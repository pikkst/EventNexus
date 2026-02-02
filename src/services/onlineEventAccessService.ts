import { supabase } from './supabase';
import logger from '../utils/logger';

/**
 * Online Event Access Service
 * Validates user access to online/hybrid events
 */

export interface OnlineEventAccessResponse {
  hasAccess: boolean;
  canJoin: boolean;
  reason?: string;
  message: string;
  currentViewers?: number;
  maxViewers?: number | null;
  ticketInfo?: {
    id: string;
    type: string;
    used: boolean;
  };
}

/**
 * Check if user has access to online event
 * This should be called BEFORE showing the stream player
 */
export const checkOnlineEventAccess = async (
  eventId: string,
  markTicketUsed: boolean = false
): Promise<OnlineEventAccessResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        hasAccess: false,
        canJoin: false,
        reason: 'AUTHENTICATION_REQUIRED',
        message: 'Please sign in to access this event',
      };
    }

    const { data, error } = await supabase.functions.invoke('check-online-event-access', {
      body: { eventId, markTicketUsed },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      logger.error('Error checking online event access:', error);
      return {
        hasAccess: false,
        canJoin: false,
        reason: 'SERVER_ERROR',
        message: 'Failed to verify access',
      };
    }

    return data as OnlineEventAccessResponse;
  } catch (error) {
    logger.error('Error in checkOnlineEventAccess:', error);
    return {
      hasAccess: false,
      canJoin: false,
      reason: 'CLIENT_ERROR',
      message: error.message || 'An unexpected error occurred',
    };
  }
};

/**
 * Mark user as joined the stream
 * Creates a viewer session and marks ticket as used
 */
export const joinOnlineEvent = async (eventId: string): Promise<OnlineEventAccessResponse> => {
  return checkOnlineEventAccess(eventId, true);
};

/**
 * Leave online event stream
 * Marks the viewer session as inactive
 */
export const leaveOnlineEvent = async (eventId: string): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return;
    }

    // Mark all active sessions for this user and event as inactive
    const { error } = await supabase
      .from('live_stream_sessions')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (error) {
      logger.error('Error leaving online event:', error);
    }
  } catch (error) {
    logger.error('Error in leaveOnlineEvent:', error);
  }
};

/**
 * Get current viewer count for an event
 */
export const getCurrentViewers = async (eventId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_concurrent_viewers', {
      p_event_id: eventId,
    });

    if (error) {
      logger.error('Error getting viewer count:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    logger.error('Error in getCurrentViewers:', error);
    return 0;
  }
};

/**
 * Check if event has reached maximum capacity
 */
export const checkEventCapacity = async (
  eventId: string
): Promise<{
  canJoin: boolean;
  currentViewers: number;
  maxViewers: number | null;
  message: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('check_online_event_capacity', {
      p_event_id: eventId,
    });

    if (error) {
      logger.error('Error checking event capacity:', error);
      return {
        canJoin: false,
        currentViewers: 0,
        maxViewers: null,
        message: 'Failed to check capacity',
      };
    }

    const result = data?.[0];
    return {
      canJoin: result?.can_join || false,
      currentViewers: result?.current_viewers || 0,
      maxViewers: result?.max_viewers || null,
      message: result?.message || '',
    };
  } catch (error) {
    logger.error('Error in checkEventCapacity:', error);
    return {
      canJoin: false,
      currentViewers: 0,
      maxViewers: null,
      message: 'An unexpected error occurred',
    };
  }
};
