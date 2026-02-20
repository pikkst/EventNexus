import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';

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
    // .trim() strips invisible characters from copy-paste in hosting dashboards
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
    const geminiApiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
    const ticketHashSecret = (process.env.TICKET_HASH_SECRET || env.TICKET_HASH_SECRET || env.VITE_TICKET_HASH_SECRET || '').trim();
    const adsenseLeftSlot = (process.env.VITE_ADSENSE_SLOT_LEFT || env.VITE_ADSENSE_SLOT_LEFT || '').trim();
    const adsenseRightSlot = (process.env.VITE_ADSENSE_SLOT_RIGHT || env.VITE_ADSENSE_SLOT_RIGHT || '').trim();
    
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        visualizer({
          filename: './dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap'
        })
      ],
      define: {
        // Explicitly define all env vars for build time replacement
        // Vite does NOT automatically read process.env.VITE_* in CI environments
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.TICKET_HASH_SECRET': JSON.stringify(ticketHashSecret),
        'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit),
        'import.meta.env.VITE_ADSENSE_SLOT_LEFT': JSON.stringify(adsenseLeftSlot),
        'import.meta.env.VITE_ADSENSE_SLOT_RIGHT': JSON.stringify(adsenseRightSlot),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        chunkSizeWarningLimit: 2500,
        sourcemap: false, // Disable sourcemaps for production (saves bandwidth)
        reportCompressedSize: true,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            manualChunks: {
              // Vendor libraries split for parallel loading
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-charts': ['recharts'],
              'vendor-geo': ['leaflet', 'react-leaflet'],
              'vendor-qr': ['qr-scanner', 'qrcode', 'jsqr'],
              'vendor-ai': ['@google/generative-ai', '@google/genai'],
              'vendor-supabase': ['@supabase/supabase-js'],
            },
            // Use descriptive chunk names for debugging
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
          }
        },
        // Compression & optimization
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: false, // Keep console.error/warn visible for debugging
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'console.trace', 'console.info'],
            passes: 3 // Multiple optimization passes
          },
          output: {
            comments: false
          }
        },
        // Enable CSS code splitting
        cssCodeSplit: true,
        // Modern module preload
        modulePreload: { polyfill: true }
      }
    };
});
