/**
 * Dynamic Meta Tag Manager for EventNexus
 * Updates page meta tags for SEO and social sharing
 * Used by event detail pages, organizer profiles, etc.
 */

export interface MetaTagConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
}

/**
 * Update all meta tags for current page
 */
export function updateMetaTags(config: MetaTagConfig): void {
  const {
    title,
    description,
    image = 'https://eventnexus.eu/favicon.svg',
    url = window.location.href,
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    tags = [],
  } = config;

  // Update title
  document.title = `${title} | EventNexus`;

  // Update or create meta tags
  setMetaTag('description', description);
  setMetaTag('keywords', tags.join(', '));

  // Open Graph (Facebook, LinkedIn)
  setMetaTag('og:title', title, 'property');
  setMetaTag('og:description', description, 'property');
  setMetaTag('og:image', image, 'property');
  setMetaTag('og:url', url, 'property');
  setMetaTag('og:type', type, 'property');
  setMetaTag('og:site_name', 'EventNexus', 'property');

  // Twitter Cards
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);
  setMetaTag('twitter:url', url);

  // Article-specific tags
  if (type === 'article' && publishedTime) {
    setMetaTag('article:published_time', publishedTime, 'property');
    if (modifiedTime) {
      setMetaTag('article:modified_time', modifiedTime, 'property');
    }
    if (author) {
      setMetaTag('article:author', author, 'property');
    }
    tags.forEach(tag => {
      addMetaTag('article:tag', tag, 'property');
    });
  }

  // Update canonical URL
  updateCanonicalUrl(url);

  // Update robots meta
  setMetaTag('robots', 'index, follow');
}

/**
 * Set or update a meta tag
 */
function setMetaTag(
  name: string,
  content: string,
  attribute: 'name' | 'property' = 'name'
): void {
  let meta = document.querySelector(`meta[${attribute}="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

/**
 * Add a meta tag (allows duplicates for article:tag, etc.)
 */
function addMetaTag(
  name: string,
  content: string,
  attribute: 'name' | 'property' = 'name'
): void {
  const meta = document.createElement('meta');
  meta.setAttribute(attribute, name);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

/**
 * Update canonical URL
 */
function updateCanonicalUrl(url: string): void {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }

  canonical.href = url;
}

/**
 * Reset meta tags to defaults
 */
export function resetMetaTags(): void {
  updateMetaTags({
    title: 'EventNexus - Discover Your Next Experience',
    description:
      'Find amazing events near you. From concerts to conferences, discover and book tickets for unforgettable experiences.',
    url: 'https://eventnexus.eu',
    type: 'website',
  });
}

/**
 * Generate meta tags for event detail page
 */
export function generateEventMetaTags(event: {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  date: string;
  location: { city: string };
  price: number;
  created_at?: string;
  updated_at?: string;
}): MetaTagConfig {
  const url = `https://eventnexus.eu/event/${event.id}`;
  const priceText = event.price === 0 ? 'FREE' : `€${event.price}`;

  return {
    title: event.name,
    description: `${event.description} | ${event.date} in ${event.location.city} | ${priceText}`,
    image: event.imageUrl,
    url,
    type: 'article',
    publishedTime: event.created_at,
    modifiedTime: event.updated_at,
    tags: [event.category, event.location.city, 'events', 'tickets'],
  };
}

/**
 * Generate meta tags for organizer profile
 */
export function generateOrganizerMetaTags(organizer: {
  slug: string;
  name: string;
  bio?: string;
  avatar?: string;
}): MetaTagConfig {
  const url = `https://eventnexus.eu/org/${organizer.slug}`;

  return {
    title: organizer.name,
    description: organizer.bio || `${organizer.name} - Event Organizer on EventNexus`,
    image: organizer.avatar || 'https://eventnexus.eu/favicon.svg',
    url,
    type: 'profile',
  };
}

/**
 * Add JSON-LD structured data to page
 */
export function addStructuredData(data: any): void {
  // Remove existing structured data
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => {
    if (script.textContent?.includes(data['@type'])) {
      script.remove();
    }
  });

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Remove all structured data scripts
 */
export function removeStructuredData(): void {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  scripts.forEach(script => script.remove());
}
