/**
 * GEMINI MODEL SELECTION STRATEGY FOR EVENTNEXUS
 * 
 * This document explains how to integrate model selection into parse-event-ai
 * and other Edge Functions.
 * 
 * 📊 MODEL USAGE BREAKDOWN (104 cities pipeline)
 */

// ============================================================================
// 1️⃣ HOW TO INTEGRATE GEMINI MODEL SELECTOR
// ============================================================================

/*
In /supabase/functions/parse-event-ai/index.ts:

Add these lines at the top:

```typescript
// Model Selection Context
interface ModelContext {
  task: 'extract_events' | 'validate_event' | 'translate' | 'summarize';
  retryCount: number;
  dataSize: 'small' | 'medium' | 'large' | 'huge';
  isTimeoutRetry: boolean;
}

function selectModel(ctx: ModelContext): string {
  // If timeout retry → downgrade model
  if (ctx.isTimeoutRetry && ctx.retryCount > 1) {
    if (ctx.retryCount === 1) return 'gemini-2.0-flash';
    if (ctx.retryCount === 2) return 'gemini-1.5-flash';
    return 'gemini-1.5-pro';
  }

  // Select by data size (extraction)
  switch (ctx.dataSize) {
    case 'small':    // < 10KB
      return 'gemini-2.0-flash-exp';
    case 'medium':   // 10-100KB
      return 'gemini-2.0-flash';
    case 'large':    // 100KB-1MB
      return 'gemini-1.5-flash';
    case 'huge':     // > 1MB (needs chunking)
      console.warn('Huge content: chunking recommended');
      return 'gemini-2.0-flash';
  }
}
```

Then, where you call Gemini API, use:

```typescript
const contentSize = rawContent.length;
const dataSize = contentSize < 10000 ? 'small'
              : contentSize < 100000 ? 'medium'
              : contentSize < 1000000 ? 'large'
              : 'huge';

const model = selectModel({
  task: 'extract_events',
  retryCount: source.retry_count || 0,
  dataSize,
  isTimeoutRetry: source.last_error?.includes('timeout') || false
});

// Now use model in API call:
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
```
*/

// ============================================================================
// 2️⃣ COST BREAKDOWN – Expected Results (104 cities)
// ============================================================================

/*
SCENARIO: 104 cities, 144 events fetched, smart model routing

COST TABLE (per 50k input tokens / 5k output tokens)

Model                   | Cost    | Latency | Best For
gemini-2.0-flash-exp    | $0.0038 | 800ms   | Small extraction (< 10KB)
gemini-2.0-flash        | $0.0038 | 900ms   | Medium extraction (10-100KB)
gemini-1.5-flash        | $0.0038 | 1200ms  | Large extraction (100KB-1MB)
gemini-1.5-pro          | $0.0625 | 2000ms  | Complex validation, fallback

EXPECTED PIPELINE COSTS (Monthly)
─────────────────────────────────

Scenario A: ALL gemini-1.5-pro (no optimization)
- 144 fetches × 50k input = 7.2M tokens
- Cost = 7.2 × $1.25 = $9.00
- Latency = 2000ms × 144 = 4.8 minutes total

Scenario B: Smart model routing (like this design)
- Small (40%): gemini-2.0-flash-exp = $0.27
- Medium (40%): gemini-2.0-flash = $0.27
- Large (15%): gemini-1.5-flash = $0.11
- Fallback (5%): gemini-1.5-pro = $0.31
- TOTAL = $0.96 (89% cost reduction!)
- Latency = avg 1050ms × 144 = 2.5 minutes total (50% faster)

MONTHLY (30 pipeline runs)
- 30 × $0.96 = $28.80
- vs. all-Pro: 30 × $9.00 = $270 (9.4x more expensive!)
*/

// ============================================================================
// 3️⃣ MODEL ROUTING TABLE – DECISIONS
// ============================================================================

/*
TASK-BASED ROUTING

Task                 | Recommended Model  | Reason
─────────────────────────────────────────────────────────
extract_events       | based on dataSize  | Flash models fast enough
classify_event       | gemini-2.0-flash   | Classification is deterministic
validate_event       | gemini-1.5-pro     | Complex rules + edge cases
translate            | gemini-2.0-flash   | Translation is standard task
summarize            | gemini-1.5-flash   | Summaries need context
geocode_address      | gemini-2.0-flash   | Simple location parsing
dedup_detection      | gemini-2.0-flash-exp | Fast pattern matching


DATA SIZE ROUTING (for extraction)

Content Size    | Model                | RPM Limit | Cost/1M
────────────────────────────────────────────────────────────
< 10KB          | gemini-2.0-flash-exp | 1000      | $0.075
10-100KB        | gemini-2.0-flash     | 1000      | $0.075
100KB-1MB       | gemini-1.5-flash     | 500       | $0.075
> 1MB           | chunk + flash        | 1000      | $0.075


RETRY STRATEGY

Attempt | Timeout? | Action
─────────────────────────────────
1       | No       | use selectedModel
1       | Yes      | retry same model
2       | Yes      | downgrade to flash
3       | Yes      | use pro (most stable)
4       | Yes      | fail + log incident
*/

// ============================================================================
// 4️⃣ REAL EXAMPLE – Parse-Event-AI Modification
// ============================================================================

