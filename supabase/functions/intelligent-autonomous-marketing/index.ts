/**
 * Intelligent Autonomous Marketing Edge Function
 * 
 * Runs periodically (via cron) to:
 * 1. Analyze platform performance
 * 2. Determine optimal marketing strategy
 * 3. Generate campaigns with AI
 * 4. Monitor and optimize existing campaigns
 * 5. Schedule social media posts
 * 
 * This is the orchestrator that connects SQL intelligence
 * with AI generation capabilities
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🤖 Starting intelligent autonomous marketing cycle...');

    // Step 1: Run SQL intelligence gathering
    console.log('📊 Step 1: Gathering platform intelligence...');
    const { data: recommendation, error: recError } = await supabase
      .rpc('get_strategic_recommendation');

    if (recError) {
      console.error('Error getting recommendation:', recError);
      throw recError;
    }

    const strategy = recommendation[0];
    console.log('Strategy determined:', {
      type: strategy.strategy_type,
      target: strategy.target_audience,
      confidence: strategy.confidence_score
    });

    // Step 2: Check if we should create a new campaign
    const shouldCreateCampaign = await checkShouldCreateCampaign(supabase, strategy);

    let campaignResult = null;

    if (shouldCreateCampaign) {
      console.log('✅ Creating new strategic campaign...');

      // Step 3: Generate campaign theme based on strategy
      const campaignTheme = generateCampaignTheme(strategy);
      
      console.log('Campaign theme:', campaignTheme);

      // Step 4: Call AI generation (this would call your Gemini service)
      // For Edge Function, we trigger campaign creation via database insert
      // The actual AI generation happens in the client-side service
      
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminUser) {
        // Create campaign placeholder that will trigger AI generation
        const { data: campaign, error: campError } = await supabase
          .from('campaigns')
          .insert({
            user_id: adminUser.id,
            title: campaignTheme.title,
            copy: campaignTheme.description,
            status: 'Draft', // Set to draft until AI content is generated
            target_audience: strategy.target_audience,
            ai_metadata: {
              strategy_type: strategy.strategy_type,
              rationale: strategy.rationale,
              confidence_score: strategy.confidence_score,
              auto_generated: true,
              created_by: 'intelligent_autonomous_marketing',
              platform_intelligence: strategy.key_metrics
            },
            metrics: {
              views: 0,
              clicks: 0,
              guestSignups: 0,
              revenueValue: 0
            }
          })
          .select()
          .single();

        if (!campError && campaign) {
          console.log('✅ Campaign created:', campaign.id);
          
          // Sync to performance table immediately
          await supabase.rpc('sync_campaign_to_performance', { p_campaign_id: campaign.id });
          
          campaignResult = {
            campaign_id: campaign.id,
            status: 'created',
            theme: campaignTheme.title
          };

          // Log the autonomous action
          await supabase
            .from('autonomous_actions')
            .insert({
              campaign_id: campaign.id,
              action_type: 'creative_refreshed',
              reason: `Intelligent autonomous marketing: ${strategy.rationale}`,
              previous_state: { campaigns_this_week: 0 },
              new_state: {
                campaign_id: campaign.id,
                theme: campaignTheme.title,
                strategy: strategy.strategy_type
              },
              confidence_score: strategy.confidence_score,
              expected_impact: generateExpectedImpact(strategy.strategy_type),
              status: 'executed'
            });
        }
      }
    } else {
      console.log('⏭️ Skipping campaign creation - recent campaign exists or criteria not met');
    }

    // Step 5: Sync campaign metrics to performance table
    console.log('🔄 Syncing campaign metrics to performance table...');
    const { data: syncResult } = await supabase
      .rpc('sync_all_campaigns_to_performance');
    
    console.log('✅ Synced campaigns:', syncResult?.synced_campaigns || 0);

    // Step 6: Monitor and optimize existing campaigns
    console.log('📈 Step 2: Monitoring existing campaigns...');
    const optimizationResults = await monitorCampaigns(supabase);

    // Step 7: Run standard autonomous operations (pause/scale/post)
    console.log('⚙️ Step 3: Running standard autonomous operations...');
    const { data: opsResult } = await supabase
      .rpc('run_autonomous_operations_with_posting');

    console.log('✅ Intelligent autonomous marketing cycle complete!');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        strategy: {
          type: strategy.strategy_type,
          target: strategy.target_audience,
          rationale: strategy.rationale,
          confidence: strategy.confidence_score
        },
        actions: {
          campaign_created: campaignResult !== null,
          campaign_result: campaignResult,
          campaigns_synced: syncResult?.synced_campaigns || 0,
          campaigns_monitored: optimizationResults.monitored,
          campaigns_paused: optimizationResults.paused,
          standard_operations: opsResult
        },
        intelligence: strategy.key_metrics
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in intelligent autonomous marketing:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if we should create a new campaign
 */
