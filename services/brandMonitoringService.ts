import type { BrandMonitoringAlert, MonitoringStats } from '@/types';
import { supabase } from './supabase';

// Get Supabase URL - hardcoded for production
const SUPABASE_URL = 'https://anlivujgkjmajkcgbaxw.supabase.co';

/**
 * Brand Monitoring Service
 * 
 * Integrates with various third-party APIs to monitor:
 * - Code similarity (GitHub API, Google Code Search)
 * - Domain monitoring (WHOIS, DNS)
 * - Brand protection (trademark databases)
 * - Search engine monitoring (Google, Bing)
 * - Social media monitoring (Twitter, Facebook, Instagram)
 * - Competitor analysis
 * 
 * Note: This service requires API keys and configurations for:
 * - GitHub API (for code similarity detection)
 * - WHOIS/DNS services (for domain monitoring)
 * - Brand monitoring platforms (e.g., Brandwatch, Mention)
 * - Social media APIs (Twitter, Facebook Graph API)
 * - Search APIs (Google Custom Search, Bing Search API)
 */

// Supabase table: brand_monitoring_alerts
// Stores alerts and monitoring data

/**
 * Get all monitoring alerts (excludes deleted alerts)
 */
export async function getMonitoringAlerts(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data, error } = await supabase
      .from('brand_monitoring_alerts')
      .select('*')
      .neq('status', 'deleted')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return data?.map(alert => ({
      ...alert,
      timestamp: new Date(alert.timestamp),
    })) || [];
  } catch (error) {
    console.error('Error fetching monitoring alerts:', error);
    return [];
  }
}

/**
 * Get monitoring statistics
 */
export async function getMonitoringStats(): Promise<MonitoringStats | null> {
  try {
    const { data, error } = await supabase
      .from('monitoring_stats')
      .select('*')
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      lastScanTime: new Date(data.last_scan_time),
    } : null;
  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    return null;
  }
}

/**
 * Create a new monitoring alert
 */
export async function createMonitoringAlert(alert: Omit<BrandMonitoringAlert, 'id'>): Promise<BrandMonitoringAlert | null> {
  try {
    const { data, error } = await supabase
      .from('brand_monitoring_alerts')
      .insert({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        url: alert.url,
        timestamp: alert.timestamp.toISOString(),
        status: alert.status,
        action_taken: alert.actionTaken,
        detected_by: alert.detectedBy,
        metadata: alert.metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      timestamp: new Date(data.timestamp),
      actionTaken: data.action_taken,
      detectedBy: data.detected_by,
    } : null;
  } catch (error) {
    console.error('Error creating monitoring alert:', error);
    return null;
  }
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
  alertId: string,
  status: BrandMonitoringAlert['status'],
  actionTaken?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('brand_monitoring_alerts')
      .update({
        status,
        action_taken: actionTaken,
      })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating alert status:', error);
    return false;
  }
}

/**
 * Delete an alert (soft delete - marks as 'deleted' to prevent re-detection)
 */
export async function deleteAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('brand_monitoring_alerts')
      .update({ status: 'deleted', action_taken: 'Deleted by admin' })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting alert:', error);
    return false;
  }
}

/**
 * Scan GitHub for code similarity
 * Calls Edge Function for secure server-side scanning
 */
export async function scanGitHubCodeSimilarity(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'scan-code' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to scan GitHub');
    }

    const result = await response.json();
    return result.alerts || [];
  } catch (error) {
    console.error('Error scanning GitHub:', error);
    return [];
  }
}

/**
 * Check domain registrations for typosquatting
 * Calls Edge Function for secure server-side scanning
 */
export async function checkDomainTyposquatting(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'scan-domain' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to scan domains');
    }

    const result = await response.json();
    return result.alerts || [];
  } catch (error) {
    console.error('Error checking domains:', error);
    return [];
  }
}

/**
 * Monitor brand mentions across web
 * Calls Edge Function for secure server-side scanning
 */
export async function monitorBrandMentions(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'scan-brand' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to scan brand');
    }

    const result = await response.json();
    return result.alerts || [];
  } catch (error) {
    console.error('Error monitoring brand:', error);
    return [];
  }
}

/**
 * Monitor search engine results
 * Calls Edge Function for secure server-side scanning
 */
export async function monitorSearchEngines(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'scan-search' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to scan search engines');
    }

    const result = await response.json();
    return result.alerts || [];
  } catch (error) {
    console.error('Error monitoring search engines:', error);
    return [];
  }
}

/**
 * Monitor social media platforms
 * Calls Edge Function for secure server-side scanning
 */
export async function monitorSocialMedia(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'scan-social' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to scan social media');
    }

    const result = await response.json();
    return result.alerts || [];
  } catch (error) {
    console.error('Error monitoring social media:', error);
    return [];
  }
}

/**
 * Analyze competitors
 * Calls Edge Function for secure server-side scanning
 */
export async function analyzeCompetitors(): Promise<BrandMonitoringAlert[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'scan-competitors' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to analyze competitors');
    }

    const result = await response.json();
    return result.alerts || [];
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    return [];
  }
}

/**
 * Run comprehensive monitoring scan
 * Calls Edge Function for all monitoring checks
 */
