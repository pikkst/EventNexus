#!/bin/bash

# Fix existing events with venue layouts
# This script applies the migration to update events that have venue layouts but missing flags

echo "🔧 Fixing existing events with venue layouts..."

# Apply the migration
supabase db push --file supabase/migrations/20260121_fix_existing_venue_layouts.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully updated existing events with venue layouts"
    echo ""
    echo "All events that had venue layouts now have:"
    echo "  - has_seating: true"
    echo "  - venue_layout_id: (set to the correct layout ID)"
    echo ""
    echo "The seat selector modal will now appear for these events."
else
    echo "❌ Failed to apply migration"
    echo "Please run this SQL manually in Supabase SQL Editor:"
    echo ""
    cat supabase/migrations/20260121_fix_existing_venue_layouts.sql
fi
