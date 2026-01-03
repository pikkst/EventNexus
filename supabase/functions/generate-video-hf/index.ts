import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { prompt, sceneIndex } = await req.json()
    
    // Get Hugging Face token from Supabase secrets
    const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN')
    if (!HF_TOKEN) {
      throw new Error('HUGGINGFACE_TOKEN not configured')
    }

    const HF_VIDEO_MODEL = 'Kevin-thu/StoryMem'
    const endpoint = `https://api-inference.huggingface.co/models/${HF_VIDEO_MODEL}`
    
    // Generate video segment
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_frames: 120, // ~4 seconds at 30fps
          guidance_scale: 7.5,
          num_inference_steps: 50
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Hugging Face API error: ${error}`)
    }

    // Return video blob
    const videoBlob = await response.blob()
    const videoBuffer = await videoBlob.arrayBuffer()
    const base64Video = btoa(
      new Uint8Array(videoBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        video: base64Video,
        sceneIndex,
        mimeType: videoBlob.type
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Video generation error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
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
