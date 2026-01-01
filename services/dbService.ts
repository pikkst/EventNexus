import { supabase } from './supabase';
import { EventNexusEvent, User, Notification } from '../types';

// Helper function to transform database event to EventNexusEvent
const transformEventFromDB = (dbEvent: any): EventNexusEvent => {
  return {
    id: dbEvent.id,
    name: dbEvent.name,
    category: dbEvent.category,
    description: dbEvent.description,
    aboutText: dbEvent.about_text || undefined,
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
    .is('archived_at', null)
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
    .is('archived_at', null)
    .eq('status', 'active')
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
  // Combine date and time into ISO timestamp
  let dateTimeISO: string;
  try {
    // Parse date and time strings into a proper ISO timestamp
    const dateStr = event.date; // e.g., "2025-02-15"
    const timeStr = event.time; // e.g., "18:00"
    
    // Combine date and time
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    dateTimeISO = new Date(dateTimeStr).toISOString();
    
    console.log('📅 Date conversion:', { input: `${dateStr} ${timeStr}`, output: dateTimeISO });
  } catch (error) {
    console.error('❌ Date parsing error:', error);
    throw new Error('Invalid date or time format');
  }
  
  // Transform to database schema
  const dbEvent: any = {
    name: event.name,
    description: event.description,
    about_text: event.aboutText || null,
    category: event.category,
    date: dateTimeISO, // Database expects TIMESTAMP WITH TIME ZONE
    time: event.time, // Keep original time string for display
    location: event.location,
    price: event.price,
    visibility: event.visibility,
    organizer_id: event.organizerId,
    image: event.imageUrl || null,
    attendees_count: event.attendeesCount || 0,
    max_capacity: event.maxAttendees || 100,
    status: 'active'
  };

  // Add end date/time if present
  if (event.end_date && event.end_time) {
    try {
      const endDateTimeStr = `${event.end_date}T${event.end_time}:00`;
      dbEvent.end_date = new Date(endDateTimeStr).toISOString();
      console.log('📅 End date conversion:', { input: `${event.end_date} ${event.end_time}`, output: dbEvent.end_date });
    } catch (error) {
      console.warn('⚠️ End date parsing error:', error);
      // Continue without end_date if parsing fails
    }
  }
  
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

// Safe delete - checks if tickets sold before deleting
export const canDeleteEvent = async (eventId: string): Promise<{ canDelete: boolean; ticketsSold: number; reason?: string }> => {
  try {
    // Check if any tickets have been sold
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid');

    if (error) {
      console.error('Error checking tickets:', error);
      return { canDelete: false, ticketsSold: 0, reason: 'Failed to check ticket status' };
    }

    const ticketCount = tickets?.length || 0;

    if (ticketCount > 0) {
      return { 
        canDelete: false, 
        ticketsSold: ticketCount, 
        reason: `Cannot delete: ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} already sold` 
      };
    }

    return { canDelete: true, ticketsSold: 0 };
  } catch (error) {
    console.error('Error in canDeleteEvent:', error);
    return { canDelete: false, ticketsSold: 0, reason: 'Unexpected error' };
  }
};

export const safeDeleteEvent = async (eventId: string): Promise<{ success: boolean; message: string }> => {
  const check = await canDeleteEvent(eventId);
  
  if (!check.canDelete) {
    return { success: false, message: check.reason || 'Cannot delete event' };
  }

  const deleted = await deleteEvent(eventId);
  
  if (deleted) {
    return { success: true, message: 'Event deleted successfully' };
  } else {
    return { success: false, message: 'Failed to delete event' };
  }
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
      console.error('Error fetching user:', error.message, error.code);
    
      // If user profile doesn't exist or RLS blocks access, try to ensure it exists
      if (error.code === 'PGRST116' || error.code === '42501' || error.message?.includes('406')) {
        console.log('🔧 User profile missing or inaccessible, attempting to create via RPC...');
        
        try {
          // Use the ensure_user_profile RPC function which has SECURITY DEFINER
          // This function returns VOID but creates the user profile
          const { error: rpcError } = await supabase
            .rpc('ensure_user_profile', { user_id: id });
          
          if (rpcError) {
            console.error('❌ RPC ensure_user_profile failed:', rpcError);
          } else {
            console.log('✅ User profile ensured via RPC');
            
            // Wait a moment for the insert to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fetch the user again now that it should exist
            const { data: fetchedUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', id)
              .single();
            
            if (!fetchError && fetchedUser) {
              console.log('✅ User profile fetched successfully after creation');
              const user = fetchedUser;
              // Apply same notification_prefs normalization
              if (!user.notification_prefs || typeof user.notification_prefs !== 'object') {
                user.notification_prefs = {
                  pushEnabled: true,
                  emailEnabled: true,
                  proximityAlerts: true,
                  alertRadius: 10,
                  interestedCategories: [],
                  notifyActiveEvents: true,
                  notifyUpcomingEvents: true,
                  upcomingEventWindow: 24,
                  minAvailableTickets: 1
                };
              }
              if (!Array.isArray(user.followed_organizers)) {
                user.followed_organizers = [];
              }
              user.followedOrganizers = user.followed_organizers;
              return user;
            }
          }
        } catch (rpcErr) {
          console.error('❌ RPC call exception:', rpcErr);
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
        interestedCategories: [],
        notifyActiveEvents: true,
        notifyUpcomingEvents: true,
        upcomingEventWindow: 24,
        minAvailableTickets: 1
      };
    } else {
      // Ensure interestedCategories is an array
      if (!Array.isArray(user.notification_prefs.interestedCategories)) {
        user.notification_prefs.interestedCategories = [];
      }
      // Set defaults for new fields if not present
      if (user.notification_prefs.notifyActiveEvents === undefined) {
        user.notification_prefs.notifyActiveEvents = true;
      }
      if (user.notification_prefs.notifyUpcomingEvents === undefined) {
        user.notification_prefs.notifyUpcomingEvents = true;
      }
      if (!user.notification_prefs.upcomingEventWindow) {
        user.notification_prefs.upcomingEventWindow = 24;
      }
      if (!user.notification_prefs.minAvailableTickets) {
        user.notification_prefs.minAvailableTickets = 1;
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

// Get all users (Admin only)
export const getUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUsers:', error);
    return [];
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
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    
    // Map camelCase frontend keys to snake_case database columns
    switch (key) {
      case 'agencySlug':
        dbUpdates.agency_slug = value;
        break;
      case 'subscriptionTier':
        dbUpdates.subscription_tier = value;
        break;
      case 'notificationPrefs':
        dbUpdates.notification_prefs = value;
        break;
      case 'agencyProfile':
        dbUpdates.agency_profile = value;
        break;
      case 'createdAt':
        dbUpdates.created_at = value;
        break;
      case 'updatedAt':
        dbUpdates.updated_at = value;
        break;
      case 'lastLogin':
        dbUpdates.last_login = value;
        break;
      case 'stripeCustomerId':
        dbUpdates.stripe_customer_id = value;
        break;
      case 'stripeAccountId':
        dbUpdates.stripe_account_id = value;
        break;
      case 'stripeSubscriptionId':
        dbUpdates.stripe_subscription_id = value;
        break;
      case 'subscriptionStatus':
        dbUpdates.subscription_status = value;
        break;
      default:
        // Keep other fields as-is (name, email, avatar, bio, location, branding, etc.)
        dbUpdates[key] = value;
    }
  }
  
  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
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
  isRead: dbNotif.isRead,
  metadata: dbNotif.metadata
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
  const allowedTypes = new Set(['proximity_radar', 'event_update', 'ticket_purchase', 'system', 'admin', 'contact_inquiry']);
  const safeType = allowedTypes.has(notification.type) ? notification.type : 'system';
  const payload = {
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    type: safeType,
    event_id: notification.eventId,
    sender_name: notification.senderName,
    isRead: notification.isRead,
    timestamp: notification.timestamp,
    metadata: notification.metadata
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

// OAuth authentication helpers
export const signInWithGoogle = async () => {
  try {
    // Construct proper redirect URL for GitHub Pages deployment with HashRouter
    const getRedirectUrl = () => {
      if (typeof window === 'undefined') return undefined;
      
      // For production - redirect to /#/profile (HashRouter format)
      if (window.location.origin.includes('eventnexus.eu')) {
        return 'https://www.eventnexus.eu/EventNexus/#/profile';
      }
      
      // For local development - use HashRouter format
      return `${window.location.origin}/#/profile`;
    };
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      console.error('Error signing in with Google:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Google OAuth error:', err);
    return { 
      data: null, 
      error: { message: err instanceof Error ? err.message : 'Failed to sign in with Google' } as any 
    };
  }
};

export const signInWithFacebook = async () => {
  try {
    // Construct proper redirect URL for GitHub Pages deployment
    const getRedirectUrl = () => {
      if (typeof window === 'undefined') return undefined;
      
      // For production - redirect to /profile
      if (window.location.origin.includes('eventnexus.eu')) {
        return 'https://www.eventnexus.eu/EventNexus/profile';
      }
      
      // For local development
      return `${window.location.origin}/profile`;
    };
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: getRedirectUrl(),
        scopes: 'email,public_profile'
      }
    });
    
    if (error) {
      console.error('Error signing in with Facebook:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Facebook OAuth error:', err);
    return { 
      data: null, 
      error: { message: err instanceof Error ? err.message : 'Failed to sign in with Facebook' } as any 
    };
  }
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
      event:event_id(
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
    .is('archived_at', null)  // Exclude archived tickets
    .order('purchase_date', { ascending: false });  // Use purchase_date for consistency
  
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
    // Try to get authenticated stats first (for admin users)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      // Admin users get detailed stats via Edge Function
      const { data, error } = await supabase.functions.invoke('platform-stats', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!error && data) {
        return data;
      }
    }

    // Public users get basic stats directly from database
    const { data, error } = await supabase.rpc('get_platform_statistics');
    
    if (error) {
      console.error('Platform stats RPC error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    // Return minimal fallback data
    return {
      totalEvents: 150,
      totalUsers: 2800,
      totalTickets: 4500,
      totalOrganizers: 85,
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

// Smart Proximity radar using enhanced Edge Function
export const checkProximityRadar = async (userId: string, latitude: number, longitude: number) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Use the new smart-proximity-radar function that includes active event notifications
    const { data, error } = await supabase.functions.invoke('smart-proximity-radar', {
      body: { userId, latitude, longitude },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking smart proximity radar:', error);
    return {
      success: false,
      nearbyEvents: [],
      activeEvents: [],
      upcomingEvents: [],
      newNotifications: [],
      summary: {
        totalNearby: 0,
        activeEvents: 0,
        upcomingEvents: 0,
        notificationsSent: 0
      }
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
    // Attempt to delete associated campaign image from Storage
    try {
      const { data: campaignRow } = await supabase
        .from('campaigns')
        .select('image_url')
        .eq('id', id)
        .single();

      const imageUrl = campaignRow?.image_url as string | undefined;
      const marker = '/storage/v1/object/public/campaign-images/';
      if (imageUrl && imageUrl.includes(marker)) {
        const objectPath = imageUrl.split('campaign-images/')[1];
        if (objectPath) {
          await supabase.storage.from('campaign-images').remove([objectPath]);
        }
      }
    } catch (storageCleanupError) {
      console.error('Warning: failed to delete campaign image from storage', storageCleanupError);
    }

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

// Success Stories CRUD
export const getSuccessStories = async (limit: number = 6, featuredOnly: boolean = false): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_success_stories', {
      p_limit: limit,
      p_featured_only: featuredOnly
    });

    if (error) {
      console.error('Error fetching success stories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSuccessStories:', error);
    return [];
  }
};

export const createSuccessStory = async (story: Omit<any, 'id' | 'created_at' | 'updated_at'>): Promise<any | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('success_stories')
      .insert({
        ...story,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating success story:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createSuccessStory:', error);
    return null;
  }
};

export const updateSuccessStory = async (id: string, updates: Partial<any>): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('success_stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating success story:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSuccessStory:', error);
    return null;
  }
};

export const deleteSuccessStory = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('success_stories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting success story:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSuccessStory:', error);
    return false;
  }
};

// Press Mentions CRUD
export const getPressMentions = async (limit: number = 10, featuredOnly: boolean = false): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_press_mentions', {
      p_limit: limit,
      p_featured_only: featuredOnly
    });

    if (error) {
      console.error('Error fetching press mentions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPressMentions:', error);
    return [];
  }
};

export const createPressMention = async (mention: Omit<any, 'id' | 'created_at' | 'updated_at'>): Promise<any | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('press_mentions')
      .insert({
        ...mention,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating press mention:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createPressMention:', error);
    return null;
  }
};

export const updatePressMention = async (id: string, updates: Partial<any>): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('press_mentions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating press mention:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updatePressMention:', error);
    return null;
  }
};

