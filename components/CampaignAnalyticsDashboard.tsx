/**
 * Campaign Analytics Dashboard
 * Real-time performance tracking and AI insights
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MousePointerClick, 
  Eye, 
  Users,
  Target,
  Zap,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalSpend: number;
  averageROI: number;
  averageCTR: number;
  averageConversionRate: number;
}

interface TopCampaign {
  id: string;
  title: string;
  impressions: number;
  clicks: number;
  conversions: number;
  roi: number;
  ctr: number;
  status: string;
}

interface PlatformPerformance {
  platform: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

export default function CampaignAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([]);
  const [platformPerformance, setPlatformPerformance] = useState<PlatformPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load overall metrics
      const { data: metricsData } = await supabase
        .from('campaign_performance')
        .select('*');
      
      if (metricsData) {
        const totalImpressions = metricsData.reduce((sum, c) => sum + (c.total_impressions || 0), 0);
        const totalClicks = metricsData.reduce((sum, c) => sum + (c.total_clicks || 0), 0);
        const totalConversions = metricsData.reduce((sum, c) => sum + (c.total_conversions || 0), 0);
        const totalRevenue = metricsData.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
        const totalSpend = metricsData.reduce((sum, c) => sum + (c.total_spend || 0), 0);
        
        setMetrics({
          totalCampaigns: metricsData.length,
          activeCampaigns: metricsData.filter(c => c.is_active).length,
          totalImpressions,
          totalClicks,
          totalConversions,
          totalRevenue,
          totalSpend,
          averageROI: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend * 100) : 0,
          averageCTR: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0,
          averageConversionRate: totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0
        });
      }
      
      // Load top campaigns
      const { data: topData } = await supabase
        .from('campaign_performance')
        .select(`
          campaign_id,
          total_impressions,
          total_clicks,
          total_conversions,
          roi,
          ctr,
          campaigns (
            id,
            title,
            status
          )
        `)
        .order('roi', { ascending: false })
        .limit(5);
      
      if (topData) {
        setTopCampaigns(topData.map((d: any) => ({
          id: d.campaign_id,
          title: d.campaigns?.title || 'Untitled',
          impressions: d.total_impressions || 0,
          clicks: d.total_clicks || 0,
          conversions: d.total_conversions || 0,
          roi: d.roi || 0,
          ctr: d.ctr || 0,
          status: d.campaigns?.status || 'unknown'
        })));
      }
      
      // Load platform performance
      const { data: platformData } = await supabase
        .from('campaign_analytics')
        .select('source, impressions, clicks')
        .not('source', 'is', null);
      
      if (platformData) {
        const platformMap = new Map<string, PlatformPerformance>();
        
        platformData.forEach((row: any) => {
          const platform = row.source || 'direct';
          const existing = platformMap.get(platform) || { platform, impressions: 0, clicks: 0, conversions: 0 };
          existing.impressions += row.impressions || 0;
          existing.clicks += row.clicks || 0;
          platformMap.set(platform, existing);
        });
        
        setPlatformPerformance(Array.from(platformMap.values()));
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <Activity className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <p className="text-slate-400">No analytics data available yet</p>
        <p className="text-sm text-slate-500 mt-2">Create and run campaigns to see performance metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Campaign Analytics
          </h2>
          <p className="text-slate-400 mt-1">Real-time performance tracking and insights</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Reach"
          value={formatNumber(metrics.totalImpressions)}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
          subtitle={`${metrics.activeCampaigns} active campaigns`}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(metrics.totalClicks)}
          icon={<MousePointerClick className="h-5 w-5" />}
          color="green"
          subtitle={`${metrics.averageCTR.toFixed(2)}% CTR`}
        />
        <MetricCard
          title="Conversions"
          value={formatNumber(metrics.totalConversions)}
          icon={<Target className="h-5 w-5" />}
          color="purple"
          subtitle={`${metrics.averageConversionRate.toFixed(2)}% rate`}
        />
        <MetricCard
          title="ROI"
          value={`${metrics.averageROI.toFixed(0)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="orange"
          subtitle={`€${formatNumber(metrics.totalRevenue)} revenue`}
          trending={metrics.averageROI > 100}
        />
      </div>

      {/* Top Campaigns */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Top Performing Campaigns
        </h3>
        
        {topCampaigns.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No campaigns yet</p>
        ) : (
          <div className="space-y-3">
            {topCampaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-black text-slate-600">#{index + 1}</div>
                  <div>
                    <h4 className="font-bold text-white">{campaign.title}</h4>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>{formatNumber(campaign.impressions)} impressions</span>
                      <span>{formatNumber(campaign.clicks)} clicks</span>
                      <span>{formatNumber(campaign.conversions)} conversions</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-green-500">
                    {campaign.roi.toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400">ROI</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Performance */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-indigo-500" />
          Platform Performance
        </h3>
        
        {platformPerformance.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No platform data yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platformPerformance.map((platform) => (
              <div
                key={platform.platform}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4"
              >
                <div className="text-sm font-bold text-slate-400 uppercase mb-2">
                  {getPlatformIcon(platform.platform)} {platform.platform}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Impressions</span>
                    <span className="font-bold">{formatNumber(platform.impressions)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Clicks</span>
                    <span className="font-bold">{formatNumber(platform.clicks)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">CTR</span>
                    <span className="font-bold text-green-500">
                      {platform.impressions > 0 
                        ? ((platform.clicks / platform.impressions) * 100).toFixed(2) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trending?: boolean;
}

function MetricCard({ title, value, icon, color, subtitle, trending }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500'
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black text-white mb-1 flex items-center gap-2">
        {value}
        {trending !== undefined && (
          trending ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )
        )}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400">{subtitle}</div>
      )}
    </div>
  );
}

// Helper Functions
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    twitter: '🐦',
    linkedin: '💼',
    direct: '🔗'
  };
  return icons[platform] || '🌐';
}
