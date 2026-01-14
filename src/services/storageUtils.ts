/**
 * Storage Utilities for Enterprise Media Management
 * Provides helper functions for file validation, compression, and format conversion
 */

// File size limits per bucket (in bytes)
export const STORAGE_LIMITS = {
  'enterprise-media': 500 * 1024 * 1024,  // 500 MB
  'event-highlights': 500 * 1024 * 1024,  // 500 MB
  'team-avatars': 10 * 1024 * 1024,       // 10 MB
  'partner-logos': 5 * 1024 * 1024,       // 5 MB
  'media-logos': 5 * 1024 * 1024,         // 5 MB
  'testimonial-avatars': 5 * 1024 * 1024, // 5 MB
};

// Allowed MIME types per bucket
export const ALLOWED_MIME_TYPES = {
  'enterprise-media': [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ],
  'event-highlights': [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm'
  ],
  'team-avatars': ['image/jpeg', 'image/png', 'image/webp'],
  'partner-logos': ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
  'media-logos': ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
  'testimonial-avatars': ['image/jpeg', 'image/png', 'image/webp'],
};

// Storage quota by subscription tier
export const TIER_QUOTAS = {
  free: 100 * 1024 * 1024,        // 100 MB
  pro: 1024 * 1024 * 1024,        // 1 GB
  premium: 10 * 1024 * 1024 * 1024, // 10 GB
  enterprise: 50 * 1024 * 1024 * 1024, // 50 GB
};

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
  bucket: string
): { valid: boolean; error?: string } => {
  // Check if bucket is valid
  if (!STORAGE_LIMITS[bucket]) {
    return { valid: false, error: 'Invalid storage bucket' };
  }

  // Check file size
  if (file.size > STORAGE_LIMITS[bucket]) {
    const maxSizeMB = Math.round(STORAGE_LIMITS[bucket] / 1024 / 1024);
    return { 
      valid: false, 
      error: `File size exceeds ${maxSizeMB}MB limit for ${bucket}` 
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES[bucket].includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type} not allowed for ${bucket}` 
    };
  }

  return { valid: true };
};

/**
 * Compress image file before upload
 * Returns compressed file or original if compression fails
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // Don't compress SVGs
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Only use compressed version if it's smaller
            if (blob.size < file.size) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
};

/**
 * Generate thumbnail from image
 */
export const generateThumbnail = async (
  file: File,
  size: number = 200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(size / img.width, size / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context error'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Image load error'));
    };

    reader.onerror = () => reject(new Error('File read error'));
  });
};

/**
 * Get video thumbnail from first frame
 */
export const getVideoThumbnail = async (
  file: File,
  timeInSeconds: number = 1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      reject(new Error('Not a video file'));
      return;
    }

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context error'));
      return;
    }

    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeInSeconds, video.duration);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Video load error'));
    };
  });
};

/**
 * Format bytes to human readable string
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Generate unique filename
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = getFileExtension(originalName);
  return `${timestamp}-${random}.${extension}`;
};

/**
 * Check if file is image
 */
export const isImage = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if file is video
 */
export const isVideo = (file: File): boolean => {
  return file.type.startsWith('video/');
};

/**
 * Get media type from MIME type
 */
export const getMediaType = (mimeType: string): 'image' | 'video' | 'logo' | 'unknown' => {
  if (mimeType.startsWith('image/')) {
    if (mimeType === 'image/svg+xml' || mimeType === 'image/png') {
      return 'logo';
    }
    return 'image';
  }
  if (mimeType.startsWith('video/')) return 'video';
  return 'unknown';
};

/**
 * Create file preview URL (for local display before upload)
 */
export const createPreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke preview URL to free memory
 */
export const revokePreviewUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * Batch process files with progress callback
 */
export const batchProcessFiles = async (
  files: File[],
  processor: (file: File) => Promise<any>,
  onProgress?: (current: number, total: number) => void
): Promise<any[]> => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await processor(files[i]);
      results.push({ success: true, result, file: files[i] });
    } catch (error) {
      results.push({ success: false, error, file: files[i] });
    }
    
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }
  
  return results;
};

/**
 * Estimate upload time based on file size and connection speed
 * @param fileSizeBytes - Size of file in bytes
 * @param speedMbps - Connection speed in Mbps (default 10)
 * @returns Estimated time in seconds
 */
export const estimateUploadTime = (
  fileSizeBytes: number,
  speedMbps: number = 10
): number => {
  const speedBps = (speedMbps * 1024 * 1024) / 8; // Convert Mbps to bytes per second
  return Math.ceil(fileSizeBytes / speedBps);
};

/**
 * Format upload time to human readable string
 */
export const formatUploadTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
};

/**
 * Check if user has enough storage quota
 */
export const hasEnoughQuota = (
  currentUsage: number,
  fileSize: number,
  quota: number
): boolean => {
  return (currentUsage + fileSize) <= quota;
};

/**
 * Calculate remaining storage
 */
export const getRemainingStorage = (
  currentUsage: number,
  quota: number
): number => {
  return Math.max(0, quota - currentUsage);
};

/**
 * Get storage usage percentage
 */
export const getStoragePercentage = (
  currentUsage: number,
  quota: number
): number => {
  if (quota === 0) return 0;
  return Math.min(100, Math.round((currentUsage / quota) * 100));
};

/**
 * Recommended compression settings by bucket type
 */
export const COMPRESSION_PRESETS = {
  'enterprise-media': { maxWidth: 1920, maxHeight: 1080, quality: 0.9 },
  'event-highlights': { maxWidth: 1920, maxHeight: 1080, quality: 0.85 },
  'team-avatars': { maxWidth: 400, maxHeight: 400, quality: 0.85 },
  'partner-logos': { maxWidth: 800, maxHeight: 800, quality: 0.9 },
  'media-logos': { maxWidth: 800, maxHeight: 800, quality: 0.9 },
  'testimonial-avatars': { maxWidth: 200, maxHeight: 200, quality: 0.8 },
};

/**
 * Get recommended compression settings for bucket
 */
export const getCompressionPreset = (bucket: string) => {
  return COMPRESSION_PRESETS[bucket] || COMPRESSION_PRESETS['enterprise-media'];
};
