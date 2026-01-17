import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutreachRequest {
  prospect: {
    name: string;
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured in Supabase secrets');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prospect, template, language }: OutreachRequest = await req.json();

    // Get platform context
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

    const totalUsers = stats?.find((s: any) => s.stat_key === 'total_users')?.stat_value || '5+';
    const totalEvents = stats?.find((s: any) => s.stat_key === 'total_events')?.stat_value || '1600+';
    const platformPhase = 'Beta Launch';
    const recentFeatures = changelog?.slice(0, 3).map((c: any) => `${c.title} (${c.version})`).join(', ') || 'AI-powered features';

    // Generate email with Gemini
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
    
    const prompt = `You are a professional B2B marketing specialist writing a personalized partnership email for EventNexus.

**REAL PLATFORM DATA:**
- Platform Phase: ${platformPhase}
- Total Users: ${totalUsers}
- Total Events: ${totalEvents}
- Recent Features: ${recentFeatures}

**PROSPECT INFO:**
- Company: ${prospect.name}
- Category: ${prospect.category}
- Description: ${prospect.description || 'N/A'}
- Website: ${prospect.website || 'N/A'}

**EMAIL TEMPLATE:**
Subject: ${template.subject_template}
Body: ${template.body_template}

**AI INSTRUCTIONS:**
${template.ai_prompt || 'Generate professional, personalized B2B outreach email'}

**REQUIREMENTS:**
1. Write in ${language === 'et' ? 'Estonian' : 'English'} language
2. Personalize based on prospect's category and description
3. Use REAL platform stats (don't invent numbers)
4. Professional B2B tone, friendly but not casual
5. Clear call-to-action (meeting/demo request)
6. Keep subject under 60 characters
7. Keep body under 400 words

Output ONLY valid JSON:
{
  "subject": "Personalized email subject",
  "body": "Complete personalized email body"
}`;

    const geminiResponse = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI response was not valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        success: true,
        subject: parsed.subject || template.subject_template,
        body: parsed.body || template.body_template,
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