export const deletePressMention = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('press_mentions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting press mention:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePressMention:', error);
    return false;
  }
};

// Platform Media CRUD
export const getPlatformMedia = async (location: string = 'landing_demo', mediaType?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_platform_media', {
      p_location: location,
      p_media_type: mediaType || null
    });

    if (error) {
      console.error('Error fetching platform media:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPlatformMedia:', error);
    return [];
  }
};

export const getAllPlatformMedia = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('platform_media')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching all platform media:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllPlatformMedia:', error);
    return [];
  }
};

export const createPlatformMedia = async (media: Omit<any, 'id' | 'created_at' | 'updated_at'>): Promise<any | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('platform_media')
      .insert({
        ...media,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating platform media:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createPlatformMedia:', error);
    return null;
  }
};

export const updatePlatformMedia = async (id: string, updates: Partial<any>): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('platform_media')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating platform media:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updatePlatformMedia:', error);
    return null;
  }
};

export const deletePlatformMedia = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('platform_media')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting platform media:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePlatformMedia:', error);
    return false;
  }
};

/**
 * Contact Inquiries Management
 */

export interface ContactInquiry {
  id: string;
  organizer_id: string;
  from_name: string;
  from_email: string;
  subject: string | null;
  message: string;
  type: 'contact' | 'partnership';
  email_id: string | null;
  status: 'new' | 'read' | 'replied' | 'archived';
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
}

