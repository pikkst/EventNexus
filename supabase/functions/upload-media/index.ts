// Enterprise Media Upload Edge Function
// Handles media uploads with compression, validation, and optimization
// Deno Deploy compatible

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadRequest {
  file: string // Base64 encoded file
  fileName: string
  mimeType: string
  bucket: string
  purpose?: string // 'hero', 'event-highlight', 'team', etc.
  userId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const body: UploadRequest = await req.json()
    const { file, fileName, mimeType, bucket, purpose, userId } = body

    // Verify user matches userId
    if (user.id !== userId) {
      throw new Error('User ID mismatch')
    }

    // Validate bucket
    const allowedBuckets = [
      'enterprise-media',
      'event-highlights',
      'team-avatars',
      'partner-logos',
      'media-logos',
      'testimonial-avatars'
    ]

    if (!allowedBuckets.includes(bucket)) {
      throw new Error('Invalid bucket')
    }

    // Check user subscription tier
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    const tier = userData.subscription_tier

    // Validate tier permissions
    const tierPermissions: Record<string, string[]> = {
      'free': [],
      'pro': ['event-highlights'],
      'premium': ['event-highlights', 'team-avatars', 'partner-logos', 'testimonial-avatars'],
      'enterprise': ['enterprise-media', 'event-highlights', 'team-avatars', 'partner-logos', 'media-logos', 'testimonial-avatars']
    }

    if (!tierPermissions[tier]?.includes(bucket)) {
      throw new Error(`Subscription tier ${tier} cannot upload to ${bucket}`)
    }

    // Decode base64 file
    const base64Data = file.replace(/^data:([a-z]+\/[a-z0-9-+.]+);base64,/, '')
    const fileData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    const fileSize = fileData.length

    // Validate MIME type
    const allowedMimes: Record<string, string[]> = {
      'enterprise-media': ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'],
      'event-highlights': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
      'team-avatars': ['image/jpeg', 'image/png', 'image/webp'],
      'partner-logos': ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      'media-logos': ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      'testimonial-avatars': ['image/jpeg', 'image/png', 'image/webp']
    }

    if (!allowedMimes[bucket]?.includes(mimeType)) {
      throw new Error(`MIME type ${mimeType} not allowed for ${bucket}`)
    }

    // Check file size limits
    const maxSizes: Record<string, number> = {
      'enterprise-media': 500 * 1024 * 1024,  // 500 MB
      'event-highlights': 500 * 1024 * 1024,  // 500 MB
      'team-avatars': 10 * 1024 * 1024,       // 10 MB
      'partner-logos': 5 * 1024 * 1024,       // 5 MB
      'media-logos': 5 * 1024 * 1024,         // 5 MB
      'testimonial-avatars': 5 * 1024 * 1024  // 5 MB
    }

    if (fileSize > maxSizes[bucket]) {
      throw new Error(`File size ${fileSize} exceeds limit ${maxSizes[bucket]}`)
    }

    // Check storage quota using database function
    const { data: quotaCheck, error: quotaError } = await supabaseClient
      .rpc('can_user_upload', { user_id: userId, file_size: fileSize })

    if (quotaError) {
      console.error('Quota check error:', quotaError)
      throw new Error('Failed to check storage quota')
    }

    if (!quotaCheck) {
      throw new Error('Storage quota exceeded. Please upgrade your plan.')
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = fileName.split('.').pop()
    const uniqueFileName = `${timestamp}-${randomString}.${extension}`
    const filePath = `${userId}/${uniqueFileName}`

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Track upload in database
    const mediaType = mimeType.startsWith('video/') ? 'video' : 
                     mimeType.startsWith('image/') ? 'image' : 'logo'

    const { data: trackingData, error: trackingError } = await supabaseClient
      .from('media_uploads')
      .insert({
        user_id: userId,
        bucket_id: bucket,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        media_type: mediaType,
        purpose: purpose,
        public_url: publicUrl,
        is_processed: true,
        processed_at: new Date().toISOString(),
        metadata: {
          original_name: fileName,
          uploaded_via: 'edge_function',
          upload_timestamp: timestamp
        }
      })
      .select()
      .single()

    if (trackingError) {
      console.error('Tracking error:', trackingError)
      // Don't fail upload if tracking fails, just log it
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        path: filePath,
        size: fileSize,
        bucket: bucket,
        tracking_id: trackingData?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Upload failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
