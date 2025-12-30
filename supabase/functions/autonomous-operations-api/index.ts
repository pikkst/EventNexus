import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutonomousLog {
  action_type: string;
  campaign_id?: string;
  campaign_title?: string;
  message: string;
  details?: any;
  status: 'checking' | 'action_taken' | 'no_action' | 'error';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get logs
    if (action === 'get_logs') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      const { data: logs, error } = await supabase
        .from('autonomous_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get stats
      const { data: actions } = await supabase
        .from('autonomous_actions')
        .select('action_type, created_at');

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('status', 'Active');

      const { data: opportunities } = await supabase
        .from('optimization_opportunities')
        .select('id')
        .eq('status', 'open');

      const stats = {
        total_checks: actions?.length || 0,
        campaigns_analyzed: campaigns?.length || 0,
        actions_taken: actions?.filter((a: any) => ['auto_pause', 'auto_scale_up', 'creative_refreshed'].includes(a.action_type)).length || 0,
        opportunities_found: opportunities?.length || 0
      };

      return new Response(
        JSON.stringify({ success: true, logs, stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run autonomous operations
    if (action === 'run') {
      // Sync campaign performance first
      const { data: syncResult } = await supabase
        .rpc('sync_all_campaigns_to_performance');

      console.log('✅ Synced campaigns:', syncResult?.synced_campaigns || 0);

      // Run autonomous operations
      const { data: result, error } = await supabase
        .rpc('run_autonomous_operations_with_posting');

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=get_logs or ?action=run' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
