// Resend Inbound Email Webhook Handler
// Receives incoming emails and stores them in admin_inbox table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  reply_to?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
    size: number;
  }>;
  headers?: Record<string, string>;
  message_id?: string;
  in_reply_to?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse webhook payload
    const payload: ResendInboundEmail = await req.json();
    
    console.log('Received inbound email:', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      hasText: !!payload.text,
      hasHtml: !!payload.html,
      attachmentCount: payload.attachments?.length || 0
    });

    // Extract sender name and email
    const fromMatch = payload.from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    const fromName = fromMatch?.[1]?.trim() || null;
    const fromEmail = fromMatch?.[2]?.trim() || payload.from;

    // Auto-detect priority based on keywords
    let priority = 'normal';
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'important'];
    const subjectLower = payload.subject.toLowerCase();
    if (urgentKeywords.some(keyword => subjectLower.includes(keyword))) {
      priority = 'high';
    }

    // Auto-detect spam (basic filters)
    let status = 'unread';
    const spamKeywords = ['viagra', 'casino', 'lottery', 'prince', 'inheritance'];
    if (spamKeywords.some(keyword => subjectLower.includes(keyword))) {
      status = 'spam';
    }

    // Process attachments (convert to storage URLs if needed)
    const attachments = (payload.attachments || []).map(att => ({
      name: att.filename,
      size: att.size,
      type: att.contentType,
      content: att.content // base64 - could upload to Supabase Storage
    }));

    // Insert into admin_inbox
    const { data, error } = await supabase
      .from('admin_inbox')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: payload.to,
        subject: payload.subject,
        body_text: payload.text,
        body_html: payload.html,
        attachments: attachments,
        status: status,
        priority: priority,
        message_id: payload.message_id,
        in_reply_to: payload.in_reply_to,
        resend_webhook_data: payload
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing email:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store email', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email stored successfully:', data.id);

    // TODO: Send real-time notification to admins via Supabase Realtime
    // This would trigger a browser notification when new email arrives

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id,
        status: data.status,
        priority: data.priority
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
