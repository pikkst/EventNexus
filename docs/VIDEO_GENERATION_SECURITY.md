# Video Generation Security Migration

## Overview
This document describes the security migration of Hugging Face video generation from client-side to server-side Edge Functions.

## Problem
Initial implementation exposed `HUGGINGFACE_TOKEN` in client-side code via `vite.config.ts`, creating a security vulnerability where the token could be extracted from the browser.

## Solution: Edge Function Architecture

### Edge Function: `generate-video-hf`
**Location:** `/supabase/functions/generate-video-hf/index.ts`

**Purpose:** Server-side video generation using Hugging Face StoryMem model

**Input:**
```typescript
{
  prompt: string;      // Scene description
  sceneIndex: number;  // 0-14 for 15 segments
}
```

**Output:**
```typescript
{
  success: boolean;
  video?: string;      // Base64-encoded video blob
  sceneIndex: number;
  mimeType: string;    // "video/mp4"
  error?: string;
}
```

**Security:**
- Token stored in Supabase Edge Function secrets (`HUGGINGFACE_TOKEN`)
- Never exposed to client-side code
- Server-side API calls only
- CORS configured for browser access

### Client Integration
**Location:** `/services/geminiService.ts`

**Function:** `generateVideoWithHuggingFace(prompt: string, sceneIndex: number)`

**Implementation:**
```typescript
const { data, error } = await supabase.functions.invoke('generate-video-hf', {
  body: { prompt, sceneIndex }
});

// Convert base64 response back to Blob
const binaryString = atob(data.video);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
return new Blob([bytes], { type: 'video/mp4' });
```

## Video Generation Pipeline

### 15-Segment Structure (60+ seconds total)
1. **Hook (3 segments × 4s = 12s):** Attention grabbing opening
2. **Conflict (3 segments × 4s = 12s):** Problem/challenge presentation
3. **Resolution (3 segments × 4s = 12s):** Solution demonstration
4. **Power (3 segments × 4s = 12s):** Key features/benefits
5. **Closing (3 segments × 4s = 12s):** Call to action

### Scene Generation Loop
```typescript
const scenePrompts = /* 15 prompts from AI analysis */;
const videoBlobs: Blob[] = [];

for (let i = 0; i < scenePrompts.length; i++) {
  const videoBlob = await generateVideoWithHuggingFace(scenePrompts[i], i);
  videoBlobs.push(videoBlob);
  await new Promise(r => setTimeout(r, 1500)); // Rate limiting
}
```

## Deployment Instructions

### 1. Deploy Edge Function
```bash
npx supabase functions deploy generate-video-hf
```

### 2. Add Secret to Supabase
**Option A: CLI**
```bash
npx supabase secrets set HUGGINGFACE_TOKEN=hf_xxxxx
```

**Option B: Dashboard**
1. Go to Supabase Dashboard → Project Settings
2. Navigate to Edge Functions → Secrets
3. Add secret: `HUGGINGFACE_TOKEN` = `hf_xxxxx`

### 3. Verify Deployment
```bash
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/generate-video-hf \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A beautiful sunset", "sceneIndex": 0}'
```

## Token Management

### Local Development
- Token in `.env.local` (gitignored)
- Never committed to repository
- Only used for local testing (not recommended)

### Production
- Token stored in Supabase Edge Function secrets
- Accessed via `Deno.env.get('HUGGINGFACE_TOKEN')`
- No client-side exposure
- Automatic rotation supported via Supabase Dashboard

### GitHub Actions (Optional)
If needed for CI/CD testing:
1. Add `HUGGINGFACE_TOKEN` to GitHub repository secrets
2. Pass to workflow: `HUGGINGFACE_TOKEN: ${{ secrets.HUGGINGFACE_TOKEN }}`
3. Use in tests only, not in production builds

## Security Checklist

- [x] Token removed from `vite.config.ts`
- [x] Token removed from client-side environment variables
- [x] Edge Function deployed with secure token access
- [x] Token added to Supabase secrets
- [x] Client code refactored to use Edge Function
- [x] No hardcoded tokens in repository
- [x] Git history rewritten to remove previous token exposure
- [x] CORS configured for browser API calls
- [x] Rate limiting implemented (1.5s delay between scenes)
- [x] Error handling for failed generation attempts

## API Usage

### Hugging Face Model
- **Model:** `Kevin-thu/StoryMem`
- **Type:** Text-to-video generation
- **Input:** Text prompt (max 200 chars)
- **Output:** MP4 video (4 seconds)
- **Quota:** Unlimited (free tier)
- **Response Time:** 60-120 seconds per segment

### Rate Limiting
- 1.5 second delay between segment requests
- Total video generation: ~25-30 minutes for 15 segments
- Progress updates every 3 scenes (5 steps total)

## Troubleshooting

### Edge Function Errors
```bash
# View Edge Function logs
npx supabase functions logs generate-video-hf

# Common issues:
# 1. Missing token: Add HUGGINGFACE_TOKEN to secrets
# 2. CORS errors: Check CORS headers in function response
# 3. Timeout: HF API may take 60-120s per video
```

### Client-Side Issues
```javascript
// Check network tab for Edge Function calls
// Should see: POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/generate-video-hf

// Common issues:
// 1. 401 Unauthorized: Check Supabase anon key in .env.local
// 2. 500 Server Error: Check Edge Function logs
// 3. Timeout: Increase function timeout in Supabase settings
```

## Future Improvements

### Video Concatenation
Currently using placeholder. Options:
1. **FFmpeg.js (Client-side):** Stitch segments in browser
2. **FFmpeg Edge Function (Server-side):** Upload segments, stitch, return final video
3. **Supabase Storage:** Store segments, trigger concatenation function

### Caching
- Store generated videos in Supabase Storage
- Cache by prompt hash to avoid regeneration
- Serve from CDN for faster delivery

### Optimization
- Parallel generation for independent scenes
- Progressive delivery (show segments as they complete)
- Adaptive quality based on network speed

## Related Documentation
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Hugging Face API](https://huggingface.co/docs/api-inference/index)
- [ProfessionalAdCampaignCreator Component](../components/ProfessionalAdCampaignCreator.tsx)
- [Gemini Service](../services/geminiService.ts)

## Contact
For security issues or questions about video generation:
- **Email:** huntersest@gmail.com
- **Production:** https://www.eventnexus.eu
