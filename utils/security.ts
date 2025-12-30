/**
 * Security utilities for EventNexus
 * Provides URL validation, HTML sanitization, and XSS protection
 */

import DOMPurify from 'dompurify';

// Type definitions for DOMPurify config
interface DOMPurifyConfig {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  FORCE_BODY?: boolean;
  RETURN_TRUSTED_TYPE?: boolean;
}

/**
 * Validates and sanitizes URLs to prevent XSS and open redirect attacks
 * @param url - URL string to validate
 * @param allowedProtocols - Allowed URL protocols (default: http, https)
 * @param allowedDomains - Optional whitelist of allowed domains
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:'],
  allowedDomains?: string[]
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Trim whitespace and decode to prevent bypass attempts
    const trimmedUrl = url.trim();
    
    // Block javascript:, data:, vbscript:, file: protocols
    const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
    if (dangerousProtocols.test(trimmedUrl)) {
      console.warn('[Security] Blocked dangerous protocol:', trimmedUrl.substring(0, 50));
      return null;
    }

    // Parse URL
    const urlObj = new URL(trimmedUrl, window.location.href);
    
    // Validate protocol
    if (!allowedProtocols.includes(urlObj.protocol)) {
      console.warn('[Security] Invalid protocol:', urlObj.protocol);
      return null;
    }

    // Validate domain if whitelist provided
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => {
        return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
      });
      
      if (!isAllowed) {
        console.warn('[Security] Domain not whitelisted:', urlObj.hostname);
        return null;
      }
    }

    // Return sanitized URL
    return urlObj.href;
  } catch (error) {
    console.error('[Security] Invalid URL:', error);
    return null;
  }
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Uses DOMPurify with strict configuration
 * @param html - HTML string to sanitize
 * @param config - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, config?: DOMPurifyConfig): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const defaultConfig: DOMPurifyConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    RETURN_TRUSTED_TYPE: false,
  };

  const mergedConfig = { ...defaultConfig, ...config };
  
  return DOMPurify.sanitize(html, mergedConfig) as string;
}

/**
 * Validates YouTube/video embed URLs
 * @param url - Video URL to validate
 * @returns Sanitized embed URL or null if invalid
 */
export function sanitizeVideoUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const urlObj = new URL(url.trim());
    
    // Only allow specific video domains
    const allowedDomains = [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'player.vimeo.com',
      'vimeo.com',
    ];

    const isAllowed = allowedDomains.some(domain => {
      return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
    });

    if (!isAllowed) {
      console.warn('[Security] Video URL domain not allowed:', urlObj.hostname);
      return null;
    }

    // Convert to embed format for YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
      let videoId = '';
      
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.searchParams.has('v')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1];
      }

      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Convert to embed format for Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const vimeoId = urlObj.pathname.split('/').filter(Boolean)[0];
      if (vimeoId && /^\d+$/.test(vimeoId)) {
        return `https://player.vimeo.com/video/${vimeoId}`;
      }
    }

    return urlObj.href;
  } catch (error) {
    console.error('[Security] Invalid video URL:', error);
    return null;
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * Use this for plain text that should never contain HTML
 * @param text - Text to escape
 * @returns Escaped text safe for HTML insertion
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Validates and sanitizes redirect URLs to prevent open redirect attacks
 * Only allows relative URLs or whitelisted domains
 * @param url - Redirect URL to validate
 * @param allowedDomains - Whitelist of allowed domains
 * @returns Sanitized URL or '/' if invalid
 */
export function sanitizeRedirectUrl(
  url: string,
  allowedDomains: string[] = []
): string {
  if (!url || typeof url !== 'string') {
    return '/';
  }

  const trimmedUrl = url.trim();

  // Allow relative URLs (must start with /)
  if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
    return trimmedUrl;
  }

  // For absolute URLs, validate domain
  try {
    const urlObj = new URL(trimmedUrl);
    
    // Check if domain is in whitelist
    const isAllowed = allowedDomains.some(domain => {
      return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
    });

    if (isAllowed && (urlObj.protocol === 'http:' || urlObj.protocol === 'https:')) {
      return urlObj.href;
    }
  } catch {
    // Invalid URL, return safe default
  }

  console.warn('[Security] Redirect URL blocked:', trimmedUrl.substring(0, 50));
  return '/';
}
