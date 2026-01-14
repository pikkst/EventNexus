import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.API_KEY || '');

// ============================================
// Types
// ============================================

export interface CampaignPattern {
  pattern_type: string;
  pattern_data: Record<string, any>;
  avg_ctr: number;
  avg_roi: number;
  campaign_count: number;
  confidence_score: number;
}

export interface PerformingElement {
  element_value: string;
  avg_ctr: number;
  avg_engagement_rate: number;
  total_impressions: number;
  total_conversions: number;
  campaign_count: number;
}

export interface UnderperformingCampaign {
  campaign_id: string;
  campaign_title: string;
  current_budget: number;
  total_spend: number;
  roi: number;
  ctr: number;
  conversion_rate: number;
  hours_running: number;
  recommendation: string;
}

export interface CampaignInsight {
  id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  ai_recommendation: string;
  suggested_action: string;
  confidence_score: number;
  is_acted_upon: boolean;
  created_at: string;
}

export interface ABTest {
  id: string;
  campaign_id: string;
  test_name: string;
  test_type: string;
  variant_a: Record<string, any>;
  variant_b: Record<string, any>;
  variant_a_impressions: number;
  variant_a_clicks: number;
  variant_a_conversions: number;
  variant_b_impressions: number;
  variant_b_clicks: number;
  variant_b_conversions: number;
  winner: string | null;
  confidence_level: number | null;
  improvement_percentage: number | null;
  status: string;
  ai_recommendation: string | null;
}

// ============================================
// Pattern Analysis
// ============================================

/**
 * Analyze campaign patterns to identify what works best
 */
