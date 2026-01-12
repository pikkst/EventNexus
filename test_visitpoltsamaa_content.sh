#!/bin/bash
# Fetch Visit Põltsamaa events page and see what HTML cleaning produces
curl -s "https://visitpoltsamaa.com/sundmused/" | \
  # Remove script and style tags
  sed -E 's|<script[^>]*>.*?</script>||gI' | \
  sed -E 's|<style[^>]*>.*?</style>||gI' | \
  # Remove ALL HTML tags
  sed -E 's|<[^>]+>| |g' | \
  # Normalize whitespace
  tr -s ' ' | \
  # Show first 2000 characters
  head -c 2000

echo ""
echo "=== FULL LENGTH ==="
curl -s "https://visitpoltsamaa.com/sundmused/" | \
  sed -E 's|<script[^>]*>.*?</script>||gI' | \
  sed -E 's|<style[^>]*>.*?</style>||gI' | \
  sed -E 's|<[^>]+>| |g' | \
  tr -s ' ' | wc -c
