/**
 * Supabase Edge Function: Google Analytics API Bridge
 * Fetches metrics from Google Analytics Data API v1 (GA4)
 * 
 * Deploy: supabase functions deploy analytics-bridge
 * 
 * Required env vars:
 * - GA_PROPERTY_ID: GA4 Property ID (517523733)
 * - GA_MEASUREMENT_ID: GA4 Measurement ID (G-JD7P5ZKF4L)
 * - GA_SERVICE_ACCOUNT_EMAIL: Service account email (optional, for advanced metrics)
 * - GA_PRIVATE_KEY: Service account private key (optional, for advanced metrics)
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface GARequest {
  metricType: 'traffic' | 'conversions' | 'users' | 'engagement';
  days: number;
  timezone: string;
}

interface GAMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

/**
 * Create JWT token for Service Account authentication
 */
async function createJWT(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import key for signing
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get OAuth2 access token using Service Account JWT
 */
async function getAccessToken(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const jwt = await createJWT(serviceAccountEmail, privateKey);
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch real GA4 data using Analytics Data API v1
 */
async function fetchGA4Metrics(
  propertyId: string,
  metricType: string,
  days: number,
  serviceAccountEmail?: string,
  privateKey?: string
): Promise<GAMetric[]> {
  // If no Service Account configured, return empty array
  if (!serviceAccountEmail || !privateKey) {
    console.warn('No Service Account configured - returning empty metrics');
    return [];
  }

  try {
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    
    // Define metric/dimension mappings
    const metricConfigs: Record<string, { metrics: string[], dimensions?: string[] }> = {
      traffic: {
        metrics: ['totalUsers', 'newUsers', 'sessions', 'bounceRate'],
      },
      conversions: {
        metrics: ['conversions', 'eventCount'],
        dimensions: ['eventName'],
      },
      users: {
        metrics: ['activeUsers', 'newUsers'],
      },
      engagement: {
        metrics: ['averageSessionDuration', 'screenPageViewsPerSession', 'engagementRate'],
      },
    };

    const config = metricConfigs[metricType] || metricConfigs.traffic;
    
    // Build request body for current period
    const currentPeriodBody = {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      metrics: config.metrics.map(m => ({ name: m })),
      dimensions: config.dimensions?.map(d => ({ name: d })) || [],
    };

    // Build request body for comparison period
    const comparisonPeriodBody = {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` }],
      metrics: config.metrics.map(m => ({ name: m })),
      dimensions: config.dimensions?.map(d => ({ name: d })) || [],
    };

    // Fetch both periods
    const [currentResponse, comparisonResponse] = await Promise.all([
      fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentPeriodBody),
      }),
      fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comparisonPeriodBody),
      }),
    ]);

    if (!currentResponse.ok) {
      const error = await currentResponse.text();
      console.error('GA4 API error:', error);
      return [];
    }

    const currentData = await currentResponse.json();
    const comparisonData = comparisonResponse.ok ? await comparisonResponse.json() : null;

    // Parse response into GAMetric format
    const metrics: GAMetric[] = [];
    
    if (currentData.rows && currentData.rows.length > 0) {
      const currentRow = currentData.rows[0];
      const comparisonRow = comparisonData?.rows?.[0];
      
      currentData.metricHeaders.forEach((header: any, index: number) => {
        const currentValue = parseFloat(currentRow.metricValues[index].value);
        const comparisonValue = comparisonRow ? parseFloat(comparisonRow.metricValues[index].value) : currentValue;
        
        const change = comparisonValue !== 0 
          ? ((currentValue - comparisonValue) / comparisonValue) * 100
          : 0;
        
        const trend = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
        
        // Format label from metric name
        const label = header.name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str: string) => str.toUpperCase())
          .trim();
        
        metrics.push({
          label,
          value: currentValue,
          change: Math.round(change * 10) / 10,
          trend,
        });
      });
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching GA4 metrics:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { metricType, days, timezone } = (await req.json()) as GARequest;

    const propertyId = Deno.env.get("GA_PROPERTY_ID") || "517523733";
    const serviceAccountEmail = Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GA_PRIVATE_KEY");

    // Fetch metrics from GA4
    const metrics = await fetchGA4Metrics(
      propertyId,
      metricType,
      days,
      serviceAccountEmail,
      privateKey
    );

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching GA metrics:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
