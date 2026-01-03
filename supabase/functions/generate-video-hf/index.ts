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

    // Use Flux.1-schnell for high quality (very fast, free), or SD 1.5 for basic
    const model = useHighQuality 
      ? 'black-forest-labs/FLUX.1-schnell'  // Fast, high quality, free
      : 'CompVis/stable-diffusion-v1-4'  // Fast, reliable, free

    console.log(`Generating image with ${model} for scene ${sceneIndex}: ${prompt.substring(0, 50)}...`)
    
    // Use Hugging Face Router (new endpoint as of 2024)
    const HF_API_URL = `https://api-inference.huggingface.co/models/${model}`
    
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: useHighQuality ? 4 : 20,  // Flux is fast even at 4 steps
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

    const imageBuffer = await response.arrayBuffer()
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    )

    console.log(`Image generated successfully for scene ${sceneIndex}, size: ${imageBuffer.byteLength} bytes`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        image: base64Image,
        sceneIndex,
        model: useHighQuality ? 'FLUX.1-schnell' : 'SD 1.4',
        size: imageBuffer.byteLength,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Image generation error:', error)
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
