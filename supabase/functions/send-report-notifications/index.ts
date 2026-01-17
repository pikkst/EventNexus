// supabase/functions/send-report-notifications/index.ts
// Edge Function to send email notifications for event reports
// Triggered when a report is created or status changes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reportId, action } = await req.json()

    if (!reportId) {
      throw new Error('Missing reportId')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch report details
    const { data: report, error: reportError } = await supabase
      .from('event_reports')
      .select('*, events(name, organizer_id)')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new Error(`Report not found: ${reportError?.message}`)
    }

    console.log(`📧 Processing ${action} notification for report ${reportId}`)

    if (action === 'created') {
      await sendReportCreatedEmail(supabase, report)
    } else if (action === 'status_updated') {
      await sendReportStatusEmail(supabase, report)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId,
        action,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-report-notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function sendReportCreatedEmail(supabase: any, report: any) {
  try {
    // Get organizer email
    const { data: organizer, error: orgError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', report.events.organizer_id)
      .single()

    if (orgError || !organizer?.email) {
      console.error('Could not fetch organizer:', orgError)
      return
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .content { line-height: 1.6; }
            .report-type { 
              display: inline-block; 
              background: #ef4444; 
              color: white; 
              padding: 5px 10px; 
              border-radius: 4px; 
              margin: 10px 0;
              font-weight: bold;
            }
            .button { 
              display: inline-block; 
              background: #4f46e5; 
              color: white; 
              padding: 10px 20px; 
              border-radius: 6px; 
              text-decoration: none;
              margin-top: 15px;
            }
            .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Your Event Has Been Reported</h2>
              <p>Event: <strong>${report.events.name}</strong></p>
            </div>
            
            <div class="content">
              <p>Hi ${organizer.name},</p>
              
              <p>A user has reported your event. Here are the details:</p>
              
              <div class="report-type">${report.report_type.replace(/_/g, ' ').toUpperCase()}</div>
              
              <p><strong>Reason:</strong><br/>${report.reason}</p>
              
              ${report.description ? `<p><strong>Details:</strong><br/>${report.description}</p>` : ''}
              
              <p>${report.reporter_email && report.reporter_email !== 'Anonymous' ? `<strong>Reporter:</strong> ${report.reporter_email}` : '<strong>Reporter:</strong> Anonymous'}</p>
              
              <p>Please review this report and take appropriate action to ensure your event information is accurate. You can update your event details or respond to this report in your organizer hub.</p>
              
              <a href="https://www.eventnexus.eu/dashboard" class="button">Review in Organizer Hub</a>
            </div>
            
            <div class="footer">
              <p>EventNexus Moderation Team<br/>
              This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@eventnexus.eu',
        to: organizer.email,
        subject: `⚠️ Your event "${report.events.name}" has been reported`,
        html: emailHtml,
      }),
    })

    if (response.ok) {
      console.log(`✉️ Report created email sent to ${organizer.email}`)
    } else {
      console.error('Failed to send email:', await response.text())
    }
  } catch (error) {
    console.error('Error sending report created email:', error)
  }
}

async function sendReportStatusEmail(supabase: any, report: any) {
  try {
    // Get reporter email (if they have one)
    if (!report.reporter_id) {
      console.log('Report is anonymous, skipping email notification')
      return
    }

    const { data: reporter, error: repError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', report.reporter_id)
      .single()

    if (repError || !reporter?.email) {
      console.error('Could not fetch reporter:', repError)
      return
    }

    const statusMessages = {
      acknowledged: {
        title: '📧 Your Report Has Been Acknowledged',
        message: 'Thank you for reporting this event. The event organizer has acknowledged your report and is reviewing it.'
      },
      resolved: {
        title: '✅ Your Report Has Been Resolved',
        message: 'Your report has been resolved. Thank you for helping us maintain a trustworthy EventNexus community!'
      },
      dismissed: {
        title: '📋 Your Report Has Been Reviewed',
        message: 'Your report has been reviewed by our moderation team and dismissed. We appreciate your diligence in keeping EventNexus safe.'
      }
    }

    const statusInfo = statusMessages[report.status as keyof typeof statusMessages] || {
      title: 'Report Status Updated',
      message: 'Your report status has been updated.'
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .content { line-height: 1.6; }
            .status-badge { 
              display: inline-block; 
              background: ${report.status === 'resolved' ? '#10b981' : report.status === 'acknowledged' ? '#f59e0b' : '#6b7280'}; 
              color: white; 
              padding: 8px 15px; 
              border-radius: 6px; 
              margin: 15px 0;
              font-weight: bold;
            }
            .footer { color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${statusInfo.title}</h2>
              <p>Event: <strong>${report.events.name}</strong></p>
            </div>
            
            <div class="content">
              <p>Hi ${reporter.name},</p>
              
              <p>${statusInfo.message}</p>
              
              <div class="status-badge">${report.status.toUpperCase()}</div>
              
              ${report.resolution_notes ? `<p><strong>Notes:</strong><br/>${report.resolution_notes}</p>` : ''}
              
              <p>Thank you for helping improve EventNexus!</p>
            </div>
            
            <div class="footer">
              <p>EventNexus Moderation Team<br/>
              This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@eventnexus.eu',
        to: reporter.email,
        subject: statusInfo.title,
        html: emailHtml,
      }),
    })

    if (response.ok) {
      console.log(`✉️ Report status email sent to ${reporter.email}`)
    } else {
      console.error('Failed to send email:', await response.text())
    }
  } catch (error) {
    console.error('Error sending report status email:', error)
  }
}
