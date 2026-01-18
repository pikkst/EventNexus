/**
 * useSEO Hook - Unified SEO management for React components
 * Dynamically manages meta tags, structured data, and AI search optimization
 * 
 * Usage:
 * const { setSEO } = useSEO();
 * 
 * In useEffect:
 * setSEO({
 *   title: 'Page Title',
 *   description: 'Page description',
 *   image: 'https://...',
 *   url: 'https://www.eventnexus.eu/page',
 *   structuredData: eventSchema
 * });
 */

import { useEffect } from 'react';
import { 
  updateMetaTags, 
  injectStructuredData, 
  generateRobotsMeta,
  StructuredData 
} from '../services/seoService';

interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event';
  keywords?: string;
  author?: string;
  structuredData?: StructuredData;
  robotsMeta?: string;
  noindex?: boolean;
}

export function useSEO(config: SEOConfig = {}) {
  const setSEO = (newConfig: SEOConfig) => {
    // Update standard meta tags
    updateMetaTags({
      title: newConfig.title,
      description: newConfig.description,
      image: newConfig.image,
      url: newConfig.url,
      type: newConfig.type,
      keywords: newConfig.keywords,
      author: newConfig.author,
    });

    // Update robots meta
    if (newConfig.noindex) {
      updateRobotsMeta('noindex, nofollow');
    } else {
      updateRobotsMeta(generateRobotsMeta(false));
    }

    // Inject structured data for AI comprehension
    if (newConfig.structuredData) {
      injectStructuredData(newConfig.structuredData);
    }
  };

  // Update on config change
  useEffect(() => {
    if (Object.keys(config).length > 0) {
      setSEO(config);
    }
  }, [JSON.stringify(config)]);

  return { setSEO };
}

/**
 * Helper: Update robots meta tag
 */
function updateRobotsMeta(content: string): void {
  if (typeof document === 'undefined') return;

  let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'robots';
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * useEventSEO - Specialized hook for event pages
 */
export function useEventSEO(event: {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  event_date?: string;
  city?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  max_capacity?: number;
  location?: { address?: string; lat?: number; lng?: number; city?: string };
  organizer_name?: string;
  organizer_id?: string;
  time?: string;
  end_date?: string;
} | null) {
  const { setSEO } = useSEO();

  useEffect(() => {
    if (!event) return;

    const eventUrl = `https://www.eventnexus.eu/event/${event.id}`;
    const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString() : '';

    // Generate Schema.org Event structured data
    const eventSchema: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.name,
      description: event.description,
      startDate: event.event_date || new Date().toISOString(),
      endDate: event.end_date || event.event_date || new Date().toISOString(),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: event.city || 'TBD',
        address: {
          '@type': 'PostalAddress',
          addressLocality: event.city || 'TBD',
          addressCountry: 'EE'
        },
        ...(event.latitude && event.longitude ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: event.latitude,
            longitude: event.longitude
          }
        } : {})
      },
      image: event.image_url || 'https://www.eventnexus.eu/og-image.png',
      ...(event.organizer_name ? {
        organizer: {
          '@type': 'Organization',
          name: event.organizer_name,
          url: `https://www.eventnexus.eu/organizer/${event.organizer_id}`
        }
      } : {}),
      ...(event.price !== undefined ? {
        offers: {
          '@type': 'Offer',
          price: event.price,
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          url: eventUrl
        }
      } : {}),
      performer: {
        '@type': 'Organization',
        name: event.organizer_name || 'EventNexus'
      }
    };

    setSEO({
      title: `${event.name} - EventNexus`,
      description: event.description || `Join ${event.name} on EventNexus. ${event.category} event in ${event.city}`,
      image: event.image_url,
      url: eventUrl,
      type: 'event',
      keywords: `${event.category}, ${event.city}, events, ${event.name}`,
      structuredData: eventSchema
    });

    // Cleanup structured data on unmount
    return () => {
      // Schema injection is handled by setSEO, but we can add cleanup if needed
    };
  }, [event?.id]);

  return { setSEO };
}

/**
 * useOrganizationSEO - Specialized hook for organizer pages
 */
export function useOrganizationSEO(org: {
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  slug?: string;
} | null) {
  const { setSEO } = useSEO();

  useEffect(() => {
    if (!org) return;

    setSEO({
      title: `${org.name} - Events on EventNexus`,
      description: org.description || `Discover events organized by ${org.name} on EventNexus`,
      image: org.logo,
      url: `https://www.eventnexus.eu/org/${org.slug}`,
      type: 'website',
      keywords: `${org.name}, events, organizer`,
    });
  }, [org?.slug]);

  return { setSEO };
}

/**
 * usePageSEO - Specialized hook for standard pages
 */
export function usePageSEO(page: {
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article';
}) {
  const { setSEO } = useSEO();

  useEffect(() => {
    setSEO({
      title: `${page.title} - EventNexus`,
      description: page.description,
      image: page.image || 'https://www.eventnexus.eu/og-image.png',
      url: `https://www.eventnexus.eu${page.path}`,
      type: page.type || 'website',
    });
  }, [page.path]);

  return { setSEO };
}
