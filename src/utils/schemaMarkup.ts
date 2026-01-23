/**
 * Schema.org Markup Generation Utilities
 * Generates comprehensive JSON-LD structured data for events to qualify for Google Event Pack
 */

import { EventNexusEvent } from '../types';

export interface EventSchemaMarkup {
  '@context': string;
  '@type': 'Event';
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  eventStatus: string;
  eventAttendanceMode: string;
  location: {
    '@type': 'Place';
    name: string;
    address: {
      '@type': 'PostalAddress';
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
    geo?: {
      '@type': 'GeoCoordinates';
      latitude: number;
      longitude: number;
    };
  };
  image?: string[];
  organizer?: {
    '@type': 'Organization' | 'Person';
    name: string;
    url?: string;
  };
  offers?: {
    '@type': 'Offer';
    url: string;
    price: string;
    priceCurrency: string;
    availability: string;
    validFrom: string;
  }[];
  performer?: {
    '@type': 'Person' | 'PerformingGroup';
    name: string;
  }[];
}

/**
 * Generate comprehensive Event Schema.org JSON-LD markup
 */
export function generateEventSchema(event: EventNexusEvent, baseUrl: string = 'https://www.eventnexus.eu'): EventSchemaMarkup {
  const eventUrl = `${baseUrl}/event/${event.id}`;
  
  // Determine event status
  const now = new Date();
  const eventDate = new Date(event.date);
  const eventStatus = eventDate < now ? 'https://schema.org/EventPostponed' : 'https://schema.org/EventScheduled';
  
  // Build location object
  const location: EventSchemaMarkup['location'] = {
    '@type': 'Place',
    name: event.venue || event.location || 'To Be Announced',
    address: {
      '@type': 'PostalAddress',
      addressLocality: event.location || undefined,
      addressCountry: event.country || undefined,
    }
  };

  // Add coordinates if available
  if (event.latitude && event.longitude) {
    location.geo = {
      '@type': 'GeoCoordinates',
      latitude: event.latitude,
      longitude: event.longitude
    };
  }

  // Build offers array for ticketing
  const offers: EventSchemaMarkup['offers'] = [];
  if (event.price !== undefined) {
    offers.push({
      '@type': 'Offer',
      url: eventUrl,
      price: event.price === 0 ? '0' : event.price.toString(),
      priceCurrency: event.currency || 'EUR',
      availability: event.capacity && event.attendees_count && event.attendees_count >= event.capacity
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      validFrom: new Date(event.created_at || event.date).toISOString()
    });
  }

  // Build schema object
  const schema: EventSchemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description || event.name,
    startDate: new Date(event.date).toISOString(),
    eventStatus,
    eventAttendanceMode: event.venue 
      ? 'https://schema.org/OfflineEventAttendanceMode'
      : 'https://schema.org/OnlineEventAttendanceMode',
    location,
  };

  // Add optional fields
  if (event.image) {
    schema.image = [event.image];
  }

  if (event.organizer_name) {
    schema.organizer = {
      '@type': 'Organization',
      name: event.organizer_name,
    };
  }

  if (offers.length > 0) {
    schema.offers = offers;
  }

  return schema;
}

/**
 * Inject Event Schema into page <head>
 */
export function injectEventSchema(event: EventNexusEvent): void {
  const schema = generateEventSchema(event);
  const scriptElement = document.getElementById('event-schema');
  
  if (scriptElement) {
    scriptElement.textContent = JSON.stringify(schema, null, 2);
  } else {
    // Create new script element if not exists
    const newScript = document.createElement('script');
    newScript.type = 'application/ld+json';
    newScript.id = 'event-schema';
    newScript.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(newScript);
  }
}

/**
 * Remove Event Schema from page (cleanup on unmount)
 */
export function removeEventSchema(): void {
  const scriptElement = document.getElementById('event-schema');
  if (scriptElement) {
    scriptElement.textContent = '';
  }
}

/**
 * Generate ItemList Schema for event directory pages
 */
export function generateEventListSchema(
  events: EventNexusEvent[],
  baseUrl: string = 'https://www.eventnexus.eu'
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Event',
        name: event.name,
        url: `${baseUrl}/event/${event.id}`,
        startDate: new Date(event.date).toISOString(),
        location: {
          '@type': 'Place',
          name: event.location || event.venue || 'TBA'
        }
      }
    }))
  };
}
