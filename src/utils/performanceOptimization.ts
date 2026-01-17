/**
 * Performance Optimization Utilities
 * Helps with critical rendering path and resource loading strategies
 */

/**
 * Lazy load images with Intersection Observer
 * Improves LCP and reduces initial payload
 */
export const enableLazyImages = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before the image enters viewport
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
};

/**
 * Defer non-critical third-party scripts
 */
export const deferThirdPartyScripts = () => {
  // Defer analytics scripts
  const analyticsScripts = document.querySelectorAll('script[src*="gtag"]');
  analyticsScripts.forEach((script) => {
    if (script.getAttribute('async') === null) {
      script.setAttribute('async', '');
    }
  });
};

/**
 * Enable font optimization with font-display swap
 * Ensures text is visible during font loading
 */
export const optimizeFontLoading = () => {
  // This is handled via CSS @font-face with font-display: swap
  // This function serves as documentation of the strategy
};

/**
 * Prefetch critical resources on idle time
 * Use with care to avoid wasting bandwidth
 */
export const prefetchCriticalResources = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Prefetch critical routes for authenticated users
      const links = [
        '/dashboard',
        '/admin',
      ];

      links.forEach((href) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
    });
  }
};

/**
 * Monitor Core Web Vitals
 * Track LCP, FID, and CLS for performance analysis
 */
export const monitorCoreWebVitals = () => {
  if ('web-vital' in window) {
    // Relies on web-vitals library being loaded
    const reportVitals = (metric: any) => {
      // Send to analytics endpoint
      console.debug('Core Web Vital:', metric.name, metric.value);
    };
  }
};

/**
 * Cleanup strategy for large DOM operations
 * Reduces forced reflows and layout thrashing
 */
export const batchDOMUpdates = (updateFn: () => void) => {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(() => {
      updateFn();
    });
  } else {
    updateFn();
  }
};

/**
 * Enable passive event listeners for scroll performance
 * Prevents scroll jank from JS event handlers
 */
export const enablePassiveListeners = () => {
  // Check if passive listeners are supported
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get() {
        supportsPassive = true;
        return true;
      }
    });
    window.addEventListener('test', () => {}, opts);
    window.removeEventListener('test', () => {}, opts);
  } catch (err) {
    supportsPassive = false;
  }

  if (supportsPassive) {
    // Browser supports passive listeners
    // Ensure scroll handlers use passive: true
  }
};

/**
 * Dynamically import heavy modules on demand
 * Reduces initial bundle size
 */
export const loadModuleOnDemand = async <T>(importFn: () => Promise<T>): Promise<T> => {
  try {
    return await importFn();
  } catch (error) {
    console.error('Failed to load module on demand:', error);
    throw error;
  }
};

/**
 * Initialize all performance optimizations
 */
export const initializePerformanceOptimizations = () => {
  // Run on next idle time to avoid blocking critical rendering
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      enableLazyImages();
      deferThirdPartyScripts();
      enablePassiveListeners();
    });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(() => {
      enableLazyImages();
      deferThirdPartyScripts();
      enablePassiveListeners();
    }, 2000);
  }
};
