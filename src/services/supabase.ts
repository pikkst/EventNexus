import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

// Trim values — Cloudflare dashboard can inject trailing newlines/spaces from copy-paste
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Runtime validation: anon key must only contain URL-safe base64 characters
if (!/^[A-Za-z0-9._-]+$/.test(supabaseAnonKey)) {
  console.error('[FATAL] VITE_SUPABASE_ANON_KEY contains invalid characters! Length:', supabaseAnonKey.length,
    'First 20 chars:', JSON.stringify(supabaseAnonKey.slice(0, 20)),
    'Last 5 chars:', JSON.stringify(supabaseAnonKey.slice(-5)));
}

// Clear corrupted/stale session data on initialization
if (typeof window !== 'undefined') {
  try {
    // Remove old Supabase key formats
    const oldKeys = ['sb-anlivujgkjmajkcgbaxw-auth-token', 'supabase.auth.token'];
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
    
    // On OAuth callback (?code= in URL), clear stale data.
    // Previous failed login attempts may have stored partial/corrupted tokens.
    // Also clear user cache so the component initializes with user=null,
    // allowing onAuthStateChange handlers (which check !user) to process.
    if (window.location.search.includes('code=')) {
      const authKey = 'eventnexus-auth-token';
      
      // Keep the code-verifier (needed for PKCE exchange) but nuke the session
      const existingSession = localStorage.getItem(authKey);
      if (existingSession) {
        console.warn('[AUTH] Clearing stale session before OAuth code exchange');
        localStorage.removeItem(authKey);
      }
      // Clear user cache so useState initializes user as null
      localStorage.removeItem('eventnexus-user-cache');
      sessionStorage.removeItem('eventnexus-notifications-cache');
      sessionStorage.removeItem('eventnexus-events-cache');
    }
  } catch (e) {
    console.warn('Could not clean session data:', e);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Let Supabase handle ?code= exchange internally during _initialize().
    // This avoids Navigator Lock contention between exchangeCodeForSession()
    // and onAuthStateChange() which both try to acquire the same exclusive lock.
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'eventnexus-auth-token',
    flowType: 'pkce',
    // Increase lock timeout to 30s — prevents timeout during OAuth redirects
    // (default 10s is too short when multiple tabs or slow network)
    lockAcquireTimeout: 30000,
    // Add debug mode to help diagnose OAuth issues
    debug: process.env.NODE_ENV === 'development',
  },
  global: {
    headers: {
      'X-Client-Info': 'eventnexus-web'
    }
  },
  // Disable inactivity timeout - admin pages with long-running operations need persistent sessions
  db: {
    schema: 'public',
  }
});

logger.log('Supabase client initialized successfully');

export default supabase;