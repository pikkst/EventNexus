import { supabase } from './supabase';
import { SupportMessage, SupportThread } from '../types';
import logger from '../utils/logger';
import { translateDescription } from './geminiService';

export const fetchSupportThreads = async (): Promise<SupportThread[]> => {
  const { data, error } = await supabase
    .from('support_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('Failed to load support threads', error);
    return [];
  }

  return data || [];
};

export const fetchSupportMessages = async (threadId: string): Promise<SupportMessage[]> => {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to load support messages', error);
    return [];
  }

  return data || [];
};

export const postAdminMessage = async (
  threadId: string,
  content: string,
  adminId: string | undefined,
  userLanguage: string | undefined
): Promise<boolean> => {
  const { data, error } = await supabase.from('support_messages').insert({
    thread_id: threadId,
    author_type: 'admin',
    author_id: adminId || null,
    content_original: content,
    content_lang: 'et',
    translated_to_user: false
  }).select('id').single();

  if (error) {
    logger.error('Failed to post admin message', error);
    return false;
  }

  // Translate admin message back to the user's language so the client can display it
  if (data?.id && userLanguage) {
    try {
      const translated = await translateDescription(content, userLanguage);
      if (translated) {
        await supabase
          .from('support_messages')
          .update({ content_en: translated, translated_to_user: true })
          .eq('id', data.id);
      }
    } catch (err) {
      logger.warn('Admin reply translation failed (non-blocking)', err);
    }
  }

  const { error: updateError } = await supabase
    .from('support_threads')
    .update({
      status: 'assigned',
      assigned_admin_id: adminId || null,
      last_message_at: new Date().toISOString()
    })
    .eq('id', threadId);

  if (updateError) {
    logger.error('Failed to bump thread after admin reply', updateError);
  }

  return true;
};

export const assignThreadToAdmin = async (
  threadId: string,
  adminId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('support_threads')
    .update({ status: 'assigned', assigned_admin_id: adminId })
    .eq('id', threadId);

  if (error) {
    logger.error('Failed to assign support thread', error);
    return false;
  }

  return true;
};

export const closeSupportThread = async (threadId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('support_threads')
    .update({ status: 'closed' })
    .eq('id', threadId);

  if (error) {
    logger.error('Failed to close support thread', error);
    return false;
  }

  return true;
};
