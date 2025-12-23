/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './supabase/**/*.{ts,tsx}',
    './constants.tsx',
    './types.ts'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
