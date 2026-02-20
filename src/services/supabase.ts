import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Clear any old/corrupted session data on initialization
if (typeof window !== 'undefined') {
  try {
    // Check for old session keys and clean them up
    const oldKeys = ['sb-anlivujgkjmajkcgbaxw-auth-token', 'supabase.auth.token'];
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        logger.debug('Removing old session key:', key);
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    logger.warn('Could not clean old session data:', e);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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