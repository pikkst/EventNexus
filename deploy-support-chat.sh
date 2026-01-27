#!/bin/bash

# Deploy AI Support Chat System
# This script deploys the Edge Function and runs migrations for the support chat system

set -e

echo "🚀 Deploying AI Support Chat System..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Run: supabase login"
    exit 1
fi

# Run migrations
echo "📊 Running database migrations..."
supabase db push

# Deploy Edge Function
echo "⚡ Deploying ai-support-chat Edge Function..."
supabase functions deploy ai-support-chat --no-verify-jwt

# Set secrets if not already set
echo "🔑 Checking environment variables..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY not set in environment"
    echo "   Set it with: supabase secrets set GEMINI_API_KEY=your_key_here"
else
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY" 2>/dev/null || echo "✅ GEMINI_API_KEY already set"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the chat widget on your landing page"
echo "   2. Monitor Edge Function logs: supabase functions logs ai-support-chat"
echo "   3. Add more knowledge base entries via Supabase dashboard"
echo "   4. (Optional) Generate embeddings for existing knowledge base entries"
echo ""
echo "🔗 Edge Function URL:"
supabase functions list | grep ai-support-chat || echo "   Run 'supabase functions list' to see URL"
