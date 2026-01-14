/**
 * Pexels Integration Service for EventNexus
 * 
 * Provides access to free stock videos and photos from Pexels
 * for event marketing, social media ads, and white-label content.
 * 
 * API Documentation: https://www.pexels.com/api/documentation/
 */

const PEXELS_API_KEY = import.meta.env.PEXELS_API_KEY || process.env.PEXELS_API_KEY || '';
const PEXELS_API_BASE = 'https://api.pexels.com';

// ============================================================================
// TYPES
// ============================================================================

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string; // Preview image URL
  url: string; // Pexels page URL
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

interface PexelsVideoFile {
  id: number;
  quality: 'hd' | 'sd' | 'uhd';
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideoPicture {
  id: number;
  picture: string;
  nr: number;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string; // Pexels page URL
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsSearchResult<T> {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos?: T[];
  photos?: T[];
}

// Social media platform specs
export const PLATFORM_SPECS = {
  facebook: {
    feed: { width: 1200, height: 630, aspectRatio: '1.91:1', maxDuration: 240 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 15 },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 60 },
  },
  instagram: {
    feed: { width: 1080, height: 1080, aspectRatio: '1:1', maxDuration: 60 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 15 },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 90 },
  },
  tiktok: {
    video: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 60 },
  },
  twitter: {
    feed: { width: 1200, height: 675, aspectRatio: '16:9', maxDuration: 140 },
    video: { width: 1280, height: 720, aspectRatio: '16:9', maxDuration: 140 },
  },
  youtube: {
    video: { width: 1920, height: 1080, aspectRatio: '16:9', maxDuration: 3600 },
    short: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 60 },
  },
};

// ============================================================================
// PEXELS API FUNCTIONS
// ============================================================================

/**
 * Search Pexels videos by query
 */
export async function searchPexelsVideos(
  query: string,
  options: {
    page?: number;
    perPage?: number;
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'small' | 'medium' | 'large';
  } = {}
): Promise<PexelsSearchResult<PexelsVideo> | null> {
  if (!PEXELS_API_KEY) {
    console.error('❌ Pexels API key not configured');
    return null;
  }

  const { page = 1, perPage = 15, orientation, size } = options;

  try {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (orientation) params.append('orientation', orientation);
    if (size) params.append('size', size);

    const response = await fetch(`${PEXELS_API_BASE}/videos/search?${params}`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('❌ Pexels API error:', response.status, response.statusText);
      return null;
    }

    const data: PexelsSearchResult<PexelsVideo> = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error searching Pexels videos:', error);
    return null;
  }
}

/**
 * Search Pexels photos by query
 */
export async function searchPexelsPhotos(
  query: string,
  options: {
    page?: number;
    perPage?: number;
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  } = {}
): Promise<PexelsSearchResult<PexelsPhoto> | null> {
  if (!PEXELS_API_KEY) {
    console.error('❌ Pexels API key not configured');
    return null;
  }

  const { page = 1, perPage = 15, orientation, size, color } = options;

  try {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (orientation) params.append('orientation', orientation);
    if (size) params.append('size', size);
    if (color) params.append('color', color);

    const response = await fetch(`${PEXELS_API_BASE}/v1/search?${params}`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('❌ Pexels API error:', response.status, response.statusText);
      return null;
    }

    const data: PexelsSearchResult<PexelsPhoto> = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error searching Pexels photos:', error);
    return null;
  }
}

/**
 * Get popular videos from Pexels
 */
export async function getPopularPexelsVideos(
  options: {
    page?: number;
    perPage?: number;
    minWidth?: number;
    minHeight?: number;
    minDuration?: number;
    maxDuration?: number;
  } = {}
): Promise<PexelsSearchResult<PexelsVideo> | null> {
  if (!PEXELS_API_KEY) {
    console.error('❌ Pexels API key not configured');
    return null;
  }

  const { page = 1, perPage = 15, minWidth, minHeight, minDuration, maxDuration } = options;

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (minWidth) params.append('min_width', minWidth.toString());
    if (minHeight) params.append('min_height', minHeight.toString());
    if (minDuration) params.append('min_duration', minDuration.toString());
    if (maxDuration) params.append('max_duration', maxDuration.toString());

    const response = await fetch(`${PEXELS_API_BASE}/videos/popular?${params}`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('❌ Pexels API error:', response.status, response.statusText);
      return null;
    }

    const data: PexelsSearchResult<PexelsVideo> = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching popular videos:', error);
    return null;
  }
}

// ============================================================================
// VIDEO SELECTION LOGIC
// ============================================================================

/**
 * Find best video for specific platform and placement
 */
