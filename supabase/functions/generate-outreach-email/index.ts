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
    
    // Map language codes to full language names for AI prompt
    const languageNames: Record<string, string> = {
      'et': 'Estonian',
      'en': 'English',
      'fi': 'Finnish',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'de': 'German',
      'fr': 'French',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'nl': 'Dutch',
      'pl': 'Polish',
      'ru': 'Russian',
      'uk': 'Ukrainian',
      'cs': 'Czech',
      'sk': 'Slovak',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'el': 'Greek',
      'tr': 'Turkish',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian'
    };
    
    const languageName = languageNames[language] || 'English';
    const isEnglish = language === 'en';
    
    // Get appropriate greeting for language
    const greetings: Record<string, string> = {
      'et': 'Tere',
      'fi': 'Hei',
      'lv': 'Sveiki',
      'lt': 'Sveiki',
      'sv': 'Hej',
      'no': 'Hei',
      'da': 'Hej',
      'de': 'Guten Tag',
      'fr': 'Bonjour',
      'es': 'Hola',
      'it': 'Buongiorno',
      'pt': 'Olá',
      'nl': 'Hallo',
      'pl': 'Dzień dobry',
      'ru': 'Здравствуйте',
      'uk': 'Доброго дня',
      'cs': 'Dobrý den',
      'sk': 'Dobrý deň',
      'hu': 'Jó napot',
      'ro': 'Bună ziua',
      'bg': 'Здравейте',
      'hr': 'Dobar dan',
      'el': 'Γεια σας',
      'tr': 'Merhaba',
      'en': 'Hello'
    };
    
    const greeting = greetings[language] || 'Hello';
    
    // Signature closing for language
    const closings: Record<string, string> = {
      'et': 'Parimate soovidega',
      'fi': 'Ystävällisin terveisin',
      'lv': 'Ar cieņu',
      'lt': 'Pagarbiai',
      'sv': 'Med vänlig hälsning',
      'no': 'Med vennlig hilsen',
      'da': 'Med venlig hilsen',
      'de': 'Mit freundlichen Grüßen',
      'fr': 'Cordialement',
      'es': 'Atentamente',
      'it': 'Cordiali saluti',
      'pt': 'Atenciosamente',
      'nl': 'Met vriendelijke groet',
      'pl': 'Z poważaniem',
      'ru': 'С уважением',
      'uk': 'З повагою',
      'cs': 'S pozdravem',
      'sk': 'S pozdravom',
      'hu': 'Tisztelettel',
      'ro': 'Cu stimă',
      'bg': 'С уважение',
      'hr': 'S poštovanjem',
      'el': 'Με εκτίμηση',
      'tr': 'Saygılarımla',
      'en': 'Best regards'
    };
    
    const closing = closings[language] || 'Best regards';
    
    const prompt = `You are Villu Künnap, founder of EventNexus, writing a personalized B2B partnership email.

**About EventNexus (Key Facts):**
- Revolutionary AI-powered event platform
- Platform fees: 1.5% - 5% (vs industry standard 10-15%)
- Cost savings: Up to 80% compared to traditional ticketing platforms
- Global reach: 1,169+ cities mapped worldwide
- AI features: Gemini 3.0 translation (50+ languages), Imagen 3 poster generation
- Technology: React 19, PostGIS mapping, QR ticketing, automated payouts
- Current phase: Global expansion (Indiegogo campaign)
- Stats: ${totalUsers} users, ${totalEvents} events
- Recent features: ${recentFeatures}

**Target Company:**
- Name: ${prospect.name}
- Category: ${prospect.category}
- Description: ${prospect.description || 'N/A'}
- Website: ${prospect.website || 'N/A'}
- Country: ${prospect.country || 'N/A'}

**Your Contact Info:**
- Name: ${adminName} (Founder, EventNexus)
- Email: ${adminEmail}
- Phone: ${adminPhone}
- Website: www.eventnexus.eu

**Template Strategy:**
${template.ai_prompt || 'Create a professional, value-focused partnership proposal'}

**Subject Template (adapt to context):**
${template.subject_template}

**Body Template (adapt and personalize):**
${template.body_template}

**CRITICAL - Language & Grammar:**
⚠️ MANDATORY: Write ENTIRELY in ${languageName.toUpperCase()} language!
1. The ENTIRE email must be in ${languageName} - subject, body, all content
2. Use PERFECT ${languageName} grammar, spelling, and professional business language
3. NO English words or phrases (except: company names, EventNexus, product names, email addresses, URLs)
4. Use native ${languageName} expressions and idioms naturally
5. Translate ALL technical terms and benefits to ${languageName}
6. Use appropriate ${languageName} formal business tone

**Content Rules:**
- Start with "${greeting}," (or appropriate ${languageName} greeting)
- Personalize with "${prospect.name}" and their specific "${prospect.category}" work
- Show you researched them (mention their country/work)
- Lead with VALUE PROPOSITION not features:
  * If large venue/festival → emphasize 80% cost savings (1.5%-5% vs 10-15%)
  * If tourism/international → emphasize global reach and 50+ language translation
  * If agency/corporate → emphasize AI marketing automation and time savings
- Use concrete numbers: "1.5%-5% fees vs 10-15% industry standard", "1,169 cities", "50+ languages"
- Include 2-3 key benefits maximum (not a feature dump)
- Low-pressure call-to-action: "5-minute chat", "quick demo", "moment this week"
- Professional but warm tone (founder reaching out personally)
- Keep subject under 60 characters
- Keep body under 350 words (brevity = respect for their time)

**Pricing Communication (translate to ${languageName}):**
- Primary message: "Platform fees 1.5% - 5% (industry standard is 10-15%)"
- Secondary: "Up to 80% savings on ticketing fees"
- Tertiary: "Transparent pricing, no hidden costs"
DO NOT list all tier prices unless specifically relevant to template strategy.

**Signature Format:**
${closing},
${adminName}
Founder, EventNexus
${adminEmail}
${adminPhone}
www.eventnexus.eu
${adminPhone}

**Output JSON only:**
{
  "subject": "Professional subject line ENTIRELY in ${languageName}",
  "body": "Complete email ENTIRELY in ${languageName} with perfect grammar"
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

            // CRITICAL: Save to marketing_outreach IMMEDIATELY so webhook can find it
            // Using SERVICE_ROLE_KEY client to bypass RLS
            console.log('💾 Saving to marketing_outreach (bypass RLS)...');
            const { data: outreachData, error: outreachError } = await supabase
              .from('marketing_outreach')
              .insert({
                prospect_id: prospect.id,
                campaign_name: `AI Generated - ${new Date().toLocaleDateString()}`,
                subject: subject,
                body: body,
                language: language,
                status: 'sent',
                sent_at: new Date().toISOString(),
                ai_generated: true,
                personalization_data: {
                  email_id: emailId,
                  generated_at: new Date().toISOString(),
                  sent_via: 'edge_function'
                }
                // No created_by - let it be NULL (edge function doesn't have user context)
              })
              .select()
              .single();

            if (outreachError) {
              console.error('⚠️ Failed to save outreach record:', outreachError);
              console.error('Details:', { prospect_id: prospect.id, emailId });
            } else {
              console.log('✅ Outreach record saved:', outreachData?.id, 'email_id:', emailId);
            }

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