/*
In your existing parse-event-ai function, change this:

OLD (line ~300):
```typescript
const model = GEMINI_MODELS[currentModelIndex]
const response = await callGemini(model, rawContent)
```

NEW:
```typescript
// Determine content size
const contentSize = rawContent?.length || 0
const dataSize = contentSize < 10000 ? 'small'
              : contentSize < 100000 ? 'medium'
              : contentSize < 1000000 ? 'large'
              : 'huge'

// Select optimal model
const model = selectModel({
  task: 'extract_events',
  retryCount: source.retry_count || 0,
  dataSize,
  isTimeoutRetry: false
})

console.log(`[${source.name}] Selected ${model} for ${dataSize} content (${contentSize} bytes)`)

const response = await callGemini(model, rawContent)
```

And update the retry logic:

```typescript
if (timeoutError) {
  console.warn(`Timeout with ${model}, downgrading...`)
  const fallbackModel = selectModel({
    task: 'extract_events',
    retryCount: attempt + 1,
    dataSize,
    isTimeoutRetry: true
  })
  // retry with fallbackModel
}
```
*/

// ============================================================================
// 5️⃣ MONITORING + DASHBOARD
// ============================================================================

/*
Track these metrics in Supabase:

CREATE TABLE IF NOT EXISTS ai_model_usage (
  id uuid primary key,
  city_id uuid,
  source_id uuid,
  model_selected text,
  content_size_bytes int,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  latency_ms int,
  success boolean,
  created_at timestamp
);

CREATE INDEX ON ai_model_usage(model_selected, created_at);
CREATE INDEX ON ai_model_usage(city_id, created_at);

Then query:

-- Cost by model (this month)
SELECT 
  model_selected,
  COUNT(*) as usage_count,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency
FROM ai_model_usage
WHERE created_at >= now() - interval '30 days'
GROUP BY model_selected
ORDER BY total_cost DESC;

-- Cost savings from smart routing
SELECT 
  ROUND(SUM(cost_usd)::numeric, 2) as actual_cost,
  ROUND((COUNT(*) * 50000 / 1000000.0 * 1.25)::numeric, 2) as if_all_pro,
  ROUND((COUNT(*) * 50000 / 1000000.0 * 1.25 - SUM(cost_usd))::numeric, 2) as savings
FROM ai_model_usage
WHERE created_at >= now() - interval '30 days';
*/

// ============================================================================
// 6️⃣ LOCAL LLM FALLBACK (optional, for offline/privacy)
// ============================================================================

/*
If Gemini fails completely (network, quota, etc.):

import Ollama from 'https://esm.sh/ollama@0.1.0'

const ollama = new Ollama({ host: 'http://localhost:11434' })

async function extractEventsLocal(content: string): Promise<any[]> {
  const response = await ollama.generate({
    model: 'mistral',  // lightweight: 7B
    prompt: `Extract events:\n${content}`,
    stream: false
  })
  return JSON.parse(response.response)
}

Usage (final fallback):
- Attempt 1-3: Gemini (smart routed)
- Attempt 4: Local LLM (if available)
- Attempt 5: fail + manual review queue
*/

// ============================================================================
// 7️⃣ CHECKLIST – Implementation Steps
// ============================================================================

/*
✅ Step 1: Copy geminiModelSelector.ts to /services/
   → Already done in this task

✅ Step 2: Update parse-event-ai/index.ts
   Add selectModel() function (copy from section 4️⃣ above)
   Modify callGemini() to use selectedModel
   Add timeout retry with model downgrade

✅ Step 3: Add ai_model_usage table + indexes
   Run SQL from section 5️⃣

✅ Step 4: Log every model decision
   In parse-event-ai, after selectModel():
   ```typescript
   await supabase.from('ai_model_usage').insert({
     city_id,
     source_id,
     model_selected: model,
     content_size_bytes: contentSize,
     cost_usd: estimateCost(model, inputTokens, outputTokens),
     created_at: new Date().toISOString()
   })
   ```

✅ Step 5: Test on Ljubljana city
   Run pipeline with logging enabled
   Verify models are switching based on content size
   Check Supabase ai_model_usage table

✅ Step 6: Monitor costs
   Query cost breakdown weekly
   Verify savings are ~85-90% vs all-Pro

✅ Step 7: Deploy to production
   Ensure all Edge Functions have model selection
   Update docs/guidelines
   Share cost report with stakeholders
*/

// ============================================================================
// 8️⃣ FAQ
// ============================================================================

/*
Q: What if gemini-2.0-flash-exp is not available?
A: Use gemini-2.0-flash as primary, same cost/performance.

Q: Can I use local LLM instead?
A: Yes, but quality will drop. Only for non-critical validation.

Q: Should I chunk huge content?
A: YES. For > 1MB, split into 500KB chunks, merge results.
   Example:
   ```typescript
   if (contentSize > 1000000) {
     const chunks = chunkContent(rawContent, 500000)
     const allEvents = []
     for (const chunk of chunks) {
       const events = await extractWithModel(model, chunk)
       allEvents.push(...events)
     }
     return deduplicateEvents(allEvents)
   }
   ```

Q: How often should I rerun city-guardian?
A: Every 30 minutes initially, then hourly once stable.

Q: What if all models are rate-limited?
A: Wait + retry exponentially. Log to incident dashboard.

Q: Can I use OpenAI instead?
A: Yes, create separate selector: selectOpenAIModel()
   Then wrap in factory: selectLLM(provider, context)
*/

// ============================================================================
export { }
