/**
 * Unsplash Integration Service for EventNexus
 * 
 * Provides access to high-quality stock photos from Unsplash
 * for event hero images, banners, and white-label backgrounds.
 * 
 * API Documentation: https://unsplash.com/documentation
 */

const UNSPLASH_ACCESS_KEY = import.meta.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_BASE = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  description: string;
  user: {
    name: string;
    username: string;
    portfolio_url: string;
  };
  links: {
    html: string;
    download_location: string;
  };
  width: number;
  height: number;
}

interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

/**
 * Search Unsplash photos by query
 */
export async function searchUnsplashPhotos(
  query: string,
  options: {
    page?: number;
    perPage?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
    orderBy?: 'relevant' | 'latest';
  } = {}
): Promise<UnsplashSearchResult | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('❌ Unsplash API key not configured');
    return null;
  }

  const { page = 1, perPage = 20, orientation = 'landscape', orderBy = 'relevant' } = options;

  try {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString(),
      orientation,
      order_by: orderBy,
    });

    const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      console.error('❌ Unsplash API error:', response.status, response.statusText);
      return null;
    }

    const data: UnsplashSearchResult = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error searching Unsplash:', error);
    return null;
  }
}

/**
 * Get a random photo from Unsplash
 */
export async function getRandomUnsplashPhoto(
  query?: string,
  options: {
    orientation?: 'landscape' | 'portrait' | 'squarish';
    count?: number;
  } = {}
): Promise<UnsplashPhoto | UnsplashPhoto[] | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('❌ Unsplash API key not configured');
    return null;
  }

  const { orientation = 'landscape', count = 1 } = options;

  try {
    const params = new URLSearchParams({
      orientation,
      count: count.toString(),
    });

    if (query) {
      params.append('query', query);
    }

    const response = await fetch(`${UNSPLASH_API_BASE}/photos/random?${params}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      console.error('❌ Unsplash API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching random photo:', error);
    return null;
  }
}

/**
 * Track download for Unsplash API requirements
 * MUST be called when using a photo to comply with Unsplash API guidelines
 */
export async function trackUnsplashDownload(downloadLocation: string): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY) return;

  try {
    await fetch(downloadLocation, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });
  } catch (error) {
    console.error('❌ Error tracking download:', error);
  }
}

/**
 * Get optimized image URL for specific dimensions
 */
export function getOptimizedImageUrl(
  photo: UnsplashPhoto,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    fit?: 'crop' | 'clamp' | 'clip' | 'facearea' | 'fill' | 'fillmax' | 'max' | 'min' | 'scale';
  } = {}
): string {
  const { width = 1920, height, quality = 80, fit = 'crop' } = options;

  const params = new URLSearchParams({
    w: width.toString(),
    q: quality.toString(),
    fit,
  });

  if (height) {
    params.append('h', height.toString());
  }

  return `${photo.urls.raw}&${params}`;
}

/**
 * Search for event-related hero images
 */
export async function searchEventHeroImages(
  eventType: string = 'event'
): Promise<UnsplashPhoto[]> {
  const queries = [
    `${eventType} crowd`,
    `${eventType} venue`,
    `${eventType} stage`,
    `${eventType} audience`,
  ];

  try {
    const results = await Promise.all(
      queries.map(query => searchUnsplashPhotos(query, { perPage: 5, orientation: 'landscape' }))
    );

    const photos = results
      .filter(result => result !== null)
      .flatMap(result => result!.results);

    return photos;
  } catch (error) {
    console.error('❌ Error searching event hero images:', error);
    return [];
  }
}

/**
 * Get attribution HTML for Unsplash photo (required by API terms)
 */
export function getUnsplashAttribution(photo: UnsplashPhoto): string {
  return `Photo by <a href="${photo.user.portfolio_url || photo.links.html}?utm_source=eventnexus&utm_medium=referral" target="_blank" rel="noopener noreferrer">${photo.user.name}</a> on <a href="https://unsplash.com?utm_source=eventnexus&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>`;
}

// Example usage:
/*
// Search for concert photos
const concertPhotos = await searchUnsplashPhotos('concert', {
  perPage: 10,
  orientation: 'landscape'
});

// Get random event photo
const randomPhoto = await getRandomUnsplashPhoto('festival', {
  orientation: 'landscape'
});

// Get optimized URL for hero image (1920x1080)
if (randomPhoto && !Array.isArray(randomPhoto)) {
  const heroUrl = getOptimizedImageUrl(randomPhoto, {
    width: 1920,
    height: 1080,
    quality: 90
  });
  
  // Track download (required!)
  await trackUnsplashDownload(randomPhoto.links.download_location);
  
  // Use heroUrl in your branding config
  console.log('Hero image URL:', heroUrl);
}
*/

export default {
  searchUnsplashPhotos,
  getRandomUnsplashPhoto,
  trackUnsplashDownload,
  getOptimizedImageUrl,
  searchEventHeroImages,
  getUnsplashAttribution,
};
