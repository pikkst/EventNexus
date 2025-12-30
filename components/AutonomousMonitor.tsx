import React, { useState, useEffect } from 'react';
import { Activity, Brain, Zap, TrendingUp, PauseCircle, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AutonomousLog {
  id: string;
  timestamp: string;
  action_type: string;
  campaign_id?: string;
  campaign_title?: string;
  message: string;
  details?: any;
  status: 'checking' | 'action_taken' | 'no_action' | 'error';
}

interface AutonomousMonitorProps {
  userId: string;
}

const AutonomousMonitor: React.FC<AutonomousMonitorProps> = ({ userId }) => {
  const [logs, setLogs] = useState<AutonomousLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({
    total_checks: 0,
    campaigns_analyzed: 0,
    actions_taken: 0,
    opportunities_found: 0
  });

  // Auto-refresh logs every 10 seconds
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('autonomous_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedLogs: AutonomousLog[] = (data || []).map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        action_type: log.action_type,
        campaign_id: log.campaign_id,
        campaign_title: log.campaign_title,
        message: log.message,
        details: log.details,
        status: log.status
      }));

      setLogs(formattedLogs);

      // Calculate stats
      const { data: actions } = await supabase
        .from('autonomous_actions')
        .select('action_type');

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('status', 'Active');

      const { data: opportunities } = await supabase
        .from('optimization_opportunities')
        .select('id')
        .eq('status', 'open');

      setStats({
        total_checks: actions?.length || 0,
        campaigns_analyzed: campaigns?.length || 0,
        actions_taken: actions?.filter((a: any) => 
          ['auto_pause', 'auto_scale_up', 'creative_refreshed'].includes(a.action_type)
        ).length || 0,
        opportunities_found: opportunities?.length || 0
      });
    } catch (error) {
      console.error('Failed to load autonomous logs:', error);
    }
  };

  const runAutonomousOps = async () => {
    setIsRunning(true);
    try {
      // First sync campaign performance
      const { data: syncResult, error: syncError } = await supabase
        .rpc('sync_all_campaigns_to_performance');

      if (syncError) {
        console.error('Sync error:', syncError);
      } else {
        console.log('✅ Synced campaigns:', syncResult?.synced_campaigns || 0);
      }

      // Run INTELLIGENT autonomous operations (includes strategic marketing)
      const { data: result, error } = await supabase
        .rpc('run_intelligent_autonomous_operations');

      if (error) {
        console.error('Autonomous ops error:', error);
        throw error;
      }
      
      console.log('✅ Intelligent operations result:', result);
      
      // If result contains logs array, display them directly
      if (result?.logs && Array.isArray(result.logs)) {
        const formattedLogs: AutonomousLog[] = result.logs.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp,
          action_type: log.action_type,
          campaign_id: log.campaign_id,
          campaign_title: log.campaign_title,
          message: log.message,
          details: log.details,
          status: log.status
        }));
        
        setLogs(formattedLogs);
        console.log('📊 Displaying', formattedLogs.length, 'logs from intelligent operations');
      } else {
        // Fallback: create summary log
        const newLog: AutonomousLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          action_type: 'operation_complete',
          message: `Intelligent operations completed - Strategy: ${result?.strategy?.type || 'unknown'} targeting ${result?.strategy?.target || 'unknown'}`,
          details: result,
          status: 'action_taken'
        };
        
        setLogs(prev => [newLog, ...prev]);
      }
      
      loadLogs(); // Refresh full logs from DB
    } catch (error) {
      console.error('Failed to run autonomous ops:', error);
      alert('Error running autonomous operations: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'action_taken': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'no_action': return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'auto_pause': return <PauseCircle className="w-4 h-4 text-orange-500" />;
      case 'auto_scale_up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'creative_refreshed': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'optimization_applied': return <Zap className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Autonomous Operations Monitor</h2>
            <p className="text-sm text-gray-600">Real-time AI decision tracking</p>
          </div>
        </div>
        
        <button
          onClick={runAutonomousOps}
          disabled={isRunning}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Now
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Checks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_checks}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Campaigns Analyzed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.campaigns_analyzed}</p>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actions Taken</p>
              <p className="text-2xl font-bold text-gray-900">{stats.actions_taken}</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Opportunities Found</p>
              <p className="text-2xl font-bold text-gray-900">{stats.opportunities_found}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Terminal-like Log Viewer */}
      <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-sm text-gray-400 font-mono">autonomous-ai-agent</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            Live monitoring
          </div>
        </div>

        <div className="p-4 h-96 overflow-y-auto font-mono text-sm space-y-2">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No autonomous operations logged yet.</p>
              <p className="text-xs mt-1">Click "Run Now" to start autonomous operations.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-500 text-xs shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {getStatusIcon(log.status)}
                {log.action_type && getActionIcon(log.action_type)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    log.status === 'action_taken' ? 'text-green-400' :
                    log.status === 'error' ? 'text-red-400' :
                    log.status === 'checking' ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>
                    {log.message}
                  </p>
                  {log.campaign_title && (
                    <p className="text-xs text-gray-500 mt-1">
                      Campaign: {log.campaign_title}
                    </p>
                  )}
                  {log.details && (
                    <details className="mt-1">
                      <summary className="text-xs text-purple-400 cursor-pointer hover:text-purple-300">
                        View details
                      </summary>
                      <pre className="text-xs text-gray-500 mt-1 p-2 bg-gray-950 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Autonomous Operations Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Auto-Pause:</strong> Campaigns with ROI &lt; 1.0x and $50+ spend are paused</li>
          <li>• <strong>Auto-Scale:</strong> Campaigns with ROI ≥ 3.0x and 10+ conversions get budget increased</li>
          <li>• <strong>Auto-Post:</strong> High-performing campaigns (CTR &gt; 2%) are posted to social media</li>
          <li>• <strong>Optimization:</strong> AI detects opportunities for creative refresh, targeting improvements, etc.</li>
        </ul>
      </div>
    </div>
  );
};

export default AutonomousMonitor;