// Get all inquiries for an organizer
export const getContactInquiries = async (organizerId: string): Promise<ContactInquiry[]> => {
  try {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contact inquiries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getContactInquiries:', error);
    return [];
  }
};

// Get unread inquiry count
export const getUnreadInquiryCount = async (organizerId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', organizerId)
      .eq('status', 'new');

    if (error) {
      console.error('Error counting unread inquiries:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadInquiryCount:', error);
    return 0;
  }
};

// Mark inquiry as read
export const markInquiryAsRead = async (inquiryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contact_inquiries')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('id', inquiryId);

    if (error) {
      console.error('Error marking inquiry as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markInquiryAsRead:', error);
    return false;
  }
};

// Mark inquiry as replied
export const markInquiryAsReplied = async (inquiryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contact_inquiries')
      .update({ 
        status: 'replied',
        replied_at: new Date().toISOString()
      })
      .eq('id', inquiryId);

    if (error) {
      console.error('Error marking inquiry as replied:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markInquiryAsReplied:', error);
    return false;
  }
};

// Archive inquiry
export const archiveInquiry = async (inquiryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contact_inquiries')
      .update({ status: 'archived' })
      .eq('id', inquiryId);

    if (error) {
      console.error('Error archiving inquiry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in archiveInquiry:', error);
    return false;
  }
};

