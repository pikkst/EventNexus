import { supabase } from './supabase';
import { EventNexusEvent, User, Notification } from '../types';

// Helper function to transform database event to EventNexusEvent
const transformEventFromDB = (dbEvent: any): EventNexusEvent => {
  return {
    id: dbEvent.id,
    name: dbEvent.name,
    category: dbEvent.category,
    description: dbEvent.description,
    date: dbEvent.date,
    time: dbEvent.time || '',
    location: dbEvent.location,
    price: dbEvent.price,
    visibility: dbEvent.visibility || 'public',
    organizerId: dbEvent.organizer_id,
    imageUrl: dbEvent.image || '',
    attendeesCount: dbEvent.attendees_count || 0,
    maxAttendees: dbEvent.max_capacity || 0,
    // Premium tier fields
    isFeatured: dbEvent.is_featured || false,
    customBranding: dbEvent.custom_branding || undefined,
    translations: dbEvent.translations || undefined
  };
};

// Events
export const getEvents = async (): Promise<EventNexusEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return (data || []).map(transformEventFromDB);
};

export const getOrganizerEvents = async (organizerId: string): Promise<EventNexusEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching organizer events:', error);
    return [];
  }
  
  return (data || []).map(transformEventFromDB);
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
  // Transform to database schema
  const dbEvent: any = {
    name: event.name,
    description: event.description,
    category: event.category,
    date: event.date, // Database expects separate date field (DATE type)
    time: event.time, // Database expects separate time field (TIME type)
    location: event.location,
    price: event.price,
    visibility: event.visibility,
    organizer_id: event.organizerId,
    image: event.imageUrl || null,
    attendees_count: event.attendeesCount || 0,
    max_capacity: event.maxAttendees || 100,
    status: 'active'
  };

  // Add Premium tier fields if present
  if (event.isFeatured !== undefined) {
    dbEvent.is_featured = event.isFeatured;
  }
  if (event.customBranding) {
    dbEvent.custom_branding = event.customBranding;
  }
  if (event.translations) {
    dbEvent.translations = event.translations;
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert([dbEvent])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    return null;
  }
  
  // Notify followers of the organizer
  try {
    // Get all users who follow this organizer
    // Use JSONB contains operator (@>) since followed_organizers is JSONB type
    const { data: followers, error: followersError } = await supabase
      .from('users')
      .select('id, name')
      .filter('followed_organizers', 'cs', `["${event.organizerId}"]`);
    
    if (!followersError && followers && followers.length > 0) {
      // Get organizer info for notification
      const { data: organizer } = await supabase
        .from('users')
        .select('name')
        .eq('id', event.organizerId)
        .single();
      
      // Create notifications for all followers
      const notifications = followers.map(follower => ({
        user_id: follower.id,
        title: 'New Event from Organizer You Follow',
        message: `${organizer?.name || 'An organizer'} just created "${event.name}". Check it out!`,
        type: 'new_event_from_followed',
        sender_name: organizer?.name || 'EventNexus',
        event_id: data.id,
        is_read: false,
        created_at: new Date().toISOString()
      }));
      
      await supabase
        .from('notifications')
        .insert(notifications);
    }
  } catch (notifError) {
    console.error('Error sending follower notifications:', notifError);
    // Don't fail event creation if notifications fail
  }
  
  return transformEventFromDB(data);
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

// Event Likes
export const likeEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('event_likes')
      .insert([{ user_id: userId, event_id: eventId }]);
    
    if (error) {
      console.error('Error liking event:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error liking event:', error);
    return false;
  }
};

export const unlikeEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('event_likes')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    
    if (error) {
      console.error('Error unliking event:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error unliking event:', error);
    return false;
  }
};

export const checkIfUserLikedEvent = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('event_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking like status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

export const getUserLikedEvents = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('event_likes')
      .select('event_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching liked events:', error);
      return [];
    }
    
    return (data || []).map(like => like.event_id);
  } catch (error) {
    console.error('Error fetching liked events:', error);
    return [];
  }
};

// Users
export const getUser = async (id: string): Promise<User | null> => {
  try {
    // Add timeout to prevent hanging - increased to 30 seconds due to slow DB
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('⏱️ getUser query timeout after 30 seconds');
        resolve(null);
      }, 30000); // Increased to 30 seconds
    });
    
    console.log('🔍 Fetching user profile:', id.substring(0, 8) + '...');
    const startTime = Date.now();
    
    const queryPromise = supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result === null) {
      const duration = Date.now() - startTime;
      console.error(`⚠️ Database query timed out after ${duration}ms. This may indicate a slow connection or database issue.`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ User profile loaded in ${duration}ms`);
    
    const { data, error } = result as any;
    
    if (error) {
      console.error('Error fetching user:', error.message);
    
      if (error.code === 'PGRST116') {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const newUser: User = {
            id: authUser.id,
            name: authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            role: 'attendee',
            subscription_tier: 'free',
            credits: 0,
            credits_balance: 0,
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
            return createdUser;
          }
        }
      }
      
      return null;
    }
    
    if (!data) return null;
    
    const user = data;
    
    // Ensure notification_prefs has proper structure
    if (!user.notification_prefs || typeof user.notification_prefs !== 'object') {
      user.notification_prefs = {
        pushEnabled: true,
        emailEnabled: true,
        proximityAlerts: true,
        alertRadius: 10,
        interestedCategories: []
      };
    } else {
      // Ensure interestedCategories is an array
      if (!Array.isArray(user.notification_prefs.interestedCategories)) {
        user.notification_prefs.interestedCategories = [];
      }
    }
    
    // Ensure followedOrganizers is an array
    if (!Array.isArray(user.followed_organizers)) {
      user.followed_organizers = [];
    }
    user.followedOrganizers = user.followed_organizers;
    
    return user;
  } catch (err) {
    console.error('Error in getUser:', err);
    return null;
  }
};

export const createUser = async (user: User): Promise<User | null> => {
  console.log('Creating user profile:', user.email);
  
  // Ensure both legacy and new credit fields are populated
  const payload = {
    ...user,
    credits_balance: user.credits_balance ?? user.credits ?? 0,
    credits: user.credits ?? user.credits_balance ?? 0
  };

  const { data, error } = await supabase
    .from('users')
    .insert([payload])
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

export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadAvatar:', error);
    return null;
  }
};

export const uploadBanner = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-banner-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading banner:', uploadError);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadBanner:', error);
    return null;
  }
};

export const uploadEventImage = async (eventId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${eventId}-${Date.now()}.${fileExt}`;
    const filePath = `event-images/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading event image:', uploadError);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadEventImage:', error);
    return null;
  }
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

export const getUserBySlug = async (slug: string): Promise<User | null> => {
  try {
    console.log('🔍 getUserBySlug: Searching for agency_slug:', slug);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('agency_slug', slug)
      .single();
    
    if (error) {
      console.error('❌ getUserBySlug: Error fetching user:', error.message, error.code);
      return null;
    }
    
    console.log('✅ getUserBySlug: Found user:', data ? {
      id: data.id,
      name: data.name,
      email: data.email,
      agency_slug: data.agency_slug,
      subscription_tier: data.subscription_tier
    } : 'NULL');
    
    return data;
  } catch (err) {
    console.error('Error in getUserBySlug:', err);
    return null;
  }
};

// Notifications
const transformNotificationFromDB = (dbNotif: any): Notification => ({
  id: dbNotif.id,
  title: dbNotif.title,
  message: dbNotif.message,
  type: dbNotif.type,
  eventId: dbNotif.event_id,
  senderName: dbNotif.sender_name,
  timestamp: dbNotif.timestamp,
  isRead: dbNotif.isRead
});

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
  
  return (data || []).map(transformNotificationFromDB);
};

export const createNotification = async (notification: Omit<Notification, 'id'> & { user_id: string }): Promise<Notification | null> => {
  const allowedTypes = new Set(['proximity_radar', 'event_update', 'ticket_purchase', 'system', 'admin']);
  const safeType = allowedTypes.has(notification.type) ? notification.type : 'system';
  const payload = {
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    type: safeType,
    event_id: notification.eventId,
    sender_name: notification.senderName,
    isRead: notification.isRead,
    timestamp: notification.timestamp
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert([payload])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }
  
  return transformNotificationFromDB(data);
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
  // First check if there's an existing session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  // If session exists, get the user
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
};

// Tickets
export const getUserTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:events!tickets_event_id_fkey(
        id,
        name,
        date,
        time,
        location,
        image
      )
    `)
    .eq('user_id', userId)
    .eq('payment_status', 'paid')  // Only return paid/confirmed tickets
    .order('purchase_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
  
  return data || [];
};

export const getTicketById = async (ticketId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:events!tickets_event_id_fkey(
        id,
        name,
        date,
        time,
        location,
        image
      )
    `)
    .eq('id', ticketId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching ticket by id:', error);
    return null;
  }

  return data || null;
};

export const validateTicket = async (qrCodeData: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('No active session found');
      throw new Error('Not authenticated - please sign in again');
    }

    const { data, error } = await supabase.functions.invoke('validate-ticket', {
      body: { qrCode: qrCodeData },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error validating ticket:', error);
    return { valid: false, error: error.message || 'Validation failed' };
  }
};

// Platform statistics for admin using Edge Function
export const getPlatformStats = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Pass authorization header explicitly to Edge Function
    const { data, error } = await supabase.functions.invoke('platform-stats', {
      body: {},
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('Platform stats error:', error);
      throw error;
    }
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
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Pass authorization header explicitly to Edge Function
    const { data, error } = await supabase.functions.invoke('infrastructure-stats', {
      body: {},
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('Infrastructure stats error:', error);
      throw error;
    }
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
      .update({ credits, credits_balance: credits })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user credits:', error);
    return false;
  }
};

/**
 * Add credits to a user's account
 */
export const addUserCredits = async (userId: string, amount: number): Promise<boolean> => {
  try {
    // Get current credits
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const newCredits = (user?.credits_balance || 0) + amount;
    
    const { error } = await supabase
      .from('users')
      .update({ credits_balance: newCredits })
      .eq('id', userId);
    
    if (error) throw error;
    
    console.log(`✅ Added ${amount} credits. New balance: ${newCredits}`);
    return true;
  } catch (error) {
    console.error('Error adding user credits:', error);
    return false;
  }
};

/**
 * Deduct credits from a user's account
 * Returns true if successful, false if insufficient credits or error
 */
export const deductUserCredits = async (userId: string, amount: number): Promise<boolean> => {
  try {
    // Get current credits
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentCredits = user?.credits_balance || 0;
    
    // Check if user has enough credits
    if (currentCredits < amount) {
      console.error('Insufficient credits:', { currentCredits, required: amount });
      return false;
    }
    
    const newCredits = currentCredits - amount;
    
    const { error } = await supabase
      .from('users')
      .update({ credits_balance: newCredits })
      .eq('id', userId);
    
    if (error) throw error;
    
    console.log(`✅ Deducted ${amount} credits. New balance: ${newCredits}`);
    return true;
  } catch (error) {
    console.error('Error deducting user credits:', error);
    return false;
  }
};

/**
 * Check if user has sufficient credits
 */
export const checkUserCredits = async (userId: string, requiredAmount: number): Promise<boolean> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return (user?.credits_balance || 0) >= requiredAmount;
  } catch (error) {
    console.error('Error checking user credits:', error);
    return false;
  }
};

/**
 * Get user's current credit balance
 */
export const getUserCredits = async (userId: string): Promise<number> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('credits, credits_balance')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    // Prefer credits_balance, fallback to legacy credits
    return user?.credits_balance ?? user?.credits ?? 0;
  } catch (error) {
    console.error('Error getting user credits:', error);
    return 0;
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
      sender_name: 'EventNexus Admin',
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

// Helper function to transform Campaign from camelCase to snake_case for database
const campaignToDbFormat = (campaign: Campaign): any => {
  const { imageUrl, trackingCode, ...rest } = campaign;
  return {
    ...rest,
    image_url: imageUrl,
    tracking_code: trackingCode,
  };
};

// Helper function to transform Campaign from snake_case to camelCase from database
const campaignFromDbFormat = (dbCampaign: any): Campaign => {
  const { image_url, tracking_code, ...rest } = dbCampaign;
  return {
    ...rest,
    imageUrl: image_url,
    trackingCode: tracking_code,
  };
};

export const getCampaigns = async (): Promise<Campaign[]> => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(campaignFromDbFormat);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
};

export const createCampaign = async (campaign: Campaign): Promise<Campaign | null> => {
  try {
    const dbCampaign = campaignToDbFormat(campaign);
    const { data, error } = await supabase
      .from('campaigns')
      .insert([dbCampaign])
      .select()
      .single();
    
    if (error) throw error;
    return data ? campaignFromDbFormat(data) : null;
  } catch (error) {
    console.error('Error creating campaign:', error);
    return null;
  }
};

export const updateCampaign = async (id: string, updates: Partial<Campaign>): Promise<Campaign | null> => {
  try {
    const dbUpdates = campaignToDbFormat(updates as Campaign);
    const { data, error } = await supabase
      .from('campaigns')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data ? campaignFromDbFormat(data) : null;
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

// Claim campaign incentive for a user
export const claimCampaignIncentive = async (userId: string, campaignId: string): Promise<{
  success: boolean;
  type?: string;
  value?: number;
  description?: string;
  error?: string;
} | null> => {
  try {
    const { data, error } = await supabase
      .rpc('claim_campaign_incentive', {
        p_user_id: userId,
        p_campaign_id: campaignId
      });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error claiming campaign incentive:', error);
    return null;
  }
};

// System Configuration
export const updateSystemConfig = async (key: string, value: any): Promise<boolean> => {
  try {
    // Convert value to JSONB format (wrap strings in quotes for JSONB)
    const jsonbValue = typeof value === 'string' ? JSON.stringify(value) : value;
    
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key, 
        value: jsonbValue, 
        updated_at: new Date().toISOString() 
      });
    
    if (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
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

// Financial Ledger
export interface FinancialTransaction {
  transaction_source: string;
  transaction_type: string;
  volume: string;
  status: string;
  amount_cents: number;
  created_at: string;
}

export const getFinancialLedger = async (): Promise<FinancialTransaction[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_financial_ledger');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching financial ledger:', error);
    return [];
  }
};

// Admin Inbox
export interface InboxMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  attachments: any[];
  status: 'unread' | 'read' | 'replied' | 'archived' | 'spam';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  replied_at: string | null;
  created_at: string;
}

export const getInboxMessages = async (status?: string): Promise<InboxMessage[]> => {
  try {
    let query = supabase
      .from('admin_inbox')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    return [];
  }
};

export const getInboxStats = async (): Promise<any> => {
  try {
    const { data, error } = await supabase.rpc('get_inbox_stats');
    
    if (error) throw error;
    return data || { total: 0, unread: 0, replied: 0, high_priority: 0 };
  } catch (error) {
    console.error('Error fetching inbox stats:', error);
    return { total: 0, unread: 0, replied: 0, high_priority: 0 };
  }
};

export const markInboxAsRead = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_inbox')
      .update({ status: 'read' })
      .eq('id', messageId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

export const replyToInboxMessage = async (messageId: string, replyBody: string): Promise<void> => {
  try {
    // Get the message details
    const { data: message, error: fetchError } = await supabase
      .from('admin_inbox')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Send reply via Edge Function
    const { data: { user } } = await supabase.auth.getUser();
    
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-email-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        to: message.from_email,
        subject: `Re: ${message.subject}`,
        body: replyBody,
        inReplyTo: message.message_id
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email reply');
    }
    
    // Update message status
    const { error: updateError } = await supabase
      .from('admin_inbox')
      .update({ 
        status: 'replied',
        replied_by: user?.id,
        replied_at: new Date().toISOString(),
        reply_body: replyBody
      })
      .eq('id', messageId);
    
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error replying to message:', error);
    throw error;
  }
};

export const deleteInboxMessage = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_inbox')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// ============================================
// Stripe Connect Functions
// ============================================

/**
 * Create or retrieve Stripe Connect account and get onboarding link
 */
export const createConnectAccount = async (userId: string, email: string): Promise<{ url: string; accountId: string } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-connect-account', {
      body: { userId, email, businessType: 'individual', country: 'EE' }
    });

    if (error) {
      console.error('Error creating Connect account:', error);
      return null;
    }

    return {
      url: data.url,
      accountId: data.accountId
    };
  } catch (error) {
    console.error('Error invoking create-connect-account:', error);
    return null;
  }
};

/**
 * Get Stripe Express Dashboard login link for organizer
 */
export const getConnectDashboardLink = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-connect-dashboard-link', {
      body: { userId }
    });

    if (error) {
      console.error('Error getting dashboard link:', error);
      return null;
    }

    return data.url;
  } catch (error) {
    console.error('Error invoking get-connect-dashboard-link:', error);
    return null;
  }
};

/**
 * Revenue Dashboard Interfaces
 */
export interface RevenueByEvent {
  event_id: string;
  event_name: string;
  event_date: string;
  tickets_sold: number;
  gross_revenue: number;
  subscription_tier: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  stripe_fee_amount: number;
  net_revenue: number;
  payout_status: 'pending' | 'processing' | 'paid';
  payout_date?: string;
}

export interface RevenueSummary {
  total_events: number;
  total_tickets_sold: number;
  total_gross: number;
  total_platform_fees: number;
  total_stripe_fees: number;
  total_net: number;
  pending_amount: number;
  paid_amount: number;
  subscription_tier: string;
}

/**
 * Get organizer revenue breakdown by event
 */
export const getOrganizerRevenue = async (organizerId: string): Promise<RevenueByEvent[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_organizer_revenue', { org_id: organizerId });

    if (error) {
      console.error('Error fetching organizer revenue:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOrganizerRevenue:', error);
    return [];
  }
};

/**
 * Get organizer revenue summary (totals)
 */
export const getOrganizerRevenueSummary = async (organizerId: string): Promise<RevenueSummary | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_organizer_revenue_summary', { org_id: organizerId });

    if (error) {
      console.error('Error fetching revenue summary:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in getOrganizerRevenueSummary:', error);
    return null;
  }
};

export interface AttendanceSummaryItem {
  event_id: string;
  name: string;
  date?: string;
  total_tickets: number;
  checked_in: number;
}

export const getOrganizerAttendanceSummary = async (organizerId: string): Promise<AttendanceSummaryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        event_id,
        status,
        event:events!inner(id, name, date, organizer_id)
      `)
      .eq('event.organizer_id', organizerId);

    if (error) {
      console.error('Error fetching attendance summary:', error);
      return [];
    }

    const summaryMap: Record<string, AttendanceSummaryItem> = {};

    (data || []).forEach((row: any) => {
      const ev = row.event;
      if (!ev) return;
      if (!summaryMap[ev.id]) {
        summaryMap[ev.id] = {
          event_id: ev.id,
          name: ev.name,
          date: ev.date,
          total_tickets: 0,
          checked_in: 0,
        };
      }
      summaryMap[ev.id].total_tickets += 1;
      if (row.status === 'used') {
        summaryMap[ev.id].checked_in += 1;
      }
    });

    return Object.values(summaryMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (error) {
    console.error('Error in getOrganizerAttendanceSummary:', error);
    return [];
  }
};

/**
 * Check if user has completed Stripe Connect onboarding
 */
export const checkConnectStatus = async (userId: string): Promise<{
  hasAccount: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking Connect status:', error);
      return null;
    }

    return {
      hasAccount: !!data.stripe_connect_account_id,
      onboardingComplete: data.stripe_connect_onboarding_complete || false,
      chargesEnabled: data.stripe_connect_charges_enabled || false,
      payoutsEnabled: data.stripe_connect_payouts_enabled || false,
    };
  } catch (error) {
    console.error('Error in checkConnectStatus:', error);
    return null;
  }
};

