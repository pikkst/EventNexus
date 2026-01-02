import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get users who haven't logged in for 24 hours after signup
    const { data: inactiveUsers, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .gte('created_at', new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())
      .lte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error) throw error

    console.log(`Found ${inactiveUsers?.length || 0} users for first action bonus email`)

    // Send emails via Resend
    const emailsSent = []
    for (const user of inactiveUsers || []) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'EventNexus <noreply@mail.eventnexus.eu>',
            to: [user.email],
            subject: '🎁 Claim Your 20 Bonus Credits!',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .header { text-align: center; margin-bottom: 40px; }
                    .logo { font-size: 32px; font-weight: 900; color: #6366f1; }
                    .content { background: #f8fafc; border-radius: 24px; padding: 40px; }
                    .title { font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 16px; }
                    .text { font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
                    .bonus-box { background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); border-radius: 16px; padding: 24px; text-align: center; margin: 32px 0; }
                    .bonus-amount { font-size: 48px; font-weight: 900; color: white; margin-bottom: 8px; }
                    .bonus-text { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 600; }
                    .actions { margin-top: 32px; text-align: center; }
                    .button { display: inline-block; background: #6366f1; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
                    .list { list-style: none; padding: 0; margin: 24px 0; }
                    .list-item { padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #475569; }
                    .footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="logo">EventNexus</div>
                    </div>
                    <div class="content">
                      <h1 class="title">Hey ${user.name || 'there'}! 👋</h1>
                      <p class="text">
                        We noticed you just joined EventNexus. Welcome aboard! To help you get started, 
                        we're giving you a special first-action bonus.
                      </p>
                      
                      <div class="bonus-box">
                        <div class="bonus-amount">+20 Credits</div>
                        <div class="bonus-text">€10 VALUE • INSTANT UNLOCK</div>
                      </div>
                      
                      <p class="text">
                        Complete any of these actions to claim your bonus:
                      </p>
                      
                      <ul class="list">
                        <li class="list-item">✓ Register for your first event</li>
                        <li class="list-item">✓ Follow an organizer you like</li>
                        <li class="list-item">✓ Enable Vibe Radar notifications</li>
                        <li class="list-item">✓ Share EventNexus with a friend</li>
                      </ul>
                      
                      <div class="actions">
                        <a href="https://www.eventnexus.eu/map" class="button">
                          Claim My Bonus
                        </a>
                      </div>
                    </div>
                    
                    <div class="footer">
                      <p>
                        EventNexus • Discover Events Near You<br>
                        <a href="https://www.eventnexus.eu" style="color: #6366f1;">www.eventnexus.eu</a>
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          }),
        })

        if (response.ok) {
          emailsSent.push(user.email)
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailsSent.length,
        total: inactiveUsers?.length || 0
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
