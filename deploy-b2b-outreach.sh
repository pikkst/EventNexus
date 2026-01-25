#!/bin/bash
# =====================================================================
# B2B MARKETING OUTREACH DEPLOYMENT SCRIPT
# Deploys templates, CRM system, webhooks, and Edge Functions
# =====================================================================

set -e  # Exit on error

echo "========================================="
echo "🚀 B2B MARKETING OUTREACH DEPLOYMENT"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install it first:${NC}"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase. Run:${NC}"
    echo "   supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI ready${NC}"
echo ""

# Step 1: Deploy SQL migrations (templates + CRM)
echo "========================================="
echo "📊 STEP 1: Deploying Database Schemas"
echo "========================================="

echo "→ Deploying B2B Templates..."
supabase db push --include-all supabase/sql/b2b_templates_estonian.sql

echo "→ Deploying CRM Multi-Channel System..."
supabase db push --include-all supabase/sql/crm_multi_channel.sql

echo -e "${GREEN}✅ Database schemas deployed${NC}"
echo ""

# Step 2: Deploy Edge Functions
echo "========================================="
echo "⚡ STEP 2: Deploying Edge Functions"
echo "========================================="

echo "→ Deploying generate-outreach-email function..."
supabase functions deploy generate-outreach-email --no-verify-jwt

echo "→ Deploying resend-webhook function..."
supabase functions deploy resend-webhook --no-verify-jwt

echo "→ Deploying resend-reply-handler function..."
supabase functions deploy resend-reply-handler --no-verify-jwt

echo -e "${GREEN}✅ Edge Functions deployed${NC}"
echo ""

# Step 3: Configure Edge Function secrets
echo "========================================="
echo "🔐 STEP 3: Configuring Secrets"
echo "========================================="

echo -e "${YELLOW}⚠️  Manual step required:${NC}"
echo ""
echo "Set these secrets in Supabase Dashboard → Settings → Edge Functions:"
echo ""
echo "1. GEMINI_API_KEY - Your Google AI API key"
echo "2. RESEND_API_KEY - Your Resend API key"
echo "3. RESEND_WEBHOOK_SECRET - Resend webhook signing secret (optional)"
echo ""
echo "Or use CLI:"
echo "  supabase secrets set GEMINI_API_KEY=your_key_here"
echo "  supabase secrets set RESEND_API_KEY=your_key_here"
echo "  supabase secrets set RESEND_WEBHOOK_SECRET=your_secret_here"
echo ""
read -p "Press Enter when secrets are configured..."

# Step 4: Configure Resend Webhooks
echo ""
echo "========================================="
echo "🔗 STEP 4: Configure Resend Webhooks"
echo "========================================="

# Get Supabase project URL
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')

if [ -z "$PROJECT_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-detect project URL${NC}"
    echo "Get your project URL from: https://app.supabase.com/project/_/settings/api"
    read -p "Enter your Supabase project URL: " PROJECT_URL
fi

echo ""
echo -e "${GREEN}Your webhook endpoints:${NC}"
echo ""
echo "1. Email Events Webhook (tracking opens, clicks, bounces):"
echo "   ${PROJECT_URL}/functions/v1/resend-webhook"
echo ""
echo "2. Email Reply Handler (inbound emails):"
echo "   ${PROJECT_URL}/functions/v1/resend-reply-handler"
echo ""
echo -e "${YELLOW}Action Required:${NC}"
echo ""
echo "Configure these webhooks in Resend Dashboard:"
echo "  https://resend.com/settings/webhooks"
echo ""
echo "Webhook 1 - Email Events:"
echo "  URL: ${PROJECT_URL}/functions/v1/resend-webhook"
echo "  Events: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained"
echo ""
echo "Webhook 2 - Inbound Emails (if using Resend for replies):"
echo "  URL: ${PROJECT_URL}/functions/v1/resend-reply-handler"
echo "  Events: email.received"
echo ""
read -p "Press Enter when webhooks are configured..."

# Step 5: Test deployment
echo ""
echo "========================================="
echo "🧪 STEP 5: Testing Deployment"
echo "========================================="

echo "→ Testing database tables..."
supabase db execute --query "SELECT COUNT(*) FROM marketing_templates;" > /dev/null 2>&1 && echo -e "${GREEN}✅ marketing_templates table exists${NC}" || echo -e "${RED}❌ marketing_templates table missing${NC}"
supabase db execute --query "SELECT COUNT(*) FROM crm_interactions;" > /dev/null 2>&1 && echo -e "${GREEN}✅ crm_interactions table exists${NC}" || echo -e "${RED}❌ crm_interactions table missing${NC}"
supabase db execute --query "SELECT COUNT(*) FROM ai_platform_stats;" > /dev/null 2>&1 && echo -e "${GREEN}✅ ai_platform_stats table exists${NC}" || echo -e "${RED}❌ ai_platform_stats table missing${NC}"

echo ""
echo "→ Testing Edge Functions..."
curl -s "${PROJECT_URL}/functions/v1/resend-webhook" > /dev/null 2>&1 && echo -e "${GREEN}✅ resend-webhook is accessible${NC}" || echo -e "${RED}❌ resend-webhook not accessible${NC}"

echo ""
echo "========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Update template variables in Supabase Dashboard:"
echo "   → Go to Table Editor → template_variables"
echo "   → Update admin_phone, admin_whatsapp with real numbers"
echo ""
echo "2. Import Estonian prospects (CSV):"
echo "   → Use Marketing Outreach Manager in admin panel"
echo "   → Upload CSV with format: Name, Website, Category, Email, Description, Source"
echo ""
echo "3. Test email generation:"
echo "   → Select a prospect in admin panel"
echo "   → Choose template (Estonian/International)"
echo "   → Generate & send test email"
echo ""
echo "4. Monitor webhooks:"
echo "   → Check Resend Dashboard → Webhooks for delivery events"
echo "   → View CRM interactions in Marketing Outreach → Analytics"
echo ""
echo "5. For Estonian prospects:"
echo "   → Use WhatsApp/phone for follow-ups (preferred)"
echo "   → Log calls/messages in CRM interaction tracker"
echo ""
echo "========================================="
echo "📚 Documentation: docs/B2B_OUTREACH_GUIDE.md"
echo "========================================="
