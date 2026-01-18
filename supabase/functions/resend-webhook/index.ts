import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

/**
 * Resend Webhook Handler
 * 
 * This Edge Function receives webhook events from Resend to track:
 * - email.sent - Email successfully delivered
 * - email.delivered - Email delivered to recipient's inbox
 * - email.delivery_delayed - Temporary delivery delay
 * - email.complained - Recipient marked as spam
 * - email.bounced - Email bounced (hard or soft)
 * - email.opened - Email opened by recipient
 * - email.clicked - Link clicked in email
 * 
 * Configure webhook at: https://resend.com/settings/webhooks
 * Endpoint URL: https://[your-project].supabase.co/functions/v1/resend-webhook
 */

serve(async (req) => {
  try {
    console.log('=== WEBHOOK START ===');
    console.log('📨 Method:', req.method);
    console.log('📨 URL:', req.url);

    if (req.method === 'OPTIONS') {
      console.log('✅ OPTIONS request - returning CORS headers');
      return new Response('ok', { headers: corsHeaders });
    }

    // Handle GET requests (for testing webhook endpoint)
    if (req.method === 'GET') {
      console.log('ℹ️ GET request received - webhook is active');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Resend webhook endpoint is active',
        info: 'Configure this URL in Resend dashboard: https://resend.com/settings/webhooks',
        events: ['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained']
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only accept POST requests for actual webhook events
    if (req.method !== 'POST') {
      console.log('❌ Invalid method:', req.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ POST request received - processing webhook');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    
    console.log('🔑 Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey,
      hasSecret: !!webhookSecret 
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get raw body first (needed for signature verification)
    const body = await req.text();

    // Log all headers for debugging
    console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));

    // Verify Svix signature (Resend uses Svix for webhook signatures) - OPTIONAL
    if (webhookSecret) {
      const svixId = req.headers.get('svix-id');
      const svixTimestamp = req.headers.get('svix-timestamp');
      const svixSignature = req.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('⚠️ Missing Svix headers - processing anyway (signature verification disabled)');
        console.log('Available headers:', Array.from(req.headers.keys()));
      } else {
        try {
          const signedContent = `${svixId}.${svixTimestamp}.${body}`;
          
          // Verify signature using HMAC SHA256
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhookSecret.replace('whsec_', '')),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          
          const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent));
          const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
          const receivedSignatures = svixSignature.split(' ').map(sig => sig.split(',')[1]);
          
          if (!receivedSignatures.includes(expectedSignature)) {
            console.warn('⚠️ Invalid signature - processing anyway');
          } else {
            console.log('✅ Signature verified');
          }
        } catch (error) {
          console.warn('⚠️ Signature verification failed:', error);
        }
      }
    } else {
      console.warn('⚠️ RESEND_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    console.log('📦 Webhook event:', payload.type);
    console.log('📧 Email ID:', payload.data?.email_id);

    const eventType = payload.type;
    const emailId = payload.data?.email_id;
    const timestamp = payload.created_at || new Date().toISOString();

    if (!emailId) {
      console.warn('⚠️ No email_id in webhook payload');
      return new Response(JSON.stringify({ success: true, message: 'No email_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find the outreach email by Resend email_id stored in personalization_data
    // Use ->> operator to extract text value from JSONB (-> returns JSON, ->> returns text)
    console.log('🔍 Searching for email_id in database...');
    const { data: outreachEmails, error: findError } = await supabase
      .from('marketing_outreach')
      .select('*, marketing_prospects(*)')
      .eq('personalization_data->>email_id', emailId);

    if (findError) {
      console.error('❌ Error finding outreach email:', findError);
      console.error('Query details:', { emailId, error: findError });
      throw findError;
    }

    console.log(`📊 Found ${outreachEmails?.length || 0} matching emails`);

    if (!outreachEmails || outreachEmails.length === 0) {
      console.warn(`⚠️ No outreach email found for email_id: ${emailId}`);
      console.log('🔍 Trying alternative search methods...');
      
      // Alternative: Search using JSONB operators (Postgres 9.4+)
      const { data: altEmails } = await supabase
        .from('marketing_outreach')
        .select('*')
        .filter('personalization_data', 'cs', JSON.stringify({ email_id: emailId }));
      
      if (altEmails && altEmails.length > 0) {
        console.log('✅ Found via alternative search:', altEmails.length);
        // Use alternative results
        outreachEmails.push(...altEmails);
      } else {
        return new Response(JSON.stringify({ success: true, message: 'Email not found in database' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const outreachEmail = outreachEmails[0];
    console.log('✅ Found outreach email:', outreachEmail.id);

    // Update outreach email based on event type
    const updates: any = {};
    let newStatus = outreachEmail.status;

    switch (eventType) {
      case 'email.sent':
      case 'email.delivered':
        if (outreachEmail.status === 'draft' || !outreachEmail.sent_at) {
          updates.sent_at = timestamp;
          newStatus = 'sent';
        }
        break;

      case 'email.opened':
        if (!outreachEmail.opened_at) {
          updates.opened_at = timestamp;
          newStatus = 'opened';
        }
        break;

      case 'email.clicked':
        // Track click but keep status as 'opened'
        updates.clicked_at = timestamp;
        if (outreachEmail.status === 'sent') {
          newStatus = 'opened';
        }
        break;

      case 'email.bounced':
        newStatus = 'bounced';
        updates.bounce_reason = payload.data?.bounce_type || 'unknown';
        break;

      case 'email.complained':
        newStatus = 'failed';
        updates.failed_reason = 'spam_complaint';
        break;

      case 'email.delivery_delayed':
        // Keep current status but log delay
        console.log('📬 Email delivery delayed:', emailId);
        break;

      default:
        console.log('ℹ️ Unhandled event type:', eventType);
    }

    // Update the outreach email if we have changes
    if (Object.keys(updates).length > 0 || newStatus !== outreachEmail.status) {
      updates.status = newStatus;

      // Merge webhook event into personalization_data
      const existingData = outreachEmail.personalization_data || {};
      const webhookEvents = existingData.webhook_events || [];
      webhookEvents.push({
        type: eventType,
        timestamp: timestamp,
        data: payload.data
      });
      updates.personalization_data = {
        ...existingData,
        webhook_events: webhookEvents,
        last_webhook_at: timestamp
      };

      const { error: updateError } = await supabase
        .from('marketing_outreach')
        .update(updates)
        .eq('id', outreachEmail.id);

      if (updateError) {
        console.error('❌ Error updating outreach email:', updateError);
        throw updateError;
      }

      console.log('✅ Outreach email updated:', {
        id: outreachEmail.id,
        status: newStatus,
        updates: Object.keys(updates)
      });

      // Update prospect status if email opened or clicked
      if ((eventType === 'email.opened' || eventType === 'email.clicked') && outreachEmail.prospect_id) {
        const { data: prospect } = await supabase
          .from('marketing_prospects')
          .select('status')
          .eq('id', outreachEmail.prospect_id)
          .single();

        // Only update if prospect is still 'new' or 'contacted'
        if (prospect && (prospect.status === 'new' || prospect.status === 'contacted')) {
          await supabase
            .from('marketing_prospects')
            .update({
              status: 'contacted',
              last_contacted_at: timestamp
            })
            .eq('id', outreachEmail.prospect_id);

          console.log('✅ Prospect status updated to contacted');
        }
      }

      // Update analytics
      const date = new Date(timestamp).toISOString().split('T')[0];
      const { data: prospect } = await supabase
        .from('marketing_prospects')
        .select('country, category')
        .eq('id', outreachEmail.prospect_id)
        .single();

      if (prospect) {
        // Upsert analytics record
        const analyticsKey = {
          date: date,
          country: prospect.country,
          category: prospect.category
        };

        const incrementField = eventType === 'email.opened' ? 'emails_opened' :
                              eventType === 'email.bounced' ? 'emails_bounced' :
                              eventType === 'email.sent' || eventType === 'email.delivered' ? 'emails_sent' :
                              null;

        if (incrementField) {
          // Get current value
          const { data: existingAnalytics } = await supabase
            .from('marketing_analytics')
            .select('*')
            .match(analyticsKey)
            .single();

          const currentValue = existingAnalytics?.[incrementField] || 0;

          await supabase
            .from('marketing_analytics')
            .upsert({
              ...analyticsKey,
              [incrementField]: currentValue + 1,
              metadata: {
                last_updated: timestamp
              }
            }, {
              onConflict: 'date,country,category'
            });

          console.log('✅ Analytics updated:', { date, country: prospect.country, field: incrementField });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        event: eventType,
        email_id: emailId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
