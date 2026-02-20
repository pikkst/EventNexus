import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
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
    
    // On OAuth callback (?code= in URL), clear any existing auth session.
    // Previous failed login attempts may have stored partial/corrupted tokens
    // that cause "Invalid value" errors in fetch headers.
    if (window.location.search.includes('code=')) {
      const authKey = 'eventnexus-auth-token';
      const verifierKey = `${authKey}-code-verifier`;
      
      // Keep the code-verifier (needed for PKCE exchange) but nuke the session
      const existingSession = localStorage.getItem(authKey);
      if (existingSession) {
        console.warn('[AUTH] Clearing stale session before OAuth code exchange');
        localStorage.removeItem(authKey);
      }
    }
  } catch (e) {
    console.warn('Could not clean session data:', e);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // We handle ?code= exchange explicitly in App.tsx loadInitialData
    // to avoid Navigator Lock race conditions with detectSessionInUrl
    detectSessionInUrl: false,
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