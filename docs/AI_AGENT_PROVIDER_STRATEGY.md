# AI Agent System - Provider Strategy

## Multi-Model Orchestration Strategy

EventNexus AI Agent System uses a **hybrid approach** with multiple AI providers optimized for cost, performance, and accuracy.

### Provider Allocation by Role

| **Agent Role** | **Provider** | **Model** | **Reasoning** |
|---|---|---|---|
| **HTML/RSS Parsing** | Gemini | `gemini-2.0-flash-exp` | Fast, cheap ($0.075/1M tokens), excellent at structured extraction |
| **Translation** | Gemini | `gemini-2.0-flash-exp` | Multi-language native, reliable for 100+ languages |
| **Semantic Validation** | Gemini | `gemini-2.0-flash-exp` | Strong content understanding, spam detection |
| **Deduplication** | Local LLM | `llama-3.1-8b` | **Cost-effective** for fuzzy matching with embeddings (no API cost) |
| **Review Explainer** | Gemini | `gemini-2.0-flash-thinking-exp` | Chain-of-thought reasoning for human review assistance |

### Cost Optimization

- **Primary Parser**: Gemini Flash processes 10,000 events/month for ~$1.50
- **Deduplication**: Local LLM = **$0 cost** (self-hosted or Supabase edge)
- **Total monthly AI cost** (1,000 events/day): **~$50-75**

### Confidence Score Standardization

All component scores use **0.00-1.00 scale** internally:
- `source_score`: 0.00-1.00
- `data_completeness`: 0.00-1.00
- `time_validity`: 0.00-1.00
- `geo_accuracy`: 0.00-1.00
- `semantic_validity`: 0.00-1.00

**Final score** is converted to **0-100** for UI presentation only.

### Agent Registry Benefits

The `ai_agents` table enables:
1. **Hot-swap models** without code changes
2. **A/B testing** different models per role
3. **City-specific agents** (e.g., German parser uses different temperature)
4. **Cost tracking** per agent
5. **Local LLM fallback** when Gemini quota exceeded

### Canonical Event Strategy

Deduplication uses **canonical event concept**:
- One event = **canonical** (`canonical_event_id = NULL`)
- Duplicates point to canonical (`canonical_event_id = <uuid>`)
- Map shows **only canonical events**
- Organizers can claim **canonical version**

### Freshness Scoring

Auto-calculated by database trigger:
- **1.0** = brand new (within 24h)
- Decays to **0.5** after 30 days
- Used for Live Map sorting
- Triggers auto-archival of stale events

## Implementation Notes

### Database Schema Highlights

```sql
-- AI Agents Registry
CREATE TABLE ai_agents (
  name TEXT UNIQUE,
  ai_provider TEXT CHECK (ai_provider IN ('gemini', 'openai', 'local', 'anthropic')),
  model TEXT,
  temperature NUMERIC(3,2),
  cost_per_1k_tokens NUMERIC(10,6)
);

-- Events with canonical reference
ALTER TABLE events 
  ADD COLUMN canonical_event_id UUID REFERENCES events(id),
  ADD COLUMN freshness_score NUMERIC(3,2),  -- Auto-calculated
  ADD COLUMN confidence_score NUMERIC(5,2); -- 0-100 for UI

-- Confidence scoring with normalized scales
CREATE TABLE event_confidence (
  source_score NUMERIC(3,2) CHECK (source_score BETWEEN 0 AND 1),
  -- ... other component scores 0-1 scale
  final_score NUMERIC(5,2) CHECK (final_score BETWEEN 0 AND 100)
);
```

### Public RLS Policy (B2G Compliance)

```sql
CREATE POLICY "Public can read unclaimed events" ON events FOR SELECT USING (
  status = 'unclaimed' 
  AND start_time > NOW()           -- Only future events
  AND confidence_score >= 60       -- Quality threshold
  AND canonical_event_id IS NULL   -- No duplicates
);
```

### Edge Function Integration

Each Edge Function references specific agent from registry:

```typescript
// In parse-event-ai function
const { data: agent } = await supabase
  .from('ai_agents')
  .select('*')
  .eq('name', 'parser_primary')
  .eq('active', true)
  .single();

// Use agent config
const response = await fetch(`.../${agent.model}:generateContent`, {
  temperature: agent.temperature,
  max_tokens: agent.max_tokens
});

// Log usage with agent_id
await supabase.from('ai_decision_log').insert({
  agent_id: agent.id,
  // ... other fields
});
```

## B2G Pitch Points

1. **City Health Metrics** = SLA dashboard for municipalities
2. **Event Opt-Outs** = GDPR compliance built-in
3. **Confidence Transparency** = Explainable AI for public trust
4. **Multi-language Native** = No translation barrier
5. **Cost-effective** = Sustainable at scale ($50/1000 events/day)

## Future Enhancements

- [ ] City-specific agent training
- [ ] Historical data import pipeline (local LLM for bulk processing)
- [ ] Real-time collaboration detection (same event, multiple organizers)
- [ ] Automated category refinement via user feedback
- [ ] Predictive freshness scoring (event popularity trends)

## References

- Database Schema: `/supabase/migrations/20260108000001_ai_agent_system.sql`
- Edge Functions: `/supabase/functions/`
- Type Definitions: `/types.ts`
- Admin Dashboard: `/components/AIAgentDashboard.tsx`
