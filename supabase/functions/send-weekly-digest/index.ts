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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all active users for weekly digest
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, notification_prefs')
      .eq('status', 'active')

    if (error) throw error

    console.log(`Generating weekly digest for ${users?.length || 0} users`)

    // Get all upcoming events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(100)

    const emailsSent = []
    
    for (const user of users || []) {
      try {
        // Skip if user disabled email notifications
        if (user.notification_prefs?.emailEnabled === false) continue

        // Get personalized events for this user
        const { data: behaviorData } = await supabase
          .from('user_behavior')
          .select('category')
          .eq('user_id', user.id)
          .eq('action', 'attend')
          .limit(20)

        const preferredCategories = [...new Set(
          behaviorData?.map(b => b.category).filter(Boolean) || []
        )]

        // Filter events by user preferences
        const personalizedEvents = events?.filter(e => 
          preferredCategories.length === 0 || preferredCategories.includes(e.category)
        ).slice(0, 5) || []

        // Get trending events
        const trendingEvents = events?.sort((a, b) => {
          const rateA = a.attendees_count / a.max_capacity
          const rateB = b.attendees_count / b.max_capacity
          return rateB - rateA
        }).slice(0, 5) || []

        if (personalizedEvents.length === 0 && trendingEvents.length === 0) {
          continue // Skip if no events to recommend
        }

        // Send email
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'EventNexus <noreply@mail.eventnexus.eu>',
            to: [user.email],
            subject: '🎉 Your Weekly Event Digest is Here!',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .header { text-align: center; margin-bottom: 40px; }
                    .logo { font-size: 32px; font-weight: 900; color: #6366f1; }
                    .section { margin: 32px 0; }
                    .section-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 16px; }
                    .event-card { background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
                    .event-name { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
                    .event-details { font-size: 14px; color: #64748b; }
                    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 12px; }
                    .footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="logo">EventNexus</div>
                      <p style="color: #64748b; font-size: 16px; margin-top: 8px;">Your Weekly Event Digest</p>
                    </div>

                    ${personalizedEvents.length > 0 ? `
                    <div class="section">
                      <h2 class="section-title">✨ Events You Might Love</h2>
                      ${personalizedEvents.map(event => `
                        <div class="event-card">
                          <div class="event-name">${event.name}</div>
                          <div class="event-details">
                            ${event.category} • ${new Date(event.date).toLocaleDateString()} • ${event.location.city}
                          </div>
                          <a href="https://www.eventnexus.eu/#/event/${event.id}" class="button">View Details</a>
                        </div>
                      `).join('')}
                    </div>
                    ` : ''}

                    ${trendingEvents.length > 0 ? `
                    <div class="section">
                      <h2 class="section-title">🔥 Trending This Week</h2>
                      ${trendingEvents.map(event => `
                        <div class="event-card">
                          <div class="event-name">${event.name}</div>
                          <div class="event-details">
                            ${event.category} • ${new Date(event.date).toLocaleDateString()} • ${event.location.city}
                          </div>
                          <a href="https://www.eventnexus.eu/#/event/${event.id}" class="button">View Details</a>
                        </div>
                      `).join('')}
                    </div>
                    ` : ''}

                    <div class="footer">
                      <p>
                        Don't want these emails? <a href="https://www.eventnexus.eu/#/profile?tab=notifications" style="color: #6366f1;">Update preferences</a>
                      </p>
                      <p style="margin-top: 16px;">
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
        console.error(`Failed to send digest to ${user.email}:`, emailError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailsSent.length,
        total: users?.length || 0
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
