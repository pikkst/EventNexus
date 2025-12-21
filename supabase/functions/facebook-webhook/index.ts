import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERIFY_TOKEN = Deno.env.get('FACEBOOK_WEBHOOK_VERIFY_TOKEN') || 'EVENTNEXUS_FACEBOOK_WEBHOOK_SECRET_2024'

serve(async (req) => {
  const url = new URL(req.url)
  
  // Handle GET request for webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    
    // Check if a token and mode is in the query string of the request
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log('✅ Facebook webhook verified!')
      return new Response(challenge, { status: 200 })
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      console.error('❌ Facebook webhook verification failed')
      return new Response('Forbidden', { status: 403 })
    }
  }
  
  // Handle POST request for webhook events
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('📥 Facebook webhook received:', JSON.stringify(body, null, 2))
      
      // Here you can process webhook events
      // Examples: page posts, comments, messages, etc.
      
      // For now, just log and acknowledge
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('❌ Error processing webhook:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  return new Response('Method not allowed', { status: 405 })
})
