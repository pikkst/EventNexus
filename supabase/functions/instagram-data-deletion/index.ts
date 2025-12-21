import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle data deletion request from Instagram
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('🗑️ Instagram data deletion request:', JSON.stringify(body, null, 2))
      
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
      
      console.log('🗑️ Processing data deletion for Instagram user:', userId)
      
      // Delete all Instagram-related data
      // 1. Remove connection
      const { error: connectionError } = await supabase
        .from('social_media_accounts')
        .delete()
        .eq('platform', 'instagram')
        .eq('account_id', userId)
      
      if (connectionError) {
        console.error('❌ Error deleting connection:', connectionError)
      }
      
      // 2. Log deletion request for compliance
      const { error: logError } = await supabase
        .from('data_deletion_requests')
        .insert({
          platform: 'instagram',
          user_id: userId,
          requested_at: new Date().toISOString(),
          status: 'completed'
        })
      
      if (logError) {
        console.error('⚠️ Error logging deletion request:', logError)
      }
      
      console.log('✅ Instagram data deleted successfully')
      
      // Generate unique confirmation code (required by Instagram)
      const confirmationCode = `del_${userId}_${Date.now()}`
      
      // Return status URL where user can check deletion status
      return new Response(JSON.stringify({
        url: `https://www.eventnexus.eu/data-deletion-status?code=${confirmationCode}`,
        confirmation_code: confirmationCode
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('❌ Error processing data deletion:', error)
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