async function checkShouldCreateCampaign(supabase: any, strategy: any): Promise<boolean> {
  // Don't create if recent campaign exists
  const { data: recentCampaigns } = await supabase
    .from('campaigns')
    .select('id')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('ai_metadata->>auto_generated', 'true');

  if (recentCampaigns && recentCampaigns.length > 0) {
    console.log('Recent auto-generated campaign exists, skipping');
    return false;
  }

  // Only create if confidence is high enough
  if (strategy.confidence_score < 70) {
    console.log('Confidence too low:', strategy.confidence_score);
    return false;
  }

  // Only create if platform has meaningful activity
  const intelligence = strategy.key_metrics;
  if (intelligence.total_events < 5 && intelligence.total_users < 20) {
    console.log('Insufficient platform activity for campaign');
    return false;
  }

  return true;
}

/**
 * Generate campaign theme based on strategy
 */
function generateCampaignTheme(strategy: any): { title: string; description: string } {
  const intelligence = strategy.key_metrics;
  
  const themes: Record<string, any> = {
    acquisition: {
      title: 'Discover Events in Your City',
      description: 'Find and book amazing events happening near you. Join thousands exploring local experiences on EventNexus.'
    },
    activation: {
      title: intelligence.active_events > 0 
        ? `${intelligence.active_events}+ Events Happening Now`
        : 'Your Next Adventure Awaits',
      description: 'Don\'t miss out on incredible events in your area. Book your tickets today and experience something amazing.'
    },
    creator_acquisition: {
      title: 'Launch Your Events Successfully',
      description: 'Zero upfront costs. Stripe Connect payouts. AI-powered promotion tools. Start reaching local event-goers today.'
    },
    engagement: {
      title: intelligence.top_categories?.[0]?.category 
        ? `${intelligence.top_categories[0].category} Events This Week`
        : 'Trending Events You\'ll Love',
      description: `Discover the hottest ${intelligence.top_categories?.[0]?.category || 'events'} in ${intelligence.top_cities?.[0]?.city || 'your city'}. Book now before they sell out!`
    },
    retention: {
      title: 'Welcome Back to EventNexus',
      description: `${intelligence.active_events || 'Amazing'} events waiting for you. New features, same great experience. Rediscover your favorite events platform.`
    }
  };

  return themes[strategy.strategy_type] || themes.acquisition;
}

/**
 * Generate expected impact text
 */
function generateExpectedImpact(strategyType: string): string {
  const impacts: Record<string, string> = {
    acquisition: 'Expected: 50 new signups, 200 engagements, €500 revenue',
    activation: 'Expected: 300 engagements, €1000 revenue boost',
    creator_acquisition: 'Expected: 20 new organizers, €2000 platform revenue',
    engagement: 'Expected: 400 engagements, €800 revenue',
    retention: 'Expected: 250 re-engagements, €600 revenue'
  };

  return impacts[strategyType] || 'Expected: Positive platform growth';
}

/**
 * Monitor active campaigns and provide insights
 */
async function monitorCampaigns(supabase: any): Promise<{ monitored: number; paused: number; insights: string[] }> {
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'Active');

  if (!campaigns || campaigns.length === 0) {
    return { monitored: 0, paused: 0, insights: [] };
  }

  let paused = 0;
  const insights: string[] = [];

  for (const campaign of campaigns) {
    const metrics = campaign.metrics || {};
    const views = metrics.views || 0;
    const clicks = metrics.clicks || 0;
    const signups = metrics.guestSignups || 0;

    // Calculate performance
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    const conversionRate = clicks > 0 ? (signups / clicks) * 100 : 0;

    // Pause poor performers
    if (views > 500 && ctr < 0.5) {
      await supabase
        .from('campaigns')
        .update({ status: 'Paused' })
        .eq('id', campaign.id);
      
      // Sync performance after status change
      await supabase.rpc('sync_campaign_to_performance', { p_campaign_id: campaign.id });
      
      paused++;
      insights.push(`Paused "${campaign.title}" - Low CTR: ${ctr.toFixed(2)}%`);

      // Log action
      await supabase
        .from('autonomous_actions')
        .insert({
          campaign_id: campaign.id,
          action_type: 'auto_pause',
          reason: `Low CTR (${ctr.toFixed(2)}%) after ${views} views`,
          previous_state: { status: 'Active', metrics },
          new_state: { status: 'Paused' },
          confidence_score: 90,
          expected_impact: 'Prevent wasted ad spend on underperforming campaign',
          status: 'executed'
        });
    }

    // Provide insights
    if (ctr > 5) {
      insights.push(`High performer: "${campaign.title}" - CTR: ${ctr.toFixed(2)}%`);
    }

    if (views > 100 && ctr > 2 && conversionRate < 1) {
      insights.push(`"${campaign.title}" needs landing page optimization - good CTR but low conversion`);
    }
  }

  return {
    monitored: campaigns.length,
    paused,
    insights
  };
}
