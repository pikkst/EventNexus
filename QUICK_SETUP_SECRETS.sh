#!/bin/bash
# Quick setup script for ticket system secrets
# Run this to configure production secrets

set -e

echo "🎫 EventNexus Ticket System - Secret Setup"
echo "==========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Generate secure random secret
echo "🔐 Generating secure secret..."
SECRET=$(openssl rand -base64 32)
echo "✅ Generated: $SECRET"
echo ""

# Set in Supabase
echo "📡 Setting secret in Supabase Edge Functions..."
supabase secrets set TICKET_HASH_SECRET="$SECRET"

if [ $? -eq 0 ]; then
    echo "✅ Supabase secret set successfully"
else
    echo "❌ Failed to set Supabase secret"
    echo "   Make sure you're logged in: supabase login"
    exit 1
fi

echo ""
echo "📋 GitHub Actions Setup Instructions:"
echo "======================================"
echo ""
echo "1. Go to: https://github.com/pikkst/EventNexus/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: TICKET_HASH_SECRET"
echo "4. Value: $SECRET"
echo "5. Click 'Add secret'"
echo ""
echo "6. Then update your deploy.yml workflow to use it:"
echo ""
echo "   - name: Build with secrets"
echo "     env:"
echo "       TICKET_HASH_SECRET: \${{ secrets.TICKET_HASH_SECRET }}"
echo "       GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}"
echo "     run: npm run build"
echo ""
echo "7. Commit and push to trigger rebuild"
echo ""
echo "✅ Setup complete! Both secrets must use the same value."
echo ""

# Save secret to temporary file for reference
echo "$SECRET" > /tmp/ticket_secret.txt
echo "💾 Secret saved to /tmp/ticket_secret.txt for your reference"
echo "   Delete this file after adding to GitHub Actions!"
