import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple helper to translate text to a target language for admin readability
const translateText = async (text: string, targetLanguage: string, apiKey: string) => {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `Translate to ${targetLanguage}. Return only the translated text.\n\n${text}` }]
            }
          ]
        })
      }
    );

    if (!response.ok) return text;
    const data = await response.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return translated || text;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
};

interface SupportRequest {
  threadId?: string;
  message: string;
  language?: string;
  mode?: 'ai' | 'human';
  email?: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { threadId, message, language, mode, email, userId }: SupportRequest = await req.json();

    // Create or get thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const { data: newThread, error: threadError } = await supabase
        .from('support_threads')
        .insert({
          status: 'open',
          mode: mode || 'ai',
          user_id: userId || null,
          guest_email: email || null,
          language: language || 'en'
        })
        .select()
        .single();

      if (threadError) throw threadError;
      currentThreadId = newThread.id;
    }

    const adminLanguage = 'Estonian';

    // Translate visitor message for admin readability (store in content_en)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const translatedForAdmin = await translateText(message, adminLanguage, geminiApiKey);

    // Store visitor message with translated variant for admins
    await supabase.from('support_messages').insert({
      thread_id: currentThreadId,
      author_type: 'visitor',
      author_id: userId || null,
      content_original: message,
      content_en: translatedForAdmin,
      content_lang: language || 'unknown'
    });

    // Update thread timestamp
    await supabase
      .from('support_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', currentThreadId);

    if (mode === 'human') {
      // Human mode: notify admins via Realtime channel
      // Admins listening on 'support_presence' channel will see the new thread
      const { error: notifyError } = await supabase
        .from('support_threads')
        .update({ status: 'open', mode: 'human' })
        .eq('id', currentThreadId);

      if (notifyError) console.error('Admin notification failed:', notifyError);

      return new Response(
        JSON.stringify({
          threadId: currentThreadId,
          reply: `Thank you! An admin has been notified. We'll respond to ${email || 'your inquiry'} soon.`,
          mode: 'human',
          adminNotified: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI mode: call Gemini with platform context
    // Build platform context with RAG
    let ragContext = '';
    
    // Retrieve relevant knowledge base entries (simple keyword search for now)
    // TODO: Replace with semantic search using embeddings when ready
    const { data: knowledgeEntries } = await supabase
      .from('ai_knowledge_base')
      .select('title, body, tags')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(5);

    if (knowledgeEntries && knowledgeEntries.length > 0) {
      ragContext = '\n\nRelevant Knowledge Base:\n' + 
        knowledgeEntries.map((entry: any) => 
          `- ${entry.title}: ${entry.body}`
        ).join('\n');
    }

    const platformContext = `
You are NexusAI, the EventNexus support assistant.
Platform facts:
- Web platform at www.eventnexus.eu (browser-based, not a native app)
- Map-first discovery with geospatial search (PostGIS)
- Stripe payments, instant QR tickets, organizer payouts
- Roles: attendee, organizer/agency, admin
- AI tools: event descriptions, translations, marketing assets, ad images
- Multi-language support with auto-detection
- Free, Pro, Premium, and Enterprise subscription tiers
- Zero upfront listing costs for organizers
- Respond in ${language || 'English'}.
- Use concise, helpful answers and offer actionable next steps.
${ragContext}
`;

    // Fetch conversation history for context
    const { data: history } = await supabase
      .from('support_messages')
      .select('author_type, content_original')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory = (history || [])
      .map((msg: any) => `${msg.author_type}: ${msg.content_original}`)
      .join('\n');

    // Call Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: platformContext }]
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: conversationHistory
                    ? `Conversation history:\n${conversationHistory}\n\nLatest message: ${message}`
                    : message
                }
              ]
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const aiReply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not process your request right now.';

    // Store AI reply
    await supabase.from('support_messages').insert({
      thread_id: currentThreadId,
      author_type: 'ai',
      content_original: aiReply,
      content_lang: language || 'en'
    });

    return new Response(
      JSON.stringify({
        threadId: currentThreadId,
        reply: aiReply,
        translatedReply: aiReply,
        mode: 'ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ai-support-chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
