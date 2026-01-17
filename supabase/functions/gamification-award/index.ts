import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Gamification Award Edge Function
 * Safely awards points and starter achievements for user actions.
 * Body: { userId: string, action: 'rsvp'|'checkin'|'review'|'community_join', eventId?: string, sourceId?: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { userId, action, eventId, sourceId } = payload

    if (!userId || !action) {
      return new Response(JSON.stringify({ error: 'Missing userId or action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Map action to points and starter achievement key
    const map: Record<string, { points: number; reason: string; ach?: string }> = {
      rsvp: { points: 20, reason: 'action:rsvp', ach: 'first_event' },
      checkin: { points: 15, reason: 'action:checkin', ach: 'first_checkin' },
      review: { points: 10, reason: 'action:review', ach: 'first_review' },
      community_join: { points: 5, reason: 'action:community_join', ach: 'first_community' },
    }

    const conf = map[action]
    if (!conf) {
      return new Response(JSON.stringify({ error: 'Unsupported action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Award points via RPC (SECURITY DEFINER)
    const { error: pointsErr } = await supabase.rpc('add_points', {
      p_user_id: userId,
      p_points: conf.points,
      p_reason: conf.reason,
      p_source_type: eventId ? 'event' : (sourceId ? 'community' : action),
      p_source_id: eventId || sourceId || null
    })
    if (pointsErr) throw pointsErr

    // Award starter achievement (idempotent by ON CONFLICT DO NOTHING)
    if (conf.ach) {
      const { error: achErr } = await supabase.rpc('award_achievement', {
        p_user_id: userId,
        p_key: conf.ach
      })
      if (achErr) {
        // Non-fatal; continue
        console.warn('award_achievement error:', achErr?.message)
      }
    }

    return new Response(JSON.stringify({ success: true, awarded: conf.points }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('gamification-award error:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
