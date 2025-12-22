/**
 * Autonomous Campaign Service
 * 
 * Manages self-optimizing campaign operations:
 * - Auto-pause underperforming campaigns
 * - Auto-scale high-ROI campaigns
 * - Detect optimization opportunities
 * - Execute autonomous actions with confidence scoring
 */

import { supabase } from './supabase';

// ============================================================
// Types
// ============================================================

export interface AutonomousAction {
  id: string;
  campaign_id: string;
  action_type: 'auto_pause' | 'auto_scale_up' | 'auto_scale_down' | 'optimization_applied' | 'ab_test_created' | 'budget_adjusted' | 'targeting_refined' | 'creative_refreshed';
  reason: string;
  previous_state: Record<string, any>;
  new_state: Record<string, any>;
  confidence_score: number;
  expected_impact: string;
  actual_impact?: Record<string, any>;
  status: 'pending' | 'executed' | 'rolled_back' | 'failed';
  executed_at?: string;
  created_at: string;
}

export interface AutonomousRule {
  id: string;
  rule_name: string;
  rule_type: 'pause' | 'scale' | 'optimize' | 'create';
  condition: Record<string, any>;
  action: Record<string, any>;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface OptimizationOpportunity {
  id: string;
  campaign_id: string;
  opportunity_type: 'low_conversion' | 'high_traffic_low_conversion' | 'declining_performance' | 'budget_inefficiency' | 'audience_mismatch' | 'creative_fatigue' | 'timing_optimization';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggested_action: string;
  estimated_impact?: Record<string, any>;
  confidence_score: number;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  resolved_at?: string;
  created_at: string;
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

export interface ScalingCandidate {
  campaign_id: string;
  campaign_title: string;
  current_budget: number;
  suggested_budget: number;
  roi: number;
  conversions: number;
  ctr: number;
  confidence_score: number;
  reasoning: string;
}

export interface AutonomousOperationsResult {
  success: boolean;
  timestamp: string;
  actions_taken: {
    campaigns_paused: number;
    campaigns_scaled: number;
    opportunities_detected: number;
  };
}

// ============================================================
// Campaign Analysis
// ============================================================

/**
 * Identify campaigns performing below thresholds
 */
export async function identifyUnderperformingCampaigns(
  minSpend: number = 50.0,
  maxROI: number = 1.0,
  minDurationHours: number = 24
): Promise<UnderperformingCampaign[]> {
  try {
    const { data, error } = await supabase.rpc('identify_underperforming_campaigns', {
      min_spend: minSpend,
      max_roi: maxROI,
      min_duration_hours: minDurationHours
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error identifying underperforming campaigns:', error);
    return [];
  }
}

/**
 * Identify high-performing campaigns eligible for scaling
 */
export async function identifyScalingCandidates(
  minROI: number = 3.0,
  minConversions: number = 10,
  maxBudgetMultiplier: number = 3.0
): Promise<ScalingCandidate[]> {
  try {
    const { data, error } = await supabase.rpc('identify_scaling_candidates', {
      min_roi: minROI,
      min_conversions: minConversions,
      max_budget_multiplier: maxBudgetMultiplier
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error identifying scaling candidates:', error);
    return [];
  }
}

/**
 * Detect specific optimization opportunities across campaigns
 */
export async function detectOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
  try {
    const { data, error } = await supabase.rpc('detect_optimization_opportunities');

    if (error) throw error;
    
    // Map to OptimizationOpportunity type
    return (data || []).map((opp: any) => ({
      id: opp.id || crypto.randomUUID(),
      campaign_id: opp.campaign_id,
      opportunity_type: opp.opportunity_type,
      severity: opp.severity,
      description: opp.description,
      suggested_action: opp.suggested_action,
      estimated_impact: opp.estimated_impact,
      confidence_score: opp.confidence_score,
      status: 'open',
      created_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error detecting optimization opportunities:', error);
    return [];
  }
}

// ============================================================
// Autonomous Actions
// ============================================================

/**
 * Auto-pause a campaign based on performance
 */
export async function autoPauseCampaign(
  campaignId: string,
  reason: string,
  confidenceScore: number = 80.0
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('auto_pause_campaign', {
      p_campaign_id: campaignId,
      p_reason: reason,
      p_confidence_score: confidenceScore
    });

    if (error) throw error;
    return data; // Returns action_id
  } catch (error) {
    console.error('Error auto-pausing campaign:', error);
    return null;
  }
}

/**
 * Auto-scale a campaign budget based on performance
 */
export async function autoScaleCampaign(
  campaignId: string,
  newBudget: number,
  reason: string,
  confidenceScore: number = 85.0
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('auto_scale_campaign', {
      p_campaign_id: campaignId,
      p_new_budget: newBudget,
      p_reason: reason,
      p_confidence_score: confidenceScore
    });

    if (error) throw error;
    return data; // Returns action_id
  } catch (error) {
    console.error('Error auto-scaling campaign:', error);
    return null;
  }
}

/**
 * Store an optimization opportunity for admin review
 */
export async function storeOptimizationOpportunity(
  campaignId: string,
  opportunityType: OptimizationOpportunity['opportunity_type'],
  severity: OptimizationOpportunity['severity'],
  description: string,
  suggestedAction: string,
  estimatedImpact: Record<string, any> = {},
  confidenceScore: number = 70.0
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('store_optimization_opportunity', {
      p_campaign_id: campaignId,
      p_opportunity_type: opportunityType,
      p_severity: severity,
      p_description: description,
      p_suggested_action: suggestedAction,
      p_estimated_impact: estimatedImpact,
      p_confidence_score: confidenceScore
    });

    if (error) throw error;
    return data; // Returns opportunity_id
  } catch (error) {
    console.error('Error storing optimization opportunity:', error);
    return null;
  }
}

/**
 * Run full autonomous operations cycle
 * Analyzes all campaigns and takes actions automatically
 */
export async function runAutonomousOperations(): Promise<AutonomousOperationsResult | null> {
  try {
    const { data, error } = await supabase.rpc('run_autonomous_operations');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error running autonomous operations:', error);
    return null;
  }
}

// ============================================================
// Query Functions
// ============================================================

/**
 * Get recent autonomous actions
 */
export async function getRecentActions(limit: number = 50): Promise<AutonomousAction[]> {
  try {
    const { data, error } = await supabase
      .from('autonomous_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching autonomous actions:', error);
    return [];
  }
}

/**
 * Get actions for a specific campaign
 */
export async function getCampaignActions(campaignId: string): Promise<AutonomousAction[]> {
  try {
    const { data, error } = await supabase
      .from('autonomous_actions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching campaign actions:', error);
    return [];
  }
}

/**
 * Get all active autonomous rules
 */
export async function getActiveRules(): Promise<AutonomousRule[]> {
  try {
    const { data, error } = await supabase
      .from('autonomous_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching autonomous rules:', error);
    return [];
  }
}

/**
 * Get open optimization opportunities
 */
export async function getOpenOpportunities(severity?: OptimizationOpportunity['severity']): Promise<OptimizationOpportunity[]> {
  try {
    let query = supabase
      .from('optimization_opportunities')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching optimization opportunities:', error);
    return [];
  }
}

/**
 * Update opportunity status
 */
export async function updateOpportunityStatus(
  opportunityId: string,
  status: OptimizationOpportunity['status']
): Promise<boolean> {
  try {
    const updateData: any = { status };
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('optimization_opportunities')
      .update(updateData)
      .eq('id', opportunityId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating opportunity status:', error);
    return false;
  }
}

/**
 * Toggle autonomous rule active status
 */
export async function toggleRuleActive(ruleId: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('autonomous_rules')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', ruleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling rule:', error);
    return false;
  }
}

// ============================================================
// Statistics & Analytics
// ============================================================

/**
 * Get autonomous operations statistics
 */
export async function getAutonomousStats(): Promise<{
  total_actions: number;
  paused_campaigns: number;
  scaled_campaigns: number;
  open_opportunities: number;
  avg_confidence: number;
}> {
  try {
    const [actionsRes, opportunitiesRes] = await Promise.all([
      supabase.from('autonomous_actions').select('action_type, confidence_score', { count: 'exact' }),
      supabase.from('optimization_opportunities').select('*', { count: 'exact' }).eq('status', 'open')
    ]);

    const actions = actionsRes.data || [];
    const pausedCount = actions.filter(a => a.action_type === 'auto_pause').length;
    const scaledCount = actions.filter(a => a.action_type === 'auto_scale_up').length;
    const avgConfidence = actions.length > 0 
      ? actions.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / actions.length 
      : 0;

    return {
      total_actions: actions.length,
      paused_campaigns: pausedCount,
      scaled_campaigns: scaledCount,
      open_opportunities: opportunitiesRes.count || 0,
      avg_confidence: Math.round(avgConfidence * 10) / 10
    };
  } catch (error) {
    console.error('Error fetching autonomous stats:', error);
    return {
      total_actions: 0,
      paused_campaigns: 0,
      scaled_campaigns: 0,
      open_opportunities: 0,
      avg_confidence: 0
    };
  }
}

/**
 * Rollback an autonomous action (restore previous state)
 */
export async function rollbackAction(actionId: string): Promise<boolean> {
  try {
    // Get action details
    const { data: action, error: fetchError } = await supabase
      .from('autonomous_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) throw fetchError || new Error('Action not found');

    // Restore previous state
    if (action.action_type === 'auto_pause') {
      // Reactivate campaign
      await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', action.campaign_id);
    } else if (action.action_type === 'auto_scale_up' || action.action_type === 'auto_scale_down') {
      // Restore previous budget
      const previousBudget = action.previous_state?.budget;
      if (previousBudget) {
        await supabase
          .from('campaigns')
          .update({ budget: previousBudget })
          .eq('id', action.campaign_id);
      }
    }

    // Mark action as rolled back
    const { error: updateError } = await supabase
      .from('autonomous_actions')
      .update({ status: 'rolled_back' })
      .eq('id', actionId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error rolling back action:', error);
    return false;
  }
}
