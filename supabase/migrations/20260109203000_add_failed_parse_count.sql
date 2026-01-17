-- Add failed_parse_count to event_sources to track sources that consistently return 0 events
-- Auto-deactivate sources after 3+ consecutive failed parses

ALTER TABLE event_sources
ADD COLUMN IF NOT EXISTS failed_parse_count INTEGER DEFAULT 0;

COMMENT ON COLUMN event_sources.failed_parse_count IS 'Count of consecutive times this source returned 0 events. Reset to 0 when events found. Auto-deactivate after 3+.';