export async function runComprehensiveScan(): Promise<{
  alerts: BrandMonitoringAlert[];
  stats: MonitoringStats;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    console.log('Running comprehensive monitoring scan...');
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/brand-monitoring`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'comprehensive' }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to run comprehensive scan');
    }

    const result = await response.json();
    const allAlerts = result.alerts || [];

    // Calculate stats
    const stats: MonitoringStats = {
      codeScans: allAlerts.filter((a: any) => a.type === 'code').length,
      domainChecks: allAlerts.filter((a: any) => a.type === 'domain').length,
      brandMentions: allAlerts.filter((a: any) => a.type === 'brand').length,
      searchResults: allAlerts.filter((a: any) => a.type === 'search').length,
      socialMentions: allAlerts.filter((a: any) => a.type === 'social').length,
      competitorAlerts: allAlerts.filter((a: any) => a.type === 'competitor').length,
      criticalAlerts: allAlerts.filter((a: any) => a.severity === 'critical').length,
      warningAlerts: allAlerts.filter((a: any) => a.severity === 'warning').length,
      infoAlerts: allAlerts.filter((a: any) => a.severity === 'info').length,
      lastScanTime: new Date(),
    };

    return { alerts: allAlerts, stats };
  } catch (error) {
    console.error('Error running comprehensive scan:', error);
    throw error;
  }
}

/**
 * Configuration guide for API integrations
 * All API keys should be stored in Supabase Secrets, not in .env files
 * 
 * To configure:
 * 1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
 * 2. Add the following secrets:
 */
export const MONITORING_CONFIG_GUIDE = {
  setup: {
    method: 'Supabase Edge Function Secrets',
    dashboard: 'Project Settings → Edge Functions → Secrets',
    cli: 'supabase secrets set <SECRET_NAME>=<value>',
  },
  github: {
    required: 'GitHub Personal Access Token',
    secret: 'GITHUB_TOKEN',
    docs: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    command: 'supabase secrets set GITHUB_TOKEN=ghp_your_token',
  },
  whois: {
    required: 'WHOIS API Key (e.g., WhoisXMLAPI)',
    secret: 'WHOIS_API_KEY',
    docs: 'https://whoisxmlapi.com/',
    command: 'supabase secrets set WHOIS_API_KEY=your_key',
  },
  brandMonitoring: {
    required: 'Brand monitoring service (Brandwatch, Mention, or Brand24)',
    secret: 'BRAND_MONITORING_API_KEY',
    docs: 'Contact brand monitoring service provider',
    command: 'supabase secrets set BRAND_MONITORING_API_KEY=your_key',
  },
  searchApis: {
    required: 'Google Custom Search API Key and Engine ID',
    secrets: ['GOOGLE_SEARCH_KEY', 'GOOGLE_SEARCH_ENGINE'],
    docs: 'https://developers.google.com/custom-search/v1/overview',
    commands: [
      'supabase secrets set GOOGLE_SEARCH_KEY=your_key',
      'supabase secrets set GOOGLE_SEARCH_ENGINE=your_engine_id',
    ],
  },
  socialMedia: {
    twitter: {
      required: 'Twitter API Bearer Token',
      secret: 'TWITTER_BEARER_TOKEN',
      docs: 'https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-tokens',
      command: 'supabase secrets set TWITTER_BEARER_TOKEN=your_token',
    },
    facebook: {
      required: 'Facebook App ID and Secret',
      secrets: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
      docs: 'https://developers.facebook.com/docs/facebook-login/access-tokens',
      commands: [
        'supabase secrets set FACEBOOK_APP_ID=your_app_id',
        'supabase secrets set FACEBOOK_APP_SECRET=your_secret',
      ],
    },
  },
};

/**
 * Get Primary Domain Info (eventnexus.eu)
 * Fetches real SSL, registrar, and status data from Edge Function
 */
export async function getPrimaryDomainInfo(): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/brand-monitoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'get-domain-info',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.domainInfo || null;
  } catch (error) {
    console.error('Error fetching domain info:', error);
    return null;
  }
}

/**
 * WHITELIST MANAGEMENT
 */

export async function addToWhitelist(url: string, title: string, reason: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('brand_monitoring_whitelist')
      .insert({
        url,
        title,
        reason,
        whitelisted_by: user.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    return false;
  }
}

export async function getWhitelist(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('brand_monitoring_whitelist')
      .select('*, whitelisted_by:users(email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    return [];
  }
}

export async function removeFromWhitelist(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('brand_monitoring_whitelist')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing from whitelist:', error);
    return false;
  }
}

/**
 * NOTES MANAGEMENT
 */

export async function addAlertNote(alertId: string, note: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('brand_monitoring_notes')
      .insert({
        alert_id: alertId,
        note,
        created_by: user.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding note:', error);
    return false;
  }
}

export async function getAlertNotes(alertId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('brand_monitoring_notes')
      .select('*, created_by:users(email)')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

/**
 * PRIORITY MANAGEMENT
 */

export async function updateAlertPriority(alertId: string, priority: 'low' | 'medium' | 'high'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('brand_monitoring_alerts')
      .update({ priority })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating priority:', error);
    return false;
  }
}

/**
 * TRENDS & ANALYTICS
 */

export async function getAlertTrends(days: number = 30): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_alert_trends', { days });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trends:', error);
    return [];
  }
}

export async function snapshotDailyStats(): Promise<boolean> {
  try {
    const { error } = await supabase
      .rpc('snapshot_daily_stats');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error snapshotting stats:', error);
    return false;
  }
}

/**
 * HISTORICAL ALERTS
 */

export async function getHistoricalAlerts(status: string[] = ['resolved', 'deleted']): Promise<BrandMonitoringAlert[]> {
  try {
    const { data, error } = await supabase
      .from('brand_monitoring_alerts')
      .select('*')
      .in('status', status)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    return data?.map(alert => ({
      ...alert,
      timestamp: new Date(alert.timestamp),
    })) || [];
  } catch (error) {
    console.error('Error fetching historical alerts:', error);
    return [];
  }
}

