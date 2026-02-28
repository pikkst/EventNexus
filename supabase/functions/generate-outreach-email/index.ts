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
    country?: string;
    location?: string;
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
    const indiegogoUrl = varMap['indiegogo_url'] || 'https://www.indiegogo.com/projects/eventnexus/eventnexus-the-global-ai-powered-event-map';
    const lifetimeSlots = varMap['enterprise_lifetime_slots'] || '30';
    const lifetimePrice = varMap['enterprise_lifetime_price_eur'] || '950';
    const launchDatetime = varMap['indiegogo_launch_datetime'] || 'February 13 at 20:00 (EET)';

    const totalUsers = stats?.find((s: any) => s.stat_key === 'total_users')?.stat_value || '5+';
    const totalEvents = stats?.find((s: any) => s.stat_key === 'total_events')?.stat_value || '1600+';
    const canvaSeating = stats?.find((s: any) => s.stat_key === 'canva_seating_charts')?.stat_value || 'Canva-powered seating charts';
    const liveStreaming = stats?.find((s: any) => s.stat_key === 'live_streaming')?.stat_value || 'Unlimited live streaming';
    const prospectCountry = (prospect.country || '').toLowerCase();
    const prospectLocation = (prospect.location || '').toLowerCase();
    const isNorthAmerica = prospectCountry === 'united states' || prospectCountry === 'usa' || prospectCountry === 'canada';

    const formatLocalLaunchDatetime = (timeZone: string) => {
      const date = new Date('2026-02-13T20:00:00+02:00');
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(date);
      const map = parts.reduce<Record<string, string>>((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
      return `${map.month} ${map.day} at ${map.hour}:${map.minute} ${map.dayPeriod} ${map.timeZoneName}`;
    };

    const resolveNorthAmericaTimezone = () => {
      const lookup = [
        { match: ['los angeles', 'san francisco', 'seattle', 'portland', 'vancouver'], timeZone: 'America/Los_Angeles' },
        { match: ['phoenix', 'denver', 'calgary', 'edmonton'], timeZone: 'America/Denver' },
        { match: ['chicago', 'dallas', 'houston', 'austin', 'winnipeg'], timeZone: 'America/Chicago' },
        { match: ['new york', 'boston', 'toronto', 'montreal', 'ottawa', 'miami', 'atlanta', 'philadelphia', 'washington'], timeZone: 'America/New_York' },
        { match: ['halifax'], timeZone: 'America/Halifax' },
        { match: ['st. john', "st john"], timeZone: 'America/St_Johns' }
      ];

      for (const item of lookup) {
        if (item.match.some((keyword) => prospectLocation.includes(keyword))) {
          return item.timeZone;
        }
      }

      return 'America/New_York';
    };

    const launchDatetimeLocal = isNorthAmerica
      ? formatLocalLaunchDatetime(resolveNorthAmericaTimezone())
      : launchDatetime;
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
    
    // Build comprehensive platform context from database
    const platformFacts = stats?.reduce((acc: any, stat: any) => {
      acc[stat.stat_key] = stat.stat_value;
      return acc;
    }, {});

    const categoryLower = (prospect.category || '').toLowerCase();
    const prospectType = categoryLower.includes('festival')
      ? 'festival'
      : (categoryLower.includes('venue') || categoryLower.includes('arena') || categoryLower.includes('theatre') || categoryLower.includes('theater') || categoryLower.includes('concert') || categoryLower.includes('hall') || categoryLower.includes('stadium') || categoryLower.includes('mice') || categoryLower.includes('conference') || categoryLower.includes('convention'))
        ? 'venue'
        : 'general';

    const prompt = `You are Villu Künnap, founder of EventNexus, writing a personalized B2B partnership email.

**CRITICAL - NO LYING:**
⚠️ ONLY use FACTS from the platform data below. DO NOT invent or exaggerate features.
⚠️ If information is missing, DO NOT make it up - use general benefits instead.
⚠️ Translate ALL content accurately - no machine translation errors.

**About EventNexus (VERIFIED FACTS - Use these ONLY):**
- **Revolutionary AI-powered event platform** (Launched 2025)
- **Platform fees: 0% on ticket sales** (revenue from subscription plans only; Stripe processing fees of 2.9% + €0.25 still apply)
- **Cost savings: 100% on platform fees** compared to traditional ticketing platforms (industry standard 10-15%)
- **Global reach: ${platformFacts?.total_cities || '1,169+'}** cities mapped worldwide
- **AI features:** 
  * ${platformFacts?.ai_translation_model || 'Gemini 3.0'} translation (${platformFacts?.languages_supported || '50+'} languages)
  * ${platformFacts?.ai_image_model || 'Imagen 3'} poster generation
  * AI-powered event descriptions and social media content
- **Venue & streaming tools:**
  * ${canvaSeating}
  * ${liveStreaming}
- **Technology stack:**
  * React ${platformFacts?.react_version || '19'} + TypeScript
  * ${platformFacts?.map_provider || 'PostGIS + OpenStreetMap'} for geospatial search
  * ${platformFacts?.ticket_format || 'QR Code'} ticketing system
  * ${platformFacts?.payment_provider || 'Stripe Connect'} automated payouts
- **Current phase: ${platformFacts?.platform_phase || 'Beta Launch'}**
- **Platform statistics:**
  * ${platformFacts?.total_users || '5+'} active users
  * ${platformFacts?.total_events || '1,600+'} events created
  * Global expansion underway (Indiegogo campaign)
- **Indiegogo campaign constants (VERIFIED):**
  * Launch: ${launchDatetimeLocal}
  * Lifetime Enterprise spots: ${lifetimeSlots}
  * Lifetime Enterprise price: EUR ${lifetimePrice}
  * Campaign link: ${indiegogoUrl}
- **Recent platform updates (VERIFIED):**
${changelog?.map((c: any) => `  * ${c.title} (${c.version}) - ${c.description}`).join('\n') || '  * AI-powered marketing tools and automation'}

**ESTONIAN MARKET SPECIFICS (ONLY for Estonian prospects):**
${prospect.country === 'Estonia' || language === 'et' ? `
- Direct founder support via phone/WhatsApp (common in Estonian business culture)
- Local payment methods and Estonian language support
- Understanding of Estonian event landscape and regulations
- Preference for personal relationships over formal contracts
- Multi-channel communication (email + calls + WhatsApp acceptable)
` : ''}

**INTERNATIONAL MARKET APPROACH (non-Estonian):**
- Professional email-first communication
- Video call for demos (Zoom/Google Meet)
- Focus on scalability and automation
- Emphasis on global features and multi-language support

**Target Company:**
- Name: ${prospect.name}
- Category: ${prospect.category}
- Description: ${prospect.description || 'N/A'}
- Website: ${prospect.website || 'N/A'}
- Country: ${prospect.country || 'N/A'}
- Location: ${prospect.location || 'N/A'}
- Language: ${languageName}

**Your Contact Info:**
- Name: ${adminName} (Founder, EventNexus)
- Email: ${adminEmail}
- Phone: ${adminPhone}
- Website: www.eventnexus.eu
${prospect.country === 'Estonia' || language === 'et' ? `- WhatsApp: ${adminPhone} (preferred for quick questions)` : ''}

**Template Strategy:**
${template.ai_prompt || 'Create a professional, value-focused partnership proposal'}

**Skeleton Compliance (MANDATORY):**
- Follow the provided Subject and Body templates as the primary structure
- Keep key phrasing intact; only personalize placeholders and adapt minor wording for grammar
- Do not add new sections beyond the template's intent

**Timezone Rule (MANDATORY):**
- If the prospect is based in North America, convert the launch time from EET to their local timezone
- Use the local time in the email body (not EET)

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
6. Use appropriate ${languageName} formal business tone (Estonian: can use informal "sina" for startups, formal "teie" for corporates)

**Content Rules - TRUTHFULNESS:**
⚠️ CRITICAL: Use ONLY verified platform facts from above
- DO NOT invent features that aren't listed
- DO NOT exaggerate numbers beyond what's stated
- If uncertain about a claim, use general benefit language instead
- Cite specific numbers ONLY from verified facts (e.g., "1,169 cities", "0% platform fees")

**Content Rules - STRUCTURE:**
- Start with "${greeting}," (or appropriate ${languageName} greeting)
- Personalize with "${prospect.name}" and their specific "${prospect.category}" work
- Show you researched them (mention their country/work if relevant)
- Lead with VALUE PROPOSITION not features:
  * If large venue/festival → emphasize 0% platform fees on ticket sales — keep 100% of ticket revenue (vs industry standard 10-15%)
  * If tourism/international → emphasize global reach and ${platformFacts?.languages_supported || '50+'} language translation
  * If agency/corporate → emphasize AI marketing automation and time savings
- Context rule (mandatory):
  * If prospect is a venue → emphasize ${canvaSeating} and seating workflow
  * If prospect is a festival → emphasize AI translation and global discovery
  * Detected prospect type: ${prospectType}
- Use concrete verified numbers from platform facts
- Include 2-3 key benefits maximum (not a feature dump)
- Low-pressure call-to-action:
  ${prospect.country === 'Estonia' || language === 'et' ? `* Estonian prospects: "5-minute call/WhatsApp chat", "quick coffee meeting", "brief chat this week"` : `* International: "15-minute video call", "quick demo", "brief call this week"`}
- Professional but warm tone (founder reaching out personally)
- Keep subject under 60 characters
- Keep body under 350 words (brevity = respect for their time)

**Multi-Channel Communication (Estonian prospects ONLY):**
${prospect.country === 'Estonia' || language === 'et' ? `
- Mention WhatsApp/phone as alternative to email
- Suggest flexible communication method (their choice)
- Personal touch: offer coffee meeting if in same city
- Use casual professional tone (Estonian business culture)
` : `
- Email-first approach
- Offer video call for demo
- Professional formal tone
`}

**Pricing Communication (translate to ${languageName}):**
- Primary message: "0% platform fees on ticket sales — keep 100% of your ticket revenue (industry standard is 10-15%)"
- Secondary: "Revenue from subscription plans only; Stripe processing fees of 2.9% + €0.25 still apply"
- Tertiary: "Transparent pricing, no hidden costs"
DO NOT list all tier prices unless specifically relevant to template strategy.
- Include 2-3 key benefits maximum (not a feature dump)
- Low-pressure call-to-action: "5-minute chat", "quick demo", "moment this week"
- Professional but warm tone (founder reaching out personally)
- Keep subject under 60 characters
- Keep body under 350 words (brevity = respect for their time)

**Pricing Communication (translate to ${languageName}):**
- Primary message: "0% platform fees on ticket sales — keep 100% of your ticket revenue (industry standard is 10-15%)"
- Secondary: "Revenue from subscription plans only; Stripe processing fees of 2.9% + €0.25 still apply"
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

    const safeCountry = prospect.country || '';
    const safeLocation = prospect.location || prospect.country || '';

    // Replace any remaining placeholders (shouldn't happen, but just in case)
    subject = subject.replace(/\{contactName\}/gi, '');
    subject = subject.replace(/\{senderName\}/gi, adminName);
    subject = subject.replace(/\{companyName\}/gi, prospect.name);
    subject = subject.replace(/\{country\}/gi, safeCountry);
    subject = subject.replace(/\{location\}/gi, safeLocation);
    subject = subject.replace(/\{indiegogoUrl\}/gi, indiegogoUrl);
    subject = subject.replace(/\{lifetimePrice\}/gi, lifetimePrice);
    subject = subject.replace(/\{lifetimeSlots\}/gi, lifetimeSlots);
    subject = subject.replace(/\{launchDatetime\}/gi, launchDatetimeLocal);
    body = body.replace(/\{contactName\}/gi, '');
    body = body.replace(/\{senderName\}/gi, adminName);
    body = body.replace(/\{companyName\}/gi, prospect.name);
    body = body.replace(/\{category\}/gi, prospect.category);
    body = body.replace(/\{country\}/gi, safeCountry);
    body = body.replace(/\{location\}/gi, safeLocation);
    body = body.replace(/\{indiegogoUrl\}/gi, indiegogoUrl);
    body = body.replace(/\{lifetimePrice\}/gi, lifetimePrice);
    body = body.replace(/\{lifetimeSlots\}/gi, lifetimeSlots);
    body = body.replace(/\{launchDatetime\}/gi, launchDatetimeLocal);

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
