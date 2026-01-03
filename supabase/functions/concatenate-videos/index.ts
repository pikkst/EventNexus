import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoSegments } = await req.json()

    if (!videoSegments || !Array.isArray(videoSegments)) {
      throw new Error('videoSegments (array of base64 videos) is required')
    }

    console.log(`Concatenating ${videoSegments.length} video segments into single MP4...`)

    // Decode base64 segments to binary
    const binarySegments = videoSegments.map((base64: string) => {
      // Remove data URL prefix if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
      return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    })

    console.log(`Decoded ${binarySegments.length} segments, total size: ${binarySegments.reduce((sum, seg) => sum + seg.length, 0) / 1024 / 1024} MB`)

    // Write segments to temp files
    const tempDir = await Deno.makeTempDir()
    const segmentFiles: string[] = []
    
    for (let i = 0; i < binarySegments.length; i++) {
      const filePath = `${tempDir}/segment_${i.toString().padStart(3, '0')}.mp4`
      await Deno.writeFile(filePath, binarySegments[i])
      segmentFiles.push(filePath)
      console.log(`Written segment ${i + 1}/${binarySegments.length}: ${filePath}`)
    }

    // Create FFmpeg concat file
    const concatFilePath = `${tempDir}/concat.txt`
    const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n')
    await Deno.writeTextFile(concatFilePath, concatContent)

    // Run FFmpeg to concatenate
    const outputPath = `${tempDir}/output.mp4`
    console.log(`Running FFmpeg concat...`)
    
    const ffmpegProcess = new Deno.Command('ffmpeg', {
      args: [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-c', 'copy',
        '-y',
        outputPath
      ],
      stdout: 'piped',
      stderr: 'piped'
    })

    const { code, stdout, stderr } = await ffmpegProcess.output()
    
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr)
      console.error('FFmpeg error:', errorText)
      throw new Error(`FFmpeg failed: ${errorText}`)
    }

    console.log('FFmpeg concat successful')

    // Read concatenated video
    const finalVideo = await Deno.readFile(outputPath)
    const base64Video = btoa(String.fromCharCode(...finalVideo))

    // Cleanup temp files
    await Deno.remove(tempDir, { recursive: true })
    console.log(`Cleanup complete. Final video size: ${finalVideo.length / 1024 / 1024} MB`)

    return new Response(
      JSON.stringify({
        success: true,
        video: base64Video,
        mimeType: 'video/mp4',
        size: finalVideo.length,
        segments: videoSegments.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Concatenation error:', error)
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