/**
 * Verify Stripe Connect onboarding completion and sync status with Stripe
 * This should be called when user returns from Stripe onboarding
 */
export const verifyConnectOnboarding = async (userId: string): Promise<{
  success: boolean;
  hasAccount: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
} | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-connect-onboarding', {
      body: { userId }
    });

    if (error) {
      console.error('Error verifying Connect onboarding:', error);
      return null;
    }

    return {
      success: data.success || false,
      hasAccount: data.hasAccount || false,
      onboardingComplete: data.onboardingComplete || false,
      chargesEnabled: data.chargesEnabled || false,
      payoutsEnabled: data.payoutsEnabled || false,
    };
  } catch (error) {
    console.error('Error invoking verify-connect-onboarding:', error);
    return null;
  }
};

// ============================================
// Beta Invitations
// ============================================

export interface BetaInvitation {
  id: string;
  code: string;
  email?: string;
  used_by?: string;
  redeemed_at?: string;
  status: 'active' | 'used' | 'expired';
  created_at: string;
  expires_at: string;
}

/**
 * Generate a batch of beta invitation codes
 */
export const generateBetaInvitations = async (count: number, expiryDays: number = 30): Promise<string[]> => {
  try {
    const codes: string[] = [];
    const now = new Date();
    const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    for (let i = 0; i < count; i++) {
      const code = `BETA-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      codes.push(code);
    }

    const invitations = codes.map(code => ({
      code,
      status: 'active',
      created_at: now.toISOString(),
      expires_at: expiryDate.toISOString()
    }));

    const { error } = await supabase
      .from('beta_invitations')
      .insert(invitations);

    if (error) throw error;

    console.log(`✅ Generated ${count} beta invitation codes`);
    return codes;
  } catch (error) {
    console.error('Error generating beta invitations:', error);
    return [];
  }
};

/**
 * Redeem a beta invitation code and give user credits + mark as beta tester
 */
export const redeemBetaInvitation = async (userId: string, code: string, creditsAmount: number = 1000): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if code exists and is valid
    const { data: invitation, error: fetchError } = await supabase
      .from('beta_invitations')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError || !invitation) {
      return { success: false, message: 'Invalid invitation code' };
    }

    if (invitation.status !== 'active') {
      return { success: false, message: 'This invitation code has already been used or expired' };
    }

    const now = new Date();
    if (new Date(invitation.expires_at) < now) {
      return { success: false, message: 'This invitation code has expired' };
    }

    // Mark invitation as used
    const { error: updateError } = await supabase
      .from('beta_invitations')
      .update({
        status: 'used',
        used_by: userId,
        redeemed_at: now.toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    // Add credits to user
    const creditsSuccess = await addUserCredits(userId, creditsAmount);

    // Mark user as beta tester
    const { error: betaError } = await supabase
      .from('users')
      .update({ is_beta_tester: true })
      .eq('id', userId);

    if (betaError) {
      console.error('Error marking user as beta tester:', betaError);
    }

    if (creditsSuccess) {
      return { 
        success: true, 
        message: `🎉 Welcome to the beta! You've received ${creditsAmount} credits and beta tester status!` 
      };
    } else {
      return { 
        success: false, 
        message: 'Code validated but failed to add credits. Please contact support.' 
      };
    }
  } catch (error) {
    console.error('Error redeeming beta invitation:', error);
    return { success: false, message: 'An error occurred while redeeming the code' };
  }
};

