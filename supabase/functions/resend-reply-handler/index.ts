import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Resend Email Reply Handler
 * 
 * Handles incoming email replies to B2B outreach campaigns
 * Parses email content, extracts sentiment, updates CRM
 * 
 * Configure Resend to forward replies to this endpoint
 */

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  reply_to?: string;
  in_reply_to?: string;
  references?: string;
  message_id?: string;
}

serve(async (req) => {
  console.log('📨 Resend Reply Handler invoked:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse incoming email
    const email: InboundEmail = await req.json();
    console.log('📧 Incoming email from:', email.from);
    console.log('📧 Subject:', email.subject);

    // Extract sender email
    const senderEmail = email.from.match(/<(.+?)>/) ? email.from.match(/<(.+?)>/)![1] : email.from;
    console.log('📧 Extracted email:', senderEmail);

    // Find prospect by email
    const { data: prospect, error: prospectError } = await supabase
      .from('marketing_prospects')
      .select('*')
      .eq('email', senderEmail)
      .single();

    if (prospectError || !prospect) {
      console.warn('⚠️ Prospect not found:', senderEmail);
      
      // Still log the reply for manual review
      await supabase.from('crm_interactions').insert({
        prospect_id: null,
        interaction_type: 'email_reply_unknown',
        subject: email.subject,
        content: email.text,
        sentiment: 'neutral',
        metadata: {
          from: email.from,
          to: email.to,
          message_id: email.message_id,
          reply_to: email.reply_to,
          in_reply_to: email.in_reply_to,
          references: email.references
        }
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Reply logged (unknown prospect)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Prospect found:', prospect.name);

    // Analyze sentiment using Gemini (if available)
    let sentiment = 'neutral';
    let extractedIntent = null;
    let suggestedAction = null;

    if (GEMINI_API_KEY) {
      try {
        console.log('🤖 Analyzing sentiment with Gemini...');
        const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        
        const sentimentPrompt = `Analyze this B2B email reply for EventNexus partnership outreach:

FROM: ${prospect.name}
SUBJECT: ${email.subject}
CONTENT:
${email.text}

Classify the reply into ONE of these categories:
1. POSITIVE - Interested, wants demo, asks questions, positive language
2. NEUTRAL - Acknowledges email, needs more info, no clear yes/no
3. NEGATIVE - Not interested, unsubscribe, negative response
4. AUTO_REPLY - Out of office, automated response
5. QUESTION - Asks specific questions about pricing, features, etc.

Also extract:
- Intent: what they want (demo, pricing info, more details, not interested, etc.)
- Suggested next action: what we should do (schedule demo, send pricing, follow up in X days, close lead)

Output JSON only:
{
  "sentiment": "positive|neutral|negative|auto_reply|question",
  "intent": "brief description",
  "suggested_action": "next step recommendation",
  "confidence": 0.0-1.0
}`;

        const geminiResponse = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: sentimentPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            sentiment = analysis.sentiment.toLowerCase();
            extractedIntent = analysis.intent;
            suggestedAction = analysis.suggested_action;
            console.log('✅ Sentiment analysis:', sentiment, '(confidence:', analysis.confidence, ')');
          }
        }
      } catch (sentimentError) {
        console.error('⚠️ Sentiment analysis failed:', sentimentError);
        // Continue without sentiment - not critical
      }
    }

    // Update prospect status based on sentiment
    let newStatus = prospect.status;
    if (sentiment === 'positive' || sentiment === 'question') {
      newStatus = 'responded';
    } else if (sentiment === 'negative') {
      newStatus = 'not_interested';
    } else if (sentiment === 'auto_reply') {
      // Keep current status for auto-replies
      newStatus = prospect.status;
    } else {
      newStatus = 'responded'; // Neutral responses still count as engagement
    }

    // Update prospect
    await supabase
      .from('marketing_prospects')
      .update({
        status: newStatus,
        last_contacted_at: new Date().toISOString(),
        notes: prospect.notes 
          ? `${prospect.notes}\n\n[${new Date().toISOString()}] Reply: ${email.subject}`
          : `[${new Date().toISOString()}] Reply: ${email.subject}`,
        metadata: {
          ...(prospect.metadata || {}),
          last_reply: {
            subject: email.subject,
            sentiment: sentiment,
            intent: extractedIntent,
            suggested_action: suggestedAction,
            received_at: new Date().toISOString()
          }
        }
      })
      .eq('id', prospect.id);

    console.log('✅ Prospect updated:', { status: newStatus, sentiment });

    // Find related outreach email (if exists)
    const { data: outreachEmails } = await supabase
      .from('marketing_outreach')
      .select('*')
      .eq('prospect_id', prospect.id)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (outreachEmails && outreachEmails.length > 0) {
      const outreach = outreachEmails[0];
      
      // Update outreach with reply timestamp
      await supabase
        .from('marketing_outreach')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          personalization_data: {
            ...(outreach.personalization_data || {}),
            reply: {
              subject: email.subject,
              received_at: new Date().toISOString(),
              sentiment: sentiment,
              intent: extractedIntent
            }
          }
        })
        .eq('id', outreach.id);

      console.log('✅ Outreach email marked as replied');
    }

    // Log interaction to CRM
    await supabase.from('crm_interactions').insert({
      prospect_id: prospect.id,
      interaction_type: 'email_reply',
      subject: email.subject,
      content: email.text,
      sentiment: sentiment,
      metadata: {
        from: email.from,
        to: email.to,
        message_id: email.message_id,
        reply_to: email.reply_to,
        in_reply_to: email.in_reply_to,
        references: email.references,
        intent: extractedIntent,
        suggested_action: suggestedAction
      }
    });

    console.log('✅ CRM interaction logged');

    // Update analytics
    const date = new Date().toISOString().split('T')[0];
    const { data: existingAnalytics } = await supabase
      .from('marketing_analytics')
      .select('*')
      .eq('date', date)
      .eq('country', prospect.country)
      .eq('category', prospect.category)
      .single();

    const responsesReceived = (existingAnalytics?.responses_received || 0) + 1;
    const positiveResponses = sentiment === 'positive' || sentiment === 'question' 
      ? (existingAnalytics?.positive_responses || 0) + 1 
      : (existingAnalytics?.positive_responses || 0);

    await supabase
      .from('marketing_analytics')
      .upsert({
        date: date,
        country: prospect.country,
        category: prospect.category,
        responses_received: responsesReceived,
        positive_responses: positiveResponses,
        metadata: {
          last_updated: new Date().toISOString()
        }
      }, {
        onConflict: 'date,country,category'
      });

    console.log('✅ Analytics updated');

    // Send notification to admin (optional)
    if (sentiment === 'positive' || sentiment === 'question') {
      // TODO: Send Slack/email notification to admin
      console.log('🎉 Positive response! Admin notification would be sent here.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reply processed successfully',
        prospect: prospect.name,
        sentiment: sentiment,
        intent: extractedIntent,
        suggested_action: suggestedAction
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Reply handler error:', error);
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
