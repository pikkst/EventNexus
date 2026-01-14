/**
 * SEO Utilities for EventNexus
 * Manages dynamic meta tags, Open Graph tags, structured data, and page titles
 * All content is in English for optimal Google SEO
 */

import { EventNexusEvent, User } from '../types';

interface SEOMetaTags {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  canonical?: string;
  structuredData?: any;
}

/**
 * Update document title and meta tags for SEO
 */
export function updatePageMeta(tags: SEOMetaTags): void {
  // Update title
  document.title = tags.title;

  // Update or create meta tags
  const metaUpdates: { [key: string]: string } = {
    description: tags.description,
    'og:title': tags.ogTitle || tags.title,
    'og:description': tags.ogDescription || tags.description,
    'og:type': tags.ogType || 'website',
    'twitter:card': tags.twitterCard || 'summary_large_image',
    'twitter:title': tags.ogTitle || tags.title,
    'twitter:description': tags.ogDescription || tags.description,
  };

  if (tags.keywords) {
    metaUpdates.keywords = tags.keywords;
  }

  if (tags.ogImage) {
    metaUpdates['og:image'] = tags.ogImage;
    metaUpdates['twitter:image'] = tags.ogImage;
  }

  if (tags.canonical) {
    metaUpdates['og:url'] = tags.canonical;
    metaUpdates['twitter:url'] = tags.canonical;
    
    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = tags.canonical;
  }

  // Update all meta tags
  Object.entries(metaUpdates).forEach(([key, value]) => {
    const isProperty = key.startsWith('og:') || key.startsWith('twitter:');
    const attrName = isProperty ? 'property' : 'name';
    const selector = isProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
    
    let metaTag = document.querySelector(selector) as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute(attrName, key);
      document.head.appendChild(metaTag);
    }
    metaTag.content = value;
  });

  // Update structured data if provided
  if (tags.structuredData) {
    updateStructuredData(tags.structuredData);
  }
}

/**
 * Update or create JSON-LD structured data
 */
export function updateStructuredData(data: any): void {
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.textContent = JSON.stringify(data);
  } else {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

/**
 * Generate SEO meta tags for event detail pages
 */
export function generateEventSEO(event: EventNexusEvent, organizerName?: string): SEOMetaTags {
  const eventDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const title = `${event.name} - ${eventDate} | EventNexus`;
  const locationCity = event.location?.city || event.location?.address || 'Estonia';
  const description = `Join ${event.name} on ${eventDate} in ${locationCity}. ${event.description.substring(0, 120)}... Book tickets now on EventNexus!`;
  
  const keywords = `${event.name}, ${event.category} event, ${locationCity} events, ${eventDate} events, buy tickets, event booking`;

  // Event image URL
  const ogImage = event.imageUrl || 'https://eventnexus.eu/og-image.png';
  
  const canonical = `https://eventnexus.eu/event/${event.id}`;

  // Generate structured data for Google rich results
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: `${event.date}T${event.time}`,
    endDate: event.end_date && event.end_time 
      ? `${event.end_date}T${event.end_time}`
      : `${event.date}T${event.time}`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location.address || event.location.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location.city || 'Estonia',
        addressCountry: 'EE'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: event.location.lat,
        longitude: event.location.lng
      }
    },
    image: [ogImage],
    organizer: {
      '@type': 'Organization',
      name: organizerName || 'EventNexus',
      url: 'https://eventnexus.eu'
    },
    offers: {
      '@type': 'Offer',
      url: canonical,
      price: event.price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      validFrom: new Date().toISOString()
    },
    performer: {
      '@type': 'PerformingGroup',
      name: organizerName || event.name
    }
  };

  return {
    title,
    description,
    keywords,
    ogTitle: event.name,
    ogDescription: description,
    ogImage,
    ogType: 'website',
    canonical,
    structuredData
  };
}

/**
 * Generate SEO meta tags for agency/organizer profile pages
 */
export function generateAgencySEO(organizer: User, eventCount: number): SEOMetaTags {
  const companyName = organizer.name;
  const title = `${companyName} - Event Organizer Profile | EventNexus`;
  const description = organizer.bio 
    ? `${organizer.bio.substring(0, 140)}... Discover ${eventCount} events organized by ${companyName} on EventNexus.`
    : `Professional event organizer ${companyName}. Discover ${eventCount} amazing events and book tickets on EventNexus.`;
  
  const keywords = `${companyName}, event organizer, ${organizer.subscription_tier} organizer, professional events, event management`;
  
  const ogImage = organizer.avatar || organizer.branding?.logoUrl || 'https://eventnexus.eu/og-image.png';
  const canonical = `https://eventnexus.eu/agency/${organizer.agency_slug || organizer.agencySlug}`;

  // Structured data for organization
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: companyName,
    description: organizer.bio || description,
    url: canonical,
    logo: organizer.branding?.logoUrl || organizer.avatar,
    image: ogImage,
    sameAs: [
      organizer.branding?.socialLinks?.website,
      organizer.branding?.socialLinks?.twitter,
      organizer.branding?.socialLinks?.instagram,
      organizer.branding?.socialLinks?.linkedin
    ].filter(Boolean),
    address: organizer.location ? {
      '@type': 'PostalAddress',
      addressLocality: organizer.location
    } : undefined
  };

  return {
    title,
    description,
    keywords,
    ogTitle: `${companyName} - Event Organizer`,
    ogDescription: description,
    ogImage,
    ogType: 'profile',
    canonical,
    structuredData
  };
}

