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

async function fetchMetaInsights(platform: string, accessToken: string, pageId: string, instagramId?: string): Promise<MetaInsight[]> {
  try {
    const accountId = platform === 'instagram' ? instagramId : pageId;
    
    if (!accountId) {
      throw new Error(`No ${platform} account ID provided`);
    }

    // Fetch insights from Meta Graph API
    const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000); // 7 days ago
    const until = Math.floor(Date.now() / 1000);
    
    const metricsToFetch = platform === 'facebook' 
      ? 'page_impressions,page_engaged_users,page_post_engagements,page_fans'
      : 'impressions,reach,profile_views,follower_count';
    
    const url = `https://graph.facebook.com/v18.0/${accountId}/insights?metric=${metricsToFetch}&period=day&since=${since}&until=${until}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Meta API error:', await response.text());
      throw new Error(`Meta API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Transform API response to our format
    const metrics: MetaInsight[] = [];
    
    if (data.data && data.data.length > 0) {
      for (const metric of data.data) {
        const values = metric.values || [];
        const latest = values[values.length - 1]?.value || 0;
        const previous = values[values.length - 2]?.value || 0;
        
        metrics.push({
          platform: platform as 'facebook' | 'instagram',
          metric: formatMetricName(metric.name),
          value: latest,
          previousValue: previous,
          trend: latest > previous ? 'up' : latest < previous ? 'down' : 'neutral'
        });
      }
    }

    // If no data, return defaults
    if (metrics.length === 0) {
      return getDefaultMetrics(platform);
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching Meta insights:', error);
    return getDefaultMetrics(platform);
  }
}

function formatMetricName(name: string): string {
  const nameMap: Record<string, string> = {
    'page_impressions': 'Total Impressions',
    'page_engaged_users': 'Engaged Users',
    'page_post_engagements': 'Post Engagements',
    'page_fans': 'Total Followers',
    'impressions': 'Total Impressions',
    'reach': 'Total Reach',
    'profile_views': 'Profile Views',
    'follower_count': 'Total Followers'
  };
  return nameMap[name] || name;
}

function getDefaultMetrics(platform: string): MetaInsight[] {
  return [
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Total Reach',
      value: 0,
      previousValue: 0,
      trend: 'neutral' as const
    },
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Engagement Rate',
      value: 0,
      previousValue: 0,
      trend: 'neutral' as const
    },
    {
      platform: platform as 'facebook' | 'instagram',
      metric: 'Profile Views',
      value: 0,
      previousValue: 0,
      trend: 'neutral' as const
    }
  ];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, period } = (await req.json()) as MetaRequest;

    const accessToken = Deno.env.get("META_PAGE_TOKEN") || "EAAVtP2I4llMBQcYfBioOfK9z2okwzd2ZCmJ0aoqa0fK6QK7TNoHUDKYZB9Pi4bmsIRutaYrllTRV2vZC6aLbbj27dQ2vd4uRwP2q3tN6gRqgEn2YRn90xtpZCDWLutQQnCZCH1b94XiOYd0HbE2NyO9ZCnytaB9b2oY0UOja2ZCQ1oaFQBxZCtbqJnnHY4yk";
    const pageId = Deno.env.get("META_PAGE_ID") || "864504226754704";
    const instagramId = Deno.env.get("META_INSTAGRAM_ID") || "17841473316101833";

    // Fetch insights from Meta API
    const insights = await fetchMetaInsights(platform, accessToken, pageId, instagramId);

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
