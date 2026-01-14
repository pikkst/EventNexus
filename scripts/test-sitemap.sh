#!/bin/bash

# Test script for sitemap-events Edge Function
# This script verifies that the sitemap-events function returns valid XML

echo "Testing sitemap-events Edge Function..."
echo "========================================"

# Test with curl
echo ""
echo "1. Fetching sitemap-events from Edge Function:"
response=$(curl -s -w "\n%{http_code}" "https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/sitemap-events")

# Split response and HTTP code
http_code=$(echo "$response" | tail -n1)
xml_content=$(echo "$response" | head -n-1)

echo "HTTP Status: $http_code"

if [ "$http_code" = "200" ]; then
  echo "✅ Function returned 200 OK"
  
  # Check if response contains valid XML
  if echo "$xml_content" | grep -q '<?xml version="1.0"'; then
    echo "✅ Response contains valid XML declaration"
  else
    echo "❌ Response does not contain valid XML declaration"
  fi
  
  # Check if response contains sitemap structure
  if echo "$xml_content" | grep -q '<urlset'; then
    echo "✅ Response contains urlset element"
  else
    echo "❌ Response does not contain urlset element"
  fi
  
  # Count number of URLs in sitemap
  url_count=$(echo "$xml_content" | grep -o '<loc>' | wc -l)
  echo "📊 Number of URLs in sitemap: $url_count"
  
  # Show sample URLs
  echo ""
  echo "Sample URLs:"
  echo "$xml_content" | grep '<loc>' | head -5
  
else
  echo "❌ Function returned HTTP $http_code"
fi

echo ""
echo "2. Checking robots.txt references:"
robots_response=$(curl -s "https://www.eventnexus.eu/robots.txt")
if echo "$robots_response" | grep -q "sitemap-index.xml"; then
  echo "✅ robots.txt correctly references sitemap-index.xml"
else
  echo "⚠️  robots.txt does not reference sitemap-index.xml"
fi

echo ""
echo "3. Verifying sitemap-index.xml:"
index_response=$(curl -s "https://www.eventnexus.eu/sitemap-index.xml")
if echo "$index_response" | grep -q "sitemap.xml"; then
  echo "✅ sitemap-index.xml references main sitemap"
fi
if echo "$index_response" | grep -q "sitemap-events"; then
  echo "✅ sitemap-index.xml references events sitemap"
fi
