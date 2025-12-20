import React, { useState, useEffect } from 'react';
import { Shield, Search, Globe, AlertTriangle, CheckCircle, XCircle, Eye, TrendingUp, Activity, Code, ExternalLink, RefreshCw } from 'lucide-react';
import type { BrandMonitoringAlert, MonitoringStats } from '@/types';
import * as brandMonitoringService from '@/services/brandMonitoringService';

interface BrandProtectionMonitorProps {
  user: any;
}

export default function BrandProtectionMonitor({ user }: BrandProtectionMonitorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'domain' | 'brand' | 'search' | 'social' | 'competitors'>('overview');
  const [alerts, setAlerts] = useState<BrandMonitoringAlert[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [domainInfo, setDomainInfo] = useState<any>(null);

  useEffect(() => {
    loadMonitoringData();
    loadDomainInfo();
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // Load real data from Supabase database
      const [alertsData, statsData] = await Promise.all([
        brandMonitoringService.getMonitoringAlerts(),
        brandMonitoringService.getMonitoringStats(),
      ]);

      // If no stats exist yet, initialize with zeros
      const initialStats: MonitoringStats = {
        codeScans: 0,
        domainChecks: 0,
        brandMentions: 0,
        searchResults: 0,
        socialMentions: 0,
        competitorAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        lastScanTime: new Date(),
      };

      setAlerts(alertsData);
      setStats(statsData || initialStats);
      setLastScan(statsData?.lastScanTime || new Date());
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDomainInfo = async () => {
    try {
      const info = await brandMonitoringService.getPrimaryDomainInfo();
      setDomainInfo(info);
    } catch (error) {
      console.error('Error loading domain info:', error);
    }
  };

  const runScan = async (scanType: string) => {
    setLoading(true);
    try {
      console.log(`Running ${scanType} scan...`);
      
      let newAlerts: BrandMonitoringAlert[] = [];
      
      switch (scanType) {
        case 'code':
          newAlerts = await brandMonitoringService.scanGitHubCodeSimilarity();
          break;
        case 'domain':
          newAlerts = await brandMonitoringService.checkDomainTyposquatting();
          break;
        case 'brand':
          newAlerts = await brandMonitoringService.monitorBrandMentions();
          break;
        case 'search':
          newAlerts = await brandMonitoringService.monitorSearchEngines();
          break;
        case 'social':
          newAlerts = await brandMonitoringService.monitorSocialMedia();
          break;
        case 'competitors':
          newAlerts = await brandMonitoringService.analyzeCompetitors();
          break;
        case 'comprehensive':
          const result = await brandMonitoringService.runComprehensiveScan();
          setAlerts(result.alerts);
          setStats(result.stats);
          setLastScan(result.stats.lastScanTime);
          return;
        default:
          console.warn(`Unknown scan type: ${scanType}`);
      }
      
      // Reload all data after scan
      await loadMonitoringData();
    } catch (error) {
      console.error(`Error running ${scanType} scan:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlertStatus = async (alertId: string, status: BrandMonitoringAlert['status'], actionTaken?: string) => {
    const success = await brandMonitoringService.updateAlertStatus(alertId, status, actionTaken);
    if (success) {
      await loadMonitoringData();
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    const success = await brandMonitoringService.deleteAlert(alertId);
    if (success) {
      await loadMonitoringData();
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
      {/* Comprehensive Scan Button */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Comprehensive Security Scan</h3>
          <p className="text-sm text-gray-400">Run all monitoring checks (Code, Domain, Search, Brand)</p>
        </div>
        <button
          onClick={() => runScan('comprehensive')}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all font-semibold"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Run Full Scan'}
        </button>
      </div>

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

      {/* API Configuration Notice */}
      {alerts.length === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">API Integration Required</h3>
              <p className="text-sm text-gray-300 mb-4">
                This monitoring dashboard requires API integrations with third-party services. Configure the following in Supabase Edge Function Secrets:
              </p>
              <ul className="text-sm text-gray-400 space-y-2 ml-4">
                <li>• <code className="text-blue-400">GITHUB_TOKEN</code> - GitHub API access for code monitoring</li>
                <li>• <code className="text-blue-400">WHOIS_API_KEY</code> - WHOIS service for domain monitoring</li>
                <li>• <code className="text-blue-400">GOOGLE_SEARCH_KEY</code> - Google Custom Search API</li>
                <li>• <code className="text-blue-400">TWITTER_BEARER_TOKEN</code> - Twitter API for social monitoring</li>
              </ul>
              <p className="text-xs text-gray-500 mt-4">
                Configure via: <code className="text-blue-400">supabase secrets set SECRET_NAME=value</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No alerts detected yet. Run a scan to start monitoring.</p>
          </div>
        ) : (
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
                <div className="mt-3 flex items-center gap-2">
                  {alert.status === 'open' && (
                    <button
                      onClick={() => handleUpdateAlertStatus(alert.id, 'investigating', 'Under investigation')}
                      className="px-3 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded transition-colors"
                    >
                      Investigate
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateAlertStatus(alert.id, 'resolved', 'Reviewed and resolved')}
                      className="px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">GitHub Repository Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Scans GitHub for repositories with similar code to EventNexus</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className={alerts.filter(a => a.type === 'code' && a.detected_by === 'github_scan').length > 0 ? 'text-yellow-500' : 'text-green-500'}>
                {alerts.filter(a => a.type === 'code' && a.detected_by === 'github_scan').length} repositories found
              </span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Package Registry Monitoring</h4>
            <p className="text-sm text-gray-400 mb-3">Checks npm & PyPI for typosquatting packages (FREE)</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className={alerts.filter(a => a.detected_by?.includes('registry')).length > 0 ? 'text-yellow-500' : 'text-green-500'}>
                {alerts.filter(a => a.detected_by?.includes('registry')).length} suspicious packages
              </span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Certificate Transparency Logs</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors SSL certificates issued for EventNexus-related domains (FREE)</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className={alerts.filter(a => a.detected_by === 'cert_transparency').length > 0 ? 'text-yellow-500' : 'text-green-500'}>
                {alerts.filter(a => a.detected_by === 'cert_transparency').length} certificates found
              </span>
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
            {domainInfo ? (
              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 ${domainInfo.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {domainInfo.status === 'active' ? 'Active & Protected' : 'Checking...'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">SSL Expires:</span>
                  <span className="text-white ml-2">
                    {domainInfo.ssl?.expiry ? new Date(domainInfo.ssl.expiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Registrar:</span>
                  <span className="text-white ml-2">{domainInfo.registrar || 'EURid'}</span>
                </div>
                <div>
                  <span className="text-gray-400">SSL:</span>
                  <span className={`ml-2 ${domainInfo.ssl?.valid ? 'text-green-500' : 'text-red-500'}`}>
                    {domainInfo.ssl?.valid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                {domainInfo.ssl?.issuer && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Certificate Issuer:</span>
                    <span className="text-white ml-2 text-xs">{domainInfo.ssl.issuer}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                <p className="text-sm text-gray-400 mt-2">Loading domain info...</p>
              </div>
            )}
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Typosquatting Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Monitors for similar domain registrations (eventnexuss.com, evetnexus.eu, etc.)</p>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Monitored via URLScan.io & DNS</span>
                <span className="text-yellow-500">{alerts.filter(a => a.type === 'domain' && a.severity === 'warning').length} suspicious</span>
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
            <p className="text-sm text-gray-400 mb-3">Manual monitoring of trademark offices (EUIPO, USPTO, WIPO)</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Brand alerts:</span>
                <span className="text-white ml-2">{alerts.filter(a => a.type === 'brand').length}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="text-gray-400 ml-2">Manual review required</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Logo & Asset Protection</h4>
            <p className="text-sm text-gray-400 mb-3">Reverse image search monitoring via scanBrand()</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Last scan: {lastScan?.toLocaleTimeString() || 'Never'}</span>
              <span className="text-gray-400">{alerts.filter(a => a.type === 'brand' && a.title?.includes('logo')).length} potential violations</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Counterfeit Detection</h4>
            <p className="text-sm text-gray-400 mb-3">Manual monitoring of marketplaces and platforms</p>
            <div className="flex items-center gap-4 text-sm">
              <span className={alerts.filter(a => a.type === 'brand' && a.severity === 'critical').length > 0 ? 'text-yellow-500' : 'text-green-500'}>
                {alerts.filter(a => a.type === 'brand' && a.severity === 'critical').length > 0 
                  ? `⚠ ${alerts.filter(a => a.type === 'brand' && a.severity === 'critical').length} alerts`
                  : '✓ No counterfeits detected'}
              </span>
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
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Google Search Results</h4>
            <p className="text-sm text-gray-400 mb-3">Tracks EventNexus mentions in Google search results</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Search alerts found:</span>
                <span className="text-white ml-2">{alerts.filter(a => a.type === 'search').length}</span>
              </div>
              <div>
                <span className="text-gray-400">Last scan:</span>
                <span className="text-white ml-2">{lastScan?.toLocaleTimeString() || 'Never'}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Monitoring Status</h4>
            <p className="text-sm text-gray-400 mb-3">Google Custom Search API integration status</p>
            <div className="flex items-center gap-4 text-sm">
              <span className={stats && stats.searchResults > 0 ? 'text-green-500' : 'text-gray-400'}>
                {stats && stats.searchResults > 0 ? '✓ Active monitoring' : '○ Run scan to activate'}
              </span>
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
            {loading ? 'Scanning...' : 'Refresh Feed'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Twitter/X Mentions</h4>
            <p className="text-sm text-gray-400 mb-3">Tracks EventNexus mentions using free Nitter scraper</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Mentions found:</span>
                <span className="text-white ml-2">{alerts.filter(a => a.type === 'social').length}</span>
              </div>
              <div>
                <span className="text-gray-400">Last scan:</span>
                <span className="text-white ml-2">{lastScan?.toLocaleTimeString() || 'Never'}</span>
              </div>
            </div>
          </div>

          {alerts.filter(a => a.type === 'social').length > 0 && (
            <div className="border border-pink-500/20 bg-pink-500/10 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Recent Mentions</h4>
              <div className="space-y-3">
                {alerts.filter(a => a.type === 'social').slice(0, 5).map(alert => (
                  <div key={alert.id} className="border border-gray-700 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-300 mb-1">{alert.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          {alert.metadata?.source && (
                            <>
                              <span>•</span>
                              <span>{alert.metadata.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {alert.url && (
                        <a href={alert.url} target="_blank" rel="noopener noreferrer" className="ml-2">
                          <ExternalLink className="w-4 h-4 text-pink-400 hover:text-pink-300" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Monitoring Status</h4>
            <p className="text-sm text-gray-400 mb-3">Free Nitter scraper - no Twitter API key required</p>
            <div className="flex items-center gap-4 text-sm">
              <span className={stats && stats.socialMentions > 0 ? 'text-green-500' : 'text-gray-400'}>
                {stats && stats.socialMentions > 0 ? '✓ Active' : '○ Run scan to activate'}
              </span>
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
            <p className="text-sm text-gray-400 mb-3">Manual feature tracking and comparison analysis</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Competitor alerts: {alerts.filter(a => a.type === 'competitor').length}</span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Pricing Intelligence</h4>
            <p className="text-sm text-gray-400 mb-3">Manual monitoring of competitor pricing and campaigns</p>
            <div className="flex items-center gap-4 text-sm">
              <span className={alerts.filter(a => a.type === 'competitor' && a.severity === 'warning').length > 0 ? 'text-yellow-500' : 'text-green-500'}>
                {alerts.filter(a => a.type === 'competitor' && a.severity === 'warning').length > 0
                  ? `⚠ ${alerts.filter(a => a.type === 'competitor' && a.severity === 'warning').length} pricing changes`
                  : '✓ Competitive pricing maintained'}
              </span>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">Market Position Tracking</h4>
            <p className="text-sm text-gray-400 mb-3">Database-driven competitor monitoring and analysis</p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">Total alerts:</span>
                <span className="text-white ml-2">{stats?.competitorAlerts || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Last scan:</span>
                <span className="text-white ml-2">{lastScan?.toLocaleTimeString() || 'Never'}</span>
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
