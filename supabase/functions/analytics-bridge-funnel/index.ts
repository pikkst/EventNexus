/**
 * Supabase Edge Function: Google Analytics Funnel Bridge
 * Fetches conversion funnel data from Google Analytics Data API v1 (GA4)
 * 
 * Deploy: supabase functions deploy analytics-bridge-funnel
 * 
 * Uses same GA secrets as analytics-bridge
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ConversionFunnel {
  step: string;
  users: number;
  conversionRate: number;
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
 * Create JWT token
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
 * Fetch GA4 funnel data
 */
async function fetchGA4Funnel(
  propertyId: string,
  days: number,
  serviceAccountEmail?: string,
  privateKey?: string
): Promise<ConversionFunnel[]> {
  if (!serviceAccountEmail || !privateKey) {
    console.warn('No Service Account configured');
    return [];
  }

  try {
    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);
    
    // Fetch key funnel metrics
    const requestBody = {
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'purchasers' }
      ]
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
    
    if (!data.rows || data.rows.length === 0) {
      return [];
    }

    const row = data.rows[0];
    const totalUsers = parseFloat(row.metricValues[0].value);
    const pageViews = parseFloat(row.metricValues[1].value);
    const addToCarts = parseFloat(row.metricValues[2].value);
    const checkouts = parseFloat(row.metricValues[3].value);
    const purchasers = parseFloat(row.metricValues[4].value);

    // Build funnel with conversion rates
    const funnel: ConversionFunnel[] = [
      { step: 'Site Visit', users: totalUsers, conversionRate: 100 },
      { 
        step: 'View Event', 
        users: Math.round(pageViews), 
        conversionRate: totalUsers > 0 ? (pageViews / totalUsers) * 100 : 0 
      },
      { 
        step: 'Add to Cart', 
        users: Math.round(addToCarts), 
        conversionRate: totalUsers > 0 ? (addToCarts / totalUsers) * 100 : 0 
      },
      { 
        step: 'Checkout', 
        users: Math.round(checkouts), 
        conversionRate: totalUsers > 0 ? (checkouts / totalUsers) * 100 : 0 
      },
      { 
        step: 'Purchase', 
        users: Math.round(purchasers), 
        conversionRate: totalUsers > 0 ? (purchasers / totalUsers) * 100 : 0 
      }
    ];

    return funnel;
  } catch (error) {
    console.error('Error fetching GA4 funnel:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { days } = await req.json();

    const propertyId = Deno.env.get("GA_PROPERTY_ID") || "517523733";
    const serviceAccountEmail = Deno.env.get("GA_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GA_PRIVATE_KEY");

    const funnel = await fetchGA4Funnel(
      propertyId,
      days,
      serviceAccountEmail,
      privateKey
    );

    return new Response(JSON.stringify(funnel), {
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