// Delete inquiry
export const deleteContactInquiry = async (inquiryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contact_inquiries')
      .delete()
      .eq('id', inquiryId);

    if (error) {
      console.error('Error deleting inquiry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteContactInquiry:', error);
    return false;
  }
};

// ============================================================================
// TICKET MANAGEMENT
// ============================================================================

import { Ticket, TicketTemplate, TicketVerification, EventTicketStats, OrganizerDashboardStats } from '../types';

// Get ticket templates for an event
export const getTicketTemplates = async (eventId: string): Promise<TicketTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching ticket templates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTicketTemplates:', error);
    return [];
  }
};

// Create ticket templates for an event
export const createTicketTemplates = async (
  eventId: string,
  templates: Partial<TicketTemplate>[]
): Promise<TicketTemplate[]> => {
  try {
    const templatesToInsert = templates.map(template => ({
      event_id: eventId,
      name: template.name,
      type: template.type,
      price: template.price || 0,
      quantity_total: template.quantity_total || 100,
      quantity_available: template.quantity_available || template.quantity_total || 100,
      quantity_sold: 0,
      description: template.description,
      sale_start: template.sale_start,
      sale_end: template.sale_end,
      valid_days: template.valid_days,
      includes: template.includes,
      is_active: true
    }));

    const { data, error } = await supabase
      .from('ticket_templates')
      .insert(templatesToInsert)
      .select();

    if (error) {
      console.error('Error creating ticket templates:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in createTicketTemplates:', error);
    throw error;
  }
};

// Update ticket template
export const updateTicketTemplate = async (
  templateId: string,
  updates: Partial<TicketTemplate>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ticket_templates')
      .update(updates)
      .eq('id', templateId);

    if (error) {
      console.error('Error updating ticket template:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateTicketTemplate:', error);
    return false;
  }
};

// Purchase ticket (calls Edge Function)
export const purchaseTicket = async (
  ticketTemplateId: string,
  userId: string,
  holderName: string,
  holderEmail: string,
  quantity: number = 1,
  metadata?: any
): Promise<{ success: boolean; tickets?: Ticket[]; message?: string }> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-ticket`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          ticket_template_id: ticketTemplateId,
          user_id: userId,
          holder_name: holderName,
          holder_email: holderEmail,
          quantity,
          metadata
        })
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error purchasing ticket:', error);
    return { success: false, message: 'Failed to purchase ticket' };
  }
};

// Get user tickets with enhanced data (via Edge Function)
export const getUserTicketsEnhanced = async (userId: string): Promise<Ticket[]> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-tickets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ user_id: userId })
      }
    );

    const result = await response.json();
    return result.tickets || [];
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
};

// Verify ticket (calls Edge Function)
export const verifyTicket = async (
  qrCode: string,
  eventId: string,
  verifierId: string
): Promise<{ success: boolean; ticket?: Ticket; message: string }> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-ticket`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          qr_code: qrCode,
          event_id: eventId,
          verifier_id: verifierId
        })
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return { success: false, message: 'Failed to verify ticket' };
  }
};

