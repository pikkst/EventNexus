import { supabase } from './supabase';
import { EventNexusEvent, User, Notification } from '../types';

// Events
export const getEvents = async (): Promise<EventNexusEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return data || [];
};

export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data || [];
};

export const createEvent = async (event: Omit<EventNexusEvent, 'id'>): Promise<EventNexusEvent | null> => {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    return null;
  }
  
  return data;
};

export const updateEvent = async (id: string, updates: Partial<EventNexusEvent>): Promise<EventNexusEvent | null> => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating event:', error);
    return null;
  }
  
  return data;
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting event:', error);
    return false;
  }
  
  return true;
};

// Users
export const getUser = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data;
};

export const createUser = async (user: User): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  return data;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user:', error);
    return null;
  }
  
  return data;
};

// Notifications
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  
  return data || [];
};

export const createNotification = async (notification: Omit<Notification, 'id'> & { user_id: string }): Promise<Notification | null> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notification])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }
  
  return data;
};

export const markNotificationRead = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('notifications')
    .update({ isRead: true })
    .eq('id', id);
  
  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
  
  return true;
};

export const deleteNotification = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
  
  return true;
};

// Authentication helpers
export const signUpUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing up:', error);
    return { user: null, error };
  }
  
  return { user: data.user, error: null };
};

export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing in:', error);
    return { user: null, error };
  }
  
  return { user: data.user, error: null };
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  
  return true;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Tickets
export const getUserTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
  
  return data || [];
};

export const validateTicket = async (ticketId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('validate-ticket', {
      body: { ticketId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error validating ticket:', error);
    return null;
  }
};

// Platform statistics for admin using Edge Function
export const getPlatformStats = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('platform-stats', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    // Return minimal fallback data
    return {
      totalEvents: 0,
      totalUsers: 0,
      totalTickets: 0,
      totalRevenue: 0,
      monthlyGPV: '€0k',
      platformConversion: '0.0',
      creditPool: '0M',
      retentionRate: 0,
      globalFee: 2.5,
      revenueByTier: []
    };
  }
};

// Infrastructure monitoring using Edge Function
export const getInfrastructureStats = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('infrastructure-stats', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching infrastructure stats:', error);
    return {
      clusterUptime: 0,
      apiLatency: 0,
      dbConnections: 0,
      storageBurn: '0.0',
      protocolStatus: 'Offline',
      maintenanceMode: true,
      securityStatus: 'UNKNOWN',
      systemLogs: ['[ERROR] Unable to fetch system metrics.'],
      systemIntegrity: 'System monitoring unavailable.',
      lastUpdated: new Date().toISOString()
    };
  }
};

// Proximity radar using Edge Function
export const checkProximityRadar = async (userId: string, latitude: number, longitude: number) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('proximity-radar', {
      body: { userId, latitude, longitude },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking proximity radar:', error);
    return {
      success: false,
      nearbyEvents: [],
      newNotifications: [],
      totalNearby: 0,
      notificationsSent: 0
    };
  }
};