// 🔧 CENTRAL DATE VALIDATOR
// Single source of truth for event date validation across all services

interface DateValidationResult {
  valid: boolean
  reason?: string
  details?: string
}

/**
 * Central date validator used by:
 * - parse-event-ai (extraction filter)
 * - rules-engine (validation)
 * - review queue
 * 
 * Ensures consistent date validation logic across entire pipeline
 */
export function validateEventDate(
  startDate: string | Date,
  cityTimezone: string = 'Europe/Tallinn'
): DateValidationResult {
  try {
    const eventDate = typeof startDate === 'string' ? new Date(startDate) : startDate
    
    // Check if date is valid
    if (isNaN(eventDate.getTime())) {
      return { 
        valid: false, 
        reason: 'invalid_date',
        details: `Date "${startDate}" is not a valid date`
      }
    }

    // Get current time in city timezone
    // Subtract 1 hour margin to avoid filtering events happening "right now"
    const now = new Date()
    const marginMs = 1 * 60 * 60 * 1000 // 1 hour
    const nowWithMargin = new Date(now.getTime() - marginMs)

    // Check if event is in the past
    if (eventDate < nowWithMargin) {
      return { 
        valid: false, 
        reason: 'past_event',
        details: `Event date ${eventDate.toISOString()} is before ${nowWithMargin.toISOString()}`
      }
    }

    // Check if event is within 30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const maxDate = new Date(now.getTime() + thirtyDaysMs)
    
    if (eventDate > maxDate) {
      return { 
        valid: false, 
        reason: 'too_far_future',
        details: `Event date ${eventDate.toISOString()} is beyond 30 days (after ${maxDate.toISOString()})`
      }
    }

    return { valid: true }
  } catch (error) {
    return { 
      valid: false, 
      reason: 'validation_error',
      details: `Error validating date: ${error.message}`
    }
  }
}

/**
 * Format date for Estonia/Tallinn timezone display
 */
export function formatEstoniaTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Tallinn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}
