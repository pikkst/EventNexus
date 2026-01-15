// supabase/functions/process-event-reports/index.ts
// Edge Function to process event reports on a schedule
// Automatically hides/suspends events with too many reports
// Runs every hour via cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const REPORT_THRESHOLD = 5; // Auto-hide event after 5 reports
const SUSPEND_THRESHOLD = 10; // Auto-suspend organizer after 10 reports

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔄 Processing event reports...')

    // Step 1: Find events with too many open reports
    const { data: problematicEvents, error: fetchError } = await supabase
      .from('event_reports')
      .select('event_id, count')
      .eq('status', 'open')
      .gte('count', REPORT_THRESHOLD)

    if (fetchError) {
      console.error('Error fetching problematic events:', fetchError)
      throw fetchError
    }

    // Step 2: Get event details for problematic events
    if (problematicEvents && problematicEvents.length > 0) {
      const eventIds = [...new Set(problematicEvents.map(r => r.event_id))]
      
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, organizer_id, report_count')
        .in('id', eventIds)

      if (eventsError) {
        console.error('Error fetching event details:', eventsError)
        throw eventsError
      }

      // Step 3: Auto-hide events with threshold reports
      const eventsToHide = events?.filter(e => e.report_count >= REPORT_THRESHOLD) || []
      
      for (const event of eventsToHide) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ 
            visibility: 'private',
            status: 'auto_hidden_due_to_reports'
          })
          .eq('id', event.id)

        if (updateError) {
          console.error(`Error hiding event ${event.id}:`, updateError)
        } else {
          console.log(`✅ Auto-hidden event: ${event.name} (${event.report_count} reports)`)

          // Send notification to organizer
          await supabase.from('notifications').insert({
            user_id: event.organizer_id,
            type: 'system',
            title: '🚨 Event Auto-Hidden',
            message: `Your event "${event.name}" has been automatically hidden due to ${event.report_count} user reports. Please review and respond to the reports.`,
            sender_name: 'EventNexus Moderation',
            isRead: false,
            metadata: {
              event_id: event.id,
              report_count: event.report_count,
              action: 'auto_hidden'
            }
          })

          // Send email to organizer
          await sendEmailNotification(
            event.organizer_id,
            `Your event "${event.name}" has been auto-hidden`,
            `Due to ${event.report_count} user reports, your event has been automatically hidden from the platform. Please log in to your organizer hub to review and respond to the reports.`
          )
        }
      }

      // Step 4: Check for organizers with too many reported events
      const organizerReportCounts = new Map<string, number>()
      events?.forEach(e => {
        const count = organizerReportCounts.get(e.organizer_id) || 0
        organizerReportCounts.set(e.organizer_id, count + e.report_count)
      })

      for (const [organizerId, totalReports] of organizerReportCounts) {
        if (totalReports >= SUSPEND_THRESHOLD) {
          console.log(`⚠️ Organizer ${organizerId} has ${totalReports} total reports - admin review needed`)
          
          // Notify all admins
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')

          if (admins) {
            for (const admin of admins) {
              await supabase.from('notifications').insert({
                user_id: admin.id,
                type: 'system',
                title: '🚨 Organizer Flagged for Suspension',
                message: `Organizer ${organizerId} has ${totalReports} total reports across their events. Review and consider suspension.`,
                sender_name: 'EventNexus Moderation',
                isRead: false,
                metadata: {
                  organizer_id: organizerId,
                  total_reports: totalReports,
                  action: 'review_for_suspension'
                }
              })
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: problematicEvents?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in process-event-reports:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function sendEmailNotification(userId: string, subject: string, message: string) {
  try {
    // Get user email
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (!user?.email) return

    // Send email via Resend (or your email provider)
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@eventnexus.eu',
        to: user.email,
        subject: subject,
        html: `
          <h2>${subject}</h2>
          <p>${message}</p>
          <p><a href="https://www.eventnexus.eu/dashboard">Log in to your account</a></p>
          <br/>
          <p>EventNexus Moderation Team</p>
        `,
      }),
    })

    if (response.ok) {
      console.log(`✉️ Email sent to ${user.email}`)
    }
  } catch (error) {
    console.error('Error sending email:', error)
  }
}
