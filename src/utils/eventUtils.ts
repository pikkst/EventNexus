import { EventNexusEvent } from '../types';

/**
 * Check if an event has ended based on end_date/end_time or date/time
 * Returns true if the event's end time has passed
 */
export const isEventExpired = (event: EventNexusEvent): boolean => {
  const now = new Date();
  
  // Use end_date and end_time if available, otherwise use date and time
  const endDateStr = event.end_date || event.date;
  const endTimeStr = event.end_time || event.time;
  
  if (!endDateStr || !endTimeStr) {
    console.log(`⚠️ Event ${event.name}: No end date/time, considering NOT expired`);
    return false; // Can't determine if expired without date/time
  }
  
  // Parse event end date/time
  const eventEndDateTime = new Date(`${endDateStr}T${endTimeStr}`);
  
  // Event has expired if the end time is in the past
  const expired = eventEndDateTime < now;
  
  if (expired) {
    console.log(`❌ Event EXPIRED: ${event.name} (ended ${endDateStr} ${endTimeStr})`);
  } else {
    console.log(`✅ Event ACTIVE: ${event.name} (ends ${endDateStr} ${endTimeStr})`);
  }
  
  return expired;
};

/**
 * Filter out expired events from an array
 */
export const filterActiveEvents = (events: EventNexusEvent[]): EventNexusEvent[] => {
  console.log(`\n🔍 Filtering ${events.length} events for expiration...`);
  const active = events.filter(event => !isEventExpired(event));
  console.log(`✅ ${active.length} active events after filtering (${events.length - active.length} expired)\n`);
  return active;
};