export async function analyzeCampaignPatterns(
  minCTR: number = 2.0,
  minConversions: number = 5,
  daysBack: number = 90
): Promise<CampaignPattern[]> {
  try {
    const { data, error } = await supabase.rpc('analyze_campaign_patterns', {
      p_min_ctr: minCTR,
      p_min_conversions: minConversions,
      p_days_back: daysBack
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error analyzing campaign patterns:', error);
    return [];
  }
}

/**
 * Get top performing elements (platforms, audiences, etc.)
 */
export async function getTopPerformingElements(
  elementType: 'title' | 'cta' | 'platform' | 'audience',
  limit: number = 10
): Promise<PerformingElement[]> {
  try {
    const { data, error } = await supabase.rpc('get_top_performing_elements', {
      p_element_type: elementType,
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting top performing elements:', error);
    return [];
  }
}

/**
 * Identify campaigns that need optimization
 */
export async function identifyUnderperformingCampaigns(
  minSpend: number = 50.0,
  maxRoi: number = 1.0,
  minDurationHours: number = 24
): Promise<UnderperformingCampaign[]> {
  try {
    const { data, error } = await supabase.rpc('identify_underperforming_campaigns', {
      min_spend: minSpend,
      max_roi: maxRoi,
      min_duration_hours: minDurationHours
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error identifying underperforming campaigns:', error);
    return [];
  }
}

// ============================================
// AI-Powered Insights
// ============================================

/**
 * Generate AI insights for a campaign using Gemini
 */
export async function generateCampaignInsights(
  campaignId: string,
  campaignData: {
    title: string;
    copy: string;
    cta: string;
    performance: {
      ctr: number;
      roi: number;
      conversion_rate: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
    };
  }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are an expert marketing analyst for EventNexus, an event discovery platform.

Analyze this campaign performance and provide actionable insights:

CAMPAIGN:
Title: ${campaignData.title}
Copy: ${campaignData.copy}
CTA: ${campaignData.cta}

PERFORMANCE METRICS:
- CTR: ${campaignData.performance.ctr.toFixed(2)}%
- ROI: ${campaignData.performance.roi.toFixed(2)}%
- Conversion Rate: ${campaignData.performance.conversion_rate.toFixed(2)}%
- Impressions: ${campaignData.performance.total_impressions.toLocaleString()}
- Clicks: ${campaignData.performance.total_clicks.toLocaleString()}
- Conversions: ${campaignData.performance.total_conversions.toLocaleString()}

Provide analysis in this format:

**Performance Assessment:**
[Brief assessment of overall performance]

**Key Insights:**
1. [Insight 1]
2. [Insight 2]
3. [Insight 3]

**Recommendations:**
1. [Specific action to take]
2. [Specific action to take]
3. [Specific action to take]

**A/B Test Suggestions:**
- Test: [What to test]
- Variant A: [Current]
- Variant B: [Suggested alternative]

Keep insights specific, actionable, and data-driven. Focus on EventNexus platform (event discovery, ticket sales, community building).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating campaign insights:', error);
    return 'Failed to generate insights. Please try again.';
  }
}

/**
 * Generate A/B test variant suggestions using AI
 */
export async function generateABTestVariants(
  testType: 'headline' | 'image' | 'cta' | 'copy',
  originalContent: string
): Promise<{ variant_a: string; variant_b: string; rationale: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are a marketing optimization expert. Generate an A/B test variant for EventNexus campaigns.

Test Type: ${testType}
Original: ${originalContent}

Generate a compelling alternative that:
- Maintains brand voice (professional, energetic, community-focused)
- Tests a specific hypothesis (urgency, social proof, benefit-focused, etc.)
- Is measurably different from the original

Respond in JSON format:
{
  "variant_a": "original content",
  "variant_b": "improved variant with clear hypothesis",
  "rationale": "Why this test will provide valuable insights"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from markdown code block if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error generating A/B test variants:', error);
    return {
      variant_a: originalContent,
      variant_b: originalContent + ' - Get Started Today!',
      rationale: 'Failed to generate AI variant. Using fallback with urgency addition.'
    };
  }
}

/**
 * Analyze successful campaigns and extract learnings
 */
export async function extractCampaignLearnings(
  topCampaigns: Array<{
    title: string;
    ctr: number;
    roi: number;
    platforms: string[];
  }>
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const campaignsText = topCampaigns.map((c, i) => 
      `${i + 1}. "${c.title}" - CTR: ${c.ctr.toFixed(2)}%, ROI: ${c.roi.toFixed(0)}%, Platforms: ${c.platforms.join(', ')}`
    ).join('\n');

    const prompt = `Analyze these top-performing EventNexus campaigns and extract key learnings:

${campaignsText}

Identify:
1. Common headline patterns/structures
2. Effective messaging themes
3. Platform-specific insights
4. Best practices to replicate

Provide actionable guidelines for future campaigns in bullet points.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error extracting campaign learnings:', error);
    return 'Failed to extract learnings.';
  }
}

// ============================================
// Insight Management
// ============================================

/**
 * Store an AI-generated insight in the database
 */
export async function storeCampaignInsight(
  campaignId: string,
  insightType: 'performance' | 'audience' | 'timing' | 'creative' | 'budget' | 'platform' | 'opportunity',
  severity: 'critical' | 'warning' | 'info' | 'success',
  title: string,
  description: string,
  aiRecommendation: string,
  suggestedAction: 'pause' | 'scale' | 'optimize' | 'ab_test' | 'none',
  confidenceScore: number,
  insightData?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('store_campaign_insight', {
      p_campaign_id: campaignId,
      p_insight_type: insightType,
      p_severity: severity,
      p_title: title,
      p_description: description,
      p_ai_recommendation: aiRecommendation,
      p_suggested_action: suggestedAction,
      p_confidence_score: confidenceScore,
      p_insight_data: insightData || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing campaign insight:', error);
    return null;
  }
}

/**
 * Get insights for a campaign
 */
export async function getCampaignInsights(
  campaignId: string,
  severity?: 'critical' | 'warning' | 'info' | 'success'
): Promise<CampaignInsight[]> {
  try {
    const { data, error } = await supabase.rpc('get_campaign_insights', {
      p_campaign_id: campaignId,
      p_severity: severity || null
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting campaign insights:', error);
    return [];
  }
}

/**
 * Mark insight as acted upon
 */
export async function markInsightActed(
  insightId: string,
  actionTaken: string,
  actionResult?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('mark_insight_acted', {
      p_insight_id: insightId,
      p_action_taken: actionTaken,
      p_action_result: actionResult || null
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking insight as acted:', error);
    return false;
  }
}

// ============================================
// A/B Testing
// ============================================

/**
 * Create an A/B test for a campaign
 */
export async function createABTest(
  campaignId: string,
  testType: 'headline' | 'image' | 'cta' | 'copy' | 'timing',
  variantA: Record<string, any>,
  variantB: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_ab_test_from_campaign', {
      p_campaign_id: campaignId,
      p_test_type: testType,
      p_variant_a: variantA,
      p_variant_b: variantB
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return null;
  }
}

/**
 * Get A/B tests for a campaign
 */
export async function getABTests(campaignId: string): Promise<ABTest[]> {
  try {
    const { data, error } = await supabase
      .from('campaign_ab_tests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting A/B tests:', error);
    return [];
  }
}

/**
 * Evaluate A/B test and determine winner
 */
export async function evaluateABTest(testId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('evaluate_ab_test', {
      p_test_id: testId
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error evaluating A/B test:', error);
    return false;
  }
}

/**
 * Get campaign learning summary
 */
export async function getCampaignLearningSummary() {
  try {
    const { data, error } = await supabase
      .from('v_campaign_learning_summary')
      .select('*')
      .order('ctr', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting campaign learning summary:', error);
    return [];
  }
}

/**
 * Automatically analyze and generate insights for underperforming campaigns
 */
export async function autoGenerateInsights(): Promise<number> {
  try {
    const underperforming = await identifyUnderperformingCampaigns();
    let count = 0;

    for (const campaign of underperforming.slice(0, 5)) { // Limit to 5 to avoid rate limits
      // Determine severity based on recommendation
      const severity = campaign.recommendation.includes('CRITICAL') ? 'critical' 
        : campaign.recommendation.includes('HIGH') ? 'warning' 
        : 'info';
      
      // Determine issue type from recommendation
      const issueType = campaign.roi < 0.5 ? 'negative_roi'
        : campaign.roi < 1.0 ? 'low_roi'
        : campaign.ctr < 1.0 ? 'low_ctr'
        : 'low_performance';

      const insightId = await storeCampaignInsight(
        campaign.campaign_id,
        'performance',
        severity as any,
        `${issueType.replace('_', ' ').toUpperCase()} Detected`,
        campaign.recommendation,
        `AI detected ${issueType}. ${campaign.recommendation}`,
        severity === 'critical' ? 'pause' : 'optimize',
        75.0,
        {
          ctr: campaign.ctr,
          roi: campaign.roi,
          total_spend: campaign.total_spend,
          conversion_rate: campaign.conversion_rate,
          hours_running: campaign.hours_running,
          issue_type: issueType
        }
      );

      if (insightId) count++;
    }

    return count;
  } catch (error) {
    console.error('Error auto-generating insights:', error);
    return 0;
  }
}
