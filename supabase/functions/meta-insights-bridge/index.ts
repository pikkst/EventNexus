/**
 * Supabase Edge Function: Meta Business API Bridge
 * Fetches insights from Meta (Facebook/Instagram) APIs
 * 
 * Deploy: supabase functions deploy meta-insights-bridge
 * Env vars: META_PAGE_TOKEN, META_AD_ACCOUNT_ID
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface MetaRequest {
  platform: 'facebook' | 'instagram';
  period: 'day' | 'week';
}

interface MetaInsight {
  platform: 'facebook' | 'instagram';
  metric: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'neutral';
}

async function fetchMetaInsights(platform: string, accessToken: string, accountId: string): Promise<MetaInsight[]> {
  // Example: Fetch page insights from Meta API
  // Real implementation would call Meta Graph API
  
  const metrics = [
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Total Reach',
      value: 45230,
      previousValue: 38450,
      trend: 'up' as const
    },
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Engagement Rate',
      value: 4.8,
      previousValue: 3.2,
      trend: 'up' as const
    },
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Click-Through Rate',
      value: 2.3,
      previousValue: 1.9,
      trend: 'up' as const
    },
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Cost Per Click',
      value: 0.45,
      previousValue: 0.62,
      trend: 'down' as const
    },
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Conversion Value',
      value: 8450,
      previousValue: 6230,
      trend: 'up' as const
    }
  ];

  return metrics;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, period } = (await req.json()) as MetaRequest;

    const accessToken = Deno.env.get("META_PAGE_TOKEN");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");

    if (!accessToken || !adAccountId) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch insights from Meta API
    const insights = await fetchMetaInsights(platform, accessToken, adAccountId);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching Meta insights:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
