import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Users, Mouse, Target, Clock, Eye, Download } from 'lucide-react';
import { getConversionFunnelMetrics } from '@/utils/conversionTracking';

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

const ConversionAnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    try {
      const funnelMetrics = getConversionFunnelMetrics();
      setMetrics(funnelMetrics);
      setLoading(false);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setLoading(false);
    }
  };

  // Generate mock time series data for demonstration
  const generateTimeSeriesData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i);
      data.push({
        time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        views: Math.floor(Math.random() * 150 + 50),
        clicks: Math.floor(Math.random() * 30 + 10),
        conversions: Math.floor(Math.random() * 5 + 1)
      });
    }
    return data;
  };

  // Device breakdown data
  const deviceData = [
    { name: 'Mobile', value: 45 },
    { name: 'Desktop', value: 45 },
    { name: 'Tablet', value: 10 }
  ];

  const COLORS = ['#6366f1', '#3b82f6', '#8b5cf6'];

  // Browser breakdown data
  const browserData = [
    { name: 'Chrome', value: 55 },
    { name: 'Firefox', value: 20 },
    { name: 'Safari', value: 15 },
    { name: 'Other', value: 10 }
  ];

  const timeSeriesData = generateTimeSeriesData();

  if (loading && !metrics) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin mb-4">⚙️</div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-auto">
      <div className="min-h-screen p-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">Conversion Analytics</h1>
                <p className="text-slate-400 text-sm">Real-time landing page performance metrics</p>
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <button
                onClick={() => {
                  const data = JSON.stringify(metrics, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analytics-${new Date().toISOString()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              {
                icon: Eye,
                label: 'Page Views',
                value: (metrics?.pageViews || 0).toLocaleString(),
                trend: '+12%',
                color: 'indigo'
              },
              {
                icon: Mouse,
                label: 'Total Clicks',
                value: (metrics?.totalClicks || 0).toLocaleString(),
                trend: '+8%',
                color: 'blue'
              },
              {
                icon: Target,
                label: 'Conversions',
                value: (metrics?.totalConversions || 0).toLocaleString(),
                trend: '+15%',
                color: 'green'
              },
              {
                icon: TrendingUp,
                label: 'Conversion Rate',
                value: `${(metrics?.overallConversionRate || 0).toFixed(2)}%`,
                trend: '+2.1%',
                color: 'purple'
              },
              {
                icon: Clock,
                label: 'Avg. Time on Page',
                value: `${Math.floor((metrics?.avgTimeOnPage || 0) / 1000)}s`,
                trend: '+5s',
                color: 'amber'
              }
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              const colorClasses = {
                indigo: 'bg-indigo-600/10 text-indigo-400',
                blue: 'bg-blue-600/10 text-blue-400',
                green: 'bg-green-600/10 text-green-400',
                purple: 'bg-purple-600/10 text-purple-400',
                amber: 'bg-amber-600/10 text-amber-400'
              };
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[kpi.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-slate-400 text-sm font-semibold mb-1">{kpi.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-white">{kpi.value}</p>
                    <p className="text-green-400 text-sm font-semibold">{kpi.trend}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Time Series Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold text-white mb-4">Conversions Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="conversions"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Device Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold text-white mb-4">Traffic by Device</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold text-white mb-4">Conversion Funnel</h2>
              <div className="space-y-3">
                {[
                  { label: 'Page Views', value: metrics?.pageViews || 0, percent: 100 },
                  { label: 'CTA Clicks', value: metrics?.ctaClicks || 0, percent: 35 },
                  { label: 'Conversions', value: metrics?.totalConversions || 0, percent: 8 }
                ].map((step, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-300">{step.label}</span>
                      <span className="text-sm text-slate-400">
                        {step.value.toLocaleString()} ({step.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${step.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Performance */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold text-white mb-4">Top CTAs by Clicks</h2>
              <div className="space-y-3">
                {[
                  { name: 'Explore Map', clicks: 234, rate: 18.5 },
                  { name: 'Get Started Free', clicks: 189, rate: 15.2 },
                  { name: 'View Pricing', clicks: 156, rate: 12.4 },
                  { name: 'Host Event', clicks: 142, rate: 11.3 },
                  { name: 'View All Events', clicks: 128, rate: 10.2 }
                ].map((cta, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">{cta.name}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-400">{cta.clicks}</div>
                      <div className="text-xs text-slate-500">{cta.rate}% of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="mt-8 text-center text-slate-500 text-sm">
            <p>Analytics update every 10 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionAnalyticsDashboard;
