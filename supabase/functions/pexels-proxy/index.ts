// Pexels API Edge Function
// Handles all Pexels API requests securely server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY')!;
const PEXELS_API_URL = 'https://api.pexels.com/v1';
const PEXELS_VIDEO_URL = 'https://api.pexels.com/videos';

interface PexelsRequest {
  type: 'photos' | 'videos' | 'popular-videos';
  query?: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  perPage?: number;
  page?: number;
  minDuration?: number;
  maxDuration?: number;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { 
      type, 
      query, 
      orientation, 
      size, 
      perPage = 15, 
      page = 1,
      minDuration,
      maxDuration 
    }: PexelsRequest = await req.json();

    let url = '';
    let params: Record<string, string> = {
      per_page: String(perPage),
      page: String(page),
    };

    switch (type) {
      case 'photos':
        url = `${PEXELS_API_URL}/search`;
        if (query) params.query = query;
        if (orientation) params.orientation = orientation;
        if (size) params.size = size;
        break;

      case 'videos':
        url = `${PEXELS_VIDEO_URL}/search`;
        if (query) params.query = query;
        if (orientation) params.orientation = orientation;
        if (size) params.size = size;
        if (minDuration) params.min_duration = String(minDuration);
        if (maxDuration) params.max_duration = String(maxDuration);
        break;

      case 'popular-videos':
        url = `${PEXELS_VIDEO_URL}/popular`;
        if (minDuration) params.min_duration = String(minDuration);
        if (maxDuration) params.max_duration = String(maxDuration);
        break;

      default:
        throw new Error(`Unknown type: ${type}`);
    }

    // Make request to Pexels API
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${url}?${queryString}`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
