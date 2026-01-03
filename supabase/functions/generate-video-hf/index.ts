import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { InferenceClient } from 'npm:@huggingface/inference@latest'

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

    console.log(`Generating video for scene ${sceneIndex}: ${prompt.substring(0, 50)}...`)
    
    // Initialize InferenceClient with token
    const client = new InferenceClient(HF_TOKEN)
    
    // Generate 3-second video using Replicate provider with Wan2.2 model
    const videoBlob = await client.textToVideo({
      provider: "replicate",
      model: "Wan-AI/Wan2.2-TI2V-5B",
      inputs: prompt,
    })
    
    console.log(`Video generated successfully for scene ${sceneIndex}, size: ${videoBlob.size} bytes`)

    // Convert blob to base64 for transport
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
