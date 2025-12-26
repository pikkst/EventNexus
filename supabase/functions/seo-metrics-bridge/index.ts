/**
 * Supabase Edge Function: Google Search Console API Bridge
 * Fetches SEO metrics from Google Search Console API
 * 
 * Deploy: supabase functions deploy seo-metrics-bridge
 * 
 * Required env vars:
 * - GSC_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GSC_PRIVATE_KEY: Service account private key
 * - GSC_SITE_URL: https://www.eventnexus.eu
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface SEORequest {
  query: string;
  limit: number;
  startDate: string;
  endDate: string;
}

interface SEOMetric {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  url: string;
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
 * Create JWT for Google API authentication
 */
async function createJWT(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .replace(/\s/g, "");
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get access token from Google OAuth2
 */
async function getAccessToken(serviceAccountEmail: string, privateKey: string): Promise<string> {
  const jwt = await createJWT(serviceAccountEmail, privateKey);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    throw new Error(`OAuth failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch real SEO metrics from Google Search Console
 */
async function fetchRealSEOMetrics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number
): Promise<SEOMetric[]> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: limit
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Search Console API error:', response.status, errorText);
    throw new Error(`Search Console API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  
  console.log('Search Console API response:', JSON.stringify(data).slice(0, 500));
  
  if (!data.rows || data.rows.length === 0) {
    console.warn('No SEO data rows returned from Search Console');
    return [];
  }

  return data.rows.map((row: any) => ({
    keyword: row.keys[0],
    url: row.keys[1] || siteUrl,
    position: Math.round(row.position),
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr * 100
  }));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, limit, startDate, endDate } = (await req.json()) as SEORequest;

    const serviceAccountEmail = Deno.env.get("GSC_SERVICE_ACCOUNT_EMAIL") || Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GSC_PRIVATE_KEY") || Deno.env.get("GA_PRIVATE_KEY");
    const siteUrl = Deno.env.get("GSC_SITE_URL") || "https://www.eventnexus.eu";

    // If credentials not configured, return empty array
    if (!serviceAccountEmail || !privateKey) {
      console.warn('GSC credentials not configured - returning empty array');
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get access token
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    
    // Fetch real SEO metrics
    const metrics = await fetchRealSEOMetrics(accessToken, siteUrl, startDate, endDate, limit);

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching SEO metrics:', error);
    // Return empty array on error (NO MOCK DATA)
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
