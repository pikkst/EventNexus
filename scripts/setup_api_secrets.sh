#!/bin/bash

# EventNexus API Secrets Setup for Supabase
# 
# This script configures all API keys as Supabase Edge Function secrets
# instead of exposing them in client-side .env.local
#
# Usage: ./scripts/setup_api_secrets.sh

set -e

echo "🔐 Setting up EventNexus API secrets in Supabase..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Running login..."
    supabase login
fi

PROJECT_REF="anlivujgkjmajkcgbaxw"

echo "📋 Setting API secrets for project: $PROJECT_REF"
echo ""

# Gemini AI API Key
echo "🤖 Setting GEMINI_API_KEY..."
read -sp "Enter your Gemini API key: " GEMINI_KEY
echo ""
supabase secrets set GEMINI_API_KEY="$GEMINI_KEY" --project-ref $PROJECT_REF
echo "✅ GEMINI_API_KEY set"
echo ""

# Unsplash API Key
echo "📸 Setting UNSPLASH_ACCESS_KEY..."
read -sp "Enter your Unsplash access key: " UNSPLASH_KEY
echo ""
supabase secrets set UNSPLASH_ACCESS_KEY="$UNSPLASH_KEY" --project-ref $PROJECT_REF
echo "✅ UNSPLASH_ACCESS_KEY set"
echo ""

# Pexels API Key
echo "🎬 Setting PEXELS_API_KEY..."
read -sp "Enter your Pexels API key: " PEXELS_KEY
echo ""
supabase secrets set PEXELS_API_KEY="$PEXELS_KEY" --project-ref $PROJECT_REF
echo "✅ PEXELS_API_KEY set"
echo ""

# List all secrets (values hidden)
echo "📋 Current secrets:"
supabase secrets list --project-ref $PROJECT_REF

echo ""
echo "✅ All API secrets configured successfully!"
echo ""
echo "⚠️  IMPORTANT: Remove API keys from .env.local file"
echo "   Keep only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
echo ""
echo "Next steps:"
echo "1. Remove GEMINI_API_KEY, UNSPLASH_ACCESS_KEY, PEXELS_API_KEY from .env.local"
echo "2. Deploy Edge Functions: supabase functions deploy"
echo "3. Client code will call Edge Functions instead of direct API calls"
