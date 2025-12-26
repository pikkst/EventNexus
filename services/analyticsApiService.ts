/**
 * Google Analytics & Meta API Integration Service
 * Fetches real platform traffic and conversion metrics
 */

import {
  generateSEORecommendations,
  generateKeywordOptimization,
  generateMetaTagSuggestions,
  analyzeContentOptimization,
  generateSEOStrategy,
} from './seoAIService';

export interface GAMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface TrafficData {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
}

export interface ConversionFunnel {
  step: string;
  users: number;
  conversionRate: number;
}

export interface MetaInsight {
  platform: 'facebook' | 'instagram';
  metric: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface SEOMetric {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  url: string;
}

/**
 * Fetch Google Analytics metrics via backend API
 * Requires Google Analytics Reporting API v4 setup on backend
 */
export async function fetchGAMetrics(
  metricType: 'traffic' | 'conversions' | 'users' | 'engagement',
  days: number = 30
): Promise<GAMetric[]> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analytics-bridge`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ metricType, days, timezone: 'UTC' })
    });

    if (!response.ok) {
      console.error('GA API error:', response.status, await response.text());
      return generateMockGAMetrics(metricType);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch GA metrics:', error);
    return generateMockGAMetrics(metricType);
  }
}

/**
 * Fetch traffic data for charts (time series)
 */
export async function fetchTrafficData(days: number = 30): Promise<TrafficData[]> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analytics-bridge-timeseries`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ metricType: 'traffic', days, timezone: 'Europe/Tallinn' })
    });

    if (!response.ok) {
      console.error('GA4 time series error:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch traffic data:', error);
    return [];
  }
}

/**
 * Fetch conversion funnel data
 */
export async function fetchConversionFunnel(days: number = 30): Promise<ConversionFunnel[]> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analytics-bridge-funnel`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ days, timezone: 'Europe/Tallinn' })
    });

    if (!response.ok) {
      console.error('GA4 funnel error:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch conversion funnel:', error);
    return [];
  }
}

/**
 * Fetch Meta (Facebook/Instagram) insights
 */
export async function fetchMetaInsights(
  platform: 'facebook' | 'instagram' = 'facebook'
): Promise<MetaInsight[]> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/meta-insights-bridge`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ platform, period: 'day' })
    });

    if (!response.ok) {
      console.error('Meta API error:', response.status, await response.text());
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Meta insights:', error);
    return [];
  }
}

/**
 * Fetch SEO metrics from Search Console API
 */
export async function fetchSEOMetrics(
  query: string = '',
  limit: number = 50
): Promise<SEOMetric[]> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/seo-metrics-bridge`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ query, limit, startDate, endDate })
    });

    if (!response.ok) {
      console.error('SEO API error:', response.status, await response.text());
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch SEO metrics:', error);
    return [];
  }
}

/**
 * Get SEO optimization recommendations using AI
 */
export async function getSEORecommendations(
  urls: string[]
): Promise<{ url: string; recommendations: string[] }[]> {
  try {
    const response = await fetch('/api/seo/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch SEO recommendations:', error);
    return [];
  }
}

/**
 * Monitor keyword rankings
 */
export async function monitorKeywordRankings(keywords: string[]): Promise<SEOMetric[]> {
  try {
    const response = await fetch('/api/seo/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        domain: 'eventnexus.eu',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to monitor keywords:', error);
    return [];
  }
}

// ========== AI-POWERED SEO ANALYSIS WRAPPERS ==========

/**
 * Generate AI-powered SEO recommendations
 */
export async function fetchSEORecommendations(seoMetrics?: SEOMetric[]) {
  try {
    const metrics = seoMetrics || (await fetchSEOMetrics('', 10));
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return [];
    }
    return await generateSEORecommendations(metrics);
  } catch (error) {
    console.error('Error fetching SEO recommendations:', error);
    return [];
  }
}

/**
 * Generate keyword optimization opportunities
 */
export async function fetchKeywordOptimization(seoMetrics?: SEOMetric[]) {
  try {
    const metrics = seoMetrics || (await fetchSEOMetrics('', 20));
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return [];
    }
    return await generateKeywordOptimization(metrics);
  } catch (error) {
    console.error('Error fetching keyword optimization:', error);
    return [];
  }
}

/**
 * Generate meta tag suggestions
 */
export async function fetchMetaTagSuggestions(seoMetrics?: SEOMetric[]) {
  try {
    const metrics = seoMetrics || (await fetchSEOMetrics('', 30));
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return [];
    }
    return await generateMetaTagSuggestions(metrics);
  } catch (error) {
    console.error('Error fetching meta tag suggestions:', error);
    return [];
  }
}

/**
 * Analyze content optimization for a specific keyword
 */
export async function fetchContentOptimization(keyword: string, position: number, seoMetrics?: SEOMetric[]) {
  try {
    const metrics = seoMetrics || (await fetchSEOMetrics('', 30));
    if (!Array.isArray(metrics)) {
      return null;
    }
    return await analyzeContentOptimization(keyword, position, metrics);
  } catch (error) {
    console.error('Error analyzing content optimization:', error);
    return null;
  }
}

/**
 * Generate 90-day SEO strategy
 */
export async function fetchSEOStrategy(seoMetrics?: SEOMetric[]) {
  try {
    const metrics = seoMetrics || (await fetchSEOMetrics('', 30));
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return null;
    }
    return await generateSEOStrategy(metrics);
  } catch (error) {
    console.error('Error generating SEO strategy:', error);
    return null;
  }
}
