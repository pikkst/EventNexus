import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle deauthorization callback from Facebook
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('📤 Facebook deauthorization request:', JSON.stringify(body, null, 2))
      
      // Extract user ID from signed request
      const signedRequest = body.signed_request
      if (!signedRequest) {
        return new Response(JSON.stringify({ error: 'Missing signed_request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Decode signed request (format: signature.payload)
      const [signature, payload] = signedRequest.split('.')
      const decodedPayload = JSON.parse(atob(payload))
      const userId = decodedPayload.user_id
      
      console.log('🔓 Deauthorizing Facebook user:', userId)
      
      // Remove Facebook connection from database
      const { error } = await supabase
        .from('social_media_accounts')
        .update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          deauthorized_at: new Date().toISOString()
        })
        .eq('platform', 'facebook')
        .eq('account_id', userId)
      
      if (error) {
        console.error('❌ Error deauthorizing user:', error)
        throw error
      }
      
      console.log('✅ Facebook account deauthorized successfully')
      
      // Return confirmation URL (required by Facebook)
      return new Response(JSON.stringify({
        url: 'https://www.eventnexus.eu',
        confirmation_code: `deauth_${userId}_${Date.now()}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('❌ Error processing deauthorization:', error)
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  return new Response('Method not allowed', { status: 405 })
})
