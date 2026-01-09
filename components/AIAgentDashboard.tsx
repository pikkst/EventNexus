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
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Settings,
  Calendar,
  Radio,
  FileText,
} from 'lucide-react';
import {
  AIAgentStats,
  CityHealthMetrics,
  ReviewQueueItem,
  AIDecisionLog,
  AIUsageLog,
} from '../types';
import { supabase } from '../services/supabase';
import { AgentLogsViewer } from './AgentLogsViewer';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'cities' | 'manage-cities' | 'scheduler' | 'review' | 'decisions' | 'costs' | 'logs'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // City management state
  const [cities, setCities] = useState<any[]>([]);
  const [showAddCity, setShowAddCity] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [newCity, setNewCity] = useState({ 
    city_name: '', 
    country: '', 
    latitude: '', 
    longitude: '', 
    timezone: 'Europe/Tallinn',
    is_active: true 
  });
  
  // Scheduler state
  const [schedulerConfigs, setSchedulerConfigs] = useState<any[]>([]);
  const [activeCronJobs, setActiveCronJobs] = useState<any[]>([]);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [loadingScheduler, setLoadingScheduler] = useState(false);

  // Live Activity state
  const [liveActivity, setLiveActivity] = useState<AIDecisionLog[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all'); // all, fetch, parse, validate, publish

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    // Subscribe to real-time activity updates
    const subscription = supabase
      .channel('ai_activity')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'ai_decision_log' }, 
        (payload) => {
          setLiveActivity(prev => [payload.new as AIDecisionLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
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
      setLiveActivity(decisionsResult); // Also populate live activity on load
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
    
    const totalResults = {
      cities: 0,
      totalFetched: 0,
      totalParsed: 0,
      totalValidated: 0,
      totalPublished: 0,
      cityErrors: [] as string[]
    };

    try {
      // Load active cities
      const { data: activeCities, error: citiesError } = await supabase
        .from('city_configs')
        .select('city_id, city_name, country')
        .eq('active', true)
        .order('city_name');

      if (citiesError) throw new Error(`Failed to load cities: ${citiesError.message}`);
      if (!activeCities || activeCities.length === 0) {
        alert('⚠️ No active cities found. Please add and activate cities first.');
        return;
      }

      totalResults.cities = activeCities.length;
      console.log(`🌍 Processing ${activeCities.length} cities one by one...`);

      // Process each city through full pipeline
      for (let i = 0; i < activeCities.length; i++) {
        const city = activeCities[i];
        console.log(`\n🏙️ [${i + 1}/${activeCities.length}] Processing: ${city.city_name}, ${city.country}`);

        try {
          // Step 1: Fetch sources for this city
          console.log(`  📥 Step 1/4: Fetching sources...`);
          const fetchResp = await supabase.functions.invoke('fetch-sources', {
            body: { city_id: city.city_id }
          });
          
          if (fetchResp.error) {
            totalResults.cityErrors.push(`${city.city_name}: Fetch failed - ${fetchResp.error.message}`);
            continue; // Skip to next city
          }
          
          const fetched = fetchResp.data?.results?.fetched || 0;
          totalResults.totalFetched += fetched;
          console.log(`  ✅ Fetched ${fetched} new events`);

          // Step 2: Parse with AI (processes all pending for this city)
          console.log(`  🤖 Step 2/4: Parsing with AI...`);
          const parseResp = await supabase.functions.invoke('parse-event-ai', {
            body: { city_id: city.city_id }
          });
          
          if (parseResp.error) {
            totalResults.cityErrors.push(`${city.city_name}: Parse failed - ${parseResp.error.message}`);
          } else {
            const parsed = parseResp.data?.results?.parsed || 0;
            totalResults.totalParsed += parsed;
            console.log(`  ✅ Parsed ${parsed} events`);
          }

          // Step 3: Validate events
          console.log(`  ✅ Step 3/4: Validating...`);
          const validateResp = await supabase.functions.invoke('validate-event', {
            body: { city_id: city.city_id }
          });
          
          if (validateResp.error) {
            totalResults.cityErrors.push(`${city.city_name}: Validate failed - ${validateResp.error.message}`);
          } else {
            const validated = validateResp.data?.results?.validated || 0;
            totalResults.totalValidated += validated;
            console.log(`  ✅ Validated ${validated} events`);
          }

          // Step 4: Publish to live map
          console.log(`  🚀 Step 4/4: Publishing...`);
          const publishResp = await supabase.functions.invoke('publish-event', {
            body: { city_id: city.city_id }
          });
          
          if (publishResp.error) {
            totalResults.cityErrors.push(`${city.city_name}: Publish failed - ${publishResp.error.message}`);
          } else {
            const published = publishResp.data?.results?.published || 0;
            totalResults.totalPublished += published;
            console.log(`  ✅ Published ${published} events`);
          }

          console.log(`✅ ${city.city_name} complete!\n`);

        } catch (cityError: any) {
          console.error(`❌ Error processing ${city.city_name}:`, cityError);
          totalResults.cityErrors.push(`${city.city_name}: ${cityError.message}`);
        }
      }

      // Show comprehensive results
      const summary = `
🎉 Pipeline Complete!

🌍 Cities Processed: ${totalResults.cities}
📥 Total Fetched: ${totalResults.totalFetched} events
🤖 Total Parsed: ${totalResults.totalParsed} events
✅ Total Validated: ${totalResults.totalValidated} events
🚀 Total Published: ${totalResults.totalPublished} events

${totalResults.cityErrors.length > 0 ? '\n⚠️ City Errors:\n' + totalResults.cityErrors.join('\n') : '✅ All cities processed successfully!'}
      `.trim();

      alert(summary);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error: any) {
      console.error('Pipeline failed:', error);
      alert(`❌ Pipeline Failed!\n\nError: ${error.message}\n\nCheck console for details.`);
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

  // City management functions
  async function loadCities() {
    try {
      const { data, error } = await supabase
        .from('city_configs')
        .select('*')
        .order('city_name');
      
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  }

  async function handleAddCity() {
    try {
      const { error } = await supabase
        .from('city_configs')
        .insert({
          city_id: crypto.randomUUID(),
          city_name: newCity.city_name,
          country: newCity.country,
          latitude: parseFloat(newCity.latitude),
          longitude: parseFloat(newCity.longitude),
          timezone: newCity.timezone,
          active: newCity.is_active,
        });

      if (error) throw error;
      
      setShowAddCity(false);
      setNewCity({ city_name: '', country: '', latitude: '', longitude: '', timezone: 'Europe/Tallinn', is_active: true });
      await loadCities();
      alert('City added successfully!');
    } catch (error: any) {
      console.error('Failed to add city:', error);
      alert(`Failed to add city: ${error.message}`);
    }
  }

  async function handleUpdateCity(city: any) {
    try {
      const { error } = await supabase
        .from('city_configs')
        .update({
          city_name: city.city_name,
          country: city.country,
          latitude: city.latitude,
          longitude: city.longitude,
          timezone: city.timezone,
          active: city.is_active,
        })
        .eq('city_id', city.city_id);

      if (error) throw error;
      
      setEditingCity(null);
      await loadCities();
      alert('City updated successfully!');
    } catch (error: any) {
      console.error('Failed to update city:', error);
      alert(`Failed to update city: ${error.message}`);
    }
  }

  async function handleDeleteCity(cityId: string) {
    if (!confirm('Are you sure you want to delete this city? This will also remove all associated event sources.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('city_configs')
        .delete()
        .eq('city_id', cityId);

      if (error) throw error;
      
      await loadCities();
      alert('City deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete city:', error);
      alert(`Failed to delete city: ${error.message}`);
    }
  }

  // Auto-geocode city when name and country are provided
  async function geocodeCity(cityName: string, country: string) {
    if (!cityName || !country) return;

    setIsGeocoding(true);
    try {
      const query = `${cityName}, ${country}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'EventNexus/1.0'
          }
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      if (data && data.length > 0) {
        const location = data[0];
        setNewCity(prev => ({
          ...prev,
          latitude: parseFloat(location.lat).toFixed(4),
          longitude: parseFloat(location.lon).toFixed(4)
        }));
      } else {
        alert(`Could not find coordinates for ${cityName}, ${country}. Please enter manually.`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to auto-fill coordinates. Please enter manually.');
    } finally {
      setIsGeocoding(false);
    }
  }

  // Auto-geocode city when name and country are provided
  async function geocodeCity(cityName: string, country: string) {
    if (!cityName || !country) return;

    setIsGeocoding(true);
    try {
      const query = `${cityName}, ${country}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      if (data && data.length > 0) {
        const location = data[0];
        setNewCity(prev => ({
          ...prev,
          latitude: parseFloat(location.lat).toFixed(4),
          longitude: parseFloat(location.lon).toFixed(4)
        }));
      } else {
        alert(`Could not find coordinates for ${cityName}, ${country}. Please enter manually.`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to auto-fill coordinates. Please enter manually.');
    } finally {
      setIsGeocoding(false);
    }
  }

  async function loadSchedulerConfig() {
    try {
      setLoadingScheduler(true);
      
      // Load scheduler configs from database
      const { data: configs, error: configError } = await supabase
        .from('scheduler_configs')
        .select('*')
        .order('job_name');
      
      if (configError) throw configError;
      setSchedulerConfigs(configs || []);
      
      // Load active cron jobs
      const { data: cronData, error: cronError } = await supabase
        .rpc('get_active_cron_jobs');
      
      if (cronError) {
        console.warn('Failed to load cron jobs:', cronError);
      } else {
        setActiveCronJobs(cronData || []);
      }
    } catch (error: any) {
      console.error('Failed to load scheduler config:', error);
      alert(`Failed to load scheduler: ${error.message}`);
    } finally {
      setLoadingScheduler(false);
    }
  }

  async function saveSchedulerJob(jobName: string, intervalHours: number, enabled: boolean) {
    try {
      setSavingScheduler(true);
      
      const functionUrls: Record<string, string> = {
        'fetch-sources': 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/fetch-sources',
        'parse-events': 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/parse-event-ai',
        'validate-events': 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/validate-event',
        'archive-expired': 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/archive-expired-events'
      };
      
      const { data, error } = await supabase.rpc('schedule_ai_pipeline_job', {
        p_job_name: jobName,
        p_interval_hours: intervalHours,
        p_function_url: functionUrls[jobName],
        p_enabled: enabled
      });
      
      if (error) throw error;
      
      if (data.success) {
        await loadSchedulerConfig();
        alert(`✅ ${jobName} scheduled successfully!\nCron: ${data.cron_expression}\nStatus: ${enabled ? 'Active' : 'Inactive'}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Failed to save scheduler:', error);
      alert(`❌ Failed to schedule job: ${error.message}`);
    } finally {
      setSavingScheduler(false);
    }
  }

  async function toggleSchedulerJob(jobName: string, currentEnabled: boolean) {
    const config = schedulerConfigs.find(c => c.job_name === jobName);
    if (!config) return;
    
    // Extract interval from cron expression (e.g., "0 */24 * * *" -> 24)
    const cronMatch = config.schedule_cron.match(/\*\/(\d+)/);
    const intervalHours = cronMatch ? parseInt(cronMatch[1]) : 24;
    await saveSchedulerJob(jobName, intervalHours, !currentEnabled);
  }

  useEffect(() => {
    if (activeTab === 'manage-cities') {
      loadCities();
    } else if (activeTab === 'scheduler') {
      loadSchedulerConfig();
    }
  }, [activeTab]);

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
                Avg confidence: {(stats.avg_confidence || 0).toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Cost (7d)</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${(stats.estimated_cost_7d || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-purple-500" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {((stats.total_tokens_used_7d || 0) / 1000).toFixed(1)}k tokens
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'live-activity', label: 'Live Activity', icon: Radio },
                { id: 'cities', label: 'City Health', icon: MapPin },
                { id: 'manage-cities', label: 'Manage Cities', icon: Settings },
                { id: 'scheduler', label: 'Scheduler', icon: Calendar },
                { id: 'review', label: 'Review Queue', icon: Eye, badge: stats?.pending_review },
                { id: 'decisions', label: 'AI Decisions', icon: Bot },
                { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
                { id: 'logs', label: 'Agent Logs', icon: FileText },
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

            {activeTab === 'live-activity' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Radio className="w-5 h-5 text-green-500 animate-pulse" />
                      Live Agent Activity
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Real-time feed of AI agent actions and decisions</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="all">All Activity</option>
                      <option value="fetch">Fetch Sources</option>
                      <option value="parse">AI Parsing</option>
                      <option value="validation">Validation</option>
                      <option value="publish">Publishing</option>
                      <option value="bootstrap">City Bootstrap</option>
                    </select>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600 uppercase">
                      <span className="w-20">Time</span>
                      <span className="w-32">Agent</span>
                      <span className="w-40">Action</span>
                      <span className="flex-1">Details</span>
                      <span className="w-20">Score</span>
                    </div>
                  </div>
                  
                  <div className="max-h-[600px] overflow-y-auto">
                    {liveActivity
                      .filter(log => activityFilter === 'all' || log.decision_type.includes(activityFilter))
                      .map((log) => (
                        <div key={log.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-2 text-sm">
                            <span className="w-20 text-gray-500 text-xs">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                            <span className="w-32 font-medium text-indigo-600 text-xs">
                              {log.ai_model || 'Unknown'}
                            </span>
                            <span className="w-40 text-gray-900 text-xs">
                              {log.decision_type}
                            </span>
                            <div className="flex-1 text-xs text-gray-600">
                              <span className="font-medium text-gray-900">{log.decision_result}</span>
                              {log.reasoning && typeof log.reasoning === 'object' && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {Object.entries(log.reasoning).slice(0, 3).map(([key, value]) => (
                                    <span key={key} className="mr-3">
                                      {key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value).slice(0, 50)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className={`w-20 text-xs font-semibold ${
                              (log.confidence_score || 0) >= 80 ? 'text-green-600' :
                              (log.confidence_score || 0) >= 60 ? 'text-yellow-600' :
                              'text-orange-600'
                            }`}>
                              {log.confidence_score ? `${log.confidence_score}%` : '-'}
                            </span>
                          </div>
                        </div>
                      ))}
                    
                    {liveActivity.length === 0 && (
                      <div className="p-12 text-center text-gray-500">
                        <Radio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Waiting for agent activity...</p>
                        <p className="text-sm mt-1">Agents will appear here when they start working</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Sources Fetched</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {liveActivity.filter(l => l.decision_type.includes('fetch')).length}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">AI Parsed</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {liveActivity.filter(l => l.decision_type.includes('parse')).length}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Published</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {liveActivity.filter(l => l.decision_type.includes('publish')).length}
                    </p>
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
                          <p className="font-semibold text-gray-900">{(metric.avg_confidence || 0).toFixed(1)}%</p>
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

            {activeTab === 'manage-cities' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Manage Cities & Event Sources</h3>
                  <button
                    onClick={() => setShowAddCity(!showAddCity)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {showAddCity ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddCity ? 'Cancel' : 'Add City'}
                  </button>
                </div>

                {/* Add City Form */}
                {showAddCity && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4">Add New City</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City Name *</label>
                        <input
                          type="text"
                          value={newCity.city_name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewCity({ ...newCity, city_name: value });
                            // Auto-geocode when both city and country are filled
                            if (value && newCity.country) {
                              geocodeCity(value, newCity.country);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Tartu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                        <input
                          type="text"
                          value={newCity.country}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewCity({ ...newCity, country: value });
                            // Auto-geocode when both city and country are filled
                            if (newCity.city_name && value) {
                              geocodeCity(newCity.city_name, value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Estonia"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude * {isGeocoding && <span className="text-indigo-600 text-xs">(loading...)</span>}
                        </label>
                        <input
                          type="text"
                          value={newCity.latitude}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                          placeholder="Auto-filled from city name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude * {isGeocoding && <span className="text-indigo-600 text-xs">(loading...)</span>}
                        </label>
                        <input
                          type="text"
                          value={newCity.longitude}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                          placeholder="Auto-filled from city name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                        <select
                          value={newCity.timezone}
                          onChange={(e) => setNewCity({ ...newCity, timezone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Europe/Tallinn">Europe/Tallinn</option>
                          <option value="Europe/Helsinki">Europe/Helsinki</option>
                          <option value="Europe/Stockholm">Europe/Stockholm</option>
                          <option value="Europe/Riga">Europe/Riga</option>
                          <option value="Europe/Vilnius">Europe/Vilnius</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newCity.is_active}
                            onChange={(e) => setNewCity({ ...newCity, is_active: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Active</span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={handleAddCity}
                        disabled={!newCity.city_name || !newCity.country || !newCity.latitude || !newCity.longitude}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save City
                      </button>
                      <button
                        onClick={() => setShowAddCity(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Cities List */}
                <div className="space-y-4">
                  {cities.map((city) => (
                    <div key={city.city_id} className="border border-gray-200 rounded-lg p-4">
                      {editingCity?.city_id === city.city_id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              value={editingCity.city_name}
                              onChange={(e) => setEditingCity({ ...editingCity, city_name: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="City Name"
                            />
                            <input
                              type="text"
                              value={editingCity.country}
                              onChange={(e) => setEditingCity({ ...editingCity, country: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="Country"
                            />
                            <input
                              type="number"
                              step="0.0001"
                              value={editingCity.latitude}
                              onChange={(e) => setEditingCity({ ...editingCity, latitude: parseFloat(e.target.value) })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="Latitude"
                            />
                            <input
                              type="number"
                              step="0.0001"
                              value={editingCity.longitude}
                              onChange={(e) => setEditingCity({ ...editingCity, longitude: parseFloat(e.target.value) })}
                              className="px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="Longitude"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleUpdateCity(editingCity)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCity(null)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              {city.city_name}, {city.country}
                              {!city.is_active && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">Inactive</span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Lat: {(city.latitude || 0).toFixed(4)}, Lng: {(city.longitude || 0).toFixed(4)} • {city.timezone}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingCity(city)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.city_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {cities.length === 0 && !showAddCity && (
                    <div className="text-center py-12 text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No cities configured yet. Add your first city to start monitoring events!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'scheduler' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">AI Pipeline Scheduler</h3>
                  <button
                    onClick={loadSchedulerConfig}
                    disabled={loadingScheduler}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingScheduler ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-900">
                      <p className="font-medium mb-1">✅ Automatic Scheduler Active</p>
                      <p>Cron jobs are managed automatically through the UI. Enable/disable jobs below and they will be immediately scheduled in the database.</p>
                    </div>
                  </div>
                </div>

                {loadingScheduler ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Fetch Sources Job */}
                    {schedulerConfigs.map((config) => {
                      const isActive = activeCronJobs.some(job => job.jobname === `ai_agent_${config.job_name.replace('-', '_')}`);
                      const jobLabels: Record<string, string> = {
                        'fetch-sources': 'Fetch Event Sources',
                        'parse-events': 'Parse Events with AI',
                        'validate-events': 'Validate & Auto-Publish',
                        'archive-expired': 'Archive Expired Events'
                      };
                      const jobDescriptions: Record<string, string> = {
                        'fetch-sources': 'Fetches new events from configured city calendars and RSS feeds',
                        'parse-events': 'Extracts structured event data from raw HTML/XML using Gemini AI',
                        'validate-events': 'Validates parsed events and auto-publishes high-confidence matches',
                        'archive-expired': 'Automatically archives events after their end time has passed (removes from map)'
                      };
                      
                      return (
                        <div key={config.job_name} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-base font-semibold text-gray-900">{jobLabels[config.job_name]}</h4>
                                <div className="flex items-center gap-2">
                                  {config.is_enabled && isActive ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Active
                                    </span>
                                  ) : config.is_enabled ? (
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">Scheduled</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Disabled</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{jobDescriptions[config.job_name]}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Schedule:</span>
                                  <p className="font-mono text-xs text-gray-900 mt-1">{config.schedule_cron}</p>
                                </div>
                                {config.last_run_at && (
                                  <div>
                                    <span className="text-gray-500">Last Run:</span>
                                    <p className="text-xs text-gray-900 mt-1">{new Date(config.last_run_at).toLocaleString()}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-500">Total Runs:</span>
                                  <p className="text-xs text-gray-900 mt-1">{config.run_count || 0}</p>
                                </div>
                                {config.error_count > 0 && (
                                  <div>
                                    <span className="text-red-500">Errors:</span>
                                    <p className="text-xs text-red-600 mt-1">{config.error_count}</p>
                                  </div>
                                )}
                              </div>
                              {config.last_error && (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                  <strong>Last Error:</strong> {config.last_error}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => toggleSchedulerJob(config.job_name, config.is_enabled)}
                              disabled={savingScheduler}
                              className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
                                config.is_enabled
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              } disabled:opacity-50`}
                            >
                              {config.is_enabled ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Enable
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {schedulerConfigs.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No scheduler jobs configured. Please run the scheduler migration.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Cron Jobs Info */}
                {activeCronJobs.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-3">Active Cron Jobs in Database</h4>
                    <div className="space-y-2">
                      {activeCronJobs.map((job, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded border border-gray-200">
                          <div>
                            <span className="font-mono text-xs text-gray-900">{job.jobname}</span>
                            <p className="text-xs text-gray-500 mt-1">{job.schedule}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${job.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {job.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

            {activeTab === 'logs' && (
              <div className="space-y-6">
                <AgentLogsViewer 
                  maxLogs={200}
                  autoRefresh={true}
                  refreshInterval={5000}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
