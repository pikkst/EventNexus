import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutreachRequest {
  prospect: {
    id: string;
    name: string;
    email: string;
    category: string;
    description?: string;
    website?: string;
  };
  template: {
    subject_template: string;
    body_template: string;
    ai_prompt?: string;
  };
  language: string;
  sendEmail?: boolean; // If true, send email via Resend API
}

serve(async (req) => {
  console.log('🔵 Edge Function invoked:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔍 Checking GEMINI_API_KEY...');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in secrets');
      throw new Error('GEMINI_API_KEY not configured in Supabase secrets');
    }
    console.log('✅ GEMINI_API_KEY found');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📨 Parsing request body...');
    const { prospect, template, language, sendEmail }: OutreachRequest = await req.json();
    console.log('✅ Request parsed:', { prospect: prospect.name, language, sendEmail });

    // Get platform context
    console.log('📊 Fetching platform stats...');
    const { data: stats } = await supabase
      .from('ai_platform_stats')
      .select('*')
      .order('last_updated', { ascending: false })
      .limit(10);

    const { data: changelog } = await supabase
      .from('ai_platform_changelog')
      .select('*')
      .order('version', { ascending: false })
      .limit(5);

    // Get template variables
    const { data: variables } = await supabase
      .from('template_variables')
      .select('*');

    const varMap: Record<string, string> = {};
    variables?.forEach((v: any) => {
      varMap[v.variable_name] = v.variable_value;
    });

    const adminName = varMap['admin_name'] || 'Villu Künnap';
    const adminEmail = varMap['admin_email'] || 'villu@mail.eventnexus.eu';
    const adminPhone = varMap['admin_phone'] || '+372 5XXX XXXX';

    const totalUsers = stats?.find((s: any) => s.stat_key === 'total_users')?.stat_value || '5+';
    const totalEvents = stats?.find((s: any) => s.stat_key === 'total_events')?.stat_value || '1600+';
    const platformPhase = 'Beta Launch';
    const recentFeatures = changelog?.slice(0, 3).map((c: any) => `${c.title} (${c.version})`).join(', ') || 'AI-powered features';
    console.log('✅ Platform stats:', { totalUsers, totalEvents, features: recentFeatures });

    // Generate email with Gemini
    console.log('🤖 Calling Gemini API...');
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    const prompt = `You are a professional B2B partnership manager writing a personalized email for EventNexus.

**About EventNexus:**
- Platform Phase: ${platformPhase}
- Total Users: ${totalUsers}
- Total Events: ${totalEvents}
- Recent Features: ${recentFeatures}

**Target Company:**
- Name: ${prospect.name}
- Category: ${prospect.category}
- Description: ${prospect.description || 'N/A'}
- Website: ${prospect.website || 'N/A'}

**Your Info:**
- Name: ${adminName}
- Email: ${adminEmail}
- Phone: ${adminPhone}

**Template Guidance:**
${template.ai_prompt || 'Create a professional, value-focused partnership proposal'}

Subject inspiration: ${template.subject_template}
Body inspiration: ${template.body_template}

**CRITICAL - Language & Grammar:**
1. Write ENTIRELY in ${language === 'et' ? 'ESTONIAN language' : 'ENGLISH language'}
2. Use PERFECT grammar and spelling for ${language === 'et' ? 'Estonian' : 'English'}
3. Check all word forms, conjugations, and declensions carefully
4. Use proper professional ${language === 'et' ? 'Estonian' : 'English'} business language

**Content Requirements:**
- Use company name "${prospect.name}" directly in text
- Use sender name "${adminName}" directly  
- Start with "Tere," (simple greeting)
- Include platform benefits with proper formatting (bullets OK)
- Use REAL stats: ${totalUsers} users, ${totalEvents} events
- Professional tone - enthusiastic but not pushy
- Clear call-to-action
- Keep subject under 60 characters
- Keep body under 400 words

**CRITICAL - PRICING & NUMBERS:**
⚠️ DO NOT mention ANY specific prices, percentages, or numbers for:
- Platform fees or commissions
- Free tickets or trial offers
- Discount percentages
- Specific monetary amounts
Instead use phrases like:
- "Competitive pricing available"
- "Flexible commission structure"
- "Pricing to be discussed based on your needs"
- "Custom pricing packages available"

**Signature Format:**
Parimate soovidega,
${adminName}
Partnership Manager | EventNexus
${adminEmail}
${adminPhone}

**Output JSON only:**
{
  "subject": "Professional subject line in ${language === 'et' ? 'Estonian' : 'English'}",
  "body": "Complete email with perfect ${language === 'et' ? 'Estonian' : 'English'} grammar"
}`;

    const geminiResponse = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,  // Lower for better grammar accuracy
          maxOutputTokens: 8192,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', geminiResponse.status, errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }
    console.log('✅ Gemini API responded');

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('📝 AI response length:', text.length);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Failed to parse AI response:', text.substring(0, 200));
      throw new Error('AI response was not valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ Email generated:', { subject: parsed.subject?.substring(0, 50) });

    // Final cleanup - remove any remaining placeholders
    let subject = parsed.subject || template.subject_template;
    let body = parsed.body || template.body_template;

    // Replace any remaining placeholders (shouldn't happen, but just in case)
    subject = subject.replace(/\{contactName\}/gi, '');
    subject = subject.replace(/\{senderName\}/gi, adminName);
    subject = subject.replace(/\{companyName\}/gi, prospect.name);
    body = body.replace(/\{contactName\}/gi, '');
    body = body.replace(/\{senderName\}/gi, adminName);
    body = body.replace(/\{companyName\}/gi, prospect.name);
    body = body.replace(/\{category\}/gi, prospect.category);

    console.log('✅ Final email ready');

    // Optional: Send email via Resend API
    let emailSent = false;
    let emailId = null;
    
    if (sendEmail) {
      console.log('📧 Sending email via Resend...');
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not configured - skipping email send');
      } else {
        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: `${adminName} <${adminEmail}>`,
              to: prospect.email,
              reply_to: adminEmail,
              subject: subject,
              html: body.replace(/\n/g, '<br>'), // Convert line breaks to HTML
            })
          });

          if (resendResponse.ok) {
            const resendData = await resendResponse.json();
            emailId = resendData.id;
            emailSent = true;
            console.log('✅ Email sent via Resend:', emailId);

            // Save interaction to CRM
            await supabase.from('crm_interactions').insert({
              prospect_id: prospect.id,
              interaction_type: 'email_sent',
              subject: subject,
              content: body,
              sentiment: 'neutral',
              metadata: {
                email_id: emailId,
                sent_via: 'resend',
                generated_by: 'ai'
              }
            });
          } else {
            const errorText = await resendResponse.text();
            console.error('❌ Resend API error:', errorText);
          }
        } catch (emailError: any) {
          console.error('❌ Email send failed:', emailError.message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        subject: subject,
        body: body,
        emailSent: emailSent,
        emailId: emailId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate outreach email error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
