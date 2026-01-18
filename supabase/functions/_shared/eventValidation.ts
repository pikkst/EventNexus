/**
 * Event Validation & SEO Quality for Supabase Edge Functions (Deno)
 * Ensures AI-generated events meet same quality standards as user-created events
 */

export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  seoScore: number; // 0-100
  qualityScore: number; // 0-100
}

/**
 * Validate AI-generated event before publishing
 */
export function validateAIEvent(eventData: {
  name?: string;
  description?: string;
  category?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  start_time?: string;
  price?: number;
  source_url?: string;
}): EventValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let seoScore = 0;
  let qualityScore = 0;

  // Name validation
  if (!eventData.name || eventData.name.trim().length === 0) {
    errors.push('Event name is required');
  } else {
    const nameLength = eventData.name.length;
    
    if (nameLength < 10) {
      errors.push('Event name must be at least 10 characters');
    } else if (nameLength > 100) {
      errors.push('Event name must not exceed 100 characters');
    } else {
      // SEO scoring for title (25%)
      if (nameLength >= 40 && nameLength <= 60) {
        seoScore += 25;
      } else if (nameLength >= 30 && nameLength <= 70) {
        seoScore += 15;
      } else {
        seoScore += 10;
      }
    }

    // Check for ALL CAPS (bad SEO)
    if (eventData.name === eventData.name.toUpperCase() && nameLength > 5) {
      warnings.push('Title is all caps - may affect SEO negatively');
      seoScore -= 5;
    }
  }

  // Description validation
  if (!eventData.description || eventData.description.trim().length === 0) {
    errors.push('Event description is required');
  } else {
    const descLength = eventData.description.length;
    
    if (descLength < 50) {
      errors.push('Description must be at least 50 characters');
    } else if (descLength > 5000) {
      warnings.push('Description is very long - may affect readability');
    } else {
      // SEO scoring for description (25%)
      if (descLength >= 150 && descLength <= 300) {
        seoScore += 25;
      } else if (descLength >= 100 && descLength <= 400) {
        seoScore += 20;
      } else {
        seoScore += 15;
      }
    }

    // Check for keyword variety
    const words = eventData.description.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words.filter(w => w.length > 3));
    if (uniqueWords.size >= 20) {
      seoScore += 10;
    } else if (uniqueWords.size >= 10) {
      seoScore += 5;
    }
  }

  // Category validation
  const validCategories = [
    'Music',
    'Sports',
    'Technology',
    'Arts',
    'Food',
    'Business',
    'Education',
    'Health',
    'Other'
  ];

  if (!eventData.category) {
    warnings.push('Category not specified - defaulting to "Other"');
    seoScore += 5;
  } else if (!validCategories.includes(eventData.category)) {
    warnings.push(`Category "${eventData.category}" may not be optimal`);
    seoScore += 5;
  } else {
    seoScore += 10; // Valid category
  }

  // Location validation (15%)
  if (!eventData.location_address || eventData.location_address.trim().length < 10) {
    errors.push('Valid street address is required');
  } else {
    seoScore += 10;
  }

  if (!eventData.location_lat || !eventData.location_lng) {
    errors.push('Location coordinates (lat/lng) are required');
  } else {
    // Check if coordinates are reasonable (not 0,0)
    if (eventData.location_lat === 0 && eventData.location_lng === 0) {
      errors.push('Invalid coordinates (0,0) - location must be geocoded');
    } else {
      seoScore += 15; // Location specificity
    }
  }

  // Date/Time validation
  if (!eventData.start_time) {
    errors.push('Event start time is required');
  } else {
    try {
      const startDate = new Date(eventData.start_time);
      const now = new Date();
      
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start time format');
      } else if (startDate < now) {
        warnings.push('Event date is in the past - may not appear in search');
      } else {
        qualityScore += 20;
      }
    } catch (e) {
      errors.push('Failed to parse start time');
    }
  }

  // Price validation
  if (eventData.price !== undefined && eventData.price !== 0) {
    warnings.push('Paid events may have lower visibility');
    qualityScore += 10;
  } else {
    qualityScore += 20; // Free events are great for SEO
  }

  // Source URL (quality indicator)
  if (!eventData.source_url || eventData.source_url.trim().length === 0) {
    warnings.push('No source URL - event may lack credibility');
    qualityScore += 10;
  } else {
    try {
      new URL(eventData.source_url);
      qualityScore += 20; // Valid source URL
    } catch (e) {
      warnings.push('Invalid source URL format');
      qualityScore += 10;
    }
  }

  // Calculate final quality score
  if (eventData.name && eventData.description && eventData.location_address) {
    qualityScore += 30; // Has all required fields
  }

  // Ensure scores are within 0-100
  seoScore = Math.max(0, Math.min(100, seoScore));
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    seoScore,
    qualityScore
  };
}

/**
 * Check if event meets minimum SEO standards
 */
export function meetsMinimumSEO(validation: EventValidationResult): boolean {
  return validation.isValid && validation.seoScore >= 60 && validation.qualityScore >= 60;
}

/**
 * Get human-readable recommendations
 */
export function getSEORecommendations(validation: EventValidationResult): string[] {
  const recommendations: string[] = [];

  if (validation.seoScore < 60) {
    recommendations.push('⚠️ SEO score below recommended threshold');
  }

  if (validation.qualityScore < 60) {
    recommendations.push('⚠️ Event quality below recommended threshold');
  }

  if (validation.errors.length > 0) {
    recommendations.push(`🚫 ${validation.errors.length} validation error(s) must be fixed`);
  }

  if (validation.warnings.length > 0) {
    recommendations.push(`⚠️ ${validation.warnings.length} warning(s) to review`);
  }

  if (validation.seoScore >= 80 && validation.qualityScore >= 80) {
    recommendations.push('✅ Event meets high quality standards!');
  }

  return recommendations;
}

/**
 * Calculate similarity between two strings (0-1)
 * Used for duplicate detection
 */
export function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  
  if (aLower === bLower) return 1.0;
  
  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));
  
  const intersection = new Set([...aWords].filter(x => bWords.has(x)));
  const union = new Set([...aWords, ...bWords]);
  
  return intersection.size / union.size;
}

/**
 * Normalize address for comparison
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,\.]/g, '')
    .trim();
}
