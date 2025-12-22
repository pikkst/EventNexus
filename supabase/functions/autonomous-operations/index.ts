// ============================================================
// Autonomous Operations Edge Function
// ============================================================
// Runs autonomous campaign optimization cycle:
// - Auto-pause underperforming campaigns
// - Auto-scale high-ROI campaigns
// - Detect optimization opportunities
// Scheduled via GitHub Actions cron (hourly)
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting autonomous operations cycle...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run autonomous operations
    const { data: result, error } = await supabase.rpc('run_autonomous_operations');

    if (error) {
      console.error('❌ Error running autonomous operations:', error);
      throw error;
    }

    console.log('✅ Autonomous cycle complete:', result);
    console.log(`  📊 Campaigns paused: ${result.actions_taken.campaigns_paused}`);
    console.log(`  📈 Campaigns scaled: ${result.actions_taken.campaigns_scaled}`);
    console.log(`  💡 Opportunities detected: ${result.actions_taken.opportunities_detected}`);

    // If any actions were taken, log summary
    if (result.actions_taken.campaigns_paused > 0 || 
        result.actions_taken.campaigns_scaled > 0 || 
        result.actions_taken.opportunities_detected > 0) {
      
      console.log('📝 Fetching recent actions...');
      
      // Get recent actions for logging
      const { data: recentActions } = await supabase
        .from('autonomous_actions')
        .select('id, campaign_id, action_type, reason, confidence_score, status')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentActions && recentActions.length > 0) {
        console.log('Recent autonomous actions:');
        recentActions.forEach(action => {
          console.log(`  - ${action.action_type} (confidence: ${action.confidence_score}%): ${action.reason}`);
        });
      }
    } else {
      console.log('✨ No actions needed - all campaigns performing optimally!');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        message: 'Autonomous operations completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Autonomous operations failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/* Edge Function invocation examples:

1. Manual trigger (local testing):
   npx supabase functions serve autonomous-operations
   curl -X POST http://localhost:54321/functions/v1/autonomous-operations \
     -H "Authorization: Bearer YOUR_ANON_KEY"

2. Production deployment:
   npx supabase functions deploy autonomous-operations --project-ref anlivujgkjmajkcgbaxw

3. GitHub Actions cron (automated):
   Schedule: 0 * * * * (every hour)
   URL: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/autonomous-operations
   Headers: Authorization: Bearer <SUPABASE_ANON_KEY>

4. Test from browser console:
   fetch('https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/autonomous-operations', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer YOUR_ANON_KEY',
       'Content-Type': 'application/json'
     }
   }).then(r => r.json()).then(console.log);
*/
