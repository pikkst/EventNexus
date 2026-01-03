# Video Generation API Options

## Current Problem
Hugging Face Inference API (api-inference.huggingface.co) is deprecated and no longer works. StoryMem model requires:
- Local Python environment with Conda
- Large model downloads (~50GB+)
- GPU for inference
- Not suitable for serverless Edge Functions

## Alternative Solutions

### 1. Replicate.com ✅ RECOMMENDED
**Pros:**
- Proper REST API with Python/Node.js SDKs
- Pay-per-use pricing (~$0.001-0.01 per second of video)
- Hosted inference (no GPU needed)
- Text-to-video models available
- Good for serverless Edge Functions

**Popular Models:**
- `deforum/deforum_stable_diffusion` - Animated sequences
- `cjwbw/damo-text-to-video` - Text-to-video
- `lucataco/animate-diff` - Animation from images
- `stability-ai/stable-video-diffusion` - High quality video

**Implementation:**
```bash
# Add to Supabase secrets
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxx

# Edge Function call
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${REPLICATE_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    version: 'model_version_id',
    input: { prompt: 'your text prompt' }
  })
});
```

**Cost:** ~$0.005-0.02 per 4-second video clip

### 2. Stability AI Video API
**Pros:**
- Official Stability AI API
- High quality video generation
- Good documentation
- Reliable service

**Cons:**
- More expensive than Replicate
- Requires subscription/credits

**Cost:** Starting at $10/month + usage

### 3. RunwayML Gen-3 API
**Pros:**
- State-of-the-art video quality
- Professional grade
- Good for commercial use

**Cons:**
- Expensive (~$0.05 per second)
- Requires API key approval
- Limited free tier

**Cost:** $12/month + $0.05/second of video

### 4. Google Gemini Veo (Current - Limited)
**Pros:**
- Already integrated
- High quality output
- Part of Gemini API

**Cons:**
- **Quota limit: 5 videos/day** ❌
- Cannot generate 15 segments needed for 60s video
- Not suitable for production at scale

**Cost:** Free (but quota limited)

### 5. Custom StoryMem Deployment
**Pros:**
- Full control over model
- Best quality and consistency
- No per-use costs after setup

**Cons:**
- Requires GPU server ($50-200/month)
- Complex setup and maintenance
- Not serverless
- Overkill for current needs

**Cost:** $50-200/month for GPU instance

## Recommendation: Replicate.com

### Why Replicate?
1. **Pay-per-use:** Only pay for actual video generation
2. **Serverless:** Perfect for Edge Functions
3. **Reliable:** Battle-tested API with good uptime
4. **Flexible:** Multiple models to choose from
5. **Cost-effective:** ~$0.30 per 60-second video (15 segments × $0.02)

### Migration Steps

#### 1. Create Replicate Account
- Sign up at https://replicate.com
- Get API token from https://replicate.com/account/api-tokens

#### 2. Choose Model
Test models in Replicate playground:
- `stability-ai/stable-video-diffusion-img2vid` - Image to video
- `anotherjesse/zeroscope-v2-xl` - Text to video
- `deforum/deforum_stable_diffusion` - Animated videos

#### 3. Update Edge Function
```typescript
// supabase/functions/generate-video-replicate/index.ts
const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');

async function generateVideo(prompt: string, sceneIndex: number) {
  // Start prediction
  const prediction = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'model_version_here',
      input: {
        prompt: prompt,
        num_frames: 120, // 4 seconds at 30fps
        fps: 30
      }
    })
  });
  
  const { id, urls } = await prediction.json();
  
  // Poll for completion
  let result;
  while (true) {
    const status = await fetch(urls.get, {
      headers: { 'Authorization': `Token ${REPLICATE_TOKEN}` }
    });
    result = await status.json();
    
    if (result.status === 'succeeded') {
      break;
    } else if (result.status === 'failed') {
      throw new Error(result.error);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Download video
  const videoResponse = await fetch(result.output);
  return videoResponse.blob();
}
```

#### 4. Add Secret
```bash
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxxxx
```

#### 5. Deploy
```bash
npx supabase functions deploy generate-video-replicate
```

#### 6. Update Client
```typescript
// services/geminiService.ts
const { data } = await supabase.functions.invoke('generate-video-replicate', {
  body: { prompt, sceneIndex }
});
```

## Cost Comparison (60-second video with 15 segments)

| Service | Cost per Segment | Total Cost | Notes |
|---------|-----------------|------------|-------|
| Replicate | $0.01-0.02 | **$0.15-0.30** | ✅ Best value |
| Stability AI | $0.05-0.10 | $0.75-1.50 | Professional quality |
| RunwayML | $0.20 | $3.00 | Highest quality |
| Gemini Veo | Free | **Quota: 5/day** | ❌ Not scalable |
| StoryMem (self-hosted) | $0 | $50-200/month | GPU costs |

## Implementation Priority

1. **Immediate:** Test Replicate with one model
2. **Short-term:** Integrate Replicate into Edge Function
3. **Long-term:** Consider self-hosting if volume justifies it

## Next Steps

1. Create Replicate account and get API token
2. Test 2-3 models in Replicate playground
3. Choose best model for quality/price
4. Implement new Edge Function
5. Update client code
6. Remove old HF integration
7. Test end-to-end video generation
8. Monitor costs and adjust as needed
