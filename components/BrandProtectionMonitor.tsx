import React, { useState, useEffect } from 'react';
import { Shield, Search, Globe, AlertTriangle, CheckCircle, XCircle, Eye, TrendingUp, Activity, Code, ExternalLink, RefreshCw } from 'lucide-react';
import type { BrandMonitoringAlert, MonitoringStats } from '@/types';

interface BrandProtectionMonitorProps {
  user: any;
}

export default function BrandProtectionMonitor({ user }: BrandProtectionMonitorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'domain' | 'brand' | 'search' | 'social' | 'competitors'>('overview');
  const [alerts, setAlerts] = useState<BrandMonitoringAlert[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls to monitoring services
      // This would integrate with GitHub API, WHOIS services, brand monitoring APIs, etc.
      
      // Mock data for demonstration
      const mockStats: MonitoringStats = {
        codeScans: 145,
        domainChecks: 89,
        brandMentions: 234,
        searchResults: 1523,
        socialMentions: 456,
        competitorAlerts: 12,
        criticalAlerts: 3,
        warningAlerts: 8,
        infoAlerts: 15,
        lastScanTime: new Date(),
      };

      const mockAlerts: BrandMonitoringAlert[] = [
        {
          id: '1',
          type: 'code',
          severity: 'critical',
          title: 'Code similarity detected on GitHub',
          description: 'Repository "fake-eventnexus" contains code similar to EventNexus platform',
          url: 'https://github.com/fake-user/fake-eventnexus',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'open',
          actionTaken: null,
        },
        {
          id: '2',
          type: 'domain',
          severity: 'warning',
          title: 'Suspicious domain registered',
          description: 'Domain "eventnexuss.com" registered by unknown party',
          url: 'https://eventnexuss.com',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          status: 'investigating',
          actionTaken: 'WHOIS lookup initiated',
        },
        {
          id: '3',
          type: 'brand',
          severity: 'info',
          title: 'Brand mention in blog post',
          description: 'Positive review of EventNexus platform on tech blog',
          url: 'https://techblog.example.com/eventnexus-review',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
          status: 'resolved',
          actionTaken: 'Monitored - no action needed',
        },
      ];

      setStats(mockStats);
      setAlerts(mockAlerts);
      setLastScan(new Date());
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async (scanType: string) => {
    setLoading(true);
    try {
      // TODO: Implement actual scan based on type
      console.log(`Running ${scanType} scan...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      await loadMonitoringData();
    } catch (error) {
      console.error(`Error running ${scanType} scan:`, error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-500';
      case 'investigating': return 'text-yellow-500';
      case 'resolved': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Code className="w-8 h-8 text-blue-500" />
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{stats?.codeScans || 0}</p>
          <p className="text-sm text-gray-400">Code Scans</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-8 h-8 text-green-500" />
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{stats?.domainChecks || 0}</p>
          <p className="text-sm text-gray-400">Domain Checks</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-8 h-8 text-purple-500" />
            <Eye className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{stats?.brandMentions || 0}</p>
          <p className="text-sm text-gray-400">Brand Mentions</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <Activity className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{(stats?.criticalAlerts || 0) + (stats?.warningAlerts || 0)}</p>
          <p className="text-sm text-gray-400">Active Alerts</p>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Alert Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500 mb-1">{stats?.criticalAlerts || 0}</div>
            <div className="text-sm text-gray-400">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500 mb-1">{stats?.warningAlerts || 0}</div>
            <div className="text-sm text-gray-400">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500 mb-1">{stats?.infoAlerts || 0}</div>
            <div className="text-sm text-gray-400">Info</div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${getStatusColor(alert.status)}`}>
                      {alert.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white mb-1">{alert.title}</h4>
                  <p className="text-sm text-gray-300">{alert.description}</p>
                </div>
                {alert.url && (
                  <a href={alert.url} target="_blank" rel="noopener noreferrer" className="ml-4">
                    <ExternalLink className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                  </a>
                )}
              </div>
              {alert.actionTaken && (
                <div className="mt-2 text-xs text-gray-400 italic">
                  Action: {alert.actionTaken}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCodeMonitoring = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Code Similarity Detection</h3>
          <button
            onClick={() => runScan('code')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Scan Now
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">GitHub Repository Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Scans GitHub for repositories with similar code to EventNexus</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className="text-green-500">✓ Active</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Google Code Search</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors public code repositories for EventNexus code snippets</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className="text-green-500">✓ Active</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Package Registry Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Checks npm, PyPI, and other registries for unauthorized packages</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className="text-green-500">✓ Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDomainMonitoring = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Domain & WHOIS Monitoring</h3>
          <button
            onClick={() => runScan('domain')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Check Domains
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-green-500/20 bg-green-500/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-white">eventnexus.eu (Primary)</h4>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-green-500 ml-2">Active & Protected</span>
              </div>
              <div>
                <span className="text-gray-400">Expires:</span>
                <span className="text-white ml-2">2026-12-15</span>
              </div>
              <div>
                <span className="text-gray-400">Registrar:</span>
                <span className="text-white ml-2">EURid</span>
              </div>
              <div>
                <span className="text-gray-400">SSL:</span>
                <span className="text-green-500 ml-2">Valid</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Typosquatting Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors for similar domain registrations (eventnexuss.com, evetnexus.eu, etc.)</p>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Domains monitored: 47</span>
                <span className="text-yellow-500">2 suspicious</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">WHOIS Change Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Alerts on WHOIS record changes for monitored domains</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">✓ No changes detected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrandProtection = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Brand Protection Services</h3>
          <button
            onClick={() => runScan('brand')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Scan Brands
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Trademark Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors trademark offices (EUIPO, USPTO, WIPO) for conflicting applications</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">EventNexus™:</span>
                <span className="text-green-500 ml-2">Registered (EU)</span>
              </div>
              <div>
                <span className="text-gray-400">Conflicts:</span>
                <span className="text-white ml-2">0 detected</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Logo & Asset Protection</h4>
            <p className="text-sm text-gray-400 mb-3">Scans web for unauthorized use of EventNexus logo and brand assets</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className="text-green-500">0 violations</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Counterfeit Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors marketplaces and platforms for counterfeit EventNexus services</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">✓ No counterfeits detected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchMonitoring = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Search Engine Monitoring</h3>
          <button
            onClick={() => runScan('search')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Update Results
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Google Search Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Tracks EventNexus mentions and rankings in Google search results</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Total results:</span>
                <span className="text-white ml-2">1,523</span>
              </div>
              <div>
                <span className="text-gray-400">Rank for "event platform":</span>
                <span className="text-green-500 ml-2">#12</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">SEO Attack Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors for negative SEO campaigns targeting EventNexus</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">✓ No attacks detected</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Reputation Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Tracks sentiment and mentions across review sites and forums</p>
            <div className="grid grid-cols-3 gap-4 text-sm mt-3">
              <div>
                <span className="text-green-500">Positive: 87%</span>
              </div>
              <div>
                <span className="text-gray-400">Neutral: 10%</span>
              </div>
              <div>
                <span className="text-red-500">Negative: 3%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSocialMonitoring = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Social Media Monitoring</h3>
          <button
            onClick={() => runScan('social')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Brand Mention Tracking</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors @EventNexus mentions across Twitter, Facebook, LinkedIn, Instagram</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Mentions (24h):</span>
                <span className="text-white ml-2">47</span>
              </div>
              <div>
                <span className="text-gray-400">Sentiment:</span>
                <span className="text-green-500 ml-2">Positive</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Impersonation Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Scans for fake EventNexus accounts and impersonators</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-yellow-500">⚠ 2 suspicious accounts flagged</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Hashtag Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Tracks #EventNexus and related hashtags for brand awareness</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">#EventNexus:</span>
                <span className="text-white ml-2">1,234 posts</span>
              </div>
              <div>
                <span className="text-gray-400">Reach:</span>
                <span className="text-white ml-2">45.7K users</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompetitorAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Competitor Analysis Tools</h3>
          <button
            onClick={() => runScan('competitors')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Analyze Now
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Platform Feature Comparison</h4>
            <p className="text-sm text-gray-400 mb-3">Tracks competitor feature releases and compares with EventNexus</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Competitors monitored: 8</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Pricing Intelligence</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors competitor pricing changes and promotional campaigns</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">✓ Competitive advantage maintained</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Market Position Tracking</h4>
            <p className="text-sm text-gray-400 mb-3">Analyzes market share and positioning relative to competitors</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Market position:</span>
                <span className="text-green-500 ml-2">Growing</span>
              </div>
              <div>
                <span className="text-gray-400">Unique features:</span>
                <span className="text-white ml-2">15</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'code', label: 'Code Protection', icon: Code },
    { id: 'domain', label: 'Domain Monitoring', icon: Globe },
    { id: 'brand', label: 'Brand Protection', icon: Shield },
    { id: 'search', label: 'Search Monitoring', icon: Search },
    { id: 'social', label: 'Social Media', icon: Eye },
    { id: 'competitors', label: 'Competitors', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-500" />
            <h1 className="text-3xl font-bold">Brand Protection Monitor</h1>
          </div>
          <p className="text-gray-400">
            Comprehensive platform and brand protection monitoring tools
          </p>
          {lastScan && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastScan.toLocaleString()}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading && activeTab !== 'overview' && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'code' && renderCodeMonitoring()}
            {activeTab === 'domain' && renderDomainMonitoring()}
            {activeTab === 'brand' && renderBrandProtection()}
            {activeTab === 'search' && renderSearchMonitoring()}
            {activeTab === 'social' && renderSocialMonitoring()}
            {activeTab === 'competitors' && renderCompetitorAnalysis()}
          </>
        )}

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-500 font-semibold mb-1">Integration Required</p>
              <p className="text-gray-400">
                This monitoring dashboard requires API integrations with third-party services (GitHub API, WHOIS services, brand monitoring platforms, etc.). 
                Configure API keys and services in the admin settings to enable real-time monitoring.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
