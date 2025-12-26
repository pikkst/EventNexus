import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // CI/CD environments set these via process.env, local dev uses .env files
    // Priority: process.env first (for GitHub Actions), then loadEnv (for local .env)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    const ticketHashSecret = process.env.TICKET_HASH_SECRET || env.TICKET_HASH_SECRET || env.VITE_TICKET_HASH_SECRET;
    
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Explicitly define all env vars for build time replacement
        // Vite does NOT automatically read process.env.VITE_* in CI environments
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.TICKET_HASH_SECRET': JSON.stringify(ticketHashSecret),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'social-media': [
                './services/socialMediaService.ts',
                './services/socialAuthHelper.ts'
              ]
            }
          }
        }
      }
    };
});
