/**
 * A/B Testing Service
 * Enables split testing across landing page CTAs with variant tracking and analytics
 */

interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // 0-100, percentage of traffic
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused' | 'completed';
  variants: ABTestVariant[];
  controlVariant: string; // variant id that is control
  hypothesis: string;
}

interface ABTestResult {
  testId: string;
  variantId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  ctr: number; // click-through rate
  confidence: number; // confidence level 0-100
  isStatisticallySignificant: boolean;
}

interface ABTestAssignment {
  testId: string;
  variantId: string;
  assignedAt: number;
}

// Local storage keys
const AB_TEST_STORAGE_KEY = 'nexus_ab_tests';
const AB_TEST_ASSIGNMENTS_KEY = 'nexus_ab_test_assignments';
const AB_TEST_METRICS_KEY = 'nexus_ab_test_metrics';

/**
 * Generate consistent variant assignment for a user based on test and user ID
 * Uses hashing to ensure same variant across sessions
 */
function getVariantForUser(testId: string, variants: ABTestVariant[]): ABTestVariant {
  // Get unique user identifier (create if needed)
  let userId = localStorage.getItem('nexus_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('nexus_user_id', userId);
  }

  // Create hash from test + user combination
  const hashInput = `${testId}-${userId}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use hash to determine variant based on weights
  const hashPercent = Math.abs(hash % 100);
  let cumulativeWeight = 0;

  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (hashPercent < cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to first variant
  return variants[0];
}

/**
 * Initialize or retrieve user's variant assignment for a test
 */
export function getAssignedVariant(testId: string, variants: ABTestVariant[]): string {
  // Check if already assigned
  const assignments = JSON.parse(localStorage.getItem(AB_TEST_ASSIGNMENTS_KEY) || '{}');
  
  if (assignments[testId]) {
    return assignments[testId].variantId;
  }

  // Assign new variant
  const variant = getVariantForUser(testId, variants);
  assignments[testId] = {
    testId,
    variantId: variant.id,
    assignedAt: Date.now()
  };

  localStorage.setItem(AB_TEST_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  return variant.id;
}

/**
 * Track an impression (user sees variant)
 */
export function trackABTestImpression(testId: string, variantId: string): void {
  const metrics = JSON.parse(localStorage.getItem(AB_TEST_METRICS_KEY) || '{}');
  
  const key = `${testId}_${variantId}`;
  if (!metrics[key]) {
    metrics[key] = {
      testId,
      variantId,
      impressions: 0,
      clicks: 0,
      conversions: 0
    };
  }

  metrics[key].impressions += 1;
  localStorage.setItem(AB_TEST_METRICS_KEY, JSON.stringify(metrics));
}

/**
 * Track a click on variant CTA
 */
export function trackABTestClick(testId: string, variantId: string): void {
  const metrics = JSON.parse(localStorage.getItem(AB_TEST_METRICS_KEY) || '{}');
  
  const key = `${testId}_${variantId}`;
  if (!metrics[key]) {
    metrics[key] = {
      testId,
      variantId,
      impressions: 0,
      clicks: 0,
      conversions: 0
    };
  }

  metrics[key].clicks += 1;
  localStorage.setItem(AB_TEST_METRICS_KEY, JSON.stringify(metrics));
}

/**
 * Track a conversion (user completed target action)
 */
export function trackABTestConversion(testId: string, variantId: string): void {
  const metrics = JSON.parse(localStorage.getItem(AB_TEST_METRICS_KEY) || '{}');
  
  const key = `${testId}_${variantId}`;
  if (!metrics[key]) {
    metrics[key] = {
      testId,
      variantId,
      impressions: 0,
      clicks: 0,
      conversions: 0
    };
  }

  metrics[key].conversions += 1;
  localStorage.setItem(AB_TEST_METRICS_KEY, JSON.stringify(metrics));
}

/**
 * Calculate chi-square statistic for statistical significance
 * Simple implementation for 2-variant tests
 */
function calculateChiSquare(controlConversions: number, controlTotal: number, 
                           treatmentConversions: number, treatmentTotal: number): number {
  const controlRate = controlConversions / controlTotal;
  const treatmentRate = treatmentConversions / treatmentTotal;
  const pooledRate = (controlConversions + treatmentConversions) / (controlTotal + treatmentTotal);

  const expectedControl = controlTotal * pooledRate;
  const expectedTreatment = treatmentTotal * pooledRate;

  if (expectedControl === 0 || expectedTreatment === 0) return 0;

  const chiSquare = 
    Math.pow(controlConversions - expectedControl, 2) / expectedControl +
    Math.pow(treatmentConversions - expectedTreatment, 2) / expectedTreatment;

  return chiSquare;
}

/**
 * Map chi-square to confidence level (simplified)
 * Chi-square of 3.84 ≈ 95% confidence for 1 degree of freedom
 */
function chiSquareToConfidence(chiSquare: number): number {
  if (chiSquare < 0.455) return 0; // 0% confidence
  if (chiSquare < 1.074) return 25;
  if (chiSquare < 2.706) return 50;
  if (chiSquare < 3.841) return 75;
  if (chiSquare < 6.635) return 90;
  return 95; // 95%+ confidence
}

/**
 * Get results for all variants in a test
 */
export function getABTestResults(testId: string, controlVariantId: string): ABTestResult[] {
  const metrics = JSON.parse(localStorage.getItem(AB_TEST_METRICS_KEY) || '{}');
  const results: ABTestResult[] = [];

  // Find all metrics for this test
  for (const [key, data] of Object.entries(metrics)) {
    const metricData = data as any;
    if (metricData.testId === testId) {
      const conversionRate = metricData.impressions > 0 
        ? (metricData.conversions / metricData.impressions) * 100 
        : 0;
      
      const ctr = metricData.impressions > 0
        ? (metricData.clicks / metricData.impressions) * 100
        : 0;

      results.push({
        testId,
        variantId: metricData.variantId,
        impressions: metricData.impressions,
        clicks: metricData.clicks,
        conversions: metricData.conversions,
        conversionRate,
        ctr,
        confidence: 0,
        isStatisticallySignificant: false
      });
    }
  }

  // Calculate statistical significance
  if (results.length === 2) {
    const control = results.find(r => r.variantId === controlVariantId)!;
    const treatment = results.find(r => r.variantId !== controlVariantId)!;

    const chiSquare = calculateChiSquare(
      control.conversions,
      control.impressions,
      treatment.conversions,
      treatment.impressions
    );

    const confidence = chiSquareToConfidence(chiSquare);
    control.confidence = confidence;
    treatment.confidence = confidence;
    
    const isSignificant = confidence >= 95;
    control.isStatisticallySignificant = isSignificant;
    treatment.isStatisticallySignificant = isSignificant;
  }

  return results;
}

/**
 * Create a new A/B test
 */
export function createABTest(test: ABTest): void {
  const tests = JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}');
  tests[test.id] = test;
  localStorage.setItem(AB_TEST_STORAGE_KEY, JSON.stringify(tests));
}

/**
 * Get all active A/B tests
 */
export function getActiveABTests(): ABTest[] {
  const tests = JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}');
  const now = Date.now();
  
  return Object.values(tests).filter((test: any) => {
    return test.status === 'active' && 
           new Date(test.startDate).getTime() <= now &&
           new Date(test.endDate).getTime() > now;
  });
}

/**
 * Get test by ID
 */
export function getABTest(testId: string): ABTest | null {
  const tests = JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}');
  return tests[testId] || null;
}

/**
 * Update test status
 */
export function updateABTestStatus(testId: string, status: 'active' | 'paused' | 'completed'): void {
  const tests = JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}');
  if (tests[testId]) {
    tests[testId].status = status;
    localStorage.setItem(AB_TEST_STORAGE_KEY, JSON.stringify(tests));
  }
}

/**
 * Export metrics for analysis
 */
export function exportABTestMetrics(): any {
  return {
    tests: JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}'),
    assignments: JSON.parse(localStorage.getItem(AB_TEST_ASSIGNMENTS_KEY) || '{}'),
    metrics: JSON.parse(localStorage.getItem(AB_TEST_METRICS_KEY) || '{}'),
    exportedAt: new Date().toISOString()
  };
}

/**
 * Clear all test data
 */
export function clearABTestData(): void {
  localStorage.removeItem(AB_TEST_STORAGE_KEY);
  localStorage.removeItem(AB_TEST_ASSIGNMENTS_KEY);
  localStorage.removeItem(AB_TEST_METRICS_KEY);
}
