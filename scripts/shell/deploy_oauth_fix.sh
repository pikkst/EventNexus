#!/bin/bash

# Facebook OAuth Fix Deployment Script
# This script deploys the OAuth callback fix to production

set -e  # Exit on error

echo "🚀 Deploying Facebook OAuth Fix..."
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch (currently on: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📋 Changes to deploy:"
echo "  ✅ Updated oauth-callback.html to handle both Auth and Social OAuth"
echo "  ✅ Updated services/dbService.ts with new callback URL"
echo "  ✅ Updated OAUTH_SETUP_GUIDE.md with complete instructions"
echo "  ✅ Updated check_oauth_setup.md checklist"
echo ""

echo "📦 Building production bundle..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🔧 Manual steps required:"
echo ""
echo "1️⃣  Facebook Developer Console:"
echo "   → https://developers.facebook.com/apps"
echo "   → Your EventNexus App → Facebook Login → Settings"
echo "   → Add to 'Valid OAuth Redirect URIs':"
echo "     • https://anlivujgkjmajkcgbaxw.supabase.co/auth/v1/callback"
echo "     • https://www.eventnexus.eu/oauth-callback.html"
echo "     • https://eventnexus.eu/oauth-callback.html"
echo "     • https://www.eventnexus.eu/EventNexus/"
echo "     • https://www.eventnexus.eu/"
echo "     • http://localhost:3000/"
echo ""
echo "2️⃣  Supabase Dashboard:"
echo "   → https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw"
echo "   → Authentication → URL Configuration → Redirect URLs"
echo "   → Add:"
echo "     • https://www.eventnexus.eu/oauth-callback.html"
echo "     • https://eventnexus.eu/oauth-callback.html"
echo "     • https://www.eventnexus.eu/EventNexus/#/profile"
echo "     • http://localhost:3000/#/profile"
echo ""
echo "3️⃣  Deploy to GitHub Pages:"
echo "   → git add ."
echo "   → git commit -m 'Fix Facebook OAuth redirect URLs'"
echo "   → git push origin main"
echo ""
echo "4️⃣  Test after deployment:"
echo "   → Visit https://www.eventnexus.eu"
echo "   → Click Login → Facebook"
echo "   → Should redirect to Facebook consent screen"
echo "   → After approval, should return to EventNexus /profile page"
echo ""
echo "📚 Documentation:"
echo "   → See OAUTH_SETUP_GUIDE.md for complete setup"
echo "   → See check_oauth_setup.md for troubleshooting checklist"
echo ""
echo "✨ Ready to deploy!"
