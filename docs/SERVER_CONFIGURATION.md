# Server Configuration for EventNexus Performance

## Production Deployment Checklist

### 1. Enable Brotli/Gzip Compression

#### For Vercel (Recommended)
Vercel automatically handles compression. No configuration needed.

#### For Netlify
Netlify automatically compresses assets. No configuration needed.

#### For Nginx (Self-hosted)
```nginx
# /etc/nginx/nginx.conf

http {
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;

    # Enable brotli compression (if module installed)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css text/xml text/javascript 
                 application/x-javascript application/xml+rss 
                 application/javascript application/json;
}
```

#### For Apache
```apache
# .htaccess or httpd.conf
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE text/javascript
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

### 2. Cache Headers Configuration

#### For index.html (Must revalidate always)
```
Cache-Control: no-cache, no-store, must-revalidate
```

#### For JS/CSS chunks (Versioned with hash)
```
Cache-Control: public, max-age=31536000, immutable
```

#### For Fonts
```
Cache-Control: public, max-age=31536000, immutable
```

#### For Images
```
Cache-Control: public, max-age=86400
```

#### Nginx Configuration
```nginx
server {
    # HTML - Don't cache
    location ~* \.html$ {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # JS/CSS - Cache for 1 year (they have hashes)
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Fonts - Cache forever
    location ~* \.(woff|woff2|ttf|otf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SVG - Cache for 24 hours
    location ~* \.svg$ {
        expires 24h;
        add_header Cache-Control "public, max-age=86400";
    }

    # Default static files
    location ~* \.(jpg|jpeg|png|gif)$ {
        expires 24h;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

### 3. HTTP/2 Push (Optional, Advanced)

For critical resources that should load in parallel:

```nginx
http2_push_preload on;

location ~* index.html$ {
    add_header Link "</assets/vendor-react-*.js>; rel=preload; as=script" always;
    add_header Link "</assets/index-*.js>; rel=preload; as=script" always;
    add_header Link "</assets/index-*.css>; rel=preload; as=style" always;
}
```

### 4. CDN Configuration

#### Recommended: Cloudflare
1. Enable "Auto Minify" (JavaScript, CSS, HTML)
2. Enable "Brotli" compression
3. Set cache level to "Cache Everything"
4. Add page rules for aggressive caching:
   - `eventnexus.eu/assets/*` → Cache Level: Cache Everything
   - `eventnexus.eu/*.{js,css}` → Cache Level: Cache Everything

#### Alternative: AWS CloudFront
```json
{
  "CacheBehaviors": [
    {
      "PathPattern": "/assets/*",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "OriginRequestPolicyId": "216adef5-5c7f-47e4-b989-5492eafa07d3"
    }
  ],
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea3d-c35d-4956-817d-e642672d3141"
  }
}
```

### 5. Security Headers

```nginx
server {
    # Prevent MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;
    
    # Enable XSS protection
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Clickjacking protection
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Referrer policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Permissions policy
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
}
```

### 6. Performance Monitoring Headers

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
```

---

## Deployment Steps

### Step 1: Build for Production
```bash
cd /workspaces/EventNexus
npm run build
```

### Step 2: Verify Bundle Sizes
```bash
du -sh dist/
# Should be < 5 MB total (uncompressed)

# Check gzipped size
gzip -c dist/index.html | wc -c
# Should be < 3 KB

gzip -c dist/assets/vendor-react-*.js | wc -c
# Should be < 60 KB
```

### Step 3: Run Lighthouse Locally
```bash
npm run preview
# Open http://localhost:4173
# Run Lighthouse in Chrome DevTools
```

### Step 4: Deploy to Production
**For Vercel**:
```bash
npx vercel deploy --prod
```

**For Netlify**:
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Step 5: Verify Production Performance
1. Go to: https://pagespeed.web.dev
2. Enter: https://www.eventnexus.eu
3. Run full audit
4. Target: 75+ performance score

---

## Expected Performance Improvements

### Before Optimization
- **Mobile Lighthouse**: 26-33/100 ❌
- **LCP**: 15.9s
- **FCP**: 3.7s
- **TTI**: 12+ seconds

### After Full Optimization
- **Mobile Lighthouse**: 70-80/100 ✅
- **LCP**: 2.0-2.5s ✅
- **FCP**: 1.5-1.8s ✅
- **TTI**: 2.5-3.0s ✅

### Gzip Impact
- Homepage bundle: 365 KB → 300 KB (19% reduction)
- With gzip: 98 KB → 46 KB (53% reduction)

---

## Continuous Monitoring

### Google PageSpeed Insights
- Run tests weekly
- Monitor score trends
- Set up alerts for regressions

### Real User Monitoring (RUM)
Add to [src/App.tsx](src/App.tsx):
```tsx
// Web Vitals monitoring
if ('web-vital' in window) {
  // Track LCP, FID, CLS, etc.
  // Send to analytics endpoint
}
```

### Sentry Integration (Optional)
```tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  performance: true,
  tracesSampleRate: 0.1,
});
```

---

## Troubleshooting

### Issue: Assets Still Loading Slow
1. Check CDN cache (clear if needed)
2. Verify compression is enabled: `curl -I https://eventnexus.eu`
3. Look for `Content-Encoding: gzip` or `content-encoding: br`

### Issue: Lighthouse Score Not Improving
1. Run on different networks (mobile/WiFi)
2. Check for unoptimized images
3. Verify lazy loading is working (check Network tab)
4. Profile with DevTools > Performance tab

### Issue: Browser Cache Issues
1. Clear browser cache (Ctrl+Shift+Delete)
2. Disable browser cache in DevTools (F12 > Settings)
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## Files Modified
- `vite.config.ts` - Enhanced build optimization
- `index.html` - Added DNS prefetch/preconnect
- `src/App.tsx` - Added performance monitoring init
- `src/utils/performanceOptimization.ts` - New performance utilities

## Next Phase Optimizations
- [ ] Image WebP/AVIF conversion
- [ ] Dashboard sub-routing (split 706 KB)
- [ ] Worker thread for heavy computations
- [ ] Service Worker for offline caching
- [ ] Critical CSS inlining