/**
 * Get all beta invitations for admin
 */
export const getBetaInvitations = async (): Promise<BetaInvitation[]> => {
  try {
    const { data, error } = await supabase
      .from('beta_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching beta invitations:', error);
    return [];
  }
};

/**
 * Get beta invitation stats for admin
 */
export const getBetaStats = async (): Promise<{
  total: number;
  active: number;
  used: number;
  expired: number;
  creditsDistributed: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('beta_invitations')
      .select('status');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      active: data?.filter(d => d.status === 'active').length || 0,
      used: data?.filter(d => d.status === 'used').length || 0,
      expired: data?.filter(d => d.status === 'expired').length || 0,
      creditsDistributed: (data?.filter(d => d.status === 'used').length || 0) * 1000
    };

    return stats;
  } catch (error) {
    console.error('Error fetching beta stats:', error);
    return { total: 0, active: 0, used: 0, expired: 0, creditsDistributed: 0 };
  }
};

/**
 * Revoke/Cancel a beta invitation
 */
export const revokeBetaInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('beta_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error revoking beta invitation:', error);
    return false;
  }
};

/**
 * Referral System Functions
 */

/**
 * Generate or get user's referral code
 */
export const generateReferralCode = async (userId: string): Promise<string> => {
  try {
    // Check if user already has a referral code
    const { data: existing } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (existing?.referral_code) {
      return existing.referral_code;
    }

    // Generate unique 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Update user with referral code
    const { error } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId);

    if (error) throw error;

    return code;
  } catch (error) {
    console.error('Error generating referral code:', error);
    return '';
  }
};

