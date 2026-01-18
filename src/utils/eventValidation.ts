/**
 * Event Validation & SEO Quality Schema for EventNexus
 * Ensures consistency between user-created and AI-created events
 * Optimizes all events for Google and AI search engines
 */

import type { EventNexusEvent } from '../types';

export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  seoScore: number; // 0-100
  qualityScore: number; // 0-100
}

export interface SEOOptimizations {
  title: string; // Optimized for search
  description: string; // SEO-friendly description
  keywords: string[]; // Relevant keywords
  slug?: string; // URL-friendly slug
  metaDescription: string; // 150-160 chars
}

/**
 * Minimum requirements for a valid event
 */
export const EVENT_VALIDATION_RULES = {
  name: {
    minLength: 10,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-\u00C0-\u017F]+$/, // Alphanumeric + accents
  },
  description: {
    minLength: 50,
    maxLength: 5000,
    requiredKeywords: 3, // Minimum unique keywords
  },
  location: {
    requiredFields: ['lat', 'lng', 'address', 'city'],
    addressMinLength: 10,
    cityMinLength: 2,
  },
  date: {
    minDaysFromNow: 0, // Can be today
    maxDaysFromNow: 365, // Max 1 year in future
  },
  category: {
    required: true,
    validCategories: [
      'Music',
      'Sports',
      'Technology',
      'Arts',
      'Food',
      'Business',
      'Education',
      'Health',
      'Other'
    ],
  },
  image: {
    required: true,
    minWidth: 800,
    minHeight: 600,
    aspectRatio: [16/9, 4/3, 1/1], // Allowed ratios
  },
} as const;

/**
 * SEO scoring weights
 */
const SEO_WEIGHTS = {
  titleOptimization: 0.25,
  descriptionQuality: 0.25,
  keywordDensity: 0.15,
  locationSpecificity: 0.15,
  imageQuality: 0.10,
  categorization: 0.10,
} as const;

/**
 * Validate event data comprehensively
 */
export function validateEvent(event: Partial<EventNexusEvent>): EventValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let seoScore = 0;
  let qualityScore = 0;

  // Name validation
  if (!event.name) {
    errors.push('Event name is required');
  } else {
    if (event.name.length < EVENT_VALIDATION_RULES.name.minLength) {
      errors.push(`Event name must be at least ${EVENT_VALIDATION_RULES.name.minLength} characters`);
    }
    if (event.name.length > EVENT_VALIDATION_RULES.name.maxLength) {
      errors.push(`Event name must not exceed ${EVENT_VALIDATION_RULES.name.maxLength} characters`);
    }
    if (!EVENT_VALIDATION_RULES.name.pattern.test(event.name)) {
      warnings.push('Event name contains special characters that may affect SEO');
    }
    
    // SEO scoring for title
    const titleScore = calculateTitleSEOScore(event.name);
    seoScore += titleScore * SEO_WEIGHTS.titleOptimization;
  }

  // Description validation
  if (!event.description) {
    errors.push('Event description is required');
  } else {
    if (event.description.length < EVENT_VALIDATION_RULES.description.minLength) {
      errors.push(`Description must be at least ${EVENT_VALIDATION_RULES.description.minLength} characters`);
    }
    if (event.description.length > EVENT_VALIDATION_RULES.description.maxLength) {
      errors.push(`Description must not exceed ${EVENT_VALIDATION_RULES.description.maxLength} characters`);
    }
    
    // SEO scoring for description
    const descScore = calculateDescriptionSEOScore(event.description);
    seoScore += descScore * SEO_WEIGHTS.descriptionQuality;
    
    // Keyword density check
    const keywordScore = calculateKeywordScore(event.description, event.category);
    seoScore += keywordScore * SEO_WEIGHTS.keywordDensity;
  }

  // Location validation
  if (!event.location) {
    errors.push('Event location is required');
  } else {
    const loc = event.location;
    if (!loc.lat || !loc.lng) {
      errors.push('Location coordinates (lat/lng) are required');
    }
    if (!loc.address || loc.address.length < EVENT_VALIDATION_RULES.location.addressMinLength) {
      errors.push('Valid street address is required');
    }
    if (!loc.city || loc.city.length < EVENT_VALIDATION_RULES.location.cityMinLength) {
      errors.push('City name is required');
    }
    
    // SEO scoring for location
    const locScore = calculateLocationScore(loc);
    seoScore += locScore * SEO_WEIGHTS.locationSpecificity;
  }

  // Date validation
  if (!event.date) {
    errors.push('Event date is required');
  } else {
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysFromNow = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysFromNow < EVENT_VALIDATION_RULES.date.minDaysFromNow) {
      errors.push('Event date cannot be in the past');
    }
    if (daysFromNow > EVENT_VALIDATION_RULES.date.maxDaysFromNow) {
      warnings.push('Event is more than 1 year in the future - may affect SEO relevance');
    }
  }

  // Category validation
  if (!event.category) {
    errors.push('Event category is required');
  } else if (!EVENT_VALIDATION_RULES.category.validCategories.includes(event.category as any)) {
    warnings.push(`Category "${event.category}" may not be optimal for SEO`);
  } else {
    seoScore += 100 * SEO_WEIGHTS.categorization;
  }

  // Image validation
  if (!event.imageUrl) {
    warnings.push('Event image is highly recommended for SEO and social sharing');
    seoScore += 0 * SEO_WEIGHTS.imageQuality;
  } else {
    // Award partial points for having an image
    seoScore += 80 * SEO_WEIGHTS.imageQuality;
  }

  // Quality score calculation
  qualityScore = calculateQualityScore(event);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    seoScore: Math.round(seoScore),
    qualityScore: Math.round(qualityScore),
  };
}

