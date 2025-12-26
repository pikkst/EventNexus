import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, action, eventId, referralCode } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if user already received first action bonus
    const { data: existingBonus } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reason', 'first_action_bonus')
      .single()

    if (existingBonus) {
      return new Response(
        JSON.stringify({ success: false, message: 'Bonus already claimed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Award 20 bonus credits
    const { error: creditError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 20,
        transaction_type: 'credit',
        reason: 'first_action_bonus',
        metadata: { action, eventId },
        timestamp: new Date().toISOString()
      })

    if (creditError) throw creditError

    // Update user credits balance
    const { data: user } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single()

    await supabase
      .from('users')
      .update({ 
        credits_balance: (user?.credits_balance || 0) + 20 
      })
      .eq('id', userId)

    // If user came from referral, reward referrer
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id, credits_balance')
        .eq('referral_code', referralCode)
        .single()

      if (referrer) {
        // Award referrer 50 credits
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: referrer.id,
            amount: 50,
            transaction_type: 'credit',
            reason: 'referral_reward',
            metadata: { referredUserId: userId },
            timestamp: new Date().toISOString()
          })

        await supabase
          .from('users')
          .update({ 
            credits_balance: (referrer.credits_balance || 0) + 50 
          })
          .eq('id', referrer.id)

        // Award referred user 50 credits too
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: 50,
            transaction_type: 'credit',
            reason: 'referral_signup',
            metadata: { referrerId: referrer.id },
            timestamp: new Date().toISOString()
          })

        await supabase
          .from('users')
          .update({ 
            credits_balance: (user?.credits_balance || 0) + 20 + 50 // First action + referral
          })
          .eq('id', userId)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        creditsAwarded: 20,
        message: 'First action bonus awarded!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
