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

  // For human/admin modes, we need the Edge Function
  if (mode === 'human') {
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
      console.warn('Edge Function ai-support-chat error (human mode):', err);
      return {
        threadId: threadId || 'error',
        reply: 'Sorry, we could not connect to an admin right now. Please email support@mail.eventnexus.eu',
        translatedReply: 'Sorry, we could not connect to an admin right now. Please email support@mail.eventnexus.eu',
        mode: 'human',
        adminNotified: false
      };
    }
  }
  
  // For AI mode, attempt to use Gemini with smart fallback
  console.log('AI support mode: attempting local Gemini AI...');

  try {
    const { createNexusChat } = await import('./geminiService');
    
    // Wait a bit for Gemini to initialize if needed
    let retries = 0;
    let chat;
    
    while (retries < 5) {
      try {
        chat = createNexusChat({ userLanguage: language, platformContext: undefined });
        break;
      } catch (err: any) {
        retries++;
        if (retries >= 5) {
          // Give up on Gemini, use fallback message
          console.warn(`Gemini failed after ${retries} retries:`, err?.message);
          throw new Error('Gemini initialization failed');
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    if (!chat) throw new Error('Failed to create chat');
    
    const stream = await chat.sendMessageStream({ message });
    let text = '';
    for await (const chunk of stream) {
      text += chunk?.text || '';
    }
    
    return {
      threadId: threadId || 'local-ai',
      reply: text,
      translatedReply: text,
      mode: 'ai',
      adminNotified: false
    };
  } catch (err) {
    console.error('AI support: Gemini fallback failed:', err);
  }

  // Final fallback response when Gemini is unavailable
  const fallbackMessages: Record<string, string> = {
    'en': 'Thanks for your message! Our support team will review it shortly. For immediate help, please email support@mail.eventnexus.eu',
    'et': 'Täname teie sõnumi eest! Meie tugimeeskond vaatab selle varsti üle. Kiire abi saamiseks saatke e-kiri aadressile support@mail.eventnexus.eu',
    'de': 'Danke für Ihre Nachricht! Unser Support-Team wird sich in Kürze damit befassen. Für sofortige Hilfe senden Sie eine E-Mail an support@mail.eventnexus.eu'
  };

  const langCode = language?.toLowerCase().split('-')[0] || 'en';
  const reply = fallbackMessages[langCode] || fallbackMessages['en'];

  return {
    threadId: threadId || 'error',
    reply,
    translatedReply: reply,
    mode: 'ai',
    adminNotified: false
  };
};
