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
  console.log('Fetching user profile for ID:', id);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    console.error('Error details:', { code: error.code, message: error.message, details: error.details });
    
    // If user profile doesn't exist (PGRST116), try to get auth user info and create profile
    if (error.code === 'PGRST116') {
      console.log('User profile not found, attempting to create...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        console.log('Creating user profile from auth data:', authUser.email);
        const newUser: User = {
          id: authUser.id,
          name: authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          role: 'attendee',
          subscription_tier: 'free',
          credits: 0,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
          notification_prefs: {
            interestedCategories: [],
            alertRadius: 10,
            proximityAlerts: true,
            eventUpdates: true,
            ticketReminders: true
          }
        };
        
        const createdUser = await createUser(newUser);
        if (createdUser) {
          console.log('User profile created successfully:', createdUser.email);
          return createdUser;
        } else {
          console.error('Failed to create user profile');
        }
      }
    }
    
    return null;
  }
  
  console.log('User profile found:', data?.email, 'Role:', data?.role);
  return data;
};

export const createUser = async (user: User): Promise<User | null> => {
  console.log('Creating user profile:', user.email);
  
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user profile:', error);
    console.error('Error details:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return null;
  }
  
  console.log('User profile created:', data?.email);
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
  // Get the current origin for email confirmation redirect
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}#/profile`
    : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
    }
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

  // Check if email is confirmed
  if (data.user && !data.user.email_confirmed_at) {
    return { 
      user: null, 
      error: { 
        message: 'Please confirm your email address before logging in. Check your inbox for the confirmation link.',
        name: 'EmailNotConfirmed',
        status: 400
      } as any
    };
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

// ============================================
// Admin-specific Functions
// ============================================

// User Management
export const suspendUser = async (userId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: reason
      })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error suspending user:', error);
    return false;
  }
};

export const unsuspendUser = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        status: 'active',
        suspended_at: null,
        suspension_reason: null
      })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unsuspending user:', error);
    return false;
  }
};

export const banUser = async (userId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        status: 'banned',
        banned_at: new Date().toISOString(),
        ban_reason: reason
      })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error banning user:', error);
    return false;
  }
};

export const updateUserCredits = async (userId: string, credits: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ credits })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user credits:', error);
    return false;
  }
};

export const updateUserSubscription = async (userId: string, tier: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ subscription_tier: tier })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
};

// Broadcast Notifications
export const broadcastNotification = async (
  title: string,
  message: string,
  targetRole?: 'all' | 'organizers' | 'attendees'
): Promise<number> => {
  try {
    // Get target users based on role filter
    let query = supabase.from('users').select('id');
    
    if (targetRole === 'organizers') {
      query = query.eq('role', 'organizer');
    } else if (targetRole === 'attendees') {
      query = query.eq('role', 'attendee');
    }
    
    const { data: users, error: userError } = await query;
    if (userError) throw userError;
    
    if (!users || users.length === 0) return 0;
    
    // Create notifications for all target users
    const notifications = users.map(user => ({
      user_id: user.id,
      title,
      message,
      type: 'system',
      isRead: false,
      timestamp: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (error) throw error;
    return users.length;
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return 0;
  }
};

// Campaign Management
export interface Campaign {
  id?: string;
  title: string;
  copy: string;
  status: 'Active' | 'Draft' | 'Paused' | 'Completed';
  placement: 'landing_page' | 'dashboard' | 'both';
  target: 'attendees' | 'organizers' | 'all';
  cta: string;
  imageUrl?: string;
  trackingCode: string;
  incentive?: {
    type: 'credits' | 'discount' | 'free_ticket';
    value: number;
    limit: number;
    redeemed: number;
  };
  metrics?: {
    views: number;
    clicks: number;
    guestSignups: number;
    proConversions: number;
    revenueValue: number;
  };
  tracking?: {
    sources: {
      facebook: number;
      x: number;
      instagram: number;
      direct: number;
    };
  };
  created_at?: string;
  updated_at?: string;
}

export const getCampaigns = async (): Promise<Campaign[]> => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
};

export const createCampaign = async (campaign: Campaign): Promise<Campaign | null> => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([campaign])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating campaign:', error);
    return null;
  }
};

export const updateCampaign = async (id: string, updates: Partial<Campaign>): Promise<Campaign | null> => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating campaign:', error);
    return null;
  }
};

export const deleteCampaign = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return false;
  }
};

// System Configuration
export const updateSystemConfig = async (key: string, value: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('system_config')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating system config:', error);
    return false;
  }
};

export const getSystemConfig = async (): Promise<Record<string, any>> => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value');
    
    if (error) throw error;
    
    const config: Record<string, any> = {};
    data?.forEach(item => {
      config[item.key] = item.value;
    });
    
    return config;
  } catch (error) {
    console.error('Error fetching system config:', error);
    return {};
  }
};