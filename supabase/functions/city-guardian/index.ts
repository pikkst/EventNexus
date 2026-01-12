// cityGuardian Edge Function
// Acts as the self-healing controller for city pipelines
// Triggered by CRON (every 6-12 hours) or manually
// Monitors city health and triggers recovery actions

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Configuration
const HEALTH_THRESHOLD = 60
const MAX_RECOVERY_ATTEMPTS = 5
const COOLDOWN_HOURS = 12

interface CityRecord {
  city_id: string
  city_name: string
  state: string
  health_score: number
  active_sources: number
  events_30d: number
  recovery_attempts: number
  last_recovery_at: string | null
  recovery_cooldown_until: string | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    console.log('🛡️ cityGuardian started', new Date().toISOString())

    // 1️⃣ Fetch unhealthy cities from health view
    const { data: healthData, error: healthError } = await supabase
      .from('city_health_view')
      .select('*')
      .lt('health_score', HEALTH_THRESHOLD)

    if (healthError) {
      console.error('❌ Failed to load city health:', healthError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch city health', details: healthError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!healthData || healthData.length === 0) {
      console.log('✅ All cities healthy')
      return new Response(
        JSON.stringify({ status: 'ok', evaluated: 0, healed: 0, message: 'All cities healthy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let healed = 0
    const results = []

    // 2️⃣ Evaluate each unhealthy city
    for (const healthInfo of healthData) {
      console.log(`⚠️ Evaluating ${healthInfo.city_name} (health: ${healthInfo.health_score})`)

      // 3️⃣ Load full city metadata
      const { data: cityMeta, error: metaError } = await supabase
        .from('city_configs')
        .select('*')
        .eq('city_id', healthInfo.city_id)
        .single()

      if (metaError || !cityMeta) {
        console.warn(`⚠️ Could not load metadata for city ${healthInfo.city_id}`)
        continue
      }

      // 4️⃣ Check cooldown protection
      if (cityMeta.recovery_cooldown_until) {
        const cooldownUntil = new Date(cityMeta.recovery_cooldown_until)
        if (new Date() < cooldownUntil) {
          console.log(
            `⏳ Cooldown active for ${cityMeta.city_name} until ${cooldownUntil.toISOString()}`
          )
          results.push({
            city: cityMeta.city_name,
            action: 'SKIPPED_COOLDOWN',
            reason: `Cooldown until ${cooldownUntil.toISOString()}`
          })
          continue
        }
      }

      // 5️⃣ Check retry limit
      if (cityMeta.recovery_attempts >= MAX_RECOVERY_ATTEMPTS) {
        console.warn(`🚫 City quarantined: ${cityMeta.city_name} (max retries exceeded)`)

        // Quarantine and log
        await supabase
          .from('city_configs')
          .update({ state: 'QUARANTINED', updated_at: new Date().toISOString() })
          .eq('city_id', healthInfo.city_id)

        await supabase.from('city_recovery_log').insert({
          city_id: healthInfo.city_id,
          action: 'QUARANTINE',
          reason: 'Max recovery attempts exceeded',
          old_state: cityMeta.state,
          new_state: 'QUARANTINED',
          old_health_score: cityMeta.health_score,
          success: true,
          triggered_by: 'city-guardian'
        })

        results.push({
          city: cityMeta.city_name,
          action: 'QUARANTINED',
          reason: 'Max recovery attempts exceeded'
        })
        continue
      }

      // 6️⃣ Decide healing strategy
      let action: 'BOOTSTRAP' | 'DISCOVER' | 'REPARSE' = 'REPARSE'
      let reason = ''

      if (healthInfo.active_sources === 0) {
        action = 'BOOTSTRAP'
        reason = 'No active event sources'
      } else if (healthInfo.events_30d === 0) {
        action = 'DISCOVER'
        reason = 'No events in last 30 days'
      } else {
        action = 'REPARSE'
        reason = 'Low health score, retrying event extraction'
      }

      console.log(
        `🧠 Healing action for ${cityMeta.city_name}: ${action} (${reason})`
      )

      // 7️⃣ Execute healing action
      try {
        let invoked = false

        if (action === 'BOOTSTRAP') {
          const { error } = await supabase.functions.invoke('bootstrap-city', {
            body: { 
              city_id: healthInfo.city_id, 
              city_name: cityMeta.city_name, 
              country: cityMeta.country,
              seed_events: false // Skip event seeding to avoid timeout
            }
          })
          if (error) throw error
          invoked = true
        }

        if (action === 'DISCOVER') {
          const { error } = await supabase.functions.invoke('discover-sources', {
            body: { city_id: healthInfo.city_id }
          })
          if (error) throw error
          invoked = true
        }

        if (action === 'REPARSE') {
          const { error } = await supabase.functions.invoke('parse-event-ai', {
            body: { city_id: healthInfo.city_id, force: true }
          })
          if (error) throw error
          invoked = true
        }

        if (!invoked) throw new Error('No action was invoked')

        // 8️⃣ Update recovery state
        const nextRecoveryTime = new Date()
        nextRecoveryTime.setHours(nextRecoveryTime.getHours() + COOLDOWN_HOURS)

        const { error: updateError } = await supabase
          .from('city_configs')
          .update({
            state: 'RECOVERING',
            recovery_attempts: cityMeta.recovery_attempts + 1,
            last_recovery_at: new Date().toISOString(),
            recovery_cooldown_until: nextRecoveryTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('city_id', healthInfo.city_id)

        if (updateError) throw updateError

        // 9️⃣ Log successful recovery action
        await supabase.from('city_recovery_log').insert({
          city_id: healthInfo.city_id,
          action: action,
          reason: reason,
          old_state: cityMeta.state,
          new_state: 'RECOVERING',
          old_health_score: cityMeta.health_score,
          success: true,
          triggered_by: 'city-guardian'
        })

        healed++
        results.push({
          city: cityMeta.city_name,
          action: action,
          status: 'HEALING_TRIGGERED'
        })

        console.log(`✅ Recovery triggered for ${cityMeta.city_name}`)
      } catch (actionError) {
        console.error(
          `❌ Failed to trigger recovery for ${cityMeta.city_name}:`,
          actionError
        )

        // Log failed recovery action
        await supabase.from('city_recovery_log').insert({
          city_id: healthInfo.city_id,
          action: action,
          reason: reason,
          old_state: cityMeta.state,
          success: false,
          error_message: String(actionError),
          triggered_by: 'city-guardian'
        })

        results.push({
          city: cityMeta.city_name,
          action: action,
          status: 'FAILED',
          error: String(actionError)
        })
      }
    }

    // 🔟 Final response
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      evaluated: healthData.length,
      healed: healed,
      results: results
    }

    console.log('🛡️ cityGuardian completed', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('🛡️ cityGuardian fatal error:', err)
    return new Response(
      JSON.stringify({ error: 'cityGuardian failed', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
