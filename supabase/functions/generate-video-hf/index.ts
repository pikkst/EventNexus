import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.6.4'

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

    // Use SDXL for high quality images, SD 1.5 for speed
    const model = useHighQuality 
      ? 'stabilityai/stable-diffusion-xl-base-1.0'  // High quality
      : 'runwayml/stable-diffusion-v1-5'  // Fast, reliable

    console.log(`Generating image with ${model} for scene ${sceneIndex}: ${prompt.substring(0, 50)}...`)
    
    // Use HuggingFace Inference SDK for image generation
    const hf = new HfInference(HF_TOKEN)
    
    try {
      const imageBlob = await hf.textToImage({
        model: model,
        inputs: prompt,
        parameters: {
          negative_prompt: 'blurry, low quality, distorted, ugly, bad anatomy, watermark, text',
          num_inference_steps: useHighQuality ? 50 : 30,
          guidance_scale: 7.5,
        },
      })

      const imageBuffer = await imageBlob.arrayBuffer()
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
          model: useHighQuality ? 'SDXL' : 'SD 1.5',
          size: imageBuffer.byteLength,
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    } catch (apiError: any) {
      // If model is loading or unavailable
      if (apiError.message?.includes('loading') || apiError.message?.includes('503')) {
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
      throw apiError
    }

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