/**
 * Generate SEO meta tags for pricing page
 */
export function generatePricingSEO(): SEOMetaTags {
  return {
    title: 'Pricing Plans - EventNexus | Event Management Platform',
    description: 'Choose the perfect plan for your event management needs. From Free to Enterprise, EventNexus offers flexible pricing for organizers of all sizes. Start creating amazing events today!',
    keywords: 'event management pricing, event platform plans, organizer pricing, event ticketing costs, free event platform, enterprise event management',
    ogTitle: 'EventNexus Pricing - Plans for Every Organizer',
    ogDescription: 'Flexible pricing plans for event organizers. Free, Pro, and Enterprise tiers with advanced features including AI-powered marketing, analytics, and more.',
    ogImage: 'https://eventnexus.eu/og-image.png',
    canonical: 'https://eventnexus.eu/pricing'
  };
}

/**
 * Generate SEO meta tags for map/explore page
 */
export function generateMapSEO(): SEOMetaTags {
  return {
    title: 'Explore Events Near You | EventNexus - Discover Amazing Experiences',
    description: 'Discover concerts, conferences, workshops, and more happening near you. Browse events on an interactive map and book tickets instantly. Find your next experience with EventNexus!',
    keywords: 'events near me, event map, discover events, local events, concert tickets, conference tickets, workshop tickets, event discovery',
    ogTitle: 'Explore Events on Interactive Map - EventNexus',
    ogDescription: 'Find amazing events happening near you. Interactive map with concerts, conferences, workshops, and more. Book tickets instantly!',
    ogImage: 'https://eventnexus.eu/og-image.png',
    canonical: 'https://eventnexus.eu/map'
  };
}

/**
 * Generate SEO meta tags for dashboard page
 */
export function generateDashboardSEO(): SEOMetaTags {
  return {
    title: 'Organizer Dashboard | EventNexus - Manage Your Events',
    description: 'Manage your events, track ticket sales, view analytics, and engage with attendees. Powerful event management tools for professional organizers on EventNexus.',
    keywords: 'event dashboard, event management, organizer tools, ticket sales, event analytics, event organizer dashboard',
    ogTitle: 'Event Organizer Dashboard - EventNexus',
    ogDescription: 'Professional event management dashboard with real-time analytics, ticket sales tracking, and attendee engagement tools.',
    ogImage: 'https://eventnexus.eu/og-image.png',
    canonical: 'https://eventnexus.eu/dashboard'
  };
}

/**
 * Generate SEO meta tags for event creation page
 */
export function generateCreateEventSEO(): SEOMetaTags {
  return {
    title: 'Create Event | EventNexus - Start Your Next Amazing Event',
    description: 'Create and publish your event in minutes. Add event details, set ticket prices, customize branding, and reach thousands of potential attendees with EventNexus event management platform.',
    keywords: 'create event, publish event, event creation, event management, event ticketing, online event platform, event organizer tools',
    ogTitle: 'Create Your Event - EventNexus',
    ogDescription: 'Professional event creation platform with AI-powered marketing tools. Create, customize, and publish your event in minutes.',
    ogImage: 'https://eventnexus.eu/og-image.png',
    canonical: 'https://eventnexus.eu/create'
  };
}

/**
 * Reset to default homepage meta tags
 */
export function resetToHomepageSEO(): void {
  updatePageMeta({
    title: 'EventNexus - Discover Your Next Experience',
    description: 'Find amazing events near you. From concerts to conferences, discover and book tickets for unforgettable experiences.',
    keywords: 'events, event tickets, concerts, conferences, workshops, event discovery, book tickets, event management',
    ogTitle: 'EventNexus - Discover Your Next Experience',
    ogDescription: 'Find amazing events near you. From concerts to conferences, discover and book tickets for unforgettable experiences.',
    ogImage: 'https://eventnexus.eu/og-image.png',
    canonical: 'https://eventnexus.eu/'
  });
}

/**
 * Generate dynamic breadcrumb structured data
 */
export function generateBreadcrumbData(items: Array<{ name: string; url: string }>): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/**
 * Clean up meta tags when component unmounts
 */
export function cleanupSEO(): void {
  // Reset to default homepage SEO
  resetToHomepageSEO();
}