/**
 * Get user's referral statistics
 */
export const getUserReferralStats = async (userId: string): Promise<{
  code: string;
  totalReferrals: number;
  creditsEarned: number;
  pendingReferrals: number;
}> => {
  try {
    // Get or generate referral code
    const code = await generateReferralCode(userId);

    // Get total referrals
    const { data: referrals } = await supabase
      .from('users')
      .select('id, created_at')
      .eq('referred_by', userId);

    // Get credits earned from referrals
    const { data: creditTransactions } = await supabase
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'referral_bonus');

    const creditsEarned = creditTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Pending referrals (signed up but no first action yet)
    const { data: pending } = await supabase
      .from('users')
      .select('id')
      .eq('referred_by', userId)
      .is('first_action_at', null);

    return {
      code,
      totalReferrals: referrals?.length || 0,
      creditsEarned,
      pendingReferrals: pending?.length || 0
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return {
      code: '',
      totalReferrals: 0,
      creditsEarned: 0,
      pendingReferrals: 0
    };
  }
};

/**
 * Award first action bonus
 */
export const awardFirstActionBonus = async (
  userId: string,
  action: string,
  eventId?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('award-first-action-bonus', {
      body: { userId, action, eventId }
    });

    if (error) throw error;
    return data?.success || false;
  } catch (error) {
    console.error('Error awarding first action bonus:', error);
    return false;
  }
};

