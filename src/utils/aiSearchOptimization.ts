/**
 * AI Search Optimization Utilities
 * Specifically optimized for AI crawlers and LLM indexing
 */

/**
 * Generate semantic HTML5 landmarks for better AI comprehension
 */
export function generateSemanticMarkup(contentType: 'event' | 'organization' | 'page'): string {
  const landmarks: Record<string, string> = {
    event: 'article',
    organization: 'main',
    page: 'main',
  };

  return landmarks[contentType] || 'main';
}

/**
 * Generate AI-friendly content summary
 * Used in meta tags and structured data
 */
export function generateAIContentSummary(
  title: string,
  description: string,
  category: string,
  location?: string,
  date?: string
): string {
  const parts = [
    title,
    `Category: ${category}`,
    description,
  ];

  if (location) parts.push(`Location: ${location}`);
  if (date) parts.push(`Date: ${date}`);

  return parts.join(' | ');
}

/**
 * Generate rel attributes for AI crawler optimization
 */
export function getSemanticRelAttributes(linkType: 'event' | 'category' | 'location' | 'organizer'): string {
  const relations: Record<string, string> = {
    event: 'related',
    category: 'related tag',
    location: 'related',
    organizer: 'related',
  };

  return relations[linkType] || 'related';
}

/**
 * Generate AI-friendly excerpt (max 160 chars for readability)
 */
export function generateMetaExcerpt(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Generate hreflang tags for multi-language support (future-proofing)
 */
export function generateHrefLang(path: string, languages: string[] = ['en']): string {
  return languages
    .map(lang => `<link rel="alternate" hreflang="${lang}" href="https://www.eventnexus.eu${path}" />`)
    .join('\n  ');
}

/**
 * AI-optimized heading structure validator
 */
export function getOptimalHeadingStructure(contentType: 'event' | 'listing'): Record<string, string> {
  return {
    h1: contentType === 'event' ? 'Event Name/Title' : 'Page Main Title',
    h2: 'Key Information Sections',
    h3: 'Subsection Details',
  };
}

/**
 * Generate rich text content for AI comprehension
 */
export function enrichContentForAI(baseContent: string): string {
  // Add semantic markers without changing display
  return baseContent
    .replace(/^([A-Z][^.!?]*[.!?])/gm, '<p>$1</p>')
    .replace(/\n\n+/g, '</p><p>')
    .trim();
}

/**
 * Time-based relevance scoring for events
 */
export function calculateEventRelevanceScore(
  eventDate: Date,
  isUpcoming: boolean,
  viewCount: number,
  followerCount: number
): number {
  const today = new Date();
  const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  let score = 50; // Base score

  // Boost upcoming events
  if (isUpcoming) {
    if (daysUntilEvent <= 7) score += 30;
    else if (daysUntilEvent <= 30) score += 20;
    else if (daysUntilEvent <= 90) score += 10;
  }

  // Boost popular events
  if (viewCount > 1000) score += 15;
  if (followerCount > 100) score += 10;

  return Math.min(score, 100);
}

/**
 * Generate OpenAI embeddings-friendly metadata
 */
export function generateEmbeddingMetadata(
  title: string,
  description: string,
  category: string,
  tags: string[] = []
): Record<string, string | string[]> {
  return {
    title,
    description,
    category,
    tags: Array.isArray(tags) ? tags : [tags],
    searchable_text: `${title} ${description} ${category} ${tags.join(' ')}`.toLowerCase(),
  };
}

/**
 * Generate content for AI agents (no HTML, pure text)
 */
export function generatePlainTextForAI(data: {
  title: string;
  description: string;
  date?: string;
  location?: string;
  category?: string;
  organizer?: string;
  price?: number;
  url?: string;
}): string {
  const lines = [
    `Title: ${data.title}`,
    `Description: ${data.description}`,
  ];

  if (data.date) lines.push(`Date: ${data.date}`);
  if (data.location) lines.push(`Location: ${data.location}`);
  if (data.category) lines.push(`Category: ${data.category}`);
  if (data.organizer) lines.push(`Organizer: ${data.organizer}`);
  if (data.price !== undefined) lines.push(`Price: $${data.price}`);
  if (data.url) lines.push(`URL: ${data.url}`);

  return lines.join('\n');
}

/**
 * Identify AI crawler from User-Agent string
 */
export function identifyAICrawler(userAgent: string): 'gpt' | 'claude' | 'perplexity' | 'other' | null {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();

  if (ua.includes('gptbot') || ua.includes('openai')) return 'gpt';
  if (ua.includes('claude') || ua.includes('anthropic')) return 'claude';
  if (ua.includes('perplexitybot')) return 'perplexity';
  if (ua.includes('ccbot') || ua.includes('commoncrawl')) return 'other';

  return null;
}

/**
 * Generate cache-busting version string for static assets
 */
export function generateAssetVersion(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Validate and sanitize URLs for crawlers
 */
export function sanitizeURLForCrawler(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'].forEach(param => {
      parsed.searchParams.delete(param);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}
