/**
 * SEO Service - Structured Data & Meta Tag Management
 * Optimizes EventNexus for AI search engines and traditional SEO
 */

import { EventNexusEvent, User } from '../types';

interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Generate JSON-LD for Event listings
 */
export function generateEventSchema(event: EventNexusEvent): StructuredData {
  const eventDate = event.event_date ? new Date(event.event_date).toISOString() : undefined;
  const startDateTime = event.start_time 
    ? new Date(`${event.event_date}T${event.start_time}`).toISOString() 
    : eventDate;
  const endDateTime = event.end_time 
    ? new Date(`${event.event_date}T${event.end_time}`).toISOString() 
    : undefined;

  const schema: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    url: `https://www.eventnexus.eu/event/${event.id}`,
    image: event.image_url || 'https://www.eventnexus.eu/og-image.png',
    startDate: startDateTime,
    endDate: endDateTime,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.is_online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    category: event.category || 'Event',
    isAccessibleForFree: !event.ticket_price || event.ticket_price === 0,
    keywords: [event.category, event.city, event.country].filter(Boolean).join(', '),
  };

  // Add location for physical events
  if (event.latitude && event.longitude) {
    schema.location = {
      '@type': 'Place',
      name: [event.city, event.state, event.country].filter(Boolean).join(', '),
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location || '',
        addressLocality: event.city,
        addressRegion: event.state,
        postalCode: event.postal_code,
        addressCountry: event.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: event.latitude,
        longitude: event.longitude,
      },
    };
  }

  // Add organizer
  if (event.organizer_id) {
    schema.organizer = {
      '@type': 'Organization',
      name: event.organizer_name || 'Event Organizer',
      url: event.organizer_website,
    };
  }

  // Add ticket information
  if (event.ticket_price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      url: `https://www.eventnexus.eu/event/${event.id}`,
      price: event.ticket_price,
      priceCurrency: event.currency || 'EUR',
      availability: 'https://schema.org/InStock',
    };
  }

  return schema;
}

/**
 * Generate Organization schema for agency/organizer pages
 */
export function generateOrganizationSchema(organizer: {
  name: string;
  website?: string;
  description?: string;
  logo?: string;
  location?: string;
  slug?: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organizer.name,
    url: organizer.website || `https://www.eventnexus.eu/org/${organizer.slug}`,
    description: organizer.description,
    logo: organizer.logo || 'https://www.eventnexus.eu/logo-optimized.svg',
    sameAs: [
      organizer.website,
    ].filter(Boolean),
  };
}

/**
 * Generate LocalBusiness schema for geo-targeting
 */
export function generateLocalBusinessSchema(event: EventNexusEvent): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: event.name,
    description: event.description,
    image: event.image_url || 'https://www.eventnexus.eu/og-image.png',
    url: `https://www.eventnexus.eu/event/${event.id}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: event.location,
      addressLocality: event.city,
      addressRegion: event.state,
      postalCode: event.postal_code,
      addressCountry: event.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: event.latitude,
      longitude: event.longitude,
    },
    telephone: event.organizer_phone,
    priceRange: event.ticket_price ? `$${event.ticket_price}` : 'Free',
  };
}

/**
 * Generate Website schema for homepage
 */
export function generateWebsiteSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EventNexus',
    url: 'https://www.eventnexus.eu',
    description: 'Discover amazing events near you. From concerts to conferences, find and book tickets for unforgettable experiences.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.eventnexus.eu/map?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/**
 * Inject structured data into document head
 */
export function injectStructuredData(schema: StructuredData): void {
  if (typeof document === 'undefined') return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  script.setAttribute('data-seo-schema', schema['@type']);

  // Remove existing schema of same type
  const existing = document.querySelector(`script[data-seo-schema="${schema['@type']}"]`);
  if (existing) {
    existing.remove();
  }

  document.head.appendChild(script);
}

/**
 * Update meta tags dynamically
 */
export function updateMetaTags(options: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event';
  keywords?: string;
  author?: string;
}): void {
  if (typeof document === 'undefined') return;

  // Update title
  if (options.title) {
    document.title = options.title;
    updateOrCreateMetaTag('og:title', options.title);
    updateOrCreateMetaTag('twitter:title', options.title);
  }

  // Update description
  if (options.description) {
    updateOrCreateMetaTag('description', options.description);
    updateOrCreateMetaTag('og:description', options.description);
    updateOrCreateMetaTag('twitter:description', options.description);
  }

  // Update image
  if (options.image) {
    updateOrCreateMetaTag('og:image', options.image);
    updateOrCreateMetaTag('og:image:alt', options.title || 'EventNexus');
    updateOrCreateMetaTag('twitter:image', options.image);
    updateOrCreateMetaTag('twitter:image:alt', options.title || 'EventNexus');
  }

  // Update URL
  if (options.url) {
    updateOrCreateMetaTag('og:url', options.url);
    updateOrCreateMetaTag('twitter:url', options.url);
    updateOrCreateLinkTag('canonical', options.url);
  }

  // Update type
  if (options.type) {
    updateOrCreateMetaTag('og:type', options.type);
  }

  // Update keywords
  if (options.keywords) {
    updateOrCreateMetaTag('keywords', options.keywords);
  }

  // Update author
  if (options.author) {
    updateOrCreateMetaTag('author', options.author);
  }
}

/**
 * Helper: Update or create meta tag
 */
function updateOrCreateMetaTag(name: string, content: string): void {
  let tag = document.querySelector(
    `meta[property="${name}"], meta[name="${name}"]`
  ) as HTMLMetaElement;

  if (!tag) {
    tag = document.createElement('meta');
    const isProperty = ['og:', 'twitter:', 'article:'].some(prefix => name.startsWith(prefix));
    if (isProperty) {
      tag.setAttribute('property', name);
    } else {
      tag.setAttribute('name', name);
    }
    document.head.appendChild(tag);
  }

  tag.content = content;
}

/**
 * Helper: Update or create link tag
 */
function updateOrCreateLinkTag(rel: string, href: string): void {
  let tag = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }

  tag.href = href;
}

/**
 * Generate SEO-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generate sitemap entries for events
 */
export function generateSitemapEntry(event: EventNexusEvent, changeFreq: 'daily' | 'weekly' | 'monthly' = 'weekly'): string {
  const eventDate = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  return `  <url>
    <loc>https://www.eventnexus.eu/event/${event.id}</loc>
    <lastmod>${eventDate}</lastmod>
    <changefreq>${changeFreq}</changefreq>
    <priority>${event.is_featured ? '0.9' : '0.7'}</priority>
  </url>`;
}

/**
 * Generate robots meta tag content
 */
export function generateRobotsMeta(isAdminPage: boolean = false): string {
  if (isAdminPage) {
    return 'noindex, nofollow';
  }
  return 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
}

/**
 * Generate keywords for event
 */
export function generateEventKeywords(event: EventNexusEvent): string {
  const keywords = [
    event.name,
    event.category,
    event.city,
    event.country,
    `${event.category} in ${event.city}`,
    `events in ${event.city}`,
    `${event.category} events`,
    'event booking',
    'ticket purchase',
  ].filter(Boolean);

  return keywords.join(', ');
}
