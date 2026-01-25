#!/bin/bash
# Deploy blog system fixes to Supabase

set -e

echo "🔧 Deploying blog system fixes..."
echo ""

# Deploy main recreation migration
echo "📦 Recreating blog tables with correct foreign keys..."
supabase db push --include-all

echo ""
echo "✅ Blog system fixes deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Test creating a blog post"
echo "2. Test publishing a blog post"
echo "3. Verify comments work correctly"
