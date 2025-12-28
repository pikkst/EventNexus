// Unsplash API Edge Function
// Handles all Unsplash API requests securely server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY')!;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface UnsplashRequest {
  action: 'search' | 'random' | 'trackDownload';
  query?: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  perPage?: number;
  page?: number;
  downloadUrl?: string;
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
    const { action, query, orientation, perPage = 10, page = 1, downloadUrl }: UnsplashRequest = await req.json();

    let url = '';
    let params: Record<string, string> = {};

    switch (action) {
      case 'search':
        url = `${UNSPLASH_API_URL}/search/photos`;
        params = {
          query: query || 'event',
          orientation: orientation || 'landscape',
          per_page: String(perPage),
          page: String(page),
        };
        break;

      case 'random':
        url = `${UNSPLASH_API_URL}/photos/random`;
        params = {
          query: query || 'event',
          orientation: orientation || 'landscape',
          count: String(perPage),
        };
        break;

      case 'trackDownload':
        if (!downloadUrl) {
          throw new Error('downloadUrl required for trackDownload');
        }
        // Track download as per Unsplash API guidelines
        await fetch(downloadUrl);
        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Make request to Unsplash API
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${url}?${queryString}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
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
