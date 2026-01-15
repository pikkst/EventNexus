#!/bin/bash

# Test AI Crawler Detection in Sitemap
# This simulates different AI crawlers accessing the sitemap

SITEMAP_URL="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap"

echo "🤖 TESTING AI CRAWLER DETECTION"
echo "================================"
echo ""

# Test 1: ChatGPT
echo "1️⃣ Testing ChatGPT (GPTBot)..."
curl -s -A "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)" \
  "${SITEMAP_URL}?format=json" > /dev/null
echo "   ✅ Request sent with GPTBot user-agent"
echo ""

# Test 2: Claude
echo "2️⃣ Testing Claude (ClaudeBot)..."
curl -s -A "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" \
  "${SITEMAP_URL}?format=xml" > /dev/null
echo "   ✅ Request sent with ClaudeBot user-agent"
echo ""

# Test 3: Perplexity
echo "3️⃣ Testing Perplexity (PerplexityBot)..."
curl -s -A "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)" \
  "${SITEMAP_URL}?format=html" > /dev/null
echo "   ✅ Request sent with PerplexityBot user-agent"
echo ""

# Test 4: CommonCrawl
echo "4️⃣ Testing CommonCrawl (CCBot)..."
curl -s -A "CCBot/2.0 (https://commoncrawl.org/faq/)" \
  "${SITEMAP_URL}?format=json" > /dev/null
echo "   ✅ Request sent with CCBot user-agent"
echo ""

# Test 5: Google AI
echo "5️⃣ Testing Google AI (Google-Extended)..."
curl -s -A "Mozilla/5.0 (compatible; Google-Extended/1.0; +http://www.google.com/bot.html)" \
  "${SITEMAP_URL}?format=xml" > /dev/null
echo "   ✅ Request sent with Google-Extended user-agent"
echo ""

echo "================================"
echo "✅ ALL TESTS COMPLETED"
echo ""
echo "📊 CHECK RESULTS:"
echo "   1. Open Supabase Dashboard → SQL Editor"
echo "   2. Run this query:"
echo ""
echo "   SELECT"
echo "     metadata->>'ai_crawler' as crawler,"
echo "     metadata->>'path' as path,"
echo "     timestamp"
echo "   FROM analytics_events"
echo "   WHERE event_type = 'ai_crawler_visit'"
echo "   ORDER BY timestamp DESC"
echo "   LIMIT 10;"
echo ""
echo "   3. Open EventNexus → Admin → Analytics Dashboard"
echo "   4. Scroll to 'AI Crawler Activity' section"
echo "   5. You should see the test crawlers listed!"
echo ""