// Get organizer statistics
export const getOrganizerStats = async (
  organizerId: string,
  period: 'week' | 'month' | 'year' = 'month'
): Promise<{
  dashboard_stats: OrganizerDashboardStats;
  event_stats: EventTicketStats[];
  events: EventNexusEvent[];
} | null> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/organizer-stats`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          organizer_id: organizerId,
          period
        })
      }
    );

    if (!response.ok) {
      console.error('Error response from organizer-stats:', await response.text());
      return null;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching organizer stats:', error);
    return null;
  }
};

// Refund ticket
export const refundTicket = async (ticketId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error refunding ticket:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in refundTicket:', error);
    return false;
  }
};

// Cancel ticket
export const cancelTicket = async (ticketId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', ticketId);

    if (error) {
      console.error('Error cancelling ticket:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in cancelTicket:', error);
    return false;
  }
};

// Get ticket verifications for an event
export const getTicketVerifications = async (eventId: string): Promise<TicketVerification[]> => {
  try {
    const { data, error } = await supabase
      .from('ticket_verifications')
      .select('*')
      .eq('event_id', eventId)
      .order('verified_at', { ascending: false });

    if (error) {
      console.error('Error fetching verifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTicketVerifications:', error);
    return [];
  }
};

// ===========================
// CREDIT MANAGEMENT SYSTEM
// ===========================

export interface PromoCode {
  id: string;
  code: string;
  code_type: 'promo' | 'reward';
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  credit_amount: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  metadata: any;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: 'admin_grant' | 'code_redemption' | 'purchase' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  promo_code_id: string | null;
  performed_by: string | null;
  reason: string | null;
  metadata: any;
  created_at: string;
}

export interface CodeRedemption {
  id: string;
  promo_code_id: string;
  user_id: string;
  redeemed_at: string;
  credit_granted: number;
}

// Generate promo codes (Admin only)
export const generatePromoCodes = async (params: {
  codeType: 'promo' | 'reward';
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  creditAmount: number;
  maxUses?: number;
  validUntil?: string;
  count?: number;
  prefix?: string;
}): Promise<PromoCode[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-promo-codes', {
      body: params
    });

    if (error) {
      console.error('Error generating promo codes:', error);
      return [];
    }

    return data?.codes || [];
  } catch (error) {
    console.error('Error in generatePromoCodes:', error);
    return [];
  }
};

// Get all promo codes (Admin only)
export const getAllPromoCodes = async (): Promise<PromoCode[]> => {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promo codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllPromoCodes:', error);
    return [];
  }
};

// Get promo code statistics (Admin only)
export const getPromoCodeStats = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('promo_code_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promo code stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPromoCodeStats:', error);
    return [];
  }
};

// Update promo code status (Admin only)
export const updatePromoCodeStatus = async (
  codeId: string,
  isActive: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: isActive })
      .eq('id', codeId);

    if (error) {
      console.error('Error updating promo code:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updatePromoCodeStatus:', error);
    return false;
  }
};

// Delete promo code (Admin only)
export const deletePromoCode = async (codeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', codeId);

    if (error) {
      console.error('Error deleting promo code:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePromoCode:', error);
    return false;
  }
};

// Redeem promo code (User)
export const redeemPromoCode = async (
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string; credits_granted?: number; new_balance?: number }> => {
  try {
    const { data, error } = await supabase.rpc('redeem_promo_code', {
      p_user_id: userId,
      p_code: code
    });

    if (error) {
      console.error('Error redeeming promo code:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Error in redeemPromoCode:', error);
    return { success: false, error: 'Failed to redeem code' };
  }
};

// Admin grant credits to user
export const adminGrantCredits = async (
  userId: string,
  amount: number,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string; new_balance?: number }> => {
  try {
    const { data, error } = await supabase.rpc('admin_grant_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_admin_id: adminId
    });

    if (error) {
      console.error('Error granting credits:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Error in adminGrantCredits:', error);
    return { success: false, error: 'Failed to grant credits' };
  }
};

// Get credit transactions for a user
export const getCreditTransactions = async (userId: string): Promise<CreditTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCreditTransactions:', error);
    return [];
  }
};

// Get all credit transactions (Admin only)
export const getAllCreditTransactions = async (): Promise<CreditTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching all credit transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllCreditTransactions:', error);
    return [];
  }
};

// Get code redemptions for a user
export const getUserCodeRedemptions = async (userId: string): Promise<CodeRedemption[]> => {
  try {
    const { data, error } = await supabase
      .from('code_redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false });

    if (error) {
      console.error('Error fetching code redemptions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserCodeRedemptions:', error);
    return [];
  }
};

// Ticket Archive Functions

// Archive a ticket (soft delete - only available for completed events)
export const archiveTicket = async (
  ticketId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('archive_ticket', {
      p_ticket_id: ticketId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error archiving ticket:', error);
      return { success: false, message: error.message };
    }

    return data || { success: false, message: 'Unknown error occurred' };
  } catch (error) {
    console.error('Error in archiveTicket:', error);
    return { success: false, message: 'Failed to archive ticket' };
  }
};

// Restore an archived ticket
export const restoreTicket = async (
  ticketId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('restore_ticket', {
      p_ticket_id: ticketId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error restoring ticket:', error);
      return { success: false, message: error.message };
    }

    return data || { success: false, message: 'Unknown error occurred' };
  } catch (error) {
    console.error('Error in restoreTicket:', error);
    return { success: false, message: 'Failed to restore ticket' };
  }
};

// Get user's archived tickets
export const getArchivedTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      event:event_id(
        id,
        name,
        date,
        time,
        location,
        image
      )
    `)
    .eq('user_id', userId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching archived tickets:', error);
    return [];
  }
  
  return data || [];
};

