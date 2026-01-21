import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Denv.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case 'get_trending':
        return await getTrendingPosts(supabaseClient, params);
      
      case 'get_featured':
        return await getFeaturedPosts(supabaseClient, params);
      
      case 'search':
        return await searchPosts(supabaseClient, params);
      
      case 'get_feed':
        return await getUserFeed(supabaseClient, params);
      
      case 'increment_views':
        return await incrementViews(supabaseClient, params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getTrendingPosts(supabase: any, params: any) {
  const { limit = 10 } = params;

  const { data, error } = await supabase
    .rpc('get_trending_blog_posts', { p_limit: limit });

  if (error) throw error;

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getFeaturedPosts(supabase: any, params: any) {
  const { limit = 5 } = params;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, author:users(id, full_name, avatar_url)')
    .eq('status', 'published')
    .eq('is_featured', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function searchPosts(supabase: any, params: any) {
  const { query, language = 'en', limit = 20 } = params;

  const { data, error } = await supabase
    .rpc('search_blog_posts', {
      p_query: query,
      p_language: language,
      p_limit: limit
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserFeed(supabase: any, params: any) {
  const { user_id, limit = 20, offset = 0 } = params;

  if (!user_id) {
    throw new Error('user_id is required');
  }

  const { data, error } = await supabase
    .rpc('get_following_feed', {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function incrementViews(supabase: any, params: any) {
  const { post_id } = params;

  if (!post_id) {
    throw new Error('post_id is required');
  }

  const { error } = await supabase
    .rpc('increment_blog_post_views', { p_post_id: post_id });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
