// Supabase Edge Function: Send Contact Form Email
// Handles contact and partnership inquiries from public agency pages

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = 'alerts@mail.eventnexus.eu';

interface ContactInquiryRequest {
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
  type: 'contact' | 'partnership';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request body
    const inquiry: ContactInquiryRequest = await req.json();

    console.log('📧 Received contact email request:', {
      type: inquiry.type,
      organizerId: inquiry.organizerId,
      organizerEmail: inquiry.organizerEmail,
      fromName: inquiry.fromName,
      fromEmail: inquiry.fromEmail,
    });

    // Validate required fields
    if (!inquiry.organizerId || !inquiry.organizerEmail || !inquiry.fromEmail || !inquiry.fromName || !inquiry.message) {
      console.error('❌ Missing required fields:', {
        hasOrganizerId: !!inquiry.organizerId,
        hasOrganizerEmail: !!inquiry.organizerEmail,
        hasFromEmail: !!inquiry.fromEmail,
        hasFromName: !!inquiry.fromName,
        hasMessage: !!inquiry.message,
      });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const isPartnership = inquiry.type === 'partnership';
    const emailSubject = isPartnership 
      ? `🤝 New Partnership Inquiry for ${inquiry.organizerName}`
      : `✉️ New Contact Message for ${inquiry.organizerName}`;

    console.log('📨 Sending email via Resend...', { to: inquiry.organizerEmail, subject: emailSubject });

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [inquiry.organizerEmail],
        replyTo: inquiry.fromEmail,
        subject: emailSubject,
        html: generateEmailHTML(inquiry, isPartnership),
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('❌ Resend API error:', { status: resendResponse.status, error });
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const resendData = await resendResponse.json();
    console.log('✅ Email sent successfully via Resend! ID:', resendData.id);

    // Store inquiry in database using SERVICE_ROLE_KEY to bypass RLS
    console.log('💾 Storing inquiry in database...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: inquiryData, error: dbError } = await supabaseClient
      .from('contact_inquiries')
      .insert({
        organizer_id: inquiry.organizerId,
        from_name: inquiry.fromName,
        from_email: inquiry.fromEmail,
        subject: inquiry.subject,
        message: inquiry.message,
        type: inquiry.type,
        email_id: resendData.id,
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.warn('⚠️ Failed to store inquiry in database (email was still sent):', dbError);
    } else {
      console.log('✅ Inquiry stored in database successfully');
      
      // Create notification for organizer
      console.log('🔔 Creating notification for organizer...');
      const notificationTitle = isPartnership 
        ? '🤝 New Partnership Inquiry'
        : '✉️ New Contact Message';
      
      const notificationMessage = `${inquiry.fromName} (${inquiry.fromEmail}) sent you a ${isPartnership ? 'partnership inquiry' : 'message'}${inquiry.subject ? `: ${inquiry.subject}` : ''}`;
      
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: inquiry.organizerId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'contact_inquiry',
          sender_name: inquiry.fromName,
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: {
            inquiryId: inquiryData?.id,
            fromEmail: inquiry.fromEmail,
            inquiryType: inquiry.type,
          },
        });
      
      if (notifError) {
        console.warn('⚠️ Failed to create notification:', notifError);
      } else {
        console.log('✅ Notification created successfully');
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-contact-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});

function generateEmailHTML(inquiry: ContactInquiryRequest, isPartnership: boolean): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  
  <div style="background: linear-gradient(135deg, ${isPartnership ? '#8b5cf6' : '#6366f1'} 0%, ${isPartnership ? '#6366f1' : '#8b5cf6'} 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <div style="font-size: 48px; margin-bottom: 10px;">${isPartnership ? '🤝' : '✉️'}</div>
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">${isPartnership ? 'Partnership Inquiry' : 'New Contact Message'}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">From your EventNexus public page</p>
  </div>

  <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    
    <!-- Sender Info -->
    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid ${isPartnership ? '#8b5cf6' : '#6366f1'};">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="background: ${isPartnership ? '#8b5cf6' : '#6366f1'}; color: white; width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; margin-right: 15px; vertical-align: middle;">
          ${inquiry.fromName.charAt(0).toUpperCase()}
        </div>
        <div style="display: inline-block; vertical-align: middle;">
          <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px;">${inquiry.fromName}</div>
          <div style="font-size: 14px; color: #6b7280;">
            <a href="mailto:${inquiry.fromEmail}" style="color: ${isPartnership ? '#8b5cf6' : '#6366f1'}; text-decoration: none;">${inquiry.fromEmail}</a>
          </div>
        </div>
      </div>
      ${inquiry.subject ? `
      <div style="margin-top: 12px;">
        <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 6px;">Subject</div>
        <div style="font-size: 16px; font-weight: 600; color: #111827;">${inquiry.subject}</div>
      </div>
      ` : ''}
    </div>

    <!-- Message -->
    <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
      <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 12px;">Message</div>
      <div style="font-size: 15px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${inquiry.message}</div>
    </div>

    <!-- Action Buttons -->
    <div style="text-align: center; padding: 30px 0 20px; border-top: 2px solid #f3f4f6;">
      <a href="mailto:${inquiry.fromEmail}?subject=Re: ${encodeURIComponent(inquiry.subject || 'Your inquiry')}" 
         style="display: inline-block; background: ${isPartnership ? '#8b5cf6' : '#6366f1'}; color: white; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 0 8px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        Reply to ${inquiry.fromName} →
      </a>
      <div style="margin-top: 20px;">
        <a href="https://www.eventnexus.eu/dashboard" 
           style="display: inline-block; background: #111827; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 0 8px;">
          Go to Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 25px 0 0; border-top: 1px solid #e5e7eb; margin-top: 20px;">
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">
        ${isPartnership ? 
          'This partnership inquiry was sent through your EventNexus agency page.' : 
          'This message was sent through your EventNexus public contact form.'
        }
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
        <a href="https://www.eventnexus.eu" style="color: #8b5cf6; text-decoration: none; font-weight: 600;">EventNexus</a> • 
        Professional Event Management Platform
      </p>
    </div>

  </div>

</body>
</html>
  `;
}
