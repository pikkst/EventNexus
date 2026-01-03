import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SORA_API_KEY = Deno.env.get('SORA_API_KEY')
const SORA_BASE_URL = 'https://freesoragenerator.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, sceneIndex, aspectRatio = '16:9' } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    if (!SORA_API_KEY) {
      throw new Error('SORA_API_KEY not configured')
    }

    console.log(`[Sora 2] Scene ${sceneIndex}: Starting generation...`)
    console.log(`[Sora 2] Prompt: ${prompt.substring(0, 100)}...`)

    // Step 1: Create generation task
    const createResponse = await fetch(`${SORA_BASE_URL}/api/v1/video/sora-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SORA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sora-2',
        prompt: prompt,
        aspectRatio: aspectRatio,
        isPublic: false, // Keep videos private
      })
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Sora API creation failed: ${createResponse.status} ${errorText}`)
    }

    const createData = await createResponse.json()
    
    if (createData.code !== 0) {
      throw new Error(`Sora API error: ${createData.message}`)
    }

    const taskId = createData.data.id
    console.log(`[Sora 2] Task created: ${taskId}`)

    // Step 2: Poll for result (max 5 minutes)
    const maxAttempts = 60 // 60 attempts × 5s = 5 minutes
    let attempts = 0
    let videoUrl = null

    while (attempts < maxAttempts) {
      attempts++
      
      // Wait 5 seconds between checks
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log(`[Sora 2] Polling attempt ${attempts}/${maxAttempts}...`)

      const checkResponse = await fetch(`${SORA_BASE_URL}/api/video-generations/check-result`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SORA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId })
      })

      if (!checkResponse.ok) {
        console.warn(`[Sora 2] Check failed: ${checkResponse.status}`)
        continue
      }

      const checkData = await checkResponse.json()

      if (checkData.code !== 0) {
        console.warn(`[Sora 2] Check error: ${checkData.message}`)
        continue
      }

      const { status, progress, result_url, failure_reason } = checkData.data

      console.log(`[Sora 2] Status: ${status}, Progress: ${progress}%`)

      if (status === 'succeeded' && result_url) {
        videoUrl = result_url
        console.log(`[Sora 2] ✅ Video ready: ${videoUrl}`)
        break
      }

      if (status === 'failed') {
        throw new Error(`Video generation failed: ${failure_reason || 'Unknown error'}`)
      }

      // Status is 'running' or 'pending', continue polling
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out after 5 minutes')
    }

    // Step 3: Download the video
    console.log(`[Sora 2] Downloading video from: ${videoUrl}`)
    
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`)
    }

    const videoBlob = await videoResponse.arrayBuffer()
    const base64Video = btoa(String.fromCharCode(...new Uint8Array(videoBlob)))

    console.log(`[Sora 2] ✅ Scene ${sceneIndex} complete: ${(videoBlob.byteLength / 1024 / 1024).toFixed(2)} MB`)

    return new Response(
      JSON.stringify({
        success: true,
        video: base64Video,
        videoUrl: videoUrl,
        sceneIndex: sceneIndex,
        mimeType: 'video/mp4',
        size: videoBlob.byteLength,
        duration: 10 // Sora 2 generates ~10 second videos
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('[Sora 2] Generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
