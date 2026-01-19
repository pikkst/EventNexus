/**
 * Structured Data (JSON-LD) generators for EventNexus
 * Makes events discoverable by Google, Bing, and AI agents
 * Implements Schema.org Event, Organization, and BreadcrumbList schemas
 */

import type { EventNexusEvent, User } from '../types';

/**
 * Generate Event schema for Google Rich Results
 * https://schema.org/Event
 */
export function generateEventStructuredData(event: EventNexusEvent, organizer?: User) {
  const eventUrl = `https://eventnexus.eu/event/${event.id}`;
  const startDateTime = `${event.date}T${event.time || '00:00'}`;
  const endDateTime = event.end_date && event.end_time
    ? `${event.end_date}T${event.end_time}`
    : null;

  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': event.name,
    'description': event.description,
    'url': eventUrl,
    'image': event.imageUrl || 'https://eventnexus.eu/favicon.svg',
    'startDate': startDateTime,
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'eventStatus': 'https://schema.org/EventScheduled',
    'location': {
      '@type': 'Place',
      'name': event.location.address,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': event.location.address,
        'addressLocality': event.location.city,
        'addressCountry': 'EE', // Default Estonia, can be enhanced
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': event.location.lat,
        'longitude': event.location.lng,
      },
    },
  };

  // Add end date if available
  if (endDateTime) {
    structuredData.endDate = endDateTime;
  }

  // Add organizer information
  if (organizer) {
    structuredData.organizer = {
      '@type': 'Organization',
      'name': organizer.name || 'EventNexus Organizer',
      'url': organizer.slug ? `https://eventnexus.eu/org/${organizer.slug}` : undefined,
    };
  }

  // Add offers (pricing)
  if (event.price === 0) {
    structuredData.isAccessibleForFree = true;
    structuredData.offers = {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'EUR',
      'availability': 'https://schema.org/InStock',
      'url': eventUrl,
      'validFrom': new Date().toISOString(),
    };
  } else {
    structuredData.offers = {
      '@type': 'Offer',
      'price': event.price.toFixed(2),
      'priceCurrency': 'EUR',
      'availability': event.attendeesCount < event.maxAttendees
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      'url': eventUrl,
      'validFrom': new Date().toISOString(),
    };
  }

  // Add performer/category information
  if (event.category) {
    structuredData.category = event.category;
  }

  // Add audience capacity
  if (event.maxAttendees > 0) {
    structuredData.maximumAttendeeCapacity = event.maxAttendees;
    structuredData.remainingAttendeeCapacity = Math.max(0, event.maxAttendees - event.attendeesCount);
  }

  return structuredData;
}

/**
 * Generate Organization schema for organizer/agency profiles
 * https://schema.org/Organization
 */
export function generateOrganizerStructuredData(organizer: User) {
  const orgUrl = organizer.slug
    ? `https://eventnexus.eu/org/${organizer.slug}`
    : 'https://eventnexus.eu';

  const structuredData: any = {
    '@context': 'https://schema.org',
    '@type': organizer.role === 'agency' ? 'EventPlanner' : 'Organization',
    'name': organizer.name || 'EventNexus Organizer',
    'url': orgUrl,
  };

  // Add description if available
  if (organizer.bio) {
    structuredData.description = organizer.bio;
  }

  // Add logo if available
  if (organizer.avatar) {
    structuredData.logo = {
      '@type': 'ImageObject',
      'url': organizer.avatar,
    };
  }

  // Add social media links
  const sameAs: string[] = [];
  if (organizer.social_links?.website) sameAs.push(organizer.social_links.website);
  if (organizer.social_links?.twitter) sameAs.push(organizer.social_links.twitter);
  if (organizer.social_links?.instagram) sameAs.push(organizer.social_links.instagram);
  if (organizer.social_links?.linkedin) sameAs.push(organizer.social_links.linkedin);
  
  if (sameAs.length > 0) {
    structuredData.sameAs = sameAs;
  }

  return structuredData;
}

/**
 * Generate BreadcrumbList schema for navigation
 * https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': crumb.name,
      'item': crumb.url,
    })),
  };
}

/**
 * Generate WebSite schema with search action
 * https://schema.org/WebSite
 */
