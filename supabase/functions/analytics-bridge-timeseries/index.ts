/**
 * Supabase Edge Function: Google Analytics Time Series Bridge
 * Fetches daily time series metrics from Google Analytics Data API v1 (GA4)
 * 
 * Deploy: supabase functions deploy analytics-bridge-timeseries
 * 
 * Uses same GA secrets as analytics-bridge
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface GARequest {
  metricType: 'traffic' | 'conversions';
  days: number;
  timezone: string;
}

interface TrafficData {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
}

/**
 * Base64URL encode helper
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
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

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
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

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get OAuth2 access token
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
 * Fetch GA4 time series data
 */
async function fetchGA4TimeSeries(
  propertyId: string,
  days: number,
  serviceAccountEmail?: string,
  privateKey?: string
): Promise<TrafficData[]> {
  if (!serviceAccountEmail || !privateKey) {
    console.warn('No Service Account configured');
    return [];
  }

  try {
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    
    const requestBody = {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
    };

    const apiUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GA4 API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    
    const timeSeries: TrafficData[] = [];
    
    if (data.rows && data.rows.length > 0) {
      data.rows.forEach((row: any) => {
        const date = row.dimensionValues[0].value; // YYYYMMDD format
        const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        
        timeSeries.push({
          date: formattedDate,
          users: parseFloat(row.metricValues[0].value),
          sessions: parseFloat(row.metricValues[1].value),
          pageViews: parseFloat(row.metricValues[2].value),
          bounceRate: parseFloat(row.metricValues[3].value) * 100 // Convert to percentage
        });
      });
    }

    return timeSeries;
  } catch (error) {
    console.error('Error fetching GA4 time series:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { days } = (await req.json()) as GARequest;

    const propertyId = Deno.env.get("GA_PROPERTY_ID") || "517523733";
    const serviceAccountEmail = Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GA_PRIVATE_KEY");

    const timeSeries = await fetchGA4TimeSeries(
      propertyId,
      days,
      serviceAccountEmail,
      privateKey
    );

    return new Response(JSON.stringify(timeSeries), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
