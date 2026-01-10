// Gemini Model Selector - Intelligent model routing
// Minimizes cost while maintaining quality

export type GeminiModel = 
  | 'gemini-2.0-flash-exp'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro-vision';

export type TaskType = 
  | 'extract_events'
  | 'classify_event'
  | 'validate_event'
  | 'translate'
  | 'geocode_address'
  | 'summarize'
  | 'dedup_detection'
  | 'complex_reasoning';

export interface ModelSelectionContext {
  task: TaskType;
  retryCount: number;
  dataSize: 'small' | 'medium' | 'large' | 'huge';
  confidence: number;
  isTimeoutRetry: boolean;
}

export interface ModelInfo {
  model: GeminiModel;
  maxTokens: number;
  costPerMTok: number;
  avgLatencyMs: number;
  bestFor: TaskType[];
}

// 📊 Model specification table
const MODEL_SPECS: Record<GeminiModel, ModelInfo> = {
  'gemini-2.0-flash-exp': {
    model: 'gemini-2.0-flash-exp',
    maxTokens: 1000000,
    costPerMTok: 0.075,  // $0.075 per M tokens
    avgLatencyMs: 800,
    bestFor: ['extract_events', 'classify_event', 'translate']
  },
  'gemini-2.0-flash': {
    model: 'gemini-2.0-flash',
    maxTokens: 1000000,
    costPerMTok: 0.075,
    avgLatencyMs: 900,
    bestFor: ['extract_events', 'classify_event', 'dedup_detection']
  },
  'gemini-1.5-pro': {
    model: 'gemini-1.5-pro',
    maxTokens: 2000000,
    costPerMTok: 1.25,   // $1.25 per M tokens
    avgLatencyMs: 2000,
    bestFor: ['complex_reasoning', 'validate_event', 'summarize']
  },
  'gemini-1.5-flash': {
    model: 'gemini-1.5-flash',
    maxTokens: 1000000,
    costPerMTok: 0.075,
    avgLatencyMs: 1200,
    bestFor: ['translate', 'summarize']
  },
  'gemini-1.5-pro-vision': {
    model: 'gemini-1.5-pro-vision',
    maxTokens: 2000000,
    costPerMTok: 2.50,
    avgLatencyMs: 3000,
    bestFor: []  // Not used in this pipeline
  }
};

/**
 * Core selector logic - chooses best model for context
 */
export function selectGeminiModel(ctx: ModelSelectionContext): GeminiModel {
  // 🚨 If timeout retry → downgrade
  if (ctx.isTimeoutRetry && ctx.retryCount > 1) {
    return selectFallbackModel(ctx);
  }

  // 📊 Task-based selection
  switch (ctx.task) {
    case 'extract_events':
    case 'classify_event':
      return selectByDataSize(ctx);

    case 'validate_event':
    case 'complex_reasoning':
      return 'gemini-1.5-pro';

    case 'translate':
    case 'summarize':
      return 'gemini-2.0-flash';

    case 'dedup_detection':
      return 'gemini-2.0-flash-exp';

    case 'geocode_address':
      return 'gemini-2.0-flash';

    default:
      return 'gemini-2.0-flash-exp';
  }
}

/**
 * Select by data size (for extraction tasks)
 */
function selectByDataSize(ctx: ModelSelectionContext): GeminiModel {
  switch (ctx.dataSize) {
    case 'small':    // < 10KB
      return 'gemini-2.0-flash-exp';

    case 'medium':   // 10-100KB
      return 'gemini-2.0-flash';

    case 'large':    // 100KB-1MB
      return 'gemini-1.5-flash';

    case 'huge':     // > 1MB
      // Need to chunk
      console.warn('Data too large, will chunk');
      return 'gemini-2.0-flash';

    default:
      return 'gemini-2.0-flash';
  }
}

/**
 * Fallback strategy on timeout/failure
 */
function selectFallbackModel(ctx: ModelSelectionContext): GeminiModel {
  // Try progressively slower models
  if (ctx.retryCount === 1) return 'gemini-2.0-flash';
  if (ctx.retryCount === 2) return 'gemini-1.5-flash';
  return 'gemini-1.5-pro'; // Most stable, slowest
}

/**
 * Cost calculator
 */
export function estimateCost(
  model: GeminiModel,
  inputTokens: number,
  outputTokens: number
): number {
  const spec = MODEL_SPECS[model];
  const totalTokens = inputTokens + outputTokens;
  const cost = (totalTokens / 1_000_000) * spec.costPerMTok;
  return cost;
}

/**
 * Model comparison for debugging
 */
export function compareModels(task: TaskType): {
  model: GeminiModel;
  cost: string;
  latency: string;
  efficiency: number;
}[] {
  const avgInputTokens = 50000;
  const avgOutputTokens = 5000;

  const candidates = [
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ] as GeminiModel[];

  return candidates
    .map(model => {
      const spec = MODEL_SPECS[model];
      const cost = estimateCost(model, avgInputTokens, avgOutputTokens);
      const efficiency = cost > 0 ? 1 / (spec.avgLatencyMs * cost) : 0;

      return {
        model,
        cost: `$${cost.toFixed(4)}`,
        latency: `${spec.avgLatencyMs}ms`,
        efficiency: parseFloat(efficiency.toFixed(4))
      };
    })
    .sort((a, b) => b.efficiency - a.efficiency);
}
