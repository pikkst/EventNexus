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
  Chrome as ChromeIcon, Flag, Home, FileText, ExternalLink, Lightbulb
} from 'lucide-react';
import {
  fetchGAMetrics, fetchTrafficData, fetchConversionFunnel,
  fetchMetaInsights, fetchSEOMetrics, getSEORecommendations,
  monitorKeywordRankings, GAMetric, TrafficData, SEOMetric, MetaInsight,
  fetchTrafficByCountry, fetchTrafficByDevice, fetchTrafficByBrowser,
  fetchTrafficBySearchEngine, fetchTopReferrers, fetchAICrawlerActivity,
  CountryTraffic, DeviceTraffic, BrowserTraffic, SearchEngineTraffic, ReferrerTraffic, AICrawlerVisit
} from '../services/analyticsApiService';
import SEOImprovementTools from './SEOImprovementTools';

const COLORS = ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardMetrics {
  ga: GAMetric[];
  traffic: TrafficData[];
  funnel: any[];
  meta: MetaInsight[];
  seo: SEOMetric[];
  countryTraffic: CountryTraffic[];
  deviceTraffic: DeviceTraffic[];
  browserTraffic: BrowserTraffic[];
  searchEngineTraffic: SearchEngineTraffic[];
  referrerTraffic: ReferrerTraffic[];
  aiCrawlers: AICrawlerVisit[];
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
    seo: [],
    countryTraffic: [],
    deviceTraffic: [],
    browserTraffic: [],
    searchEngineTraffic: [],
    referrerTraffic: [],
    aiCrawlers: []
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
    { id: 'seo', label: 'SEO Tools', icon: <Globe className="w-4 h-4" /> },
    { id: 'seo-improve', label: 'AI SEO Optimizer', icon: <Lightbulb className="w-4 h-4" /> }
  ];

  // Load metrics on mount and when dateRange changes
  useEffect(() => {
    loadMetrics(true); // Initial load with loading state
  }, [dateRange]);

  // Auto-refresh every 10 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadMetrics(false); // Background refresh without loading state
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [dateRange]);

  const loadMetrics = async (showLoading: boolean = false) => {
    // Only show loading spinner on initial load, not on background refresh
    if (showLoading && metrics.ga.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const [ga, traffic, funnel, meta, seo, countryTraffic, deviceTraffic, browserTraffic, searchEngineTraffic, referrerTraffic, aiCrawlers] = await Promise.all([
        fetchGAMetrics('traffic', dateRange),
        fetchTrafficData(dateRange),
        fetchConversionFunnel(dateRange),
        fetchMetaInsights('facebook'),
        fetchSEOMetrics('', 50),
        fetchTrafficByCountry(dateRange),
        fetchTrafficByDevice(dateRange),
        fetchTrafficByBrowser(dateRange),
        fetchTrafficBySearchEngine(dateRange),
        fetchTopReferrers(dateRange, 10),
        fetchAICrawlerActivity(dateRange)
      ]);

      // Update metrics smoothly without clearing old data first
      setMetrics({ ga, traffic, funnel, meta, seo, countryTraffic, deviceTraffic, browserTraffic, searchEngineTraffic, referrerTraffic, aiCrawlers });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await loadMetrics(false); // Refresh without full loading state
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
    <div className="w-full bg-gray-50 rounded-lg p-6 space-y-6 relative">
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
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 relative"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-700'}`} />
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

      {/* Content with stable layout - no opacity changes */}
      <div>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.ga.map((metric, idx) => (
                  <div key={idx} className="transition-all duration-300 hover:scale-105">
                    <MetricCard metric={metric} />
                  </div>
                ))}
              </div>

              {/* Traffic Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-300">
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

              {/* Geographic & Device Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic by Country */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Flag className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">Traffic by Country</h2>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {metrics.countryTraffic.length > 0 ? (
                      metrics.countryTraffic.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-700">{item.country || 'Unknown'}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{item.visit_count.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{item.unique_users} unique</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </div>
                </div>

                {/* Traffic by Device */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">Device Types</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={metrics.deviceTraffic}
                        dataKey="visit_count"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.device}: ${entry.percentage}%`}
                      >
                        {metrics.deviceTraffic.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Traffic by Browser */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Chrome className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">Browsers</h2>
                  </div>
                  <div className="space-y-2">
                    {metrics.browserTraffic.length > 0 ? (
                      metrics.browserTraffic.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded transition-colors">
                          <span className="font-medium text-gray-700">{item.browser}</span>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{item.percentage}%</span>
                            <span className="text-xs text-gray-500 ml-2">({item.visit_count})</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </div>
                </div>

                {/* Traffic by Search Engine */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Search className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">Search Engines</h2>
                  </div>
                  <div className="space-y-2">
                    {metrics.searchEngineTraffic.length > 0 ? (
                      metrics.searchEngineTraffic.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded transition-colors">
                          <span className="font-medium text-gray-700">{item.search_engine}</span>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{item.visit_count}</span>
                            <span className="text-xs text-gray-500 ml-2">({item.conversion_rate}% CVR)</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No data available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Referrers */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Top Referrers</h2>
                </div>
                <div className="space-y-2">
                  {metrics.referrerTraffic.length > 0 ? (
                    metrics.referrerTraffic.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">{idx + 1}</span>
                          </div>
                          <span className="font-medium text-gray-700">{item.referrer_domain}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{item.visit_count}</div>
                          <div className="text-xs text-gray-500">{item.unique_users} unique</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  )}
                </div>
              </div>

              {/* AI Crawler Activity */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative">
                    <span className="text-2xl">🤖</span>
                    {metrics.aiCrawlers.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">AI Crawler Activity</h2>
                  <span className="ml-auto text-xs text-gray-500">ChatGPT, Claude, Perplexity</span>
                </div>
                <div className="space-y-3">
                  {metrics.aiCrawlers.length > 0 ? (
                    metrics.aiCrawlers.map((crawler, idx) => {
                      // Assign emoji based on crawler type
                      const crawlerIcon = 
                        crawler.ai_crawler === 'ChatGPT' ? '🟢' :
                        crawler.ai_crawler === 'Claude' ? '🟠' :
                        crawler.ai_crawler === 'Perplexity' ? '🔵' :
                        crawler.ai_crawler === 'Google AI' ? '🔴' :
                        crawler.ai_crawler === 'CommonCrawl' ? '🟤' : '⚪';
                      
                      const lastVisitDate = new Date(crawler.last_visit);
                      const isRecent = Date.now() - lastVisitDate.getTime() < 24 * 60 * 60 * 1000;
                      
                      return (
                        <div key={idx} className={`p-4 rounded-lg border-2 transition-all ${
                          isRecent 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{crawlerIcon}</span>
                              <h3 className="font-bold text-gray-900">{crawler.ai_crawler}</h3>
                              {isRecent && (
                                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-semibold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{crawler.visit_count}</div>
                              <div className="text-xs text-gray-500">visits</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-semibold">Last visit:</span> {lastVisitDate.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-semibold">Pages explored:</span> {crawler.pages_visited.length}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {crawler.pages_visited.slice(0, 3).map((page, pidx) => (
                                <span key={pidx} className="px-2 py-0.5 bg-white rounded text-gray-700 border border-gray-200">
                                  {page}
                                </span>
                              ))}
                              {crawler.pages_visited.length > 3 && (
                                <span className="px-2 py-0.5 text-gray-500">
                                  +{crawler.pages_visited.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-gray-600 mb-1">No AI crawler activity detected yet</p>
                      <p className="text-sm text-gray-500">
                        ChatGPT, Claude, and Perplexity will appear here when they visit your platform
                      </p>
                    </div>
                  )}
                </div>
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

          {/* AI SEO Optimizer Tab */}
          {activeTab === 'seo-improve' && (
            <div className="animate-in fade-in duration-500">
              <SEOImprovementTools />
            </div>
          )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
