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
    const { prompt, sceneIndex, useHighQuality = false } = await req.json()
    
    // Get Hugging Face token from Supabase secrets
    const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN')
    if (!HF_TOKEN) {
      throw new Error('HUGGINGFACE_TOKEN not configured')
    }

    // Use Zeroscope XL for key moments (better quality), ModelScope for others
    const model = useHighQuality 
      ? 'cerspense/zeroscope_v2_XL'  // 3s, 1024x576, high quality
      : 'damo-vilab/text-to-video-ms-1.7b'  // 3s, faster, reliable

    console.log(`Generating with ${model} for scene ${sceneIndex}: ${prompt.substring(0, 50)}...`)
    
    // Direct API call to Hugging Face Inference
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: useHighQuality ? {
          num_frames: 24,
          fps: 8,
          guidance_scale: 9.0,
          num_inference_steps: 40,
        } : {
          num_frames: 16,
          fps: 8,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Model loading - return special status
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ 
            error: 'Model is loading, please retry in 20 seconds', 
            success: false,
            loading: true 
          }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`)
    }

    const videoBuffer = await response.arrayBuffer()
    const base64Video = btoa(
      new Uint8Array(videoBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    )

    console.log(`Video generated successfully for scene ${sceneIndex}, size: ${videoBuffer.byteLength} bytes`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        video: base64Video,
        sceneIndex,
        model: useHighQuality ? 'Zeroscope XL' : 'ModelScope',
        size: videoBuffer.byteLength,
        duration: 3,
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