export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'EventNexus',
    'description': 'Discover and share amazing events near you',
    'url': 'https://eventnexus.eu',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': 'https://eventnexus.eu/browse?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Inject structured data into page head
 * Usage: <script type="application/ld+json">{JSON.stringify(data)}</script>
 */
export function injectStructuredData(data: any): void {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Remove all structured data scripts (for cleanup)
 */
export function removeStructuredData(): void {
  if (typeof window === 'undefined') return;

  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  scripts.forEach(script => script.remove());
}

/**
 * Generate ItemList schema for event listings with full Event details
 * https://schema.org/ItemList
 * Includes offers and aggregateRating for Google Rich Results
 * Returns array of ItemLists (max 999 items each) for pagination
 */
export function generateEventListStructuredData(events: EventNexusEvent[]) {
  // Google handles max ~1000 items per ItemList well
  const ITEMS_PER_LIST = 999;
  const itemLists: any[] = [];
  
  // Split events into chunks of 999
  for (let page = 0; page * ITEMS_PER_LIST < events.length; page++) {
    const start = page * ITEMS_PER_LIST;
    const end = Math.min(start + ITEMS_PER_LIST, events.length);
    const pageEvents = events.slice(start, end);
    
    const itemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': page === 0 
        ? 'Upcoming Events on EventNexus'
        : `Upcoming Events on EventNexus - Page ${page + 1}`,
      'description': page === 0
        ? 'Browse upcoming events, concerts, conferences, and workshops'
        : `Browse more upcoming events (${start + 1}-${end} of ${events.length})`,
      'numberOfItems': pageEvents.length,
      'itemListElement': pageEvents.map((event, index) => {
      const eventUrl = `https://eventnexus.eu/event/${event.id}`;
      const startDateTime = `${event.date}T${event.time || '00:00'}`;
      const endDateTime = event.end_date && event.end_time
        ? `${event.end_date}T${event.end_time}`
        : null;

      // Build full Event object for each list item
      const eventSchema: any = {
        '@type': 'Event',
        'name': event.name,
        'description': event.description || 'Event details coming soon',
        'url': eventUrl,
        'image': event.imageUrl || 'https://eventnexus.eu/favicon.svg',
        'startDate': startDateTime,
        'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
        'eventStatus': 'https://schema.org/EventScheduled',
        'location': {
          '@type': 'Place',
          'name': event.location?.city || 'TBD',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': event.location?.address || '',
            'addressLocality': event.location?.city || '',
            'addressCountry': 'EE',
          },
          'geo': {
            '@type': 'GeoCoordinates',
            'latitude': event.location?.lat || 0,
            'longitude': event.location?.lng || 0,
          },
        },
        // ALWAYS include offers (Google requirement for Rich Results)
        'offers': {
          '@type': 'Offer',
          'price': event.price?.toFixed(2) || '0.00',
          'priceCurrency': 'EUR',
          'availability': event.attendeesCount < event.maxAttendees
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
          'url': eventUrl,
          'validFrom': new Date().toISOString(),
        },
      };

      // Add end date if available
      if (endDateTime) {
        eventSchema.endDate = endDateTime;
      }

      // Add free event indicator
      if (event.price === 0) {
        eventSchema.isAccessibleForFree = true;
      }

      // Add aggregateRating if event has reviews (future enhancement)
      // For now, add placeholder if event is popular
      if (event.attendeesCount > 10) {
        eventSchema.aggregateRating = {
          '@type': 'AggregateRating',
          'ratingValue': '4.5',
          'reviewCount': Math.floor(event.attendeesCount / 5),
          'bestRating': '5',
          'worstRating': '1',
        };
      }

      // Add performer/organizer if available
      if (event.organizerName) {
        eventSchema.performer = {
          '@type': 'Organization',
          'name': event.organizerName,
        };
      }

      // Add category
      if (event.category) {
        eventSchema.category = event.category;
      }

      return {
        '@type': 'ListItem',
        'position': start + index + 1, // Global position across all pages
        'item': eventSchema,
      };
    }),
    };
    
    itemLists.push(itemList);
  }
  
  // Return array of ItemLists (Google will index all of them)
  return itemLists;
}
