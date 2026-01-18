import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Receive Email Reply Handler (Resend Inbound Webhook)
 * 
 * Handles incoming email replies from prospects and generates AI responses
 * 
 * Flow:
 * 1. Prospect replies to marketing email
 * 2. Resend forwards to this webhook
 * 3. Extract sender, subject, body
 * 4. Find original outreach email thread
 * 5. Analyze sentiment and intent (AI)
 * 6. Generate contextual reply (AI)
 * 7. Send reply automatically or save as draft for admin review
 */

interface InboundEmail {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  in_reply_to?: string;
  references?: string[];
  headers?: Record<string, string>;
}

serve(async (req) => {
  console.log('📬 Inbound email webhook received:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email reply handler is active',
      info: 'Configure inbound domain at Resend: villu@mail.eventnexus.eu'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const email: InboundEmail = await req.json();
    console.log('📧 Inbound email from:', email.from);
    console.log('📧 Subject:', email.subject);

    // Extract sender email
    const senderMatch = email.from.match(/<(.+?)>/);
    const senderEmail = senderMatch ? senderMatch[1] : email.from;
    console.log('👤 Sender email:', senderEmail);

    // Find the prospect by email
    const { data: prospect, error: prospectError } = await supabase
      .from('marketing_prospects')
      .select('*')
      .eq('email', senderEmail.toLowerCase())
      .single();

    if (prospectError || !prospect) {
      console.warn('⚠️ Unknown sender:', senderEmail);
      // Still log for admin review
      await supabase.from('crm_interactions').insert({
        prospect_id: null,
        interaction_type: 'email_received_unknown',
        subject: email.subject,
        content: email.text || email.html || '',
        sentiment: 'neutral',
        metadata: {
          from: email.from,
          to: email.to,
          raw_email: email
        }
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email logged - unknown sender' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Found prospect:', prospect.name);

    // Find original outreach email thread
    const { data: outreachEmails } = await supabase
      .from('marketing_outreach')
      .select('*')
      .eq('prospect_id', prospect.id)
      .order('sent_at', { ascending: false })
      .limit(5);

    const originalEmail = outreachEmails?.[0];
    console.log('📨 Found original email thread:', originalEmail?.id);

    // Update prospect status to "responded"
    await supabase
      .from('marketing_prospects')
      .update({ 
        status: 'responded',
        last_contacted_at: new Date().toISOString()
      })
      .eq('id', prospect.id);

    // Update outreach email status to "replied"
    if (originalEmail) {
      const currentReplies = (originalEmail.personalization_data as any)?.replies || [];
      
      await supabase
        .from('marketing_outreach')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          personalization_data: {
            ...(originalEmail.personalization_data as any),
            replies: [
              ...currentReplies,
              {
                from: email.from,
                received_at: new Date().toISOString(),
                subject: email.subject,
                preview: (email.text || email.html || '').substring(0, 200)
              }
            ]
          }
        })
        .eq('id', originalEmail.id);

      console.log('✅ Updated outreach status to replied');
    }

    // Log the interaction
    await supabase.from('crm_interactions').insert({
      prospect_id: prospect.id,
      interaction_type: 'email_received',
      subject: email.subject,
      content: email.text || email.html || '',
      sentiment: 'neutral', // Will be analyzed by AI
      metadata: {
        from: email.from,
        to: email.to,
        reply_to: email.reply_to,
        headers: email.headers
      }
    });

    console.log('✅ Logged email interaction');

    // Analyze sentiment and intent with AI
    console.log('🤖 Analyzing email with Gemini AI...');
    const emailBody = email.text || email.html?.replace(/<[^>]*>/g, '') || '';
    
    const analysisPrompt = `Analyze this email reply from a business prospect and extract key information:

**Email:**
From: ${email.from}
Subject: ${email.subject}
Body:
${emailBody}

**Context:**
This is a reply to our EventNexus partnership proposal email.

**Extract:**
1. Sentiment: positive, neutral, negative, interested, not_interested
2. Intent: wants_demo, wants_call, wants_pricing, has_questions, polite_decline, spam
3. Key questions or concerns (list)
4. Urgency level: high, medium, low
5. Suggested response approach (1 sentence)

**Output JSON only:**
{
  "sentiment": "...",
  "intent": "...",
  "questions": ["...", "..."],
  "urgency": "...",
  "response_approach": "..."
}`;

    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      }
    );

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const analysisMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = analysisMatch ? JSON.parse(analysisMatch[0]) : { sentiment: 'neutral', intent: 'unknown' };

    console.log('📊 AI Analysis:', analysis);

    // Update sentiment in interaction log
    await supabase
      .from('crm_interactions')
      .update({ sentiment: analysis.sentiment })
      .eq('prospect_id', prospect.id)
      .eq('interaction_type', 'email_received')
      .order('created_at', { ascending: false })
      .limit(1);

    // Generate AI reply
    console.log('✍️ Generating AI reply...');
    
    const replyPrompt = `You are Villu Künnap, founder of EventNexus. Generate a professional reply to this email.

**Original Email We Sent:**
Subject: ${originalEmail?.subject || 'Partnership Opportunity'}
Body: ${originalEmail?.body?.substring(0, 500) || 'We sent them a partnership proposal'}

**Their Reply:**
From: ${prospect.name}
Subject: ${email.subject}
Body:
${emailBody}

**AI Analysis:**
- Sentiment: ${analysis.sentiment}
- Intent: ${analysis.intent}
- Questions: ${analysis.questions?.join(', ') || 'None'}

**Your Task:**
Write a warm, professional, and helpful reply in ${prospect.language === 'en' ? 'English' : 'their native language'}.

**Guidelines:**
- Be personal and warm (you're the founder reaching out personally)
- Address their specific questions or concerns
- If they want a demo/call: suggest specific times this week
- If they have questions: answer clearly and concisely
- If they're interested: provide next steps
- If they declined politely: thank them and leave door open
- Keep it SHORT (under 150 words)
- Sign as "Villu Künnap, Founder, EventNexus"

**Output JSON only:**
{
  "subject": "Re: ${email.subject}",
  "body": "Your reply here..."
}`;

    const replyResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: replyPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    const replyData = await replyResponse.json();
    const replyText = replyData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const replyMatch = replyText.match(/\{[\s\S]*\}/);
    const aiReply = replyMatch ? JSON.parse(replyMatch[0]) : null;

    if (!aiReply) {
      console.error('❌ Failed to generate AI reply');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to generate reply' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ AI reply generated');

    // Decide: auto-send or save as draft?
    const autoSendConditions = 
      analysis.sentiment === 'positive' || 
      analysis.sentiment === 'interested' ||
      analysis.intent === 'wants_demo' ||
      analysis.intent === 'wants_call' ||
      analysis.intent === 'wants_pricing';

    if (autoSendConditions) {
      // AUTO-SEND reply for positive/interested leads
      console.log('📤 Auto-sending reply...');
      
      const sendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Villu Künnap <villu@mail.eventnexus.eu>',
          to: prospect.email,
          reply_to: 'villu@mail.eventnexus.eu',
          subject: aiReply.subject,
          html: aiReply.body.replace(/\n/g, '<br>'),
          in_reply_to: email.headers?.['message-id'],
        })
      });

      if (sendResponse.ok) {
        const sendData = await sendResponse.json();
        console.log('✅ Reply sent automatically:', sendData.id);

        // Log the sent reply
        await supabase.from('marketing_outreach').insert({
          prospect_id: prospect.id,
          campaign_name: 'AI Auto-Reply',
          subject: aiReply.subject,
          body: aiReply.body,
          language: prospect.language,
          status: 'sent',
          sent_at: new Date().toISOString(),
          ai_generated: true,
          personalization_data: {
            email_id: sendData.id,
            generated_at: new Date().toISOString(),
            auto_reply: true,
            in_reply_to: email.from,
            analysis: analysis
          },
          created_by: '00000000-0000-0000-0000-000000000000' // System
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Reply sent automatically',
          sentiment: analysis.sentiment,
          intent: analysis.intent
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.error('❌ Failed to send reply');
      }
    } else {
      // SAVE AS DRAFT for admin review (negative/spam/unclear)
      console.log('💾 Saving reply as DRAFT for admin review...');
      
      await supabase.from('marketing_outreach').insert({
        prospect_id: prospect.id,
        campaign_name: 'AI Draft Reply (needs review)',
        subject: aiReply.subject,
        body: aiReply.body,
        language: prospect.language,
        status: 'draft',
        ai_generated: true,
        personalization_data: {
          generated_at: new Date().toISOString(),
          auto_reply_draft: true,
          in_reply_to: email.from,
          analysis: analysis,
          reason: 'Requires admin review - sentiment not clearly positive'
        },
        created_by: '00000000-0000-0000-0000-000000000000'
      });

      console.log('✅ Draft saved for admin review');

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Draft saved for admin review',
        sentiment: analysis.sentiment,
        intent: analysis.intent
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Email reply processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
