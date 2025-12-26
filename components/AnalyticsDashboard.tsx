import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Eye, MousePointerClick, RefreshCw,
  Search, Filter, Download, ArrowUpRight, ArrowDownRight,
  Globe, Target, Zap, AlertCircle, CheckCircle2, Clock,
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Settings, Share2, Maximize2, Plus, Trash2, Edit,
  Calendar, MapPin, Users, Smartphone, Chrome, Firefox, Safari,
  Chrome as ChromeIcon, Flag, Home, FileText, ExternalLink
} from 'lucide-react';
import {
  fetchGAMetrics, fetchTrafficData, fetchConversionFunnel,
  fetchMetaInsights, fetchSEOMetrics, getSEORecommendations,
  monitorKeywordRankings, GAMetric, TrafficData, SEOMetric, MetaInsight
} from '../services/analyticsApiService';

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardMetrics {
  ga: GAMetric[];
  traffic: TrafficData[];
  funnel: any[];
  meta: MetaInsight[];
  seo: SEOMetric[];
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    ga: [],
    traffic: [],
    funnel: [],
    meta: [],
    seo: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [metaTab, setMetaTab] = useState<'facebook' | 'instagram'>('facebook');
  const [seoSearch, setSeoSearch] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'traffic', label: 'Traffic', icon: <LineChartIcon className="w-4 h-4" /> },
    { id: 'conversions', label: 'Conversions', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'meta', label: 'Meta Ads', icon: <Target className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO Tools', icon: <Globe className="w-4 h-4" /> }
  ];

  // Load metrics on mount and when dateRange changes
  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [ga, traffic, funnel, meta, seo] = await Promise.all([
        fetchGAMetrics('traffic', dateRange),
        fetchTrafficData(dateRange),
        fetchConversionFunnel(dateRange),
        fetchMetaInsights('facebook'),
        fetchSEOMetrics('', 50)
      ]);

      setMetrics({ ga, traffic, funnel, meta, seo });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  const TrendBadge = ({ change, trend }: { change: number; trend: string }) => (
    <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
      {trend === 'up' ? (
        <ArrowUpRight className="w-4 h-4" />
      ) : (
        <ArrowDownRight className="w-4 h-4" />
      )}
      <span className="font-semibold">{Math.abs(change)}%</span>
    </div>
  );

  const MetricCard = ({ metric }: { metric: GAMetric }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-700">{metric.label}</h3>
        <TrendBadge change={metric.change} trend={metric.trend} />
      </div>
      <div className="text-3xl font-bold text-gray-900">
        {metric.value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        {metric.trend === 'up' ? 'Growing' : 'Declining'} this period
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gray-50 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.ga.map((metric, idx) => (
                  <MetricCard key={idx} metric={metric} />
                ))}
              </div>

              {/* Traffic Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Traffic Trends</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.traffic}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#0ea5e9"
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Conversion Funnel</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.funnel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="step" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TRAFFIC TAB */}
          {activeTab === 'traffic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users & Sessions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Users vs Sessions</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.traffic}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#0ea5e9" />
                      <Line type="monotone" dataKey="sessions" stroke="#06b6d4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Page Views & Bounce */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Page Views & Bounce Rate</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={metrics.traffic}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="pageViews" fill="#10b981" />
                      <Line yAxisId="right" type="monotone" dataKey="bounceRate" stroke="#ef4444" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* CONVERSIONS TAB */}
          {activeTab === 'conversions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Conversion Path</h2>
                <div className="space-y-4">
                  {metrics.funnel.map((step, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900">{step.step}</h3>
                        <span className="text-lg font-bold text-blue-600">
                          {step.users.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(step.users / metrics.funnel[0].users) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        Conversion: {step.conversionRate.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* META ADS TAB */}
          {activeTab === 'meta' && (
            <div className="space-y-6">
              <div className="flex gap-4 mb-6">
                {(['facebook', 'instagram'] as const).map(platform => (
                  <button
                    key={platform}
                    onClick={() => setMetaTab(platform)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      metaTab === platform
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.meta.map((insight, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-700">{insight.metric}</h3>
                      {insight.trend === 'up' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {insight.metric.includes('Cost') ? '$' : ''}
                      {insight.value.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Previous: {insight.previousValue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO TOOLS TAB */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              {/* Keyword Search & Monitor */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">SEO Keywords</h2>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={seoSearch}
                    onChange={(e) => setSeoSearch(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Keywords Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Keyword</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Position</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Impressions</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Clicks</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.seo.map((metric, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{metric.keyword}</div>
                            <div className="text-xs text-gray-500">{metric.url}</div>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${
                              metric.position <= 3
                                ? 'bg-green-100 text-green-700'
                                : metric.position <= 10
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              #{metric.position}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4 text-gray-900">
                            {metric.impressions.toLocaleString()}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-900">
                            {metric.clicks.toLocaleString()}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-900 font-semibold">
                            {metric.ctr.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEO Recommendations */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  SEO Optimization Tips
                </h2>
                <div className="space-y-3">
                  {[
                    { icon: <CheckCircle2 />, title: 'Meta Descriptions', desc: 'All pages have unique meta descriptions (155-160 chars)' },
                    { icon: <CheckCircle2 />, title: 'Mobile Optimization', desc: 'Site is fully responsive and mobile-friendly' },
                    { icon: <AlertCircle />, title: 'Header Tags', desc: 'Consider using more H1 tags strategically' },
                    { icon: <AlertCircle />, title: 'Internal Links', desc: 'Increase internal linking for better crawlability' },
                    { icon: <CheckCircle2 />, title: 'Schema Markup', desc: 'Event schema and Organization schema properly configured' }
                  ].map((tip, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={tip.icon.type === CheckCircle2 ? 'text-green-600' : 'text-blue-600'}>
                        {tip.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{tip.title}</h4>
                        <p className="text-sm text-gray-600">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sitemap & Robots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Sitemap</h3>
                  <div className="space-y-2">
                    <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" 
                       className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <span className="font-medium text-gray-900">sitemap.xml</span>
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </a>
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                      <p className="font-medium">Last updated: Today</p>
                      <p>Contains 1,234 URLs</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Robots.txt</h3>
                  <div className="space-y-2">
                    <a href="/robots.txt" target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <span className="font-medium text-gray-900">robots.txt</span>
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </a>
                    <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                      <p className="font-medium">Status: Optimized</p>
                      <p>All crawlers allowed to index content</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
