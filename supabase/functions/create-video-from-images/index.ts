import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { images, audio, duration = 3 } = await req.json();
    
    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    console.log(`Creating video from ${images.length} images, duration: ${duration}s each`);

    // Create temporary directory
    const tempDir = await Deno.makeTempDir();
    const imagesDir = `${tempDir}/images`;
    await Deno.mkdir(imagesDir);

    try {
      // Save all images as PNG files
      for (let i = 0; i < images.length; i++) {
        const imageData = images[i].replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
        await Deno.writeFile(`${imagesDir}/image_${String(i).padStart(3, '0')}.png`, imageBuffer);
      }

      // Save audio if provided
      let audioPath = '';
      if (audio) {
        audioPath = `${tempDir}/audio.mp3`;
        const audioData = audio.replace(/^data:audio\/\w+;base64,/, '');
        const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        await Deno.writeFile(audioPath, audioBuffer);
      }

      // Create video using FFmpeg
      // Each image shows for ${duration} seconds
      const outputPath = `${tempDir}/output.mp4`;
      
      const ffmpegArgs = [
        '-framerate', `${1/duration}`, // Show each image for duration seconds
        '-pattern_type', 'glob',
        '-i', `${imagesDir}/image_*.png`,
      ];

      if (audio) {
        ffmpegArgs.push('-i', audioPath);
        ffmpegArgs.push('-c:v', 'libx264');
        ffmpegArgs.push('-c:a', 'aac');
        ffmpegArgs.push('-shortest'); // End when audio ends
      } else {
        ffmpegArgs.push('-c:v', 'libx264');
      }

      ffmpegArgs.push(
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '23',
        outputPath
      );

      console.log('Running FFmpeg:', ffmpegArgs.join(' '));

      const ffmpegProcess = new Deno.Command('ffmpeg', {
        args: ffmpegArgs,
        stdout: 'piped',
        stderr: 'piped',
      });

      const { code, stdout, stderr } = await ffmpegProcess.output();
      
      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr);
        console.error('FFmpeg error:', errorOutput);
        throw new Error(`FFmpeg failed with code ${code}`);
      }

      console.log('FFmpeg output:', new TextDecoder().decode(stdout));

      // Read the generated video
      const videoData = await Deno.readFile(outputPath);
      const base64Video = btoa(String.fromCharCode(...videoData));

      // Cleanup
      await Deno.remove(tempDir, { recursive: true });

      console.log(`Video created successfully: ${videoData.length} bytes`);

      return new Response(
        JSON.stringify({
          success: true,
          video: base64Video,
          size: videoData.length,
          duration: images.length * duration,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Cleanup on error
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {}
      throw error;
    }
  } catch (error) {
    console.error('Video creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