// Production Transition
export const transitionToproduction = async (
  stripePublicKey?: string,
  apiBaseUrl?: string,
  notes?: string
): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke(
      'production-transition',
      {
        body: {
          stripe_public_key: stripePublicKey,
          api_base_url: apiBaseUrl || 'https://www.eventnexus.eu',
          notes: notes || 'Admin-initiated production transition'
        }
      }
    );

    if (error) {
      console.error('Production transition error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error transitioning to production:', error);
    return null;
  }
};

export const getCurrentEnvironment = async (): Promise<Record<string, any>> => {
  try {
    const { data, error } = await supabase
      .from('environment_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return data || {};
  } catch (error) {
    console.error('Error fetching current environment:', error);
    return {};
  }
};

export const getProductionTransitionHistory = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc(
      'get_production_transition_history'
    );

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching production transition history:', error);
    return [];
  }
};

// ============================================================================
// ENTERPRISE MEDIA UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload media file to Enterprise storage bucket
 * Supports images and videos with automatic compression and validation
 */
export const uploadEnterpriseMedia = async (
  userId: string, 
  file: File, 
  purpose?: string
): Promise<string | null> => {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session');
      return null;
    }

    // Call Edge Function for upload
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        mimeType: file.type,
        bucket: 'enterprise-media',
        purpose: purpose,
        userId: userId
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Upload failed:', result.error);
      return null;
    }

    return result.url;
  } catch (error) {
    console.error('Error uploading enterprise media:', error);
    return null;
  }
};

