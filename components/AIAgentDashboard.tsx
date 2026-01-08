import React, { useState, useEffect } from 'react';
import {
  Activity,
  Bot,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  MapPin,
  DollarSign,
  Zap,
  RefreshCw,
  Eye,
  Play,
  Pause,
} from 'lucide-react';
import {
  AIAgentStats,
  CityHealthMetrics,
  ReviewQueueItem,
  AIDecisionLog,
  AIUsageLog,
} from '../types';
import { supabase } from '../services/supabase';

interface AIAgentDashboardProps {
  user: any;
}

export default function AIAgentDashboard({ user }: AIAgentDashboardProps) {
  const [stats, setStats] = useState<AIAgentStats | null>(null);
  const [cityMetrics, setCityMetrics] = useState<CityHealthMetrics[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<AIDecisionLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cities' | 'review' | 'decisions' | 'costs'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Load all data in parallel
      const [
        statsResult,
        metricsResult,
        reviewResult,
        decisionsResult,
        usageResult,
      ] = await Promise.all([
        loadStats(),
        loadCityMetrics(),
        loadReviewQueue(),
        loadRecentDecisions(),
        loadUsageLogs(),
      ]);

      setStats(statsResult);
      setCityMetrics(metricsResult);
      setReviewQueue(reviewResult);
      setRecentDecisions(decisionsResult);
      setUsageLogs(usageResult);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats(): Promise<AIAgentStats> {
    // Get aggregated stats from multiple sources
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [citiesData, sourcesData, eventsData, reviewData, confidenceData, usageData] = await Promise.all([
      supabase.from('city_configs').select('*', { count: 'exact' }).eq('active', true),
      supabase.from('event_sources').select('*', { count: 'exact' }).eq('active', true),
      supabase.from('events').select('*', { count: 'exact' }).gte('created_at', yesterday.toISOString()),
      supabase.from('review_queue').select('*', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('event_confidence').select('final_score'),
      supabase.from('ai_usage_log').select('tokens_used, cost_estimate').gte('created_at', weekAgo.toISOString()),
    ]);

    const avgConfidence = confidenceData.data?.length
      ? confidenceData.data.reduce((sum, item) => sum + (item.final_score || 0), 0) / confidenceData.data.length
      : 0;

    const totalTokens = usageData.data?.reduce((sum, item) => sum + (item.tokens_used || 0), 0) || 0;
    const totalCost = usageData.data?.reduce((sum, item) => sum + (item.cost_estimate || 0), 0) || 0;

    return {
      total_cities: citiesData.count || 0,
      active_sources: sourcesData.count || 0,
      events_discovered_24h: eventsData.count || 0,
      events_published_24h: eventsData.count || 0,
      pending_review: reviewData.count || 0,
      avg_confidence: Math.round(avgConfidence * 100) / 100,
      total_tokens_used_7d: totalTokens,
      estimated_cost_7d: totalCost,
    };
  }

  async function loadCityMetrics(): Promise<CityHealthMetrics[]> {
    const { data, error } = await supabase
      .from('city_health_metrics')
      .select(`
        *,
        city:city_configs(city_name, country, active)
      `)
      .order('calculated_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  async function loadReviewQueue(): Promise<ReviewQueueItem[]> {
    const { data, error } = await supabase
      .from('review_queue')
      .select(`
        *,
        parsed_event:parsed_events(structured_json)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async function loadRecentDecisions(): Promise<AIDecisionLog[]> {
    const { data, error } = await supabase
      .from('ai_decision_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async function loadUsageLogs(): Promise<AIUsageLog[]> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('ai_usage_log')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async function triggerAgentPipeline() {
    setIsProcessing(true);
    try {
      // Trigger the agent pipeline via Edge Functions
      const { data, error } = await supabase.functions.invoke('fetch-sources', {
        body: { city_id: null }, // Process all cities
      });

      if (error) throw error;

      alert(`Agent pipeline triggered successfully!\n${JSON.stringify(data.results, null, 2)}`);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to trigger agent:', error);
      alert('Failed to trigger agent pipeline. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function approveReviewItem(item: ReviewQueueItem) {
    try {
      const { error } = await supabase
        .from('review_queue')
        .update({
          status: 'approved',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      // If it has a parsed_event, trigger publish
      if (item.parsed_event_id) {
        await supabase.functions.invoke('publish-event');
      }

      await loadDashboardData();
    } catch (error) {
      console.error('Failed to approve item:', error);
      alert('Failed to approve item');
    }
  }

  async function rejectReviewItem(item: ReviewQueueItem) {
    try {
      const { error } = await supabase
        .from('review_queue')
        .update({
          status: 'rejected',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to reject item:', error);
      alert('Failed to reject item');
    }
  }

  function getConfidenceColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  }

  function getHealthColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Agent Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bot className="w-8 h-8 text-indigo-600" />
                AI Agent System
              </h1>
              <p className="text-gray-600 mt-1">
                Autonomous event discovery, validation & publishing
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={triggerAgentPipeline}
                disabled={isProcessing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Pause className="w-4 h-4 animate-pulse" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Pipeline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cities Active</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_cities}</p>
                </div>
                <MapPin className="w-10 h-10 text-blue-500" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.active_sources} sources monitored
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Events (24h)</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.events_discovered_24h}</p>
                </div>
                <Activity className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.events_published_24h} published
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pending_review}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Avg confidence: {stats.avg_confidence.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Cost (7d)</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${stats.estimated_cost_7d.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-purple-500" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {(stats.total_tokens_used_7d / 1000).toFixed(1)}k tokens
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'cities', label: 'City Health', icon: MapPin },
                { id: 'review', label: 'Review Queue', icon: Eye, badge: stats?.pending_review },
                { id: 'decisions', label: 'AI Decisions', icon: Bot },
                { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">System Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Pipeline Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Fetching Sources</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">AI Parsing</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Validation</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Publishing</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
                    <div className="space-y-2">
                      {recentDecisions.slice(0, 5).map((decision) => (
                        <div key={decision.id} className="flex items-start gap-2 text-sm">
                          <Zap className="w-4 h-4 text-indigo-500 mt-0.5" />
                          <div>
                            <p className="text-gray-900">{decision.decision_type}</p>
                            <p className="text-gray-500 text-xs">
                              {new Date(decision.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cities' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">City Health Metrics</h3>
                <div className="space-y-4">
                  {cityMetrics.map((metric) => (
                    <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {metric.city?.city_name || 'Unknown'}, {metric.city?.country || ''}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Last updated: {new Date(metric.calculated_at).toLocaleString()}
                          </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${getHealthColor(metric.freshness_score)}`} />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Events (7d)</p>
                          <p className="font-semibold text-gray-900">{metric.events_last_7d}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Confidence</p>
                          <p className="font-semibold text-gray-900">{metric.avg_confidence.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Unclaimed</p>
                          <p className="font-semibold text-gray-900">{metric.unclaimed_events}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Failed Sources</p>
                          <p className={`font-semibold ${metric.failed_sources > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {metric.failed_sources}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Review Queue</h3>
                <div className="space-y-4">
                  {reviewQueue.map((item) => {
                    const eventData = item.parsed_event?.structured_json;
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {eventData?.title || 'Unknown Event'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>📍 {eventData?.location_address}</span>
                              <span>📅 {eventData?.start_time ? new Date(eventData.start_time).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(item.confidence_score || 0)}`}>
                            {item.confidence_score?.toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveReviewItem(item)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Approve & Publish
                          </button>
                          <button
                            onClick={() => rejectReviewItem(item)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Reject
                          </button>
                          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {reviewQueue.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>No items pending review</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">AI Decision Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Time</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Result</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Model</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Confidence</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Time (ms)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentDecisions.slice(0, 20).map((decision) => (
                        <tr key={decision.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(decision.created_at).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-gray-900">{decision.decision_type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              decision.decision_result.includes('success') || decision.decision_result.includes('approved')
                                ? 'bg-green-100 text-green-700'
                                : decision.decision_result.includes('reject')
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {decision.decision_result}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{decision.ai_model}</td>
                          <td className="px-4 py-3 text-gray-900">
                            {decision.confidence_score?.toFixed(1) || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {decision.processing_time_ms || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'costs' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">AI Cost Analysis (Last 7 Days)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {((stats?.total_tokens_used_7d || 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(stats?.estimated_cost_7d || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Avg Cost/Event</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(stats?.events_discovered_24h ? (stats.estimated_cost_7d / stats.events_discovered_24h) : 0).toFixed(3)}
                    </p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Agent</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Model</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Tokens</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700">Cost</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {usageLogs.slice(0, 50).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{log.agent_name}</td>
                          <td className="px-4 py-3 text-gray-600">{log.ai_model}</td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {log.tokens_used?.toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            ${log.cost_estimate?.toFixed(4) || '0.0000'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
