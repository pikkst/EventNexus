import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { platform, accountId, videoBlob, caption, thumbnailUrl } = await req.json()

    // Verify user is admin
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      throw new Error('Admin access required')
    }

    // Get social account credentials
    const { data: account } = await supabaseClient
      .from('social_media_accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single()

    if (!account || !account.is_connected) {
      throw new Error('Social account not connected')
    }

    // Decode base64 video
    const base64Data = videoBlob.split(',')[1]
    const videoBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    let uploadResult = null

    // Upload to specific platform
    switch (platform.toLowerCase()) {
      case 'facebook':
        uploadResult = await uploadToFacebook(account, videoBuffer, caption)
        break
      
      case 'instagram':
        uploadResult = await uploadToInstagram(account, videoBuffer, caption, thumbnailUrl)
        break
      
      case 'linkedin':
        uploadResult = await uploadToLinkedIn(account, videoBuffer, caption)
        break
      
      case 'twitter':
        uploadResult = await uploadToTwitter(account, videoBuffer, caption)
        break
      
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    return new Response(
      JSON.stringify({ success: true, result: uploadResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Upload to Facebook
async function uploadToFacebook(account: any, videoBuffer: Uint8Array, caption: string) {
  const formData = new FormData()
  formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }))
  formData.append('description', caption)
  
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${account.account_id}/videos`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`
      },
      body: formData
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Facebook upload failed: ${error.error?.message || 'Unknown error'}`)
  }

  return await response.json()
}

// Upload to Instagram
async function uploadToInstagram(account: any, videoBuffer: Uint8Array, caption: string, thumbnailUrl: string | null) {
  // Instagram requires a two-step process: create container, then publish
  
  // Step 1: Upload video and create container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${account.account_id}/media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        media_type: 'VIDEO',
        video_url: 'YOUR_VIDEO_URL', // Note: Instagram requires a public URL
        caption: caption,
        ...(thumbnailUrl && { thumb_offset: 3 })
      })
    }
  )

  if (!containerResponse.ok) {
    const error = await containerResponse.json()
    throw new Error(`Instagram container creation failed: ${error.error?.message || 'Unknown error'}`)
  }

  const { id: containerId } = await containerResponse.json()

  // Step 2: Publish container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ creation_id: containerId })
    }
  )

  if (!publishResponse.ok) {
    const error = await publishResponse.json()
    throw new Error(`Instagram publish failed: ${error.error?.message || 'Unknown error'}`)
  }

  return await publishResponse.json()
}

// Upload to LinkedIn
async function uploadToLinkedIn(account: any, videoBuffer: Uint8Array, caption: string) {
  // LinkedIn video upload is more complex - requires multi-step process
  // 1. Register upload
  // 2. Upload video chunks
  // 3. Create post with video URN
  
  // Step 1: Register upload
  const registerResponse = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
          owner: `urn:li:person:${account.account_id}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      })
    }
  )

  if (!registerResponse.ok) {
    const error = await registerResponse.json()
    throw new Error(`LinkedIn register failed: ${error.message || 'Unknown error'}`)
  }

  const registerData = await registerResponse.json()
  const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
  const asset = registerData.value.asset

  // Step 2: Upload video
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${account.access_token}`
    },
    body: videoBuffer
  })

  if (!uploadResponse.ok) {
    throw new Error('LinkedIn video upload failed')
  }

  // Step 3: Create post
  const postResponse = await fetch(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: `urn:li:person:${account.account_id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: caption },
            shareMediaCategory: 'VIDEO',
            media: [{
              status: 'READY',
              media: asset
            }]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    }
  )

  if (!postResponse.ok) {
    const error = await postResponse.json()
    throw new Error(`LinkedIn post failed: ${error.message || 'Unknown error'}`)
  }

  return await postResponse.json()
}

// Upload to Twitter/X
async function uploadToTwitter(account: any, videoBuffer: Uint8Array, caption: string) {
  // Twitter requires chunked upload for videos
  // 1. INIT
  // 2. APPEND chunks
  // 3. FINALIZE
  // 4. Create tweet
  
  const videoSize = videoBuffer.length

  // Step 1: INIT
  const initResponse = await fetch(
    'https://upload.twitter.com/1.1/media/upload.json',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: videoSize.toString(),
        media_type: 'video/mp4'
      })
    }
  )

  if (!initResponse.ok) {
    throw new Error('Twitter INIT failed')
  }

  const { media_id_string } = await initResponse.json()

  // Step 2: APPEND chunks (5MB chunks)
  const chunkSize = 5 * 1024 * 1024
  let segmentIndex = 0
  
  for (let i = 0; i < videoSize; i += chunkSize) {
    const chunk = videoBuffer.slice(i, Math.min(i + chunkSize, videoSize))
    const formData = new FormData()
    formData.append('command', 'APPEND')
    formData.append('media_id', media_id_string)
    formData.append('segment_index', segmentIndex.toString())
    formData.append('media', new Blob([chunk]))

    const appendResponse = await fetch(
      'https://upload.twitter.com/1.1/media/upload.json',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        },
        body: formData
      }
    )

    if (!appendResponse.ok) {
      throw new Error(`Twitter APPEND failed at segment ${segmentIndex}`)
    }

    segmentIndex++
  }

  // Step 3: FINALIZE
  const finalizeResponse = await fetch(
    'https://upload.twitter.com/1.1/media/upload.json',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        command: 'FINALIZE',
        media_id: media_id_string
      })
    }
  )

  if (!finalizeResponse.ok) {
    throw new Error('Twitter FINALIZE failed')
  }

  // Step 4: Create tweet
  const tweetResponse = await fetch(
    'https://api.twitter.com/2/tweets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: caption,
        media: {
          media_ids: [media_id_string]
        }
      })
    }
  )

  if (!tweetResponse.ok) {
    const error = await tweetResponse.json()
    throw new Error(`Twitter tweet failed: ${error.detail || 'Unknown error'}`)
  }

  return await tweetResponse.json()
}
