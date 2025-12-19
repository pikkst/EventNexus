import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase configuration:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'set' : 'missing',
    key: supabaseAnonKey ? 'set' : 'missing'
  });
  throw new Error(
    'Supabase configuration error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
    'Add these secrets to your GitHub repository settings under Settings → Secrets and variables → Actions.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client initialized successfully');

export default supabase;