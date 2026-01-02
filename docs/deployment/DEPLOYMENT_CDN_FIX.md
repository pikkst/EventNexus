# CDN Cache Clear Instructions

## Problem
eventnexus.eu serves CACHED index.html with old chunk hashes (UserProfile-DugF9TLm.js).
New chunks exist in dist/ but not deployed yet OR CDN cache not cleared.

## Solution Steps

### 1. Wait for GitHub Pages Deployment
Check: https://github.com/pikkst/EventNexus/actions
Status: Should show ✅ green checkmark for latest commit f9f4083

### 2. Clear Fastly CDN Cache (GitHub Pages uses Fastly)
GitHub Pages automatically clears cache on new deployment, but can take 5-10 minutes.

**Manual CDN Cache Clear:**
```bash
# Force CDN refresh by adding query parameter
curl -I "https://www.eventnexus.eu/?v=$(date +%s)"
```

### 3. Browser Hard Refresh
After deployment completes:
- **Chrome/Edge:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- **Firefox:** Ctrl+F5 / Cmd+Shift+R
- **Safari:** Cmd+Option+R

### 4. Verify New Chunks Loaded
Open DevTools → Network → Reload
Should see: `UserProfile-DrEAuJFJ.js` (NEW) not `UserProfile-DugF9TLm.js` (OLD)

## Current Status
- ✅ Local build: UserProfile-DrEAuJFJ.js (new hash)
- ❌ Live site: UserProfile-DugF9TLm.js (old hash, 404)
- 🕐 CDN Cache: Hit (age: 9 seconds)

## Estimated Timeline
- Deployment: 2-3 minutes after push
- CDN propagation: 5-10 minutes
- **Total:** ~10-15 minutes from push

## Alternative: Bypass CDN Cache in Browser
Add `?nocache=1` to URL: https://www.eventnexus.eu/profile?nocache=1

## Check Deployment Status
```bash
# Option 1: GitHub Actions page
https://github.com/pikkst/EventNexus/actions

# Option 2: Check commit on live site
curl -s "https://www.eventnexus.eu/" | grep -o 'data-commit="[^"]*"'
# Should show: f9f4083 (latest commit)
```

## If Still 404 After 15 Minutes
1. Check if CNAME file is in dist/: `ls dist/CNAME`
2. Verify GitHub Pages settings: Settings → Pages → Custom domain
3. Re-push with empty commit to trigger rebuild:
   ```bash
   git commit --allow-empty -m "chore: Force CDN cache clear"
   git push origin main
   ```
