// Media Upload Edge Function - Batch Upload Support
// Handles multiple file uploads in a single request for efficiency
// Deno Deploy compatible

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BatchFileUpload {
  file: string // Base64 encoded
  fileName: string
  mimeType: string
  purpose?: string
}

interface BatchUploadRequest {
  files: BatchFileUpload[]
  bucket: string
  userId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const body: BatchUploadRequest = await req.json()
    const { files, bucket, userId } = body

    if (user.id !== userId) {
      throw new Error('User ID mismatch')
    }

    if (!files || files.length === 0) {
      throw new Error('No files provided')
    }

    if (files.length > 10) {
      throw new Error('Maximum 10 files per batch')
    }

    // Validate bucket and permissions (same as single upload)
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

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    const tier = userData.subscription_tier

    const tierPermissions: Record<string, string[]> = {
      'free': [],
      'pro': ['event-highlights'],
      'premium': ['event-highlights', 'team-avatars', 'partner-logos', 'testimonial-avatars'],
      'enterprise': ['enterprise-media', 'event-highlights', 'team-avatars', 'partner-logos', 'media-logos', 'testimonial-avatars']
    }

    if (!tierPermissions[tier]?.includes(bucket)) {
      throw new Error(`Subscription tier ${tier} cannot upload to ${bucket}`)
    }

    // Process all files
    const results = []
    const errors = []

    for (const fileData of files) {
      try {
        const { file, fileName, mimeType, purpose } = fileData

        // Decode base64
        const base64Data = file.replace(/^data:([a-z]+\/[a-z0-9-+.]+);base64,/, '')
        const decodedFile = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
        const fileSize = decodedFile.length

        // Check quota before each upload
        const { data: quotaCheck } = await supabaseClient
          .rpc('can_user_upload', { user_id: userId, file_size: fileSize })

        if (!quotaCheck) {
          errors.push({ fileName, error: 'Storage quota exceeded' })
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const extension = fileName.split('.').pop()
        const uniqueFileName = `${timestamp}-${randomString}.${extension}`
        const filePath = `${userId}/${uniqueFileName}`

        // Upload
        const { error: uploadError } = await supabaseClient.storage
          .from(bucket)
          .upload(filePath, decodedFile, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          errors.push({ fileName, error: uploadError.message })
          continue
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(filePath)

        const publicUrl = urlData.publicUrl

        // Track upload
        const mediaType = mimeType.startsWith('video/') ? 'video' : 
                         mimeType.startsWith('image/') ? 'image' : 'logo'

        await supabaseClient
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
            processed_at: new Date().toISOString()
          })

        results.push({
          fileName,
          url: publicUrl,
          path: filePath,
          size: fileSize,
          success: true
        })

      } catch (error) {
        errors.push({ fileName: fileData.fileName, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: results.length > 0,
        uploaded: results.length,
        failed: errors.length,
        results,
        errors
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
        error: error.message || 'Batch upload failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
