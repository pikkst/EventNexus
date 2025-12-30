/**
 * Security Utilities Test Suite
 * Tests for XSS prevention and URL sanitization
 */

import { sanitizeUrl, sanitizeVideoUrl, sanitizeHtml, escapeHtml, sanitizeRedirectUrl } from './security';

describe('Security Utilities', () => {
  describe('sanitizeUrl', () => {
    test('should allow valid HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    test('should allow valid HTTP URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    test('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert("XSS")')).toBeNull();
    });

    test('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("XSS")</script>')).toBeNull();
    });

    test('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBeNull();
    });

    test('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    test('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
    });

    test('should validate against domain whitelist', () => {
      expect(sanitizeUrl('https://example.com', ['http:', 'https:'], ['example.com'])).toBe('https://example.com/');
      expect(sanitizeUrl('https://evil.com', ['http:', 'https:'], ['example.com'])).toBeNull();
    });
  });

  describe('sanitizeVideoUrl', () => {
    test('should convert YouTube watch URL to embed', () => {
      expect(sanitizeVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
        .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    test('should convert youtu.be short URL to embed', () => {
      expect(sanitizeVideoUrl('https://youtu.be/dQw4w9WgXcQ'))
        .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    test('should accept valid YouTube embed URL', () => {
      const embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(sanitizeVideoUrl(embedUrl)).toBe(embedUrl);
    });

    test('should convert Vimeo URL to embed', () => {
      expect(sanitizeVideoUrl('https://vimeo.com/123456789'))
        .toBe('https://player.vimeo.com/video/123456789');
    });

    test('should block non-video domains', () => {
      expect(sanitizeVideoUrl('https://evil.com/fake-video')).toBeNull();
    });

    test('should block javascript: URLs', () => {
      expect(sanitizeVideoUrl('javascript:alert("XSS")')).toBeNull();
    });
  });

  describe('sanitizeHtml', () => {
    test('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      expect(sanitizeHtml(html)).toContain('<p>');
      expect(sanitizeHtml(html)).toContain('<strong>');
    });

    test('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("XSS")</script>';
      expect(sanitizeHtml(html)).not.toContain('<script>');
      expect(sanitizeHtml(html)).not.toContain('alert');
    });

    test('should remove onclick attributes', () => {
      const html = '<p onclick="alert(\'XSS\')">Click me</p>';
      expect(sanitizeHtml(html)).not.toContain('onclick');
    });

    test('should remove javascript: hrefs', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });

    test('should allow safe links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('href="https://example.com"');
    });

    test('should remove dangerous tags like iframe', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      expect(sanitizeHtml(html)).not.toContain('<iframe');
    });
  });

  describe('escapeHtml', () => {
    test('should escape < and >', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    test('should escape quotes', () => {
      expect(escapeHtml('"Hello"')).toContain('&quot;');
      expect(escapeHtml("'Hello'")).toContain('&#39;');
    });

    test('should escape ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('should handle normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeRedirectUrl', () => {
    test('should allow relative URLs', () => {
      expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
    });

    test('should block protocol-relative URLs', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/');
    });

    test('should allow whitelisted domains', () => {
      expect(sanitizeRedirectUrl('https://example.com', ['example.com']))
        .toBe('https://example.com/');
    });

    test('should block non-whitelisted domains', () => {
      expect(sanitizeRedirectUrl('https://evil.com', ['example.com']))
        .toBe('/');
    });

    test('should block javascript: URLs', () => {
      expect(sanitizeRedirectUrl('javascript:alert("XSS")')).toBe('/');
    });
  });
});

// Manual testing examples
export const testSecurityUtils = () => {
  console.group('🔒 Security Utils Test Results');

  // Test dangerous URLs
  const dangerousUrls = [
    'javascript:alert("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
    'vbscript:msgbox("XSS")',
    'file:///etc/passwd',
  ];

  console.log('Testing dangerous URLs (all should return null):');
  dangerousUrls.forEach(url => {
    const result = sanitizeUrl(url);
    console.log(`${url.substring(0, 50)} => ${result}`);
  });

  // Test video URLs
  const videoUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
  ];

  console.log('\nTesting video URLs (all should convert to embed):');
  videoUrls.forEach(url => {
    const result = sanitizeVideoUrl(url);
    console.log(`${url} => ${result}`);
  });

  // Test HTML sanitization
  const dangerousHtml = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)">Click</a>',
  ];

  console.log('\nTesting HTML sanitization (should remove dangerous content):');
  dangerousHtml.forEach(html => {
    const result = sanitizeHtml(html);
    console.log(`${html} => ${result}`);
  });

  console.groupEnd();
};