export function findBestVideoForPlatform(
  videos: PexelsVideo[],
  platform: keyof typeof PLATFORM_SPECS,
  placement: string
): { video: PexelsVideo; file: PexelsVideoFile } | null {
  const spec = PLATFORM_SPECS[platform]?.[placement as keyof typeof PLATFORM_SPECS[typeof platform]];
  if (!spec) return null;

  // Calculate aspect ratio
  const targetAspectRatio = spec.width / spec.height;

  for (const video of videos) {
    // Filter by duration
    if (video.duration > spec.maxDuration) continue;

    // Find best matching video file
    const videoAspectRatio = video.width / video.height;
    const aspectRatioDiff = Math.abs(videoAspectRatio - targetAspectRatio);

    // Accept if aspect ratio is close enough (within 10%)
    if (aspectRatioDiff / targetAspectRatio < 0.1) {
      // Find HD or best quality file
      const file = video.video_files.find(f => 
        f.quality === 'hd' && 
        f.width >= spec.width &&
        f.height >= spec.height
      ) || video.video_files[0];

      if (file) {
        return { video, file };
      }
    }
  }

  return null;
}

/**
 * Search videos optimized for social media ads
 */
export async function searchSocialMediaVideos(
  query: string,
  platform: keyof typeof PLATFORM_SPECS,
  placement: string,
  options: { count?: number } = {}
): Promise<Array<{ video: PexelsVideo; file: PexelsVideoFile }>> {
  const { count = 5 } = options;

  const spec = PLATFORM_SPECS[platform]?.[placement as keyof typeof PLATFORM_SPECS[typeof platform]];
  if (!spec) return [];

  // Determine orientation based on aspect ratio
  let orientation: 'landscape' | 'portrait' | 'square' = 'landscape';
  if (spec.aspectRatio === '9:16' || spec.aspectRatio === '4:5') {
    orientation = 'portrait';
  } else if (spec.aspectRatio === '1:1') {
    orientation = 'square';
  }

  // Search with more results to filter
  const result = await searchPexelsVideos(query, {
    perPage: 30,
    orientation,
  });

  if (!result || !result.videos) return [];

  // Filter videos by duration and find best matches
  const matches: Array<{ video: PexelsVideo; file: PexelsVideoFile }> = [];

  for (const video of result.videos) {
    if (video.duration > spec.maxDuration) continue;

    const match = findBestVideoForPlatform([video], platform, placement);
    if (match) {
      matches.push(match);
      if (matches.length >= count) break;
    }
  }

  return matches;
}

/**
 * Get attribution text for Pexels content (optional but recommended)
 */
export function getPexelsAttribution(
  content: PexelsVideo | PexelsPhoto
): string {
  if ('user' in content) {
    // Video
    return `Video by ${content.user.name} from Pexels`;
  } else {
    // Photo
    return `Photo by ${content.photographer} from Pexels`;
  }
}

/**
 * Get multiple videos for cross-platform campaign
 */
export async function getMultiPlatformVideos(
  query: string,
  platforms: Array<{
    platform: keyof typeof PLATFORM_SPECS;
    placement: string;
  }>
): Promise<Map<string, { video: PexelsVideo; file: PexelsVideoFile }>> {
  const results = new Map<string, { video: PexelsVideo; file: PexelsVideoFile }>();

  // Search once and reuse results
  const searchResults = await searchPexelsVideos(query, { perPage: 30 });
  if (!searchResults || !searchResults.videos) return results;

  for (const { platform, placement } of platforms) {
    const match = findBestVideoForPlatform(searchResults.videos, platform, placement);
    if (match) {
      results.set(`${platform}_${placement}`, match);
    }
  }

  return results;
}

/**
 * Search event-specific videos
 */
export async function searchEventVideos(
  eventType: string,
  mood: 'energetic' | 'professional' | 'casual' | 'elegant' = 'energetic'
): Promise<PexelsVideo[]> {
  const moodKeywords = {
    energetic: 'crowd dancing party celebration',
    professional: 'conference business meeting presentation',
    casual: 'gathering friends social outdoor',
    elegant: 'gala formal dinner luxury venue',
  };

  const query = `${eventType} ${moodKeywords[mood]}`;
  const result = await searchPexelsVideos(query, {
    perPage: 15,
    orientation: 'landscape',
  });

  return result?.videos || [];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  searchPexelsVideos,
  searchPexelsPhotos,
  getPopularPexelsVideos,
  findBestVideoForPlatform,
  searchSocialMediaVideos,
  getPexelsAttribution,
  getMultiPlatformVideos,
  searchEventVideos,
  PLATFORM_SPECS,
};