/**
 * Calculate title SEO score (0-100)
 */
function calculateTitleSEOScore(title: string): number {
  let score = 0;
  
  // Length optimization (40-60 chars is ideal)
  const length = title.length;
  if (length >= 40 && length <= 60) {
    score += 40;
  } else if (length >= 30 && length <= 70) {
    score += 25;
  } else if (length >= 20 && length <= 80) {
    score += 15;
  }
  
  // Contains numbers (dates, prices) - good for CTR
  if (/\d/.test(title)) {
    score += 15;
  }
  
  // Contains action words
  const actionWords = /\b(join|discover|experience|attend|celebrate|watch|learn|enjoy|free|live)\b/i;
  if (actionWords.test(title)) {
    score += 15;
  }
  
  // Starts with capital letter
  if (/^[A-Z]/.test(title)) {
    score += 10;
  }
  
  // No ALL CAPS (bad SEO)
  if (title === title.toUpperCase() && title.length > 5) {
    score -= 20;
  }
  
  // Contains location hint
  if (/\b(in|at|tallinn|tartu|estonia|online)\b/i.test(title)) {
    score += 20;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate description SEO score (0-100)
 */
function calculateDescriptionSEOScore(description: string): number {
  let score = 0;
  
  // Length optimization (150-300 chars ideal for meta description)
  const length = description.length;
  if (length >= 150 && length <= 300) {
    score += 30;
  } else if (length >= 100 && length <= 400) {
    score += 20;
  } else if (length >= 50) {
    score += 10;
  }
  
  // Contains question marks (engages readers)
  if (/\?/.test(description)) {
    score += 10;
  }
  
  // Contains CTA (call to action)
  const ctaPattern = /\b(register|sign up|book|join us|reserve|get tickets|learn more|find out)\b/i;
  if (ctaPattern.test(description)) {
    score += 15;
  }
  
  // Sentence count (2-4 sentences is ideal)
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 2 && sentences.length <= 4) {
    score += 15;
  }
  
  // Keyword variety (unique words)
  const words = description.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words.filter(w => w.length > 3));
  if (uniqueWords.size >= 20) {
    score += 20;
  } else if (uniqueWords.size >= 10) {
    score += 10;
  }
  
  // No excessive punctuation
  const punctuationCount = (description.match(/[!?]{2,}/g) || []).length;
  if (punctuationCount > 0) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate keyword relevance score
 */
function calculateKeywordScore(description: string, category?: string): number {
  if (!category) return 50;
  
  let score = 0;
  const lowerDesc = description.toLowerCase();
  const categoryLower = category.toLowerCase();
  
  // Category mentioned in description
  if (lowerDesc.includes(categoryLower)) {
    score += 40;
  }
  
  // Event-related keywords
  const eventKeywords = ['event', 'experience', 'workshop', 'conference', 'meetup', 'festival', 'concert'];
  const hasEventKeyword = eventKeywords.some(kw => lowerDesc.includes(kw));
  if (hasEventKeyword) {
    score += 30;
  }
  
  // Time-related keywords
  const timeKeywords = ['date', 'time', 'when', 'schedule', 'day'];
  const hasTimeKeyword = timeKeywords.some(kw => lowerDesc.includes(kw));
  if (hasTimeKeyword) {
    score += 15;
  }
  
  // Location-related keywords
  const locKeywords = ['where', 'location', 'venue', 'place', 'address'];
  const hasLocKeyword = locKeywords.some(kw => lowerDesc.includes(kw));
  if (hasLocKeyword) {
    score += 15;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate location specificity score
 */
function calculateLocationScore(location: any): number {
  let score = 0;
  
  // Has coordinates
  if (location.lat && location.lng) {
    score += 40;
  }
  
  // Has detailed address
  if (location.address && location.address.length > 20) {
    score += 30;
  }
  
  // Has city
  if (location.city && location.city.length > 2) {
    score += 30;
  }
  
  return score;
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(event: Partial<EventNexusEvent>): number {
  let score = 0;
  
  // Has all required fields
  if (event.name && event.description && event.date && event.location && event.category) {
    score += 30;
  }
  
  // Has optional but valuable fields
  if (event.aboutText && event.aboutText.length > 100) score += 10;
  if (event.end_date) score += 5;
  if (event.end_time) score += 5;
  if (event.imageUrl) score += 20;
  if (event.maxAttendees && event.maxAttendees > 0) score += 5;
  
  // Price is set
  if (typeof event.price === 'number') {
    score += 5;
    if (event.price === 0) score += 5; // Free events are great for SEO
  }
  
  // Visibility is public
  if (event.visibility === 'public') {
    score += 15;
  }
  
  return Math.min(100, score);
}

/**
 * Generate SEO optimizations for an event
 */
export function generateEventSEO(event: Partial<EventNexusEvent>): SEOOptimizations {
  const name = event.name || 'Untitled Event';
  const category = event.category || 'Event';
  const city = event.location?.city || '';
  const date = event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const price = event.price === 0 ? 'FREE' : event.price ? `€${event.price}` : '';
  
  // Optimized title (50-60 chars)
  let title = name;
  if (city && !name.toLowerCase().includes(city.toLowerCase())) {
    title = `${name} in ${city}`;
  }
  if (date && title.length < 50) {
    title = `${title} - ${date}`;
  }
  
  // Optimized meta description (150-160 chars)
  let metaDescription = event.description?.slice(0, 140) || '';
  if (metaDescription.length > 0 && !metaDescription.endsWith('.')) {
    metaDescription += '...';
  }
  if (city && date) {
    const suffix = ` ${date} in ${city}. ${price ? price + '. ' : ''}Book tickets now!`;
    if (metaDescription.length + suffix.length <= 160) {
      metaDescription += suffix;
    }
  }
  
  // Extract keywords
  const keywords = extractKeywords(event);
  
  // Generate URL-friendly slug
  const slug = generateSlug(name);
  
  return {
    title: title.slice(0, 60),
    description: event.description || '',
    metaDescription: metaDescription.slice(0, 160),
    keywords,
    slug,
  };
}

/**
 * Extract relevant keywords from event
 */
function extractKeywords(event: Partial<EventNexusEvent>): string[] {
  const keywords: Set<string> = new Set();
  
  // Add category
  if (event.category) {
    keywords.add(event.category.toLowerCase());
  }
  
  // Add city
  if (event.location?.city) {
    keywords.add(event.location.city.toLowerCase());
  }
  
  // Add price type
  if (event.price === 0) {
    keywords.add('free');
    keywords.add('free entry');
  }
  
  // Extract from description
  if (event.description) {
    const words = event.description
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4 && !['event', 'this', 'that', 'with', 'from'].includes(w));
    
    words.slice(0, 10).forEach(w => keywords.add(w));
  }
  
  // Add generic event keywords
  keywords.add('events');
  keywords.add('tickets');
  if (event.location?.city) {
    keywords.add(`events in ${event.location.city.toLowerCase()}`);
  }
  
  return Array.from(keywords).slice(0, 15);
}

/**
 * Generate URL-friendly slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

/**
 * Validate and optimize event before saving
 * Use this in both EventCreationFlow and AI Pipeline
 */
export function validateAndOptimizeEvent(
  event: Partial<EventNexusEvent>,
  options: { autoFix?: boolean } = {}
): {
  event: Partial<EventNexusEvent>;
  validation: EventValidationResult;
  seo: SEOOptimizations;
} {
  // Validate first
  const validation = validateEvent(event);
  
  // Generate SEO optimizations
  const seo = generateEventSEO(event);
  
  // Auto-fix if requested and event is valid
  let optimizedEvent = { ...event };
  if (options.autoFix && validation.isValid) {
    // Apply SEO optimizations
    optimizedEvent = {
      ...optimizedEvent,
      // Keep original name but store SEO version in metadata if needed
    };
  }
  
  return {
    event: optimizedEvent,
    validation,
    seo,
  };
}

/**
 * Check if event meets minimum SEO standards
 */
export function meetsMinimumSEO(validation: EventValidationResult): boolean {
  return validation.isValid && validation.seoScore >= 60;
}

/**
 * Get human-readable SEO recommendations
 */
export function getSEORecommendations(validation: EventValidationResult, seo: SEOOptimizations): string[] {
  const recommendations: string[] = [];
  
  if (validation.seoScore < 60) {
    recommendations.push('⚠️ SEO score is below recommended threshold');
  }
  
  if (seo.title.length < 40) {
    recommendations.push('💡 Add more context to title (location, date) for better SEO');
  }
  
  if (seo.metaDescription.length < 100) {
    recommendations.push('💡 Expand description to 150-160 characters for optimal meta description');
  }
  
  if (seo.keywords.length < 5) {
    recommendations.push('💡 Add more relevant keywords to description');
  }
  
  if (!validation.warnings.length && validation.seoScore >= 80) {
    recommendations.push('✅ Event is well-optimized for search engines!');
  }
  
  return recommendations;
}