/**
 * Upload event highlight media (image or video)
 */
export const uploadEventHighlight = async (
  userId: string,
  file: File,
  eventId?: string
): Promise<string | null> => {
  try {
    const base64 = await fileToBase64(file);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        mimeType: file.type,
        bucket: 'event-highlights',
        purpose: eventId ? `event-${eventId}` : 'highlight',
        userId: userId
      })
    });

    const result = await response.json();
    return result.success ? result.url : null;
  } catch (error) {
    console.error('Error uploading event highlight:', error);
    return null;
  }
};

/**
 * Upload team member avatar
 */
export const uploadTeamAvatar = async (
  userId: string,
  file: File,
  teamMemberId?: string
): Promise<string | null> => {
  try {
    const base64 = await fileToBase64(file);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        mimeType: file.type,
        bucket: 'team-avatars',
        purpose: teamMemberId ? `team-${teamMemberId}` : 'team',
        userId: userId
      })
    });

    const result = await response.json();
    return result.success ? result.url : null;
  } catch (error) {
    console.error('Error uploading team avatar:', error);
    return null;
  }
};

/**
 * Upload partner logo
 */
export const uploadPartnerLogo = async (
  userId: string,
  file: File,
  partnerId?: string
): Promise<string | null> => {
  try {
    const base64 = await fileToBase64(file);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        mimeType: file.type,
        bucket: 'partner-logos',
        purpose: partnerId ? `partner-${partnerId}` : 'partner',
        userId: userId
      })
    });

    const result = await response.json();
    return result.success ? result.url : null;
  } catch (error) {
    console.error('Error uploading partner logo:', error);
    return null;
  }
};

/**
 * Upload media outlet logo
 */
export const uploadMediaLogo = async (
  userId: string,
  file: File,
  outletName?: string
): Promise<string | null> => {
  try {
    const base64 = await fileToBase64(file);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        mimeType: file.type,
        bucket: 'media-logos',
        purpose: outletName ? `outlet-${outletName}` : 'media',
        userId: userId
      })
    });

    const result = await response.json();
    return result.success ? result.url : null;
  } catch (error) {
    console.error('Error uploading media logo:', error);
    return null;
  }
};

/**
 * Upload testimonial avatar
 */