// Event Archive Functions

// Archive an event (soft delete - only available for completed events)
export const archiveEvent = async (
  eventId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('archive_event', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error archiving event:', error);
      return { success: false, message: error.message };
    }

    return data || { success: false, message: 'Unknown error occurred' };
  } catch (error) {
    console.error('Error in archiveEvent:', error);
    return { success: false, message: 'Failed to archive event' };
  }
};

// Restore an archived event
export const restoreEvent = async (
  eventId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('restore_event', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error restoring event:', error);
      return { success: false, message: error.message };
    }

    return data || { success: false, message: 'Unknown error occurred' };
  } catch (error) {
    console.error('Error in restoreEvent:', error);
    return { success: false, message: 'Failed to restore event' };
  }
};

// Get organizer's archived events
export const getArchivedEvents = async (organizerId: string): Promise<EventNexusEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching archived events:', error);
    return [];
  }
  
  return (data || []).map(transformEventFromDB);
};

// Check if event is completed and cannot accept ticket purchases
export const isEventCompleted = async (eventId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_event_completed', {
      p_event_id: eventId
    });

    if (error) {
      console.error('Error checking event completion:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in isEventCompleted:', error);
    return false;
  }
};

// Manually trigger auto-archiving of completed events (admin function)
export const runAutoArchiveCompletedEvents = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('auto_archive_completed_events');

    if (error) {
      console.error('Error running auto-archive:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in runAutoArchiveCompletedEvents:', error);
    return 0;
  }
};
