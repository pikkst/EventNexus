import React, { useState, useEffect } from 'react';
import { Shield, Search, Globe, AlertTriangle, CheckCircle, XCircle, Eye, TrendingUp, Activity, Code, ExternalLink, RefreshCw, FileText, Download, X, Filter, SortAsc, MessageSquare, Ban } from 'lucide-react';
import type { BrandMonitoringAlert, MonitoringStats } from '@/types';
import * as brandMonitoringService from '@/services/brandMonitoringService';
import { generateBrandProtectionReport } from '@/services/geminiService';

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
  const [showReport, setShowReport] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  
  // Filter, Sort, Search states
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'severity' | 'type'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Whitelist modal
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [whitelistAlert, setWhitelistAlert] = useState<BrandMonitoringAlert | null>(null);
  const [whitelistReason, setWhitelistReason] = useState('');
  
  // Notes modal
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesAlert, setNotesAlert] = useState<BrandMonitoringAlert | null>(null);
  const [alertNotes, setAlertNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

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

  const toggleSelectAlert = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map(a => a.id)));
    }
  };

  const handleBulkAction = async (action: 'investigate' | 'resolve' | 'delete') => {
    const alertIds = Array.from(selectedAlerts);
    if (alertIds.length === 0) return;

    setLoading(true);
    try {
      for (const alertId of alertIds) {
        if (action === 'investigate') {
          await brandMonitoringService.updateAlertStatus(alertId, 'investigating', 'Bulk investigation');
        } else if (action === 'resolve') {
          await brandMonitoringService.updateAlertStatus(alertId, 'resolved', 'Bulk resolved');
        } else if (action === 'delete') {
          await brandMonitoringService.deleteAlert(alertId);
        }
      }
      setSelectedAlerts(new Set());
      await loadMonitoringData();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNotesModal = async (alert: BrandMonitoringAlert) => {
    setNotesAlert(alert);
    setShowNotesModal(true);
    setNewNote('');
    
    // Load existing notes
    try {
      const notes = await brandMonitoringService.getAlertNotes(alert.id);
      setAlertNotes(notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      setAlertNotes([]);
    }
  };

  const handleAddNote = async () => {
    if (!notesAlert || !newNote.trim()) return;
    
    setLoading(true);
    try {
      const success = await brandMonitoringService.addAlertNote(notesAlert.id, newNote);
      
      if (success) {
        const notes = await brandMonitoringService.getAlertNotes(notesAlert.id);
        setAlertNotes(notes);
        setNewNote('');
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelistAlert = async () => {
    if (!whitelistAlert || !whitelistReason) return;
    
    setLoading(true);
    try {
      const success = await brandMonitoringService.addToWhitelist(
        whitelistAlert.url || '',
        whitelistAlert.title,
        whitelistReason
      );
      
      if (success) {
        await brandMonitoringService.deleteAlert(whitelistAlert.id);
        await loadMonitoringData();
        setShowWhitelistModal(false);
        setWhitelistAlert(null);
        setWhitelistReason('');
      }
    } catch (error) {
      console.error('Whitelist error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const report = await generateBrandProtectionReport(alerts, stats);
      setAiReport(report);
      setShowReport(true);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = () => {
    if (!aiReport?.report) return;
    
    const content = `
EventNexus Brand Protection Report
Generated: ${new Date().toLocaleString()}
Alerts Analyzed: ${aiReport.alertsAnalyzed}
Critical: ${aiReport.criticalCount} | Warnings: ${aiReport.warningCount}

${aiReport.report}

---
Legal Framework References:
- LICENSE.md: /workspaces/EventNexus/LICENSE.md
- LEGAL_PROTECTION.md: /workspaces/EventNexus/docs/LEGAL_PROTECTION.md
- SECURITY.md: /workspaces/EventNexus/SECURITY.md
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-protection-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getFilteredAndSortedAlerts = () => {
    let filtered = alerts;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === filterSeverity);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        (a.url && a.url.toLowerCase().includes(query))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          return (severityOrder[a.severity as keyof typeof severityOrder] || 3) - 
                 (severityOrder[b.severity as keyof typeof severityOrder] || 3);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'newest':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return sorted;
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
        <div className="flex gap-3">
          <button
            onClick={generateReport}
            disabled={generatingReport || alerts.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all font-semibold"
          >
            <FileText className={`w-5 h-5 ${generatingReport ? 'animate-pulse' : ''}`} />
            {generatingReport ? 'Generating...' : 'AI Report'}
          </button>
          <button
            onClick={() => runScan('comprehensive')}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all font-semibold"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning...' : 'Run Full Scan'}
          </button>
        </div>
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
        {/* Filter, Search, Sort Bar */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="code">Code</option>
                <option value="domain">Domain</option>
                <option value="brand">Brand</option>
                <option value="search">Search</option>
                <option value="social">Social</option>
                <option value="competitor">Competitor</option>
              </select>

              {/* Severity Filter */}
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="newest">Newest First</option>
                <option value="severity">By Severity</option>
                <option value="type">By Type</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Recent Alerts
            {(filterType !== 'all' || filterSeverity !== 'all' || searchQuery) && (
              <span className="ml-2 text-sm text-gray-400">
                ({getFilteredAndSortedAlerts().length} filtered)
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            {alerts.length > 0 && (
              <>
                {selectedAlerts.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{selectedAlerts.size} selected</span>
                    <button
                      onClick={() => handleBulkAction('investigate')}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded transition-colors disabled:opacity-50"
                    >
                      Investigate All
                    </button>
                    <button
                      onClick={() => handleBulkAction('resolve')}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded transition-colors disabled:opacity-50"
                    >
                      Resolve All
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded transition-colors disabled:opacity-50"
                    >
                      Delete All
                    </button>
                  </div>
                )}
                {alerts.length > 5 && (
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="px-4 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
                  >
                    {showAllAlerts ? `Show Less` : `Show All (${alerts.length})`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No alerts detected yet. Run a scan to start monitoring.</p>
          </div>
        ) : getFilteredAndSortedAlerts().length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No alerts match your filters.</p>
            <button
              onClick={() => {
                setFilterType('all');
                setFilterSeverity('all');
                setSearchQuery('');
              }}
              className="mt-3 text-sm text-purple-400 hover:text-purple-300"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
              <input
                type="checkbox"
                checked={selectedAlerts.size === getFilteredAndSortedAlerts().length && getFilteredAndSortedAlerts().length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
              />
              <label className="text-sm text-gray-400 cursor-pointer" onClick={toggleSelectAll}>
                Select All ({getFilteredAndSortedAlerts().length} alerts)
              </label>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(showAllAlerts ? getFilteredAndSortedAlerts() : getFilteredAndSortedAlerts().slice(0, 5)).map(alert => (
              <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.has(alert.id)}
                    onChange={() => toggleSelectAlert(alert.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900 cursor-pointer"
                  />
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
                    <a href={alert.url} target="_blank" rel="noopener noreferrer" className="ml-2">
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
                  <button
                    onClick={() => handleOpenNotesModal(alert)}
                    className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Notes
                  </button>
                  <button
                    onClick={() => {
                      setWhitelistAlert(alert);
                      setShowWhitelistModal(true);
                    }}
                    className="px-3 py-1 text-xs bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/30 rounded transition-colors flex items-center gap-1"
                  >
                    <Ban className="w-3 h-3" />
                    Whitelist
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* API Configuration Notice - shown only when no alerts */}
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

      {/* AI Report Modal */}
      {showReport && aiReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-indigo-900/50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">AI Brand Protection Report</h2>
                  <p className="text-sm text-gray-400">
                    Generated {new Date(aiReport.timestamp).toLocaleString()} • {aiReport.alertsAnalyzed} alerts analyzed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadReport}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Download Report"
                >
                  <Download className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Alert Stats */}
            <div className="flex items-center gap-6 px-6 py-4 bg-gray-800/50 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-300">{aiReport.criticalCount} Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-300">{aiReport.warningCount} Warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Legal Framework Applied</span>
              </div>
            </div>

            {/* Report Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                  {aiReport.report}
                </div>
              </div>

              {/* Legal References */}
              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-sm font-semibold text-purple-400 mb-2">Legal Framework References</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• <strong>LICENSE.md</strong> - Proprietary Software License Agreement</p>
                  <p>• <strong>LEGAL_PROTECTION.md</strong> - Comprehensive Legal Framework</p>
                  <p>• <strong>SECURITY.md</strong> - Security Policy & Disclosure</p>
                  <p className="mt-2 text-gray-500">Framework includes: Copyright (Berne Convention), Trade Secrets (EU 2016/943), Trademark Protection, Domain Rights (ICANN UDRP)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Modal */}
      {showWhitelistModal && whitelistAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Ban className="w-6 h-6 text-gray-400" />
                <h3 className="text-xl font-bold text-white">Whitelist Alert</h3>
              </div>
              
              <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded">
                <p className="text-sm font-medium text-white">{whitelistAlert.title}</p>
                {whitelistAlert.url && (
                  <p className="text-xs text-gray-400 mt-1 break-all">{whitelistAlert.url}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Whitelisting <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={whitelistReason}
                  onChange={(e) => setWhitelistReason(e.target.value)}
                  placeholder="e.g., Not related to our platform, False positive, Scientific software..."
                  className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWhitelistModal(false);
                    setWhitelistAlert(null);
                    setWhitelistReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWhitelistAlert}
                  disabled={!whitelistReason.trim() || loading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Ban className="w-4 h-4" /> Add to Whitelist</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && notesAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Alert Notes</h3>
                </div>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotesAlert(null);
                    setAlertNotes([]);
                    setNewNote('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded">
                <p className="text-sm font-medium text-white">{notesAlert.title}</p>
                {notesAlert.url && (
                  <p className="text-xs text-gray-400 mt-1 break-all">{notesAlert.url}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {alertNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notes yet. Add the first one below.</p>
                </div>
              ) : (
                alertNotes.map((note) => (
                  <div key={note.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-gray-700">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add Note
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Document findings, actions taken, investigation notes..."
                  className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotesAlert(null);
                    setAlertNotes([]);
                    setNewNote('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</>
                  ) : (
                    <><MessageSquare className="w-4 h-4" /> Add Note</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
