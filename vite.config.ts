import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Get git commit hash for build tracking
const getGitCommit = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const gitCommit = getGitCommit();
    
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
        'process.env.HUGGINGFACE_TOKEN': JSON.stringify(env.HUGGINGFACE_TOKEN || ''),
        'process.env.TICKET_HASH_SECRET': JSON.stringify(ticketHashSecret),
        'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 2500,
        sourcemap: false, // Disable sourcemaps for production (saves bandwidth)
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Only split truly independent heavy libraries
              if (id.includes('node_modules')) {
                // Large chart library (independent)
                if (id.includes('recharts')) {
                  return 'charts';
                }
                // QR Scanner (independent)
                if (id.includes('qr-scanner')) {
                  return 'qr';
                }
                // AI/Gemini (independent)
                if (id.includes('@google/generative-ai')) {
                  return 'ai';
                }
                // Don't split React, maps, or other React-dependent libs
                // Let Vite handle them automatically
              }
            }
          }
        },
        // Compression & optimization
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'console.trace']
          }
        }
      }
    };
});
