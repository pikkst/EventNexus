import { supabase } from './supabase';
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
 * Admin/human modes require Edge Function (no local fallback).
 * AI mode only: falls back to direct Gemini if Edge Function unavailable.
 */
export const sendSupportMessage = async (params: SendSupportMessageParams): Promise<SupportReply> => {
  const { threadId, message, language, mode = 'ai', email, userId } = params;

  // Try Edge Function first (required for all modes)
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
    console.warn('Edge Function ai-support-chat error:', err);
    
    // For human/admin modes, don't fall back - Edge Function is required
    if (mode === 'human') {
      return {
        threadId: threadId || 'error',
        reply: 'Sorry, we could not connect to an admin right now. Please email support@mail.eventnexus.eu',
        translatedReply: 'Sorry, we could not connect to an admin right now. Please email support@mail.eventnexus.eu',
        mode: 'human',
        adminNotified: false
      };
    }
    
    // Only for AI mode, try local fallback
    console.warn('AI mode: attempting local Gemini fallback...');
  }

  // Fallback: direct Gemini chat (AI-only, no admin handoff)
  if (mode === 'ai') {
    try {
      const { createNexusChat } = await import('./geminiService');
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
      console.error('AI mode fallback failed:', err);
    }
  }

  // Final fallback response
  return {
    threadId: threadId || 'error',
    reply: 'Sorry, we could not process your request right now. Please try again or email support@mail.eventnexus.eu',
    translatedReply: 'Sorry, we could not process your request right now. Please try again or email support@mail.eventnexus.eu',
    mode: mode,
    adminNotified: false
  };
};
