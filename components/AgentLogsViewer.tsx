import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Bug, Filter, RefreshCw } from 'lucide-react';

export interface AgentLog {
  id: string;
  created_at: string;
  agent_name: string;
  job_id?: string;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  message: string;
  details?: any;
  duration_ms?: number;
  city_id?: string;
}

interface AgentLogsViewerProps {
  maxLogs?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onLogsUpdate?: (logs: AgentLog[]) => void; // Callback to pass logs to parent
}

export const AgentLogsViewer: React.FC<AgentLogsViewerProps> = ({
  maxLogs = 100,
  autoRefresh = true,
  refreshInterval = 5000,
  onLogsUpdate,
}) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxLogs);

      if (filter !== 'all') {
        query = query.eq('level', filter);
      }

      if (agentFilter !== 'all') {
        query = query.eq('agent_name', agentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      const fetchedLogs = data || [];
      setLogs(fetchedLogs);
      
      // Pass logs to parent component
      if (onLogsUpdate) {
        onLogsUpdate(fetchedLogs);
      }
    } catch (error) {
      console.error('Failed to fetch agent logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [filter, agentFilter]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'debug': return <Bug className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-gray-900';
      case 'success': return 'bg-green-500 text-white';
      case 'debug': return 'bg-gray-600 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getAgentBadgeColor = (agent: string) => {
    switch (agent) {
      case 'bootstrap-city': return 'bg-purple-600 text-white';
      case 'fetch-sources': return 'bg-indigo-600 text-white';
      case 'parse-event-ai': return 'bg-pink-600 text-white';
      case 'validate-event': return 'bg-orange-600 text-white';
      case 'publish-event': return 'bg-teal-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Agent Activity Logs</h3>
          
          {/* Level Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          {/* Agent Filter */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Agents</option>
            <option value="bootstrap-city">Bootstrap City</option>
            <option value="fetch-sources">Fetch Sources</option>
            <option value="parse-event-ai">Parse Event AI</option>
            <option value="validate-event">Validate Event</option>
            <option value="publish-event">Publish Event</option>
          </select>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Logs List */}
      <div className="overflow-y-auto max-h-[600px]">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No logs found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Time */}
                      <span className="text-xs text-gray-500 font-mono">
                        {formatTime(log.created_at)}
                      </span>

                      {/* Agent Badge */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAgentBadgeColor(log.agent_name)}`}>
                        {log.agent_name}
                      </span>

                      {/* Level Badge */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelBadgeColor(log.level)}`}>
                        {log.level}
                      </span>

                      {/* Duration */}
                      {log.duration_ms !== null && log.duration_ms !== undefined && (
                        <span className="text-xs text-gray-500">
                          {log.duration_ms}ms
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-900 mb-1">{log.message}</p>

                    {/* Details */}
                    {log.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-800">
                          View details
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
        <span>Showing last {logs.length} logs</span>
        {autoRefresh && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Auto-refreshing every {refreshInterval / 1000}s
          </span>
        )}
      </div>
    </div>
  );
};