export const uploadTestimonialAvatar = async (
  userId: string,
  file: File,
  testimonialId?: string
): Promise<string | null> => {
  try {
    const base64 = await fileToBase64(file);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        mimeType: file.type,
        bucket: 'testimonial-avatars',
        purpose: testimonialId ? `testimonial-${testimonialId}` : 'testimonial',
        userId: userId
      })
    });

    const result = await response.json();
    return result.success ? result.url : null;
  } catch (error) {
    console.error('Error uploading testimonial avatar:', error);
    return null;
  }
};

/**
 * Batch upload multiple files at once
 */
export const uploadMediaBatch = async (
  userId: string,
  files: File[],
  bucket: string,
  purpose?: string
): Promise<Array<{ fileName: string; url: string; success: boolean }>> => {
  try {
    // Convert all files to base64
    const filePromises = files.map(async (file) => ({
      file: await fileToBase64(file),
      fileName: file.name,
      mimeType: file.type,
      purpose: purpose
    }));

    const fileData = await Promise.all(filePromises);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/upload-media-batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: fileData,
        bucket: bucket,
        userId: userId
      })
    });

    const result = await response.json();
    return result.results || [];
  } catch (error) {
    console.error('Error in batch upload:', error);
    return [];
  }
};

/**
 * Get user's storage usage and quota
 */
export const getUserStorageInfo = async (userId: string): Promise<{
  used: number;
  quota: number;
  percentage: number;
} | null> => {
  try {
    const { data: usage, error: usageError } = await supabase.rpc(
      'get_user_storage_usage',
      { user_id: userId }
    );

    if (usageError) throw usageError;

    const { data: quota, error: quotaError } = await supabase.rpc(
      'get_user_storage_quota',
      { user_id: userId }
    );

    if (quotaError) throw quotaError;

    const usedBytes = usage || 0;
    const quotaBytes = quota || 0;
    const percentage = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

    return {
      used: usedBytes,
      quota: quotaBytes,
      percentage: Math.round(percentage * 100) / 100
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
};

/**
 * Get user's media uploads history
 */
export const getUserMediaUploads = async (
  userId: string,
  filters?: { bucket?: string; mediaType?: string; purpose?: string }
): Promise<any[]> => {
  try {
    let query = supabase
      .from('media_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (filters?.bucket) {
      query = query.eq('bucket_id', filters.bucket);
    }
    if (filters?.mediaType) {
      query = query.eq('media_type', filters.mediaType);
    }
    if (filters?.purpose) {
      query = query.eq('purpose', filters.purpose);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching media uploads:', error);
    return [];
  }
};

/**
 * Delete media file and tracking record
 */
export const deleteMediaFile = async (
  userId: string,
  filePath: string,
  bucket: string
): Promise<boolean> => {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      return false;
    }

    // Delete tracking record
    const { error: dbError } = await supabase
      .from('media_uploads')
      .delete()
      .eq('user_id', userId)
      .eq('file_path', filePath)
      .eq('bucket_id', bucket);

    if (dbError) {
      console.error('Error deleting tracking record:', dbError);
    }

    return true;
  } catch (error) {
    console.error('Error deleting media file:', error);
    return false;
  }
};

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Organizer Ratings
export interface OrganizerRatingStats {
  organizer_id: string;
  organizer_name: string;
  agency_slug: string;
  subscription_tier: string;
  total_ratings: number;
  avg_rating: number;
  weighted_score: number;
  events_rated: number;
}

export const getTopOrganizers = async (limit: number = 10, tier?: string): Promise<OrganizerRatingStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_top_organizers', {
      p_limit: limit,
      p_tier: tier || null
    });

    if (error) {
      console.error('Error fetching top organizers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTopOrganizers:', error);
    return [];
  }
};

export const submitOrganizerRating = async (
  organizerId: string,
  rating: number,
  eventId?: string,
  reviewText?: string,
  aspects?: {
    organization?: number;
    venue?: number;
    communication?: number;
    value?: number;
  }
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('rate-organizer', {
      body: {
        organizerId,
        eventId,
        rating,
        reviewText,
        aspects
      }
    });

    if (error) {
      console.error('Error submitting rating:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error in submitOrganizerRating:', error);
    return false;
  }
};

export const getOrganizerRatings = async (organizerId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('organizer_ratings')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizer ratings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getOrganizerRatings:', error);
    return [];
  }
};
