import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Info,
  Globe,
  Search,
} from 'lucide-react';
import {
  AIAgentStats,
  CityHealthMetrics,
  ReviewQueueItem,
  AIDecisionLog,
  AIUsageLog,
} from '../types';
import { supabase } from '../services/supabase';
import { AgentLogsViewer, AgentLog } from './AgentLogsViewer';
import CityFiltersPanel from './CityFiltersPanel';

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
  
  // Store Supabase agent logs for download
  const [supabaseLogs, setSupabaseLogs] = useState<AgentLog[]>([]);
  
  // Selected cities for pipeline execution (using city_id)
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  
  // Force refresh flag - clears all cached data before pipeline run
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // Guardian test state
  const [isTestingGuardian, setIsTestingGuardian] = useState(false);
  
  // Pipeline pause/stop state
  const [pipelineShouldStop, setPipelineShouldStop] = useState(false);
  const [pipelinePaused, setPipelinePaused] = useState(false);
  
  // Refs for pipeline control (used during async operations to track real-time state changes)
  const pipelineShouldStopRef = useRef(false);
  const pipelinePausedRef = useRef(false);
  
  // Update refs whenever state changes
  useEffect(() => {
    pipelineShouldStopRef.current = pipelineShouldStop;
  }, [pipelineShouldStop]);
  
  useEffect(() => {
    pipelinePausedRef.current = pipelinePaused;
  }, [pipelinePaused]);
  
  // City filtering and sorting state
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [cityFilterCountry, setCityFilterCountry] = useState<string>('all');
  const [cityFilterHealth, setCityFilterHealth] = useState<string>('all');
  const [cityFilterActive, setCityFilterActive] = useState<string>('all');
  const [cityFilterBootstrap, setCityFilterBootstrap] = useState<string>('all');
  const [citySortBy, setCitySortBy] = useState<'name' | 'country' | 'health' | 'events' | 'free_events'>('name');
  const [citySortOrder, setCitySortOrder] = useState<'asc' | 'desc'>('asc');
  const [cityGroupByCountry, setCityGroupByCountry] = useState(false);
  
  // Load persisted pipeline progress from localStorage
  const loadPersistedProgress = () => {
    try {
      const saved = localStorage.getItem('ai_pipeline_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if pipeline was running AND started recently (within last 2 hours)
        if (parsed.isRunning && parsed.runStartTime) {
          const startTime = new Date(parsed.runStartTime).getTime();
          const now = Date.now();
          const twoHoursInMs = 2 * 60 * 60 * 1000;
          
          if (now - startTime < twoHoursInMs) {
            console.log('📋 Restoring pipeline progress from localStorage');
            return parsed;
          } else {
            console.warn('⚠️ Stale pipeline progress found (>2 hours old), clearing...');
            localStorage.removeItem('ai_pipeline_progress');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted progress:', error);
      localStorage.removeItem('ai_pipeline_progress');
    }
    return null;
  };

  // Pipeline progress tracking
  const [pipelineProgress, setPipelineProgress] = useState(() => loadPersistedProgress() || {
    isRunning: false,
    runStartTime: null as string | null, // Track when pipeline started
    runEndTime: null as string | null, // Track when pipeline ended
    currentCity: '',
    currentCityIndex: 0,
    totalCities: 0,
    citiesCompleted: 0,
    citiesFailed: 0,
    totalFetched: 0,
    totalParsed: 0,
    totalValidated: 0,
    totalPublished: 0,
    currentStep: '',
    recentLogs: [] as string[],
    fullLogs: [] as string[], // Complete log history for download
    errors: [] as string[], // Error log for debugging
    
    // Enhanced debugging data
    detailedErrors: [] as Array<{
      timestamp: string;
      city: string;
      step: string;
      error: string;
      context?: any;
      stackTrace?: string;
    }>,
    performanceMetrics: [] as Array<{
      city: string;
      fetchTime: number;
      parseTime: number;
      validateTime: number;
      publishTime: number;
      totalTime: number;
    }>,
    validationFailures: [] as Array<{
      city: string;
      eventName: string;
      reason: string;
      data?: any;
    }>,
    geocodingStats: {
      attempts: 0,
      successes: 0,
      failures: 0,
      avgTime: 0,
      failureReasons: {} as Record<string, number>
    },
    aiStats: {
      totalRequests: 0,
      timeouts: 0,
      rateLimits: 0,
      modelUsage: {} as Record<string, number>,
      avgResponseTime: 0
    }
  });
  
  // Persist pipeline progress to localStorage whenever it changes
  useEffect(() => {
    if (pipelineProgress.isRunning) {
      try {
        localStorage.setItem('ai_pipeline_progress', JSON.stringify(pipelineProgress));
      } catch (error) {
        console.error('Failed to persist progress:', error);
      }
    } else {
      // Clear on completion
      localStorage.removeItem('ai_pipeline_progress');
    }
  }, [pipelineProgress]);
  
  // City management state
  const [cities, setCities] = useState<any[]>([]);
  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingResults, setGeocodingResults] = useState<any[]>([]);
  const [newCity, setNewCity] = useState({ 
    city_name: '', 
    country: '', 
    latitude: '', 
    longitude: '', 
    timezone: 'Europe/Tallinn',
    is_active: true 
  });
  
  // Country bulk import state
  const [selectedCountryForBulk, setSelectedCountryForBulk] = useState('');
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [suggestedCities, setSuggestedCities] = useState<any[]>([]);
  const [selectedCitiesForImport, setSelectedCitiesForImport] = useState<Set<string>>(new Set());
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({ current: 0, total: 0, currentCity: '' });
  
  // Scheduler state
  const [schedulerConfigs, setSchedulerConfigs] = useState<any[]>([]);
  const [activeCronJobs, setActiveCronJobs] = useState<any[]>([]);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [loadingScheduler, setLoadingScheduler] = useState(false);
  
  // Manual jobs state
  const [showManualJobs, setShowManualJobs] = useState(false);
  const [runningManualJob, setRunningManualJob] = useState(false);
  const [selectedCityForBootstrap, setSelectedCityForBootstrap] = useState<string>('');

  // Live Activity state
  const [liveActivity, setLiveActivity] = useState<AIDecisionLog[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all'); // all, fetch, parse, validate, publish

  // Batch bootstrap state
  const [batchBootstrapping, setBatchBootstrapping] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentCity: '' });

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    // Keep-alive: Aggressively ping Supabase auth every 15 seconds to prevent auto-logout during long pipeline runs
    // This ensures admin sessions stay active while running multi-city pipelines that can take 10+ minutes
    const keepAliveInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Refresh session to keep it alive and prevent inactivity timeout
          await supabase.auth.refreshSession();
          console.log('🔄 Auth session refreshed (keep-alive)');
        }
      } catch (error) {
        console.error('Keep-alive refresh failed:', error);
      }
    }, 15000); // Every 15 seconds (more aggressive than before)
    
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
      clearInterval(keepAliveInterval);
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

    const [citiesData, sourcesData, eventsData, freeEventsData, reviewData, confidenceData, usageData] = await Promise.all([
      supabase.from('city_configs').select('*', { count: 'exact' }).eq('active', true),
      supabase.from('event_sources').select('*', { count: 'exact' }).eq('active', true),
      supabase.from('events').select('*', { count: 'exact' }).gte('created_at', yesterday.toISOString()),
      supabase.from('events').select('*', { count: 'exact' }).eq('price', 0).eq('status', 'active'),
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
      free_events_active: freeEventsData.count || 0, // ⭐ NEW
      pending_review: reviewData.count || 0,
      avg_confidence: Math.round(avgConfidence * 100) / 100,
      total_tokens_used_7d: totalTokens,
      estimated_cost_7d: totalCost,
    };
  }

  async function loadCityMetrics(): Promise<CityHealthMetrics[]> {
    // ✅ Load from city_health_view (backend health system)
    const { data: healthData, error: healthError } = await supabase
      .from('city_health_view')
      .select('*')
      .order('health_score', { ascending: false });

    if (healthError) {
      console.error('Failed to load city health:', healthError);
      return [];
    }

    if (!healthData || healthData.length === 0) return [];
    
    // Get city configs for additional metadata
    const { data: cities, error: cityError } = await supabase
      .from('city_configs')
      .select('city_id, city_name, country, active, state, recovery_attempts, recovery_cooldown_until, pipeline_enabled, bootstrap_status')
      .order('city_name');

    if (cityError) {
      console.error('Failed to load city configs:', cityError);
      return [];
    }

    // Map health view data to CityHealthMetrics
    const metrics: CityHealthMetrics[] = healthData.map((health) => {
      const cityConfig = cities?.find(c => c.city_id === health.city_id);
      
      return {
        id: health.city_id,
        city_id: health.city_id,
        active_sources: health.active_sources || 0,
        total_events: health.total_events || 0, // ✅ NOW from health_view!
        events_this_week: health.events_7d || 0,
        free_events_count: health.free_events_count || 0, // ✅ NOW from health_view!
        avg_confidence: health.avg_confidence_score || 0,
        freshness_score: health.health_score || 0, // ✅ Use backend health_score
        last_fetch_at: null,
        last_bootstrap_at: health.last_bootstrap_at || null,
        calculated_at: new Date().toISOString(),
        city: {
          city_name: health.city_name,
          country: health.country,
          active: cityConfig?.active ?? true
        },
        pipeline_enabled: cityConfig?.pipeline_enabled ?? true,
        bootstrap_status: cityConfig?.bootstrap_status || 'pending',
        // ✅ Guardian fields
        health_status: health.health_status, // 🟢🟡🟠🔴
        recovery_attempts: cityConfig?.recovery_attempts || 0,
        recovery_cooldown_until: cityConfig?.recovery_cooldown_until,
        city_state: cityConfig?.state || 'ACTIVE'
      };
    });

    return metrics;
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

  // Manual job functions
  
  // Bulk country import - fetch major cities using Gemini AI
  async function fetchMajorCitiesForCountry() {
    if (!selectedCountryForBulk.trim()) {
      alert('Please select or enter a country name');
      return;
    }
    
    setIsFetchingCities(true);
    setSuggestedCities([]);
    setSelectedCitiesForImport(new Set());
    
    try {
      console.log(`🌍 Fetching major cities for ${selectedCountryForBulk}...`);
      
      // Use Gemini to get major cities with coordinates
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `List the top 20 major cities in ${selectedCountryForBulk} with their approximate coordinates and timezones.\n\nReturn ONLY a JSON array with this exact structure (no markdown, no explanations):\n[{"city_name":"City","country":"${selectedCountryForBulk}","latitude":12.34,"longitude":56.78,"timezone":"Region/City"}]\n\nEnsure:\n- Use English city names\n- Include capital and largest cities\n- Provide accurate coordinates (latitude/longitude as numbers)\n- Use IANA timezone format (e.g., Europe/Berlin, America/New_York)\n- Return valid JSON only`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 1,
              topP: 0.8,
              maxOutputTokens: 4096,
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        throw new Error('No response from Gemini AI');
      }
      
      // Parse JSON from response (handle markdown code blocks)
      let citiesData;
      try {
        // Remove markdown code blocks if present
        const cleanedText = textContent.replace(/```json\n?|```\n?/g, '').trim();
        citiesData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', textContent);
        throw new Error('Invalid JSON response from AI. Please try again.');
      }
      
      if (!Array.isArray(citiesData) || citiesData.length === 0) {
        throw new Error('No cities found in AI response');
      }
      
      // Validate and filter existing cities
      const validCities = citiesData.filter(city => 
        city.city_name && 
        city.latitude && 
        city.longitude && 
        !isNaN(parseFloat(city.latitude)) && 
        !isNaN(parseFloat(city.longitude))
      );
      
      if (validCities.length === 0) {
        throw new Error('No valid cities in response');
      }
      
      // Check which cities already exist
      const { data: existingCities, error: checkError } = await supabase
        .from('city_configs')
        .select('city_name, country')
        .eq('country', selectedCountryForBulk);
      
      if (checkError) {
        console.error('Error checking existing cities:', checkError);
      }
      
      const existingCityNames = new Set(
        (existingCities || []).map(c => c.city_name.toLowerCase())
      );
      
      // Mark cities as already existing
      const citiesWithStatus = validCities.map(city => ({
        ...city,
        exists: existingCityNames.has(city.city_name.toLowerCase()),
        timezone: city.timezone || 'UTC'
      }));
      
      setSuggestedCities(citiesWithStatus);
      
      // Auto-select cities that don't exist yet
      const newCities = citiesWithStatus
        .filter(c => !c.exists)
        .map(c => c.city_name);
      setSelectedCitiesForImport(new Set(newCities));
      
      alert(
        `✅ Found ${citiesWithStatus.length} cities for ${selectedCountryForBulk}\n\n` +
        `New cities: ${citiesWithStatus.filter(c => !c.exists).length}\n` +
        `Already in database: ${citiesWithStatus.filter(c => c.exists).length}\n\n` +
        `Review and select cities to import below.`
      );
      
    } catch (error: any) {
      console.error('Failed to fetch cities:', error);
      alert(`Failed to fetch cities: ${error.message}`);
      setSuggestedCities([]);
    } finally {
      setIsFetchingCities(false);
    }
  }
  
  async function bulkImportSelectedCities() {
    if (selectedCitiesForImport.size === 0) {
      alert('Please select at least one city to import');
      return;
    }
    
    const citiesToImport = suggestedCities.filter(city => 
      selectedCitiesForImport.has(city.city_name) && !city.exists
    );
    
    const confirmed = confirm(
      `🌍 Bulk Import Cities?\n\n` +
      `Country: ${selectedCountryForBulk}\n` +
      `Cities to import: ${citiesToImport.length}\n\n` +
      citiesToImport.map(c => `• ${c.city_name}`).join('\n') +
      `\n\nEach city will be:\n` +
      `1. Added to the database\n` +
      `2. Auto-bootstrapped for event sources\n` +
      `3. Added to the discovery pipeline\n\n` +
      `This may take a few minutes. Continue?`
    );
    
    if (!confirmed) return;
    
    setIsBulkImporting(true);
    setBulkImportProgress({ current: 0, total: citiesToImport.length, currentCity: '' });
    
    const results = {
      success: [] as string[],
      failed: [] as { city: string, error: string }[]
    };
    
    for (let i = 0; i < citiesToImport.length; i++) {
      const city = citiesToImport[i];
      const cityName = `${city.city_name}, ${city.country}`;
      
      setBulkImportProgress({ 
        current: i + 1, 
        total: citiesToImport.length, 
        currentCity: cityName 
      });
      
      console.log(`\n🔄 [${i + 1}/${citiesToImport.length}] Importing: ${cityName}`);
      
      try {
        // Add city to database (use same logic as single city add)
        await addCityToDatabase({
          city_name: city.city_name,
          country: city.country,
          latitude: city.latitude.toString(),
          longitude: city.longitude.toString(),
          timezone: city.timezone || 'UTC',
          is_active: true
        });
        
        results.success.push(cityName);
        console.log(`✅ Successfully imported: ${cityName}`);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.error(`❌ Failed to import ${cityName}:`, error);
        results.failed.push({ city: cityName, error: error.message });
      }
    }
    
    setIsBulkImporting(false);
    setBulkImportProgress({ current: 0, total: 0, currentCity: '' });
    
    // Show results
    const summary = `
🌍 Bulk Import Complete!

✅ Successfully imported: ${results.success.length}
${results.failed.length > 0 ? `❌ Failed: ${results.failed.length}` : ''}

${results.success.length > 0 ? 'Successful cities:\n' + results.success.map(c => `✓ ${c}`).join('\n') : ''}

${results.failed.length > 0 ? '\nFailed cities:\n' + results.failed.map(f => `✗ ${f.city}: ${f.error}`).join('\n') : ''}

🤖 Auto-bootstrap will start within 5 minutes.
Check Agent Logs to monitor progress.
    `.trim();
    
    alert(summary);
    
    // Reset form and reload
    setShowAddCountry(false);
    setSuggestedCities([]);
    setSelectedCitiesForImport(new Set());
    setSelectedCountryForBulk('');
    
    await loadCities();
    const metrics = await loadCityMetrics();
    setCityMetrics(metrics);
  }
  
  async function geocodeAndAddCity() {
    if (!newCity.city_name.trim()) {
      alert('Please enter a city name');
      return;
    }
    
    setIsGeocoding(true);
    setGeocodingResults([]);
    
    try {
      // Use Nominatim to geocode city name with namedetails for English names
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(newCity.city_name)}&` +
        `format=json&limit=5&` +
        `featuretype=city&` +
        `addressdetails=1&` +
        `namedetails=1`, // Get name variants including English
        {
          headers: {
            'User-Agent': 'EventNexus/1.0',
            'Accept-Language': 'en' // Prefer English results
          }
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const results = await response.json();
      
      if (results.length === 0) {
        alert('City not found. Please try a different name or spelling.');
        return;
      }
      
      // Show results for user to select
      setGeocodingResults(results);
      
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to find city. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  }
  
  async function selectGeocodedCity(result: any) {
    // Extract city name and country from OSM result
    // Prioritize: city > town > municipality > village > name (fallback)
    // IMPORTANT: Use English names from namedetails if available
    const cityName = result.namedetails?.name 
      || result.address.city 
      || result.address.town 
      || result.address.municipality
      || result.address.village 
      || result.name.split(',')[0].trim(); // Take first part of display name
    
    const country = result.address.country;
    const lat = result.lat;
    const lng = result.lon;
    
    // Auto-detect timezone based on coordinates (simplified - use lat/lng)
    const timezone = getTimezoneFromCoords(parseFloat(lat), parseFloat(lng));
    
    console.log('Selected city:', { 
      cityName, 
      country, 
      lat, 
      lng, 
      timezone,
      raw: result 
    });
    
    setGeocodingResults([]);
    
    // Confirm with user
    const confirm = window.confirm(
      `Add city: ${cityName}, ${country}?\n\n` +
      `Coordinates: ${lat}, ${lng}\n` +
      `Timezone: ${timezone}\n\n` +
      `After adding, the system will automatically:\n` +
      `1. Bootstrap event sources for this city\n` +
      `2. Start discovering events\n` +
      `3. Add to regular pipeline\n\n` +
      `Continue?`
    );
    
    if (!confirm) {
      return;
    }
    
    // Add city to database with explicit data (don't rely on state update timing)
    await addCityToDatabase({
      city_name: cityName,
      country: country,
      latitude: lat,
      longitude: lng,
      timezone: timezone,
      is_active: true
    });
  }
  
  function getTimezoneFromCoords(lat: number, lng: number): string {
    // Simplified timezone detection by region
    if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) {
      // Europe
      if (lng >= 20) return 'Europe/Tallinn'; // Eastern Europe
      if (lng >= 5) return 'Europe/Berlin'; // Central Europe
      return 'Europe/London'; // Western Europe
    }
    if (lat >= -60 && lat <= 15 && lng >= -170 && lng <= -30) {
      return 'America/New_York'; // Americas
    }
    if (lat >= -50 && lat <= 55 && lng >= 40 && lng <= 180) {
      return 'Asia/Tokyo'; // Asia/Pacific
    }
    return 'UTC'; // Fallback
  }
  
  async function addCityToDatabase(cityToAdd?: any) {
    try {
      setIsGeocoding(true);
      
      // Use passed parameter or fall back to state
      const cityData = cityToAdd || newCity;
      
      // Validate coordinates (parse as float first)
      const lat = parseFloat(cityData.latitude);
      const lng = parseFloat(cityData.longitude);
      
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) < 0.01 || Math.abs(lng) < 0.01) {
        alert(`Invalid coordinates: ${cityData.latitude}, ${cityData.longitude}. Please try geocoding again.`);
        setIsGeocoding(false);
        return;
      }
      
      console.log('Adding city to database:', { ...cityData, lat, lng });
      
      // 🔧 Check if city already exists
      const { data: existingCity, error: checkError } = await supabase
        .from('city_configs')
        .select('city_id, city_name, country, bootstrap_status')
        .eq('city_name', cityData.city_name)
        .eq('country', cityData.country)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing city:', checkError);
        throw checkError;
      }
      
      if (existingCity) {
        alert(`⚠️ City already exists: ${existingCity.city_name}, ${existingCity.country}\n\nBootstrap status: ${existingCity.bootstrap_status || 'pending'}\n\nUse the city list below to manage it.`);
        setShowAddCity(false);
        // Reload city metrics to show existing city
        const metrics = await loadCityMetrics();
        setCityMetrics(metrics);
        return;
      }
      
      // Insert city into city_configs (only columns that exist)
      const insertData: any = {
        city_name: cityData.city_name,
        country: cityData.country,
        latitude: lat,
        longitude: lng,
        timezone: cityData.timezone,
        is_active: true
      };
      
      // Add optional columns only if they exist in schema
      // These might not exist yet - that's OK, city will still be created
      try {
        insertData.bootstrap_status = 'pending';
        insertData.pipeline_enabled = true;
      } catch (e) {
        console.log('Optional columns not available:', e);
      }
      
      const { data: insertedCity, error: insertError } = await supabase
        .from('city_configs')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Better error message for duplicate
        if (insertError.code === '23505') {
          alert(`⚠️ This city already exists in the database.\n\nCity: ${cityData.city_name}, ${cityData.country}\n\nPlease check the city list below.`);
          setShowAddCity(false);
          return;
        }
        
        throw insertError;
      }
      
      console.log('City inserted successfully:', insertedCity);
      
      alert(`✅ City added: ${cityData.city_name}, ${cityData.country}\n\n🤖 Auto-bootstrap queued! Sources will be discovered within 5 minutes.\n\nCheck Agent Logs to monitor progress.`);
      
      // Auto-bootstrap handled by database trigger → bootstrap_queue
      // No need to call triggerBootstrapForCity() - cron job will process the queue
      
      // Reset form and reload cities
      setNewCity({ 
        city_name: '', 
        country: '', 
        latitude: '', 
        longitude: '', 
        timezone: 'Europe/Tallinn',
        is_active: true 
      });
      setShowAddCity(false);
      await loadCities();
      
    } catch (error) {
      console.error('Error adding city:', error);
      alert('Failed to add city. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  }
  
  async function testGuardian() {
    setIsTestingGuardian(true);
    try {
      console.log('🛡️ Testing city-guardian...');
      
      // Add timeout wrapper
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/city-guardian`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({}),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Guardian failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🛡️ Guardian result:', result);
      
      // Show results
      const actionsCount = result.actions?.length || 0;
      const cities = result.cities_checked || 0;
      const interventions = result.actions?.map((a: any) => 
        `${a.city_name}: ${a.action} (${a.health_score}%)`
      ).join('\n') || 'No interventions needed';
      
      alert(
        `✅ Guardian Test Complete!\n\n` +
        `Cities Checked: ${cities}\n` +
        `Interventions: ${actionsCount}\n\n` +
        `${interventions}\n\n` +
        `Check Agent Logs for details.`
      );
      
      // Reload city metrics to show updated health
      const metrics = await loadCityMetrics();
      setCityMetrics(metrics);
      
    } catch (error: any) {
      console.error('Guardian test error:', error);
      
      // Better error messages
      let errorMsg = error.message;
      if (error.name === 'AbortError') {
        errorMsg = 'Request timeout (>60s). Guardian may still be processing in background.';
      } else if (errorMsg.includes('Failed to fetch')) {
        errorMsg = 'Network error. Check:\n- CORS settings\n- Ad blocker disabled\n- Internet connection\n\nGuardian endpoint: ' + import.meta.env.VITE_SUPABASE_URL;
      }
      
      alert(`❌ Guardian test failed:\n\n${errorMsg}`);
    } finally {
      setIsTestingGuardian(false);
    }
  }
  
  async function triggerBootstrapForCity(cityId: string, silent = false) {
    try {
      console.log('🚀 Triggering bootstrap for city:', cityId);
      
      // Get city details from metrics (which has city info already)
      const cityMetric = cityMetrics.find(m => m.city_id === cityId);
      if (!cityMetric?.city) {
        throw new Error('City details not found');
      }
      
      // Update UI to show bootstrapping status
      setCityMetrics(prev => prev.map(m => 
        m.city_id === cityId 
          ? { ...m, bootstrap_status: 'bootstrapping' as const }
          : m
      ));
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bootstrap-city`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            city_id: cityId,
            city_name: cityMetric.city.city_name,
            country: cityMetric.city.country,
            auto_discover: true,
            seed_events: false // Don't seed events, just discover sources
          })
        }
      );
      
      console.log('📡 Bootstrap response status:', response.status);
      const responseText = await response.text();
      console.log('📡 Bootstrap response body:', responseText);
      
      if (!response.ok) {
        throw new Error(`Bootstrap failed: ${response.status} - ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      
      // Refresh city metrics to show updated data
      const updatedMetrics = await loadCityMetrics();
      setCityMetrics(updatedMetrics);
      
      if (!silent) {
        alert(`✅ Bootstrap completed!\n\nDiscovered ${result.sources_added || 0} event sources.\n\nCheck Agent Logs for details.`);
      }
      
      return { success: true, sources_added: result.sources_added || 0 };
      
    } catch (error) {
      console.error('❌ Bootstrap error:', error);
      
      // Reset bootstrap status on error
      setCityMetrics(prev => prev.map(m => 
        m.city_id === cityId 
          ? { ...m, bootstrap_status: 'pending' as const }
          : m
      ));
      
      if (!silent) {
        alert(`❌ Bootstrap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async function batchBootstrapAllPendingCities() {
    // Find all cities that need bootstrapping
    const pendingCities = cityMetrics.filter(m => 
      m.active_sources === 0 && 
      m.city?.active && 
      m.bootstrap_status !== 'bootstrapping'
    );

    if (pendingCities.length === 0) {
      alert('✅ No pending cities to bootstrap!');
      return;
    }

    const confirmed = confirm(
      `🚀 Start batch bootstrap?\n\n` +
      `Cities to process: ${pendingCities.length}\n\n` +
      pendingCities.map(c => `• ${c.city?.city_name}, ${c.city?.country}`).join('\n') +
      `\n\nThis will process cities one by one.\nContinue?`
    );

    if (!confirmed) return;

    setBatchBootstrapping(true);
    setBatchProgress({ current: 0, total: pendingCities.length, currentCity: '' });

    const results = {
      success: [] as string[],
      failed: [] as { city: string, error: string }[],
      totalSources: 0
    };

    for (let i = 0; i < pendingCities.length; i++) {
      const city = pendingCities[i];
      const cityName = `${city.city?.city_name}, ${city.city?.country}`;
      
      setBatchProgress({ 
        current: i + 1, 
        total: pendingCities.length, 
        currentCity: cityName 
      });

      console.log(`\n🔄 [${i + 1}/${pendingCities.length}] Bootstrapping: ${cityName}`);

      const result = await triggerBootstrapForCity(city.city_id, true);

      if (result.success) {
        results.success.push(cityName);
        results.totalSources += result.sources_added || 0;
        console.log(`✅ Success: ${cityName} - ${result.sources_added} sources`);
      } else {
        results.failed.push({ city: cityName, error: result.error || 'Unknown error' });
        console.log(`❌ Failed: ${cityName}`);
      }

      // Wait 2 seconds between cities to avoid rate limiting
      if (i < pendingCities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setBatchBootstrapping(false);
    setBatchProgress({ current: 0, total: 0, currentCity: '' });

    // Show summary
    const summary = `
🎉 Batch Bootstrap Complete!

✅ Success: ${results.success.length}/${pendingCities.length}
📋 Total sources discovered: ${results.totalSources}

${results.success.length > 0 ? 'Successful cities:\n' + results.success.map(c => `✓ ${c}`).join('\n') : ''}

${results.failed.length > 0 ? '\n❌ Failed cities:\n' + results.failed.map(f => `✗ ${f.city}: ${f.error}`).join('\n') : ''}
    `.trim();

    alert(summary);

    // Refresh metrics one final time
    await loadCityMetrics().then(metrics => setCityMetrics(metrics));
  }
  
  async function runManualBootstrap() {
    if (!selectedCityForBootstrap) {
      alert('Please select a city first');
      return;
    }
    
    setRunningManualJob(true);
    try {
      const city = cities.find(c => c.city_id === selectedCityForBootstrap);
      console.log(`🚀 Bootstrap starting for: ${city.city_name}`);
      
      const { data, error } = await supabase.functions.invoke('bootstrap-city', {
        body: { 
          city_name: city.city_name,
          country: city.country,
          auto_discover: true,
          seed_events: true
        }
      });
      
      if (error) throw error;
      
      const summary = `
✅ Bootstrap Complete for ${city.city_name}!

📋 Sources Added: ${data.sources_added || 0}
🎉 Events Seeded: ${data.events_seeded || 0}
${data.error ? `\n⚠️ ${data.error}` : ''}
      `.trim();
      
      alert(summary);
      await loadDashboardData();
    } catch (error: any) {
      console.error('Bootstrap failed:', error);
      alert(`❌ Bootstrap Failed!\n\n${error.message}`);
    } finally {
      setRunningManualJob(false);
      setShowManualJobs(false);
    }
  }

  async function runManualJob(jobName: string) {
    setRunningManualJob(true);
    try {
      const { data, error } = await supabase.functions.invoke(jobName);
      
      if (error) throw error;
      
      alert(`✅ ${jobName} completed!\n\n${JSON.stringify(data?.results || data, null, 2)}`);
      await loadDashboardData();
    } catch (error: any) {
      console.error(`${jobName} failed:`, error);
      alert(`❌ ${jobName} failed!\n\n${error.message}`);
    } finally {
      setRunningManualJob(false);
    }
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
      // Load ALL cities (including inactive ones if explicitly selected by user)
      const { data: allCities, error: citiesError } = await supabase
        .from('city_configs')
        .select('city_id, city_name, country, country_code, active')
        .order('city_name');

      if (citiesError) throw new Error(`Failed to load cities: ${citiesError.message}`);
      if (!allCities || allCities.length === 0) {
        alert('⚠️ No cities found. Please add cities first.');
        return;
      }
      
      // Filter by selected cities if any are selected
      const citiesToProcess = selectedCities.size > 0
        ? allCities.filter(city => selectedCities.has(city.city_id))
        : allCities.filter(city => city.active); // If no selection, default to active cities only
      
      if (citiesToProcess.length === 0) {
        alert('⚠️ No cities selected. Please select at least one city to run the pipeline.');
        return;
      }
      
      // Warn about inactive cities
      const inactiveCities = citiesToProcess.filter(city => !city.active);
      if (inactiveCities.length > 0) {
        const names = inactiveCities.map(c => c.city_name).join(', ');
        console.warn(`⚠️ Warning: ${inactiveCities.length} inactive cities selected: ${names}`);
        const proceed = confirm(`⚠️ Warning: ${inactiveCities.length} selected cities are inactive:\n${names}\n\nInactive cities may have limited event sources. Continue anyway?`);
        if (!proceed) return;
      }

      // 🔄 FORCE REFRESH: Clear all cached data for selected cities
      if (forceRefresh) {
        console.log(`🧹 Force Refresh enabled - clearing cached data for ${citiesToProcess.length} cities...`);
        
        for (const city of citiesToProcess) {
          try {
            // Delete raw_events (cached HTML/API content)
            await supabase
              .from('raw_events')
              .delete()
              .in('source_id', 
                supabase.from('event_sources')
                  .select('id')
                  .eq('city_id', city.city_id)
              );
            
            // Delete parsed_events (AI-extracted events)
            await supabase
              .from('parsed_events')
              .delete()
              .in('raw_event_id',
                supabase.from('raw_events')
                  .select('id')
                  .in('source_id',
                    supabase.from('event_sources')
                      .select('id')
                      .eq('city_id', city.city_id)
                  )
              );
            
            // Delete published events
            await supabase
              .from('events')
              .delete()
              .eq('city_id', city.city_id);
            
            console.log(`  ✅ Cleared cache for ${city.city_name}`);
          } catch (error: any) {
            console.error(`  ❌ Failed to clear cache for ${city.city_name}:`, error.message);
          }
        }
        
        console.log(`✅ Force Refresh complete - starting fresh pipeline`);
      }

      totalResults.cities = citiesToProcess.length;
      console.log(`🌍 Processing ${citiesToProcess.length} cities one by one...`);

      // Initialize progress
      const runStartTime = new Date().toISOString();
      
      setPipelineProgress({
        isRunning: true,
        runStartTime: runStartTime, // Track pipeline start time
        runEndTime: null,
        currentCity: '',
        currentCityIndex: 0,
        totalCities: citiesToProcess.length,
        citiesCompleted: 0,
        citiesFailed: 0,
        totalFetched: 0,
        totalParsed: 0,
        totalValidated: 0,
        totalPublished: 0,
        currentStep: 'Starting pipeline...',
        recentLogs: [`Started processing ${citiesToProcess.length} cities`],
        fullLogs: [`Started processing ${citiesToProcess.length} cities`],
        errors: [], // Reset errors at pipeline start
        detailedErrors: [],
        performanceMetrics: [],
        validationFailures: [],
        geocodingStats: {
          attempts: 0,
          successes: 0,
          failures: 0,
          avgTime: 0,
          failureReasons: {}
        },
        aiStats: {
          totalRequests: 0,
          timeouts: 0,
          rateLimits: 0,
          modelUsage: {},
          avgResponseTime: 0
        }
      });

      // Process each city through full pipeline
      for (let i = 0; i < citiesToProcess.length; i++) {
        // Check if pipeline should stop (use ref for real-time state)
        if (pipelineShouldStopRef.current) {
          console.log('🛑 Pipeline stop requested by user');
          setPipelineProgress(prev => ({
            ...prev,
            isRunning: false,
            currentStep: 'Stopped by user',
            recentLogs: [...prev.recentLogs.slice(-9), '🛑 Pipeline stopped by user'],
            fullLogs: [...prev.fullLogs, '🛑 Pipeline stopped by user']
          }));
          setPipelineShouldStop(false);
          pipelineShouldStopRef.current = false;
          setIsProcessing(false);
          break; // Break out of the loop
        }

        // Handle pause (use ref for real-time state)
        while (pipelinePausedRef.current) {
          setPipelineProgress(prev => ({
            ...prev,
            currentStep: '⏸️ Paused by user - waiting to resume...',
            recentLogs: [...prev.recentLogs.slice(-9), '⏸️ Pipeline paused']
          }));
          // Wait and check again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const city = citiesToProcess[i];
        console.log(`\n🏙️ [${i + 1}/${citiesToProcess.length}] Processing: ${city.city_name}, ${city.country}`);

        // Update progress - current city
        const cityLogEntry = `[${i + 1}/${citiesToProcess.length}] ${city.city_name}, ${city.country} ${city.country_code ? '(' + city.country_code.toUpperCase() + ')' : ''}`;
        setPipelineProgress(prev => ({
          ...prev,
          currentCity: `${city.city_name}, ${city.country}`,
          currentCityIndex: i + 1,
          currentStep: 'Checking sources...',
          recentLogs: [...prev.recentLogs.slice(-9), cityLogEntry],
          fullLogs: [...prev.fullLogs, cityLogEntry]
        }));

        try {
          // Step 1: Discover events using EventScout AI (replaces bootstrap + fetch + parse)
          console.log(`  🤖 Step 1/3: EventScout AI discovering events...`);
          setPipelineProgress(prev => ({ 
            ...prev, 
            currentStep: '🤖 EventScout AI discovering events...' 
          }));
          
          const discoverResp = await supabase.functions.invoke('discover-events-ai', {
            body: { 
              city_id: city.city_id,
              target_events: 15  // Find 15 free events minimum
            }
          });
          
          if (discoverResp.error) {
            const errorMsg = discoverResp.error.message || String(discoverResp.error);
            totalResults.cityErrors.push(`${city.city_name}: EventScout AI failed - ${errorMsg}`);
            setPipelineProgress(prev => ({
              ...prev,
              citiesFailed: prev.citiesFailed + 1,
              recentLogs: [...prev.recentLogs.slice(-9), `  ❌ Discovery failed: ${errorMsg}`],
              fullLogs: [...prev.fullLogs, `  ❌ EventScout AI failed: ${errorMsg}`],
              errors: [...prev.errors, `[${city.city_name}] Discovery: ${errorMsg}`]
            }));
            continue; // Skip to next city
          }
          
          const discoverResults = discoverResp.data?.results || {};
          const eventsFound = discoverResults.events_found || 0;
          const eventsInserted = discoverResults.events_inserted || 0;
          
          console.log(`  ✅ EventScout AI: Found ${eventsFound}, inserted ${eventsInserted} events`);
          
          totalResults.totalFetched += eventsFound;
          totalResults.totalParsed += eventsInserted;
          
          setPipelineProgress(prev => ({
            ...prev,
            totalFetched: prev.totalFetched + eventsFound,
            totalParsed: prev.totalParsed + eventsInserted,
            currentStep: '✅ Validating...',
            recentLogs: [...prev.recentLogs.slice(-9), `  ✅ EventScout: ${eventsInserted}/${eventsFound} events`],
            fullLogs: [...prev.fullLogs, `  ✅ EventScout AI discovered ${eventsFound} events, inserted ${eventsInserted}`]
          }));
          
          if (eventsInserted === 0) {
            console.log(`  ⚠️ No events found for ${city.city_name}`);
            setPipelineProgress(prev => ({
              ...prev,
              citiesFailed: prev.citiesFailed + 1,
              recentLogs: [...prev.recentLogs.slice(-9), `  ⚠️ No events found`],
              fullLogs: [...prev.fullLogs, `  ⚠️ No events discovered for this city`]
            }));
            continue; // Skip validation/publishing
          }
          
          // EventScout AI = auto-validated (95% confidence from Gemini Pro + Thinking Mode)
          totalResults.totalValidated += eventsInserted;
          setPipelineProgress(prev => ({
            ...prev,
            totalValidated: prev.totalValidated + eventsInserted
          }));

          // Step 2: Publish to live map
          console.log(`  🚀 Step 2/2: Publishing to map...`);
          setPipelineProgress(prev => ({ 
            ...prev, 
            currentStep: '🚀 Publishing to map...' 
          }));
          
          const publishResp = await supabase.functions.invoke('publish-event', {
            body: { city_id: city.city_id }
          });
          
          if (publishResp.error) {
            const errorMsg = publishResp.error.message || String(publishResp.error);
            totalResults.cityErrors.push(`${city.city_name}: Publish failed - ${errorMsg}`);
            setPipelineProgress(prev => ({
              ...prev,
              recentLogs: [...prev.recentLogs.slice(-9), `  ⚠️ Publish failed: ${errorMsg}`],
              fullLogs: [...prev.fullLogs, `  ⚠️ Publish failed: ${errorMsg}`],
              errors: [...prev.errors, `[${city.city_name}] Publish: ${errorMsg}`]
            }));
          } else {
            const published = publishResp.data?.results?.published || 0;
            totalResults.totalPublished += published;
            console.log(`  ✅ Published ${published} events`);
            setPipelineProgress(prev => ({
              ...prev,
              totalPublished: prev.totalPublished + published,
              currentStep: '🎯 Ensuring free events...',
              recentLogs: [...prev.recentLogs.slice(-9), `  ✅ Published ${published} events`],
              fullLogs: [...prev.fullLogs, `  ✅ Published ${published} events`]
            }));
          }

          // EventScout AI already ensures free events, skip this step
          console.log(`  ✅ EventScout AI guarantees free events - skipping ensure step`);
          setPipelineProgress(prev => ({
            ...prev,
            citiesCompleted: prev.citiesCompleted + 1,
            recentLogs: [...prev.recentLogs.slice(-9), `✅ Complete!`],
            fullLogs: [...prev.fullLogs, `✅ Pipeline complete for ${city.city_name}!`]
          }));

          console.log(`✅ ${city.city_name} complete!\n`);

        } catch (cityError: any) {
          console.error(`❌ Error processing ${city.city_name}:`, cityError);
          totalResults.cityErrors.push(`${city.city_name}: ${cityError.message}`);
          setPipelineProgress(prev => ({
            ...prev,
            citiesFailed: prev.citiesFailed + 1,
            recentLogs: [...prev.recentLogs.slice(-9), `  ❌ Error: ${cityError.message}`],
            fullLogs: [...prev.fullLogs, `  ❌ Error: ${cityError.message}`],
            errors: [...prev.errors, `[${city.city_name}] General: ${cityError.message}`]
          }));
        }
        
        // Add 5 second delay between cities to prevent server overload
        // This ensures AI image generation and map rendering don't crash
        if (i < citiesToProcess.length - 1) {
          console.log(`⏳ Waiting 5s before processing next city...`);
          setPipelineProgress(prev => ({
            ...prev,
            currentStep: '⏳ Cooling down...',
            recentLogs: [...prev.recentLogs.slice(-9), `⏳ Waiting 5s before next city...`]
          }));
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Show comprehensive results
      const runEndTime = new Date().toISOString();
      
      setPipelineProgress(prev => ({
        ...prev,
        isRunning: false,
        runEndTime: runEndTime, // Track pipeline end time
        currentStep: 'Complete!',
        recentLogs: [...prev.recentLogs, '🎉 Pipeline complete!'],
        fullLogs: [...prev.fullLogs, '🎉 Pipeline complete!']
      }));

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
      setPipelineProgress(prev => ({
        ...prev,
        isRunning: false,
        currentStep: 'Failed',
        recentLogs: [...prev.recentLogs, `❌ Pipeline failed: ${error.message}`],
        fullLogs: [...prev.fullLogs, `❌ Pipeline failed: ${error.message}`]
      }));
      alert(`❌ Pipeline Failed!\n\nError: ${error.message}\n\nCheck console for details.`);
    } finally {
      setIsProcessing(false);
    }
  }

  // Pause/Resume pipeline
  function handlePausePipeline() {
    setPipelinePaused(!pipelinePaused);
    setPipelineProgress(prev => ({
      ...prev,
      currentStep: !pipelinePaused ? '⏸️ Paused' : 'Resuming...',
      recentLogs: [...prev.recentLogs.slice(-9), !pipelinePaused ? '⏸️ Pipeline paused' : '▶️ Pipeline resuming'],
      fullLogs: [...prev.fullLogs, !pipelinePaused ? '⏸️ Pipeline paused by user' : '▶️ Pipeline resumed by user']
    }));
  }

  // Stop pipeline
  function handleStopPipeline() {
    const confirmed = confirm(
      '⚠️ Stop the running pipeline?\n\n' +
      'Current progress will be saved, but the pipeline will halt immediately.\n\n' +
      'You can resume later or start fresh.\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;

    console.log('🛑 Stop button clicked - stopping pipeline immediately');
    
    // Set stop flags
    setPipelineShouldStop(true);
    pipelineShouldStopRef.current = true;
    
    // Also unpause if paused
    if (pipelinePaused) {
      setPipelinePaused(false);
      pipelinePausedRef.current = false;
    }
    
    // Immediately set isRunning to false and clear localStorage
    setPipelineProgress(prev => ({
      ...prev,
      isRunning: false,
      runEndTime: new Date().toISOString(),
      currentStep: '🛑 Stopped by user',
      recentLogs: [...prev.recentLogs.slice(-9), '🛑 Pipeline stopped by user'],
      fullLogs: [...prev.fullLogs, '🛑 Pipeline stopped by user at ' + new Date().toISOString()]
    }));
    
    // Force clear localStorage immediately
    localStorage.removeItem('ai_pipeline_progress');
    
    // Reset processing state
    setIsProcessing(false);
  }

  // Download pipeline logs as JSON (includes both pipeline execution and Supabase agent logs)
  function downloadPipelineLogs() {
    const logData = {
      timestamp: new Date().toISOString(),
      pipeline: {
        isRunning: pipelineProgress.isRunning,
        runStartTime: pipelineProgress.runStartTime,
        runEndTime: pipelineProgress.runEndTime,
        runDuration: pipelineProgress.runStartTime && pipelineProgress.runEndTime
          ? ((new Date(pipelineProgress.runEndTime).getTime() - new Date(pipelineProgress.runStartTime).getTime()) / 1000).toFixed(2) + 's'
          : 'N/A',
        currentCity: pipelineProgress.currentCity,
        currentCityIndex: pipelineProgress.currentCityIndex,
        totalCities: pipelineProgress.totalCities,
        currentStep: pipelineProgress.currentStep,
      },
      stats: {
        citiesCompleted: pipelineProgress.citiesCompleted,
        citiesFailed: pipelineProgress.citiesFailed,
        totalFetched: pipelineProgress.totalFetched,
        totalParsed: pipelineProgress.totalParsed,
        totalValidated: pipelineProgress.totalValidated,
        totalPublished: pipelineProgress.totalPublished,
      },
      logs: pipelineProgress.fullLogs.length > 0 ? pipelineProgress.fullLogs : pipelineProgress.recentLogs,
      errors: pipelineProgress.errors,
      
      // Enhanced debugging data
      detailedErrors: pipelineProgress.detailedErrors,
      performanceMetrics: pipelineProgress.performanceMetrics,
      validationFailures: pipelineProgress.validationFailures,
      geocodingStats: pipelineProgress.geocodingStats,
      aiStats: pipelineProgress.aiStats,
      
      // Supabase Edge Function logs (from agent_logs table, filtered by pipeline run time)
      supabaseLogsTimeRange: {
        startTime: pipelineProgress.runStartTime,
        endTime: pipelineProgress.runEndTime || new Date().toISOString(),
        note: 'Logs are filtered to show only entries from this specific pipeline run'
      },
      supabaseLogs: supabaseLogs.map(log => ({
        timestamp: log.created_at,
        agent: log.agent_name,
        level: log.level,
        message: log.message,
        details: log.details,
        duration_ms: log.duration_ms,
        job_id: log.job_id,
        city_id: log.city_id,
      })),
      
      // Summaries for quick analysis
      summary: {
        totalLogEntries: pipelineProgress.fullLogs.length > 0 ? pipelineProgress.fullLogs.length : pipelineProgress.recentLogs.length,
        totalErrors: pipelineProgress.errors.length,
        totalDetailedErrors: pipelineProgress.detailedErrors?.length ?? 0,
        totalValidationFailures: pipelineProgress.validationFailures?.length ?? 0,
        totalSupabaseLogs: supabaseLogs.length,
        supabaseLogsByLevel: {
          error: supabaseLogs.filter(l => l.level === 'error').length,
          warning: supabaseLogs.filter(l => l.level === 'warning').length,
          success: supabaseLogs.filter(l => l.level === 'success').length,
          info: supabaseLogs.filter(l => l.level === 'info').length,
          debug: supabaseLogs.filter(l => l.level === 'debug').length,
        },
        avgCityProcessingTime: (pipelineProgress.performanceMetrics?.length ?? 0) > 0 
          ? (pipelineProgress.performanceMetrics.reduce((sum, m) => sum + m.totalTime, 0) / pipelineProgress.performanceMetrics.length).toFixed(2)
          : 0,
        geocodingSuccessRate: (pipelineProgress.geocodingStats?.attempts ?? 0) > 0
          ? ((pipelineProgress.geocodingStats.successes / pipelineProgress.geocodingStats.attempts) * 100).toFixed(1) + '%'
          : 'N/A',
        aiErrorRate: (pipelineProgress.aiStats?.totalRequests ?? 0) > 0
          ? (((pipelineProgress.aiStats.timeouts + pipelineProgress.aiStats.rateLimits) / pipelineProgress.aiStats.totalRequests) * 100).toFixed(1) + '%'
          : 'N/A',
      }
    };

    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pipeline-debug-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // Get unique countries from city metrics
  function getUniqueCountries(): string[] {
    return Array.from(new Set(cityMetrics.map(m => m.city?.country).filter(Boolean) as string[])).sort();
  }

  // Filter and sort city metrics
  function getFilteredAndSortedCities(): CityHealthMetrics[] {
    // Apply filters
    let filtered = cityMetrics.filter(metric => {
      // Search filter
      if (citySearchQuery) {
        const query = citySearchQuery.toLowerCase();
        const cityName = (metric.city?.city_name || '').toLowerCase();
        const country = (metric.city?.country || '').toLowerCase();
        if (!cityName.includes(query) && !country.includes(query)) {
          return false;
        }
      }

      // Country filter
      if (cityFilterCountry !== 'all' && metric.city?.country !== cityFilterCountry) {
        return false;
      }

      // Health status filter
      if (cityFilterHealth !== 'all') {
        const score = metric.freshness_score;
        if (cityFilterHealth === 'healthy' && score < 80) return false;
        if (cityFilterHealth === 'good' && (score < 60 || score >= 80)) return false;
        if (cityFilterHealth === 'warning' && (score < 40 || score >= 60)) return false;
        if (cityFilterHealth === 'critical' && (score > 0 && score < 40)) return false;
        if (cityFilterHealth === 'inactive' && score !== 0) return false;
      }

      // Active/Inactive filter
      if (cityFilterActive === 'active' && !metric.city?.active) return false;
      if (cityFilterActive === 'inactive' && metric.city?.active) return false;

      // Bootstrap status filter
      if (cityFilterBootstrap !== 'all' && metric.bootstrap_status !== cityFilterBootstrap) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (citySortBy) {
        case 'name':
          aVal = (a.city?.city_name || '').toLowerCase();
          bVal = (b.city?.city_name || '').toLowerCase();
          break;
        case 'country':
          aVal = (a.city?.country || '').toLowerCase();
          bVal = (b.city?.country || '').toLowerCase();
          break;
        case 'health':
          aVal = a.freshness_score;
          bVal = b.freshness_score;
          break;
        case 'events':
          aVal = a.total_events || 0;
          bVal = b.total_events || 0;
          break;
        case 'free_events':
          aVal = a.free_events_count || 0;
          bVal = b.free_events_count || 0;
          break;
        default:
          aVal = (a.city?.city_name || '').toLowerCase();
          bVal = (b.city?.city_name || '').toLowerCase();
      }

      if (aVal < bVal) return citySortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return citySortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
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
    try {
      // First, check how many events this city has
      const { count: eventCount, error: countError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', cityId);

      if (countError) {
        console.error('Error checking events:', countError);
      }

      // Find city info for the confirmation dialog
      const city = cities.find(c => c.city_id === cityId);
      const cityName = city ? `${city.city_name}, ${city.country}` : 'this city';

      let confirmMessage = `⚠️ Delete ${cityName}?\n\n`;
      
      if (eventCount && eventCount > 0) {
        confirmMessage += `This city has ${eventCount} published event(s).\n\n`;
        confirmMessage += `Deleting will:\n`;
        confirmMessage += `✗ Remove ${eventCount} published event(s)\n`;
        confirmMessage += `✗ Remove all event sources\n`;
        confirmMessage += `✗ Remove all AI agent data\n`;
        confirmMessage += `✗ Remove all parsed events\n\n`;
        confirmMessage += `⚠️ This action CANNOT be undone!\n\n`;
        confirmMessage += `Continue?`;
      } else {
        confirmMessage += `This will remove:\n`;
        confirmMessage += `✗ All event sources\n`;
        confirmMessage += `✗ All AI agent data\n`;
        confirmMessage += `✗ All parsed events (if any)\n\n`;
        confirmMessage += `Continue?`;
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      // If city has events, we need to delete them first (CASCADE)
      if (eventCount && eventCount > 0) {
        console.log(`Deleting ${eventCount} events for city ${cityId}...`);
        
        const { error: eventsDeleteError } = await supabase
          .from('events')
          .delete()
          .eq('city_id', cityId);

        if (eventsDeleteError) {
          throw new Error(`Failed to delete events: ${eventsDeleteError.message}`);
        }
        
        console.log(`✓ Deleted ${eventCount} events`);
      }

      // Delete event sources (should cascade to raw_events, parsed_events, etc.)
      const { error: sourcesError } = await supabase
        .from('event_sources')
        .delete()
        .eq('city_id', cityId);

      if (sourcesError) {
        console.warn('Failed to delete event sources:', sourcesError);
        // Continue anyway, city_configs delete should cascade
      }

      // Finally, delete the city config
      const { error: cityError } = await supabase
        .from('city_configs')
        .delete()
        .eq('city_id', cityId);

      if (cityError) throw cityError;
      
      await loadCities();
      await loadCityMetrics(); // Refresh metrics too
      
      alert(`✅ City deleted successfully!\n\n${eventCount ? `Removed ${eventCount} events and all associated data.` : 'Removed all associated data.'}`);
      
    } catch (error: any) {
      console.error('Failed to delete city:', error);
      alert(`❌ Failed to delete city: ${error.message}\n\nPlease check the browser console for details or contact support.`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Bot className="w-8 h-8 text-indigo-400" />
                AI Agent System
              </h1>
              <p className="text-indigo-300 mt-1">
                🚀 EventScout AI: Google Search → Gemini → Live Map (3 steps)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl text-white font-bold shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {/* Manual Jobs Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowManualJobs(!showManualJobs)}
                  className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-indigo-500/30 rounded-2xl hover:bg-white/20 text-white font-bold shadow-xl flex items-center gap-2 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Manual Jobs
                </button>
                
                {showManualJobs && (
                  <div className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-slate-800 to-indigo-900 border border-indigo-500/30 rounded-2xl shadow-2xl backdrop-blur-xl z-50">
                    <div className="p-4 border-b border-indigo-500/30">
                      <h3 className="font-semibold text-white">Manual Job Triggers</h3>
                      <p className="text-xs text-indigo-300 mt-1">🚀 EventScout AI Pipeline (3 steps)</p>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      {/* Discover Events with EventScout AI */}
                      <div className="border border-indigo-200 bg-indigo-50 rounded p-3">
                        <label className="text-sm font-medium text-indigo-900 block mb-2">
                          🤖 EventScout AI Discovery
                        </label>
                        <select
                          value={selectedCityForBootstrap}
                          onChange={(e) => setSelectedCityForBootstrap(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm"
                        >
                          <option value="">Select city...</option>
                          {cities.map(city => (
                            <option key={city.city_id} value={city.city_id}>
                              {city.city_name}, {city.country}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={runManualBootstrap}
                          disabled={!selectedCityForBootstrap || runningManualJob}
                          className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold shadow-lg transition-all"
                        >
                          {runningManualJob ? 'Discovering...' : 'Step 1: Discover Events'}
                        </button>
                        <p className="text-xs text-indigo-300 mt-1">Google Search + Gemini AI</p>
                      </div>
                      
                      {/* Validate & Publish */}
                      <button
                        onClick={() => runManualJob('validate-event')}
                        disabled={runningManualJob}
                        className="w-full px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-30 text-sm text-left font-bold shadow-lg transition-all"
                      >
                        Step 2: Validate Events
                      </button>
                      
                      <button
                        onClick={() => runManualJob('publish-event')}
                        disabled={runningManualJob}
                        className="w-full px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 text-sm text-left font-bold shadow-lg transition-all"
                      >
                        Step 3: Publish to Map
                      </button>
                      
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      {/* Helper Agents */}
                      <p className="text-xs font-medium text-gray-600 px-2">Helper Agents:</p>
                      
                      <button
                        onClick={testGuardian}
                        disabled={isTestingGuardian || runningManualJob}
                        className="w-full px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-30 text-sm text-left font-bold shadow-lg transition-all"
                      >
                        {isTestingGuardian ? 'Testing...' : '🛡️ City Guardian (Self-Heal)'}
                      </button>
                      
                      <button
                        onClick={() => runManualJob('ensure-free-events')}
                        disabled={runningManualJob}
                        className="w-full px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-30 text-sm text-left font-bold shadow-lg transition-all"
                      >
                        🎯 Ensure Free Events
                      </button>
                    </div>
                    
                    <div className="p-3 border-t border-indigo-500/30">
                      <button
                        onClick={() => setShowManualJobs(false)}
                        className="w-full px-3 py-2 border border-indigo-500/30 rounded-xl hover:bg-white/10 text-white text-sm font-bold transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Progress Tracker */}
        {pipelineProgress.isRunning && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <h3 className="text-lg font-semibold text-blue-900">Pipeline Running</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-700">
                      {pipelineProgress.currentCityIndex} / {pipelineProgress.totalCities} cities
                    </span>
                    {/* Pause/Resume Button */}
                    <button
                      onClick={handlePausePipeline}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        pipelinePaused
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                      title={pipelinePaused ? 'Resume pipeline' : 'Pause pipeline'}
                    >
                      {pipelinePaused ? (
                        <>
                          <Play className="w-4 h-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      )}
                    </button>
                    {/* Stop Button */}
                    <button
                      onClick={handleStopPipeline}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all"
                      title="Stop pipeline immediately"
                    >
                      <X className="w-4 h-4" />
                      Stop
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span className="font-medium">{pipelineProgress.currentCity}</span>
                    <span>{Math.round((pipelineProgress.currentCityIndex / pipelineProgress.totalCities) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(pipelineProgress.currentCityIndex / pipelineProgress.totalCities) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Current Step */}
                <div className="mb-3 text-sm text-gray-700 flex items-center justify-between">
                  <div>
                    <span className="font-medium">Current Step:</span> {pipelineProgress.currentStep}
                  </div>
                  {pipelinePaused && (
                    <div className="px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full animate-pulse">
                      ⏸️ PAUSED
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="text-lg font-bold text-green-600">{pipelineProgress.citiesCompleted}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Failed</div>
                    <div className="text-lg font-bold text-red-600">{pipelineProgress.citiesFailed}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Fetched</div>
                    <div className="text-lg font-bold text-blue-600">{pipelineProgress.totalFetched}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Parsed</div>
                    <div className="text-lg font-bold text-purple-600">{pipelineProgress.totalParsed}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Published</div>
                    <div className="text-lg font-bold text-green-600">{pipelineProgress.totalPublished}</div>
                  </div>
                </div>

                {/* Recent Activity Log */}
                <div className="bg-white rounded p-3 max-h-40 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-600">Recent Activity:</div>
                    <button
                      onClick={downloadPipelineLogs}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Download full logs as JSON"
                    >
                      <Download className="w-3 h-3" />
                      Download JSON
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-xs text-gray-700">
                    {pipelineProgress.recentLogs.map((log, idx) => (
                      <div key={idx} className="leading-tight">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Summary (after completion) */}
            {!pipelineProgress.isRunning && pipelineProgress.totalCities > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">Pipeline Completed</h3>
                  </div>
                  <button
                    onClick={downloadPipelineLogs}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Download full logs as JSON"
                  >
                    <Download className="w-4 h-4" />
                    Download Logs
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Total Cities</div>
                    <div className="text-xl font-bold text-gray-900">{pipelineProgress.totalCities}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Completed</div>
                    <div className="text-xl font-bold text-green-600">{pipelineProgress.citiesCompleted}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Total Fetched</div>
                    <div className="text-xl font-bold text-blue-600">{pipelineProgress.totalFetched}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Total Parsed</div>
                    <div className="text-xl font-bold text-purple-600">{pipelineProgress.totalParsed}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Total Published</div>
                    <div className="text-xl font-bold text-green-600">{pipelineProgress.totalPublished}</div>
                  </div>
                </div>
              </div>
            )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-sm border border-indigo-500/30 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-300">Cities Active</p>
                  <p className="text-3xl font-bold text-white">{stats.total_cities}</p>
                </div>
                <MapPin className="w-10 h-10 text-indigo-400" />
              </div>
              <p className="text-sm text-indigo-400 mt-2">
                {stats.active_sources} sources monitored
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 backdrop-blur-sm border border-emerald-500/30 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-300">Events (24h)</p>
                  <p className="text-3xl font-bold text-white">{stats.events_discovered_24h}</p>
                </div>
                <Activity className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-sm text-emerald-400 mt-2">
                {stats.events_published_24h} published
              </p>
            </div>

            {/* ⭐ NEW: Free Events Card */}
            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm border-2 border-emerald-500/50 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-300 font-bold">Free Events</p>
                  <p className="text-3xl font-bold text-white">{stats.free_events_active || 0}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-sm text-emerald-400 mt-2 font-bold">
                {stats.total_cities > 0 
                  ? `${Math.round((stats.free_events_active || 0) / stats.total_cities * 10) / 10} per city avg`
                  : 'Across all cities'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 backdrop-blur-sm border border-orange-500/30 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">Pending Review</p>
                  <p className="text-3xl font-bold text-white">{stats.pending_review}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-orange-400" />
              </div>
              <p className="text-sm text-orange-400 mt-2">
                Avg confidence: {(stats.avg_confidence || 0).toFixed(1)}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">AI Cost (7d)</p>
                  <p className="text-3xl font-bold text-white">
                    ${(stats.estimated_cost_7d || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-purple-400" />
              </div>
              <p className="text-sm text-purple-400 mt-2">
                {((stats.total_tokens_used_7d || 0) / 1000).toFixed(1)}k tokens
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm border border-indigo-500/30 rounded-2xl shadow-2xl mb-6">
          <div className="border-b border-indigo-500/30">
            <nav className="flex -mb-px overflow-x-auto p-2">
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
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20'
                      : 'text-indigo-300 hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold shadow-lg">
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

            {activeTab === 'cities' && (() => {
              // Calculate filtered cities first so buttons can use it
              const filteredCitiesForButtons = getFilteredAndSortedCities();
              
              return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">City Health & Pipeline Status</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-blue-700">
                        {selectedCities.size} / {cityMetrics.length} selected
                      </span>
                      <button
                        onClick={() => {
                          const allCityIds = new Set(cityMetrics.map(m => m.city_id));
                          setSelectedCities(allCityIds);
                        }}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          const filteredCityIds = new Set(filteredCitiesForButtons.map(m => m.city_id));
                          setSelectedCities(filteredCityIds);
                        }}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Select Filtered
                      </button>
                      <button
                        onClick={() => setSelectedCities(new Set())}
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Deselect All
                      </button>
                    </div>
                    
                    {/* Force Refresh Checkbox */}
                    <label className="flex items-center gap-2 text-sm text-white cursor-pointer px-4 py-3 bg-white/10 backdrop-blur-sm border border-indigo-500/30 rounded-2xl hover:bg-white/20 transition-all">
                      <input
                        type="checkbox"
                        checked={forceRefresh}
                        onChange={(e) => setForceRefresh(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="select-none font-bold">
                        Force Refresh
                      </span>
                      <span className="text-indigo-300" title="Clear all cached data (raw_events, parsed_events, published events) before running pipeline. Use this when Edge Functions have been updated.">
                        ℹ️
                      </span>
                    </label>
                    
                    {/* Run Pipeline Button */}
                    <button
                      onClick={triggerAgentPipeline}
                      disabled={isProcessing || selectedCities.size === 0}
                      className="flex items-center gap-2 px-6 py-3 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-xl shadow-indigo-500/20 transition-all"
                      title="Run EventScout AI pipeline for selected cities"
                    >
                      {isProcessing ? (
                        <>
                          <Pause className="w-5 h-5 animate-pulse" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Run Pipeline ({selectedCities.size})
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={testGuardian}
                      disabled={isTestingGuardian || loading}
                      className="flex items-center gap-2 px-6 py-3 text-sm bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-xl shadow-purple-500/20 transition-all"
                      title="Run city-guardian to check health and trigger recovery for degraded cities"
                    >
                      {isTestingGuardian ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Running Guardian...
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4" />
                          🛡️ Test Guardian
                        </>
                      )}
                    </button>
                    <button
                      onClick={batchBootstrapAllPendingCities}
                      disabled={batchBootstrapping || loading}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {batchBootstrapping ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Bootstrapping {batchProgress.current}/{batchProgress.total}...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Bootstrap All Pending
                        </>
                      )}
                    </button>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const metrics = await loadCityMetrics();
                          setCityMetrics(metrics);
                        } catch (error) {
                          console.error('Failed to refresh city metrics:', error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>
                
                {batchBootstrapping && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">
                          Processing: {batchProgress.currentCity}
                        </p>
                        <p className="text-sm text-blue-700">
                          Progress: {batchProgress.current} / {batchProgress.total} cities
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-500"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* City Filters Panel */}
                <CityFiltersPanel
                  totalCities={cityMetrics.length}
                  searchQuery={citySearchQuery}
                  onSearchChange={setCitySearchQuery}
                  filterCountry={cityFilterCountry}
                  onFilterCountryChange={setCityFilterCountry}
                  filterHealth={cityFilterHealth}
                  onFilterHealthChange={setCityFilterHealth}
                  filterActive={cityFilterActive}
                  onFilterActiveChange={setCityFilterActive}
                  filterBootstrap={cityFilterBootstrap}
                  onFilterBootstrapChange={setCityFilterBootstrap}
                  sortBy={citySortBy}
                  onSortByChange={setCitySortBy}
                  sortOrder={citySortOrder}
                  onSortOrderToggle={() => setCitySortOrder(citySortOrder === 'asc' ? 'desc' : 'asc')}
                  groupByCountry={cityGroupByCountry}
                  onGroupByCountryChange={setCityGroupByCountry}
                  uniqueCountries={getUniqueCountries()}
                />
                
                {cityMetrics.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No cities configured yet. Add cities in "Manage Cities" tab.</p>
                  </div>
                ) : (() => {
                  const filteredCities = getFilteredAndSortedCities();
                  
                  if (filteredCities.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Info className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p>No cities match the current filters.</p>
                      </div>
                    );
                  }

                  if (cityGroupByCountry) {
                    // Group cities by country
                    const grouped = filteredCities.reduce((acc, metric) => {
                      const country = metric.city?.country || 'Unknown';
                      if (!acc[country]) acc[country] = [];
                      acc[country].push(metric);
                      return acc;
                    }, {} as Record<string, typeof filteredCities>);

                    const sortedCountries = Object.keys(grouped).sort();

                    return (
                      <div className="space-y-6">
                        {sortedCountries.map(country => (
                          <div key={country} className="space-y-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                              <MapPin className="w-5 h-5 text-indigo-600" />
                              <h4 className="font-semibold text-indigo-900">{country}</h4>
                              <span className="ml-auto text-sm text-indigo-700">
                                {grouped[country].length} {grouped[country].length === 1 ? 'city' : 'cities'}
                              </span>
                            </div>
                            <div className="space-y-3 pl-4">
                              {grouped[country].map((metric) => (
                                <div key={metric.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedCities.has(metric.city_id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedCities);
                                if (e.target.checked) {
                                  newSelected.add(metric.city_id);
                                } else {
                                  newSelected.delete(metric.city_id);
                                }
                                setSelectedCities(newSelected);
                              }}
                              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <MapPin className={`w-5 h-5 ${metric.city?.active ? 'text-green-500' : 'text-gray-400'}`} />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {metric.city?.city_name || 'Unknown'}, {metric.city?.country || ''}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {metric.pipeline_enabled ? (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Pipeline Active
                                  </span>
                                ) : (
                                  <span className="text-gray-500 flex items-center gap-1">
                                    <Pause className="w-3 h-3" /> Pipeline Paused
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {metric.bootstrap_status === 'bootstrapping' ? (
                              <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Bootstrapping...
                              </div>
                            ) : (
                              <>
                                {/* ✅ Show health_status from backend if available */}
                                {metric.health_status && (
                                  <div className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                    {metric.health_status}
                                  </div>
                                )}
                                {/* Fallback to freshness_score color coding */}
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  metric.freshness_score >= 80 ? 'bg-green-100 text-green-700' :
                                  metric.freshness_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                  metric.freshness_score >= 40 ? 'bg-orange-100 text-orange-700' :
                                  metric.freshness_score === 0 ? 'bg-gray-100 text-gray-600' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  Health: {metric.freshness_score}%
                                </div>
                              </>
                            )}
                            <div className={`w-3 h-3 rounded-full ${getHealthColor(metric.freshness_score)}`} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-blue-600 text-xs">Event Sources</p>
                            <p className="font-bold text-blue-900 text-lg">{metric.active_sources}</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-green-600 text-xs">Total Events</p>
                            <p className="font-bold text-green-900 text-lg">{metric.total_events}</p>
                          </div>
                          {/* ⭐ NEW: Free Events */}
                          <div className="bg-emerald-50 rounded p-2 border-2 border-emerald-200">
                            <p className="text-emerald-700 text-xs font-semibold">Free Events</p>
                            <p className="font-bold text-emerald-900 text-lg">
                              {metric.free_events_count || 0}
                              {metric.free_events_count !== undefined && metric.free_events_count < 5 && (
                                <span className="text-xs text-orange-600 ml-1">⚠️</span>
                              )}
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-purple-600 text-xs">Last 30 Days</p>
                            <p className="font-bold text-purple-900 text-lg">{metric.events_30d || 0}</p>
                          </div>
                          <div className="bg-orange-50 rounded p-2">
                            <p className="text-orange-600 text-xs">Bootstrap Status</p>
                            <p className="font-semibold text-orange-900 text-xs capitalize">{metric.bootstrap_status || 'pending'}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-gray-600 text-xs">Last Bootstrap</p>
                            <p className="font-medium text-gray-900 text-xs">
                              {metric.last_bootstrap_at ? new Date(metric.last_bootstrap_at).toLocaleDateString() : 'Never'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {metric.active_sources === 0 && metric.city?.active && (
                            <div className="flex-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                              ⚠️ No event sources - Bootstrap needed
                            </div>
                          )}
                          {metric.city?.active && (
                            <button
                              onClick={() => triggerBootstrapForCity(metric.city_id)}
                              disabled={metric.bootstrap_status === 'bootstrapping'}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium whitespace-nowrap"
                              title={metric.active_sources > 0 ? 'Re-run bootstrap to discover more sources' : 'Run bootstrap to discover event sources'}
                            >
                              {metric.bootstrap_status === 'bootstrapping' ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  Bootstrapping...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3" />
                                  {metric.active_sources > 0 ? 'Re-bootstrap' : 'Bootstrap'}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {!metric.city?.active && (
                          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                            ℹ️ City is inactive. Enable in "Manage Cities" to start discovery.
                          </div>
                        )}
                      </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Regular list view (not grouped)
                  return (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600 pb-2">
                        Showing {filteredCities.length} of {cityMetrics.length} cities
                      </div>
                      {filteredCities.map((metric) => (
                        <div key={metric.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedCities.has(metric.city_id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedCities);
                                  if (e.target.checked) {
                                    newSelected.add(metric.city_id);
                                  } else {
                                    newSelected.delete(metric.city_id);
                                  }
                                  setSelectedCities(newSelected);
                                }}
                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <MapPin className={`w-5 h-5 ${metric.city?.active ? 'text-green-500' : 'text-gray-400'}`} />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {metric.city?.city_name || 'Unknown'}, {metric.city?.country || ''}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {metric.pipeline_enabled ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> Pipeline Active
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 flex items-center gap-1">
                                      <Pause className="w-3 h-3" /> Pipeline Paused
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {metric.bootstrap_status === 'bootstrapping' ? (
                                <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 animate-pulse">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  Bootstrapping...
                                </div>
                              ) : (
                                <>
                                  {metric.health_status && (
                                    <div className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                      {metric.health_status}
                                    </div>
                                  )}
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    metric.freshness_score >= 80 ? 'bg-green-100 text-green-700' :
                                    metric.freshness_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                    metric.freshness_score >= 40 ? 'bg-orange-100 text-orange-700' :
                                    metric.freshness_score === 0 ? 'bg-gray-100 text-gray-600' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    Health: {metric.freshness_score}%
                                  </div>
                                </>
                              )}
                              <div className={`w-3 h-3 rounded-full ${getHealthColor(metric.freshness_score)}`} />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-blue-600 text-xs">Event Sources</p>
                              <p className="font-bold text-blue-900 text-lg">{metric.active_sources}</p>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-green-600 text-xs">Total Events</p>
                              <p className="font-bold text-green-900 text-lg">{metric.total_events}</p>
                            </div>
                            <div className="bg-emerald-50 rounded p-2 border-2 border-emerald-200">
                              <p className="text-emerald-700 text-xs font-semibold">Free Events</p>
                              <p className="font-bold text-emerald-900 text-lg">
                                {metric.free_events_count || 0}
                                {metric.free_events_count !== undefined && metric.free_events_count < 5 && (
                                  <span className="text-xs text-orange-600 ml-1">⚠️</span>
                                )}
                              </p>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <p className="text-purple-600 text-xs">Last 30 Days</p>
                              <p className="font-bold text-purple-900 text-lg">{metric.events_this_week}</p>
                            </div>
                            <div className="bg-orange-50 rounded p-2">
                              <p className="text-orange-600 text-xs">Bootstrap Status</p>
                              <p className="font-semibold text-orange-900 text-xs capitalize">{metric.bootstrap_status || 'pending'}</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-600 text-xs">Last Bootstrap</p>
                              <p className="font-medium text-gray-900 text-xs">
                                {metric.last_bootstrap_at ? new Date(metric.last_bootstrap_at).toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between gap-2">
                            {metric.active_sources === 0 && metric.city?.active && (
                              <div className="flex-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                ⚠️ No event sources - Bootstrap needed
                              </div>
                            )}
                            {metric.city?.active && (
                              <button
                                onClick={() => triggerBootstrapForCity(metric.city_id)}
                                disabled={metric.bootstrap_status === 'bootstrapping'}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium whitespace-nowrap"
                                title={metric.active_sources > 0 ? 'Re-run bootstrap to discover more sources' : 'Run bootstrap to discover event sources'}
                              >
                                {metric.bootstrap_status === 'bootstrapping' ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Bootstrapping...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3 h-3" />
                                    {metric.active_sources > 0 ? 'Re-bootstrap' : 'Bootstrap'}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          
                          {!metric.city?.active && (
                            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                              ℹ️ City is inactive. Enable in "Manage Cities" to start discovery.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              );
            })()}

            {activeTab === 'manage-cities' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Manage Cities & Event Sources</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddCountry(!showAddCountry);
                        if (!showAddCountry) {
                          setShowAddCity(false);
                          setSuggestedCities([]);
                          setSelectedCitiesForImport(new Set());
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      {showAddCountry ? <X className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      {showAddCountry ? 'Cancel' : 'Add Country'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCity(!showAddCity);
                        if (!showAddCity) {
                          setShowAddCountry(false);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      {showAddCity ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {showAddCity ? 'Cancel' : 'Add City'}
                    </button>
                  </div>
                </div>

                {/* Bulk Country Import */}
                {showAddCountry && (
                  <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-green-600" />
                      Bulk Import Cities by Country
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Select a country and the system will use AI to find all major cities with coordinates and timezones. You can review and select which cities to import.
                    </p>
                    
                    <div className="space-y-4">
                      {/* Country Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country Name *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={selectedCountryForBulk}
                            onChange={(e) => setSelectedCountryForBulk(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="Germany, France, United States, Japan..."
                            onKeyPress={(e) => e.key === 'Enter' && fetchMajorCitiesForCountry()}
                            disabled={isFetchingCities}
                          />
                          <button
                            onClick={fetchMajorCitiesForCountry}
                            disabled={isFetchingCities || !selectedCountryForBulk.trim()}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isFetchingCities ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Fetching...
                              </>
                            ) : (
                              <>
                                <Search className="w-4 h-4" />
                                Find Cities
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Tip: AI will find ~20 major cities. For Germany, this would include Berlin, Munich, Hamburg, etc.
                        </p>
                      </div>
                      
                      {/* Bulk Import Progress */}
                      {isBulkImporting && (
                        <div className="border border-green-300 bg-green-100 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <RefreshCw className="w-5 h-5 text-green-600 animate-spin" />
                            <div>
                              <p className="font-medium text-green-900">
                                Importing Cities... {bulkImportProgress.current}/{bulkImportProgress.total}
                              </p>
                              <p className="text-sm text-green-700">
                                Current: {bulkImportProgress.currentCity}
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Suggested Cities List */}
                      {suggestedCities.length > 0 && (
                        <div className="border border-green-200 bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">
                              Found {suggestedCities.length} cities in {selectedCountryForBulk}
                            </h5>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const newCities = suggestedCities.filter(c => !c.exists).map(c => c.city_name);
                                  setSelectedCitiesForImport(new Set(newCities));
                                }}
                                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Select All New
                              </button>
                              <button
                                onClick={() => setSelectedCitiesForImport(new Set())}
                                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Deselect All
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                            {suggestedCities.map((city, idx) => (
                              <label
                                key={idx}
                                className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                  city.exists 
                                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                    : selectedCitiesForImport.has(city.city_name)
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-white border-gray-200 hover:border-green-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCitiesForImport.has(city.city_name)}
                                  disabled={city.exists}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedCitiesForImport);
                                    if (e.target.checked) {
                                      newSet.add(city.city_name);
                                    } else {
                                      newSet.delete(city.city_name);
                                    }
                                    setSelectedCitiesForImport(newSet);
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{city.city_name}</p>
                                    {city.exists && (
                                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                                        Already exists
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {city.timezone}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              <strong>{selectedCitiesForImport.size}</strong> cities selected for import
                            </p>
                            <button
                              onClick={bulkImportSelectedCities}
                              disabled={selectedCitiesForImport.size === 0 || isBulkImporting}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Import {selectedCitiesForImport.size} Cities
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Add City Form */}
                {showAddCity && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4">Add New City (Auto-Setup)</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter a city name. System will automatically find coordinates, country, timezone and bootstrap event sources.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City Name *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCity.city_name}
                            onChange={(e) => setNewCity({ ...newCity, city_name: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Berlin, Paris, London, New York..."
                            onKeyPress={(e) => e.key === 'Enter' && geocodeAndAddCity()}
                          />
                          <button
                            onClick={geocodeAndAddCity}
                            disabled={isGeocoding || !newCity.city_name.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isGeocoding ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Searching...
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4" />
                                Find & Add City
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Geocoding Results */}
                      {geocodingResults.length > 0 && (
                        <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
                          <h5 className="font-medium text-indigo-900 mb-3">Select City:</h5>
                          <div className="space-y-2">
                            {geocodingResults.map((result, idx) => (
                              <button
                                key={idx}
                                onClick={() => selectGeocodedCity(result)}
                                className="w-full text-left p-3 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {result.address.city || result.address.town || result.address.village || result.name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {result.address.country}
                                      {result.address.state && `, ${result.address.state}`}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Lat: {parseFloat(result.lat).toFixed(4)}, Lng: {parseFloat(result.lon).toFixed(4)}
                                    </p>
                                  </div>
                                  <span className="text-xs text-indigo-600 font-medium">
                                    Click to add
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Existing Cities List */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white">
                  <h4 className="font-medium text-gray-900 mb-4">Active Cities</h4>
                  
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
                {/* Combined Logs - Pipeline + Supabase Functions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">All Agent Logs</h3>
                          <p className="text-sm text-gray-600">Combined: Pipeline execution + Supabase Edge Functions</p>
                        </div>
                      </div>
                      {pipelineProgress.fullLogs.length > 0 && (
                        <button
                          onClick={downloadPipelineLogs}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Download full pipeline logs as JSON"
                        >
                          <Download className="w-4 h-4" />
                          Download JSON
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pipeline Status */}
                  {pipelineProgress.isRunning && (
                    <div className="p-4 bg-blue-50 border-b border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                          <span className="font-semibold text-blue-900">Pipeline Running</span>
                          <span className="text-sm text-blue-700">
                            ({pipelineProgress.currentCityIndex}/{pipelineProgress.totalCities} cities)
                          </span>
                        </div>
                        <div className="text-sm text-blue-700">
                          {Math.round((pipelineProgress.currentCityIndex / pipelineProgress.totalCities) * 100)}%
                        </div>
                      </div>
                      <div className="text-sm text-blue-800 mb-2">
                        {pipelineProgress.currentStep} - {pipelineProgress.currentCity}
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(pipelineProgress.currentCityIndex / pipelineProgress.totalCities) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Pipeline Stats */}
                  {pipelineProgress.totalCities > 0 && (
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="grid grid-cols-5 gap-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Completed</div>
                          <div className="text-lg font-bold text-green-600">{pipelineProgress.citiesCompleted}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Fetched</div>
                          <div className="text-lg font-bold text-blue-600">{pipelineProgress.totalFetched}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Parsed</div>
                          <div className="text-lg font-bold text-purple-600">{pipelineProgress.totalParsed}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Validated</div>
                          <div className="text-lg font-bold text-orange-600">{pipelineProgress.totalValidated}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Published</div>
                          <div className="text-lg font-bold text-green-600">{pipelineProgress.totalPublished}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Combined Full Logs - Pipeline + Supabase */}
                  <div className="p-4">
                    {pipelineProgress.fullLogs.length > 0 ? (
                      <>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Play className="w-4 h-4 text-indigo-600" />
                          Pipeline Execution Log ({pipelineProgress.fullLogs.length} entries)
                        </h4>
                        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs mb-6">
                          {pipelineProgress.fullLogs.map((log, idx) => (
                            <div 
                              key={idx} 
                              className={`leading-tight py-0.5 ${
                                log.includes('❌') || log.includes('Failed') ? 'text-red-400' :
                                log.includes('⚠️') ? 'text-yellow-400' :
                                log.includes('✅') ? 'text-green-400' :
                                log.includes('🚀') ? 'text-blue-400' :
                                'text-gray-300'
                              }`}
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="p-8 text-center text-gray-500 mb-6">
                        <Play className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="font-medium">No pipeline logs yet</p>
                        <p className="text-sm">Click "Run Pipeline" to see logs here</p>
                      </div>
                    )}

                    {/* 📊 ENHANCED DEBUG SECTIONS */}
                    
                    {/* Performance Metrics */}
                    {(pipelineProgress.performanceMetrics?.length ?? 0) > 0 && (
                      <div className="mb-6 border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Performance Metrics (Last 10 Cities)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">City</th>
                                <th className="px-3 py-2 text-right">Fetch</th>
                                <th className="px-3 py-2 text-right">Parse</th>
                                <th className="px-3 py-2 text-right">Validate</th>
                                <th className="px-3 py-2 text-right">Publish</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pipelineProgress.performanceMetrics.slice(-10).map((metric, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                  <td className="px-3 py-2">{metric.city}</td>
                                  <td className="px-3 py-2 text-right text-blue-600">{metric.fetchTime.toFixed(2)}s</td>
                                  <td className="px-3 py-2 text-right text-purple-600">{metric.parseTime.toFixed(2)}s</td>
                                  <td className="px-3 py-2 text-right text-orange-600">{metric.validateTime.toFixed(2)}s</td>
                                  <td className="px-3 py-2 text-right text-green-600">{metric.publishTime.toFixed(2)}s</td>
                                  <td className="px-3 py-2 text-right font-bold">{metric.totalTime.toFixed(2)}s</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* AI Stats */}
                    {(pipelineProgress.aiStats?.totalRequests ?? 0) > 0 && (
                      <div className="mb-6 border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Bot className="w-4 h-4 text-purple-600" />
                          AI Performance Stats
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-purple-50 rounded p-3">
                            <div className="text-xs text-purple-600">Total Requests</div>
                            <div className="text-lg font-bold text-purple-900">{pipelineProgress.aiStats.totalRequests}</div>
                          </div>
                          <div className="bg-red-50 rounded p-3">
                            <div className="text-xs text-red-600">Timeouts</div>
                            <div className="text-lg font-bold text-red-900">{pipelineProgress.aiStats.timeouts}</div>
                          </div>
                          <div className="bg-orange-50 rounded p-3">
                            <div className="text-xs text-orange-600">Rate Limits</div>
                            <div className="text-lg font-bold text-orange-900">{pipelineProgress.aiStats.rateLimits}</div>
                          </div>
                          <div className="bg-blue-50 rounded p-3">
                            <div className="text-xs text-blue-600">Avg Response</div>
                            <div className="text-lg font-bold text-blue-900">{pipelineProgress.aiStats.avgResponseTime.toFixed(2)}s</div>
                          </div>
                        </div>
                        {Object.keys(pipelineProgress.aiStats.modelUsage).length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-600 mb-2">Model Usage:</div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(pipelineProgress.aiStats?.modelUsage ?? {}).map(([model, count]) => (
                                <span key={model} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                  {model}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Geocoding Stats */}
                    {(pipelineProgress.geocodingStats?.attempts ?? 0) > 0 && (
                      <div className="mb-6 border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          Geocoding Statistics
                        </h4>
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div className="bg-blue-50 rounded p-3">
                            <div className="text-xs text-blue-600">Attempts</div>
                            <div className="text-lg font-bold text-blue-900">{pipelineProgress.geocodingStats?.attempts ?? 0}</div>
                          </div>
                          <div className="bg-green-50 rounded p-3">
                            <div className="text-xs text-green-600">Successes</div>
                            <div className="text-lg font-bold text-green-900">{pipelineProgress.geocodingStats?.successes ?? 0}</div>
                          </div>
                          <div className="bg-red-50 rounded p-3">
                            <div className="text-xs text-red-600">Failures</div>
                            <div className="text-lg font-bold text-red-900">{pipelineProgress.geocodingStats?.failures ?? 0}</div>
                          </div>
                          <div className="bg-purple-50 rounded p-3">
                            <div className="text-xs text-purple-600">Success Rate</div>
                            <div className="text-lg font-bold text-purple-900">
                              {((pipelineProgress.geocodingStats?.successes ?? 0) / (pipelineProgress.geocodingStats?.attempts ?? 1) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        {Object.keys(pipelineProgress.geocodingStats?.failureReasons ?? {}).length > 0 && (
                          <div>
                            <div className="text-xs text-gray-600 mb-2">Top Failure Reasons:</div>
                            <div className="space-y-1">
                              {Object.entries(pipelineProgress.geocodingStats?.failureReasons ?? {})
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5)
                                .map(([reason, count]) => (
                                  <div key={reason} className="flex justify-between items-center bg-red-50 rounded px-3 py-2">
                                    <span className="text-xs text-red-700">{reason}</span>
                                    <span className="text-xs font-bold text-red-900">{count}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Validation Failures */}
                    {(pipelineProgress.validationFailures?.length ?? 0) > 0 && (
                      <div className="mb-6 border-t pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          Validation Failures ({pipelineProgress.validationFailures.length})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {pipelineProgress.validationFailures.slice(0, 20).map((failure, idx) => (
                            <div key={idx} className="bg-orange-50 rounded p-3 text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-orange-900">{failure.eventName}</span>
                                <span className="text-orange-600">{failure.city}</span>
                              </div>
                              <div className="text-orange-700">{failure.reason}</div>
                              {failure.data && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-orange-600 hover:text-orange-700">View Details</summary>
                                  <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(failure.data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Errors */}
                    {(pipelineProgress.detailedErrors?.length ?? 0) > 0 && (
                      <div className="mb-6 border-t pt-4">
                        <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Detailed Error Log ({pipelineProgress.detailedErrors?.length ?? 0})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {(pipelineProgress.detailedErrors ?? []).map((error, idx) => (
                            <div key={idx} className="bg-red-50 rounded p-3 text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-red-900">{error.city} - {error.step}</span>
                                <span className="text-red-600">{new Date(error.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-red-700 mb-2">{error.error}</div>
                              {error.context && (
                                <details className="mb-2">
                                  <summary className="cursor-pointer text-red-600 hover:text-red-700">Context</summary>
                                  <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(error.context, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {error.stackTrace && (
                                <details>
                                  <summary className="cursor-pointer text-red-600 hover:text-red-700">Stack Trace</summary>
                                  <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto font-mono">
                                    {error.stackTrace}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AgentLogsViewer - Supabase Function Logs integrated */}
                    <div className="border-t pt-4">
                      {pipelineProgress.runStartTime && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-800">
                            <Info className="w-4 h-4" />
                            <span className="font-semibold">Filtered to this pipeline run:</span>
                            <span className="text-xs text-blue-600">
                              {new Date(pipelineProgress.runStartTime).toLocaleString('et-EE')}
                              {pipelineProgress.runEndTime && (
                                <> → {new Date(pipelineProgress.runEndTime).toLocaleString('et-EE')}</>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      <AgentLogsViewer 
                        maxLogs={200}
                        autoRefresh={true}
                        refreshInterval={5000}
                        onLogsUpdate={(logs) => setSupabaseLogs(logs)}
                        startTime={pipelineProgress.runStartTime}
                        endTime={pipelineProgress.runEndTime || undefined}
                      />
                    </div>
                  </div>

                  {/* Error Logs */}
                  {pipelineProgress.errors.length > 0 && (
                    <div className="p-4 border-t border-red-200 bg-red-50">
                      <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Pipeline Errors ({pipelineProgress.errors.length})
                      </h4>
                      <div className="space-y-2">
                        {pipelineProgress.errors.map((error, idx) => (
                          <div key={idx} className="bg-white rounded p-2 text-xs text-red-700 font-mono">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
