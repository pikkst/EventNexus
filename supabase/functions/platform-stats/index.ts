// Platform Statistics Edge Function
// Returns comprehensive platform statistics for admin dashboard

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No Authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Auth session missing!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated and admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No user found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found', details: profileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (userProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required', details: `User role: ${userProfile?.role}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get platform statistics using database function (SECURITY DEFINER handles permissions)
    const { data: stats, error } = await supabaseClient
      .rpc('get_platform_statistics')

    if (error) {
      console.error('RPC error:', error)
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in platform-stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
