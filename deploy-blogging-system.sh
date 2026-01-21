#!/bin/bash

# Deploy Blogging System to EventNexus
# Run from project root: bash deploy-blogging-system.sh

set -e

echo "🚀 Deploying Blogging System to EventNexus..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the project root."
  exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Error: Supabase CLI not installed. Install with: npm install -g supabase"
  exit 1
fi

echo -e "${BLUE}📊 Step 1: Running database migrations...${NC}"
cd supabase
if supabase db push; then
  echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Migration failed or already applied${NC}"
fi
cd ..

echo -e "${BLUE}📦 Step 2: Deploying Edge Function...${NC}"
if supabase functions deploy blog-operations; then
  echo -e "${GREEN}✅ Edge Function deployed${NC}"
else
  echo -e "${YELLOW}⚠️  Edge Function deployment failed${NC}"
fi

echo -e "${BLUE}🔧 Step 3: Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🏗️  Step 4: Building production bundle...${NC}"
npm run build

echo -e "${GREEN}✅ Blogging System Deployment Complete!${NC}"
echo ""
echo "🎉 Next steps:"
echo "   1. Test locally: npm run dev"
echo "   2. Navigate to /blog to see the blog list"
echo "   3. Navigate to /blog/new to create a post"
echo "   4. Check sitemap: visit /api/sitemap"
echo ""
echo "📖 Documentation: docs/BLOGGING_SYSTEM_IMPLEMENTATION.md"
