/**
 * Geocoding Service with Caching and Retry Logic
 * Handles location lookup from address strings and coordinates
 * Caches results for 24 hours to reduce Nominatim API calls
 * Rate limits requests to prevent abuse
 */

import { rateLimiters } from './rateLimitService';

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address: string;
  city: string;
  country: string;
}

// In-memory cache with expiry
const CACHE_KEY_PREFIX = 'geocode_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Get cached result if available and not expired
 */
function getCachedResult(query: string): GeocodeResult | null {
  try {
    const key = CACHE_KEY_PREFIX + query.toLowerCase();
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const { data, timestamp } = JSON.parse(stored);
    const age = Date.now() - timestamp;
    
    // If expired, remove and return null
    if (age > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data as GeocodeResult;
  } catch {
    return null;
  }
}

/**
 * Store result in cache
 */
function setCacheResult(query: string, result: GeocodeResult): void {
  try {
    const key = CACHE_KEY_PREFIX + query.toLowerCase();
    localStorage.setItem(key, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));
  } catch {
    // Silently fail cache storage (localStorage full, etc.)
  }
}

/**
 * Exponential backoff retry wrapper
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 500
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt); // 500ms, 1s, 2s, ...
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError || new Error('Unknown geocoding error');
}

/**
 * Geocode address string to coordinates
 * Implements caching and retry logic with rate limiting
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || address.trim().length === 0) {
    throw new Error('Address cannot be empty');
  }
  
  // Check cache first
  const cached = getCachedResult(address);
  if (cached) {
    console.log('📍 Geocode cache hit:', address);
    return cached;
  }
  
  // Check rate limit
  const limiter = rateLimiters.geocoding;
  const status = limiter.checkLimit();
  if (status.limited) {
    throw new Error(`Rate limited. Try again in ${(status.retryAfterMs / 1000).toFixed(1)}s`);
  }
  
  // Record rate limit
  if (!limiter.recordRequest()) {
    throw new Error('Rate limited');
  }
  
  console.log('🔍 Geocoding address:', address);
  
  const result = await retryWithBackoff(async () => {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '1'
    });
    
    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { 'User-Agent': 'EventNexus/1.0' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No results found for: ${address}`);
    }
    
    const first = data[0];
    const result: GeocodeResult = {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
      address: first.address?.road || '',
      city: first.address?.city || first.address?.town || first.address?.village || '',
      country: first.address?.country || ''
    };
    
    setCacheResult(address, result);
    return result;
  });
  
  return result;
}

/**
 * Reverse geocode coordinates to address
 * Useful for map-based location selection
 * Rate limited to prevent abuse
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const query = `${lat},${lng}`;
  
  // Check cache first
  const cached = getCachedResult(query);
  if (cached) {
    console.log('📍 Reverse geocode cache hit:', query);
    return cached;
  }
  
  // Check rate limit
  const limiter = rateLimiters.geocoding;
  const status = limiter.checkLimit();
  if (status.limited) {
    throw new Error(`Rate limited. Try again in ${(status.retryAfterMs / 1000).toFixed(1)}s`);
  }
  
  // Record rate limit
  if (!limiter.recordRequest()) {
    throw new Error('Rate limited');
  }
  
  console.log('🔍 Reverse geocoding:', query);
  
  const result = await retryWithBackoff(async () => {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1'
    });
    
    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { 'User-Agent': 'EventNexus/1.0' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const result: GeocodeResult = {
      lat,
      lng,
      displayName: data.display_name,
      address: data.address?.road || '',
      city: data.address?.city || data.address?.town || data.address?.village || '',
      country: data.address?.country || ''
    };
    
    setCacheResult(query, result);
    return result;
  });
  
  return result;
}

/**
 * Clear geocoding cache (for admin operations)
 */
export function clearGeocodingCache(): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ Geocoding cache cleared');
  } catch (error) {
    console.error('Error clearing geocoding cache:', error);
  }
}

/**
 * Get cache statistics for admin dashboard
 */
export function getGeocodingCacheStats(): {
  entries: number;
  sizeKb: number;
} {
  let sizeKb = 0;
  let entries = 0;
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        entries++;
        sizeKb += (localStorage.getItem(key) || '').length / 1024;
      }
    });
  } catch {
    // Ignore
  }
  
  return { entries, sizeKb: Math.round(sizeKb * 100) / 100 };
}
