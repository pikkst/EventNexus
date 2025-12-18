import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // For non-VITE_ prefixed env vars, we need to explicitly define them
    const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    
    return {
      base: '/EventNexus/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Only define non-VITE_ prefixed env vars
        // Vite automatically exposes VITE_* env vars via import.meta.env
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
