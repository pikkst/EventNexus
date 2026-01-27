import { supabase } from './supabase';
import { createNexusChat } from './geminiService';
import { SupportMode } from '../types';

interface SendSupportMessageParams {
  threadId?: string;
  message: string;
  language?: string;
  mode?: SupportMode;
  email?: string;
  userId?: string;
}

interface SupportReply {
  threadId?: string;
  reply?: string;
  translatedReply?: string;
  mode?: SupportMode;
  adminNotified?: boolean;
}

/**
 * Send a support message via Supabase Edge Function.
 * Falls back to direct Gemini chat if the function is unavailable.
 */
export const sendSupportMessage = async (params: SendSupportMessageParams): Promise<SupportReply> => {
  const { threadId, message, language, mode = 'ai', email, userId } = params;

  // Try Edge Function first (preferred for human handoff and logging)
  try {
    const { data, error } = await supabase.functions.invoke('ai-support-chat', {
      body: {
        threadId,
        message,
        language,
        mode,
        email,
        userId
      }
    });

    if (error) throw error;
    if (data) {
      return {
        threadId: data.threadId || threadId,
        reply: data.reply,
        translatedReply: data.translatedReply || data.reply,
        mode: (data.mode as SupportMode) || mode,
        adminNotified: data.adminNotified || mode === 'human'
      };
    }
  } catch (err) {
    console.warn('Edge Function ai-support-chat unavailable; falling back to direct Gemini.', err);
  }

  // Fallback: direct Gemini chat (AI-only, no admin handoff)
  try {
    const chat = createNexusChat({ userLanguage: language, platformContext: undefined });
    const stream = await chat.sendMessageStream({ message });
    let text = '';
    for await (const chunk of stream) {
      text += chunk?.text || '';
    }
    return {
      threadId: threadId || 'local-fallback',
      reply: text,
      translatedReply: text,
      mode: 'ai',
      adminNotified: false
    };
  } catch (err) {
    console.error('Support chat fallback failed:', err);
    return {
      threadId: threadId || 'error',
      reply: 'Sorry, we could not process your request right now.',
      translatedReply: 'Sorry, we could not process your request right now.',
      mode: 'ai',
      adminNotified: false
    };
  }
};
