import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TrendingDown, Zap, Clock, AlertCircle } from 'lucide-react';

interface CostMetrics {
  date: string;
  total_cost_usd: number;
  actual_cost: number;
  cost_if_all_pro: number;
  cost_saved: number;
  savings_percentage: number;
  total_calls: number;
  avg_latency_ms: number;
  success_rate_pct: number;
  flash_exp_usage: number;
  flash_usage: number;
  pro_flash_usage: number;
  pro_usage: number;
}

interface ModelPerformance {
  model_selected: string;
  usage_count: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  success_rate_pct: number;
  total_tokens_m: number;
}

interface CityAICost {
  id: string;
  name: string;
  total_calls: number;
  total_cost_usd: number;
  success_rate_pct: number;
  models_used: string;
}

/**
 * AI Cost & Model Dashboard
 * 
 * Shows:
 * - Daily/monthly cost breakdown
 * - Model usage distribution
 * - Cost savings from smart routing
 * - Performance metrics (latency, success rate)
 * - City-level cost tracking
 * - Timeout analysis
 */
export function AICostDashboard() {
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL || '',
    process.env.REACT_APP_SUPABASE_ANON_KEY || ''
  );

  const [costData, setCostData] = useState<CostMetrics[]>([]);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [cityCosts, setCityCosts] = useState<CityAICost[]>([]);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // 1. Pipeline cost summary (last 30 days)
      const { data: costSummary } = await supabase
        .from('v_pipeline_cost_summary')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (costSummary) {
        setCostData(costSummary as CostMetrics[]);
        const monthTotal = costSummary.reduce(
          (sum, day) => sum + (day.total_cost_usd || 0),
          0
        );
        setTotalMonthlyCost(monthTotal);
      }

      // 2. Cost savings view
      const { data: savingsData } = await supabase
        .from('v_cost_savings')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (savingsData) {
        const totalSavings = savingsData.reduce(
          (sum, day) => sum + (day.cost_saved || 0),
          0
        );
        setTotalSavings(totalSavings);
      }

      // 3. Model performance breakdown
      const { data: models } = await supabase
        .from('v_model_cost_breakdown')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (models) {
        // Aggregate by model
        const modelMap = new Map<string, ModelPerformance>();
        (models as any[]).forEach(row => {
          const key = row.model_selected;
          if (!modelMap.has(key)) {
            modelMap.set(key, {
              model_selected: row.model_selected,
              usage_count: 0,
              total_cost_usd: 0,
              avg_latency_ms: 0,
              success_rate_pct: 0,
              total_tokens_m: 0
            });
          }
          const existing = modelMap.get(key)!;
          existing.usage_count += row.usage_count || 0;
          existing.total_cost_usd += row.total_cost_usd || 0;
          existing.avg_latency_ms = row.avg_latency_ms || 0;
          existing.success_rate_pct = row.success_rate_pct || 0;
          existing.total_tokens_m += row.total_tokens_m || 0;
        });

        setModelPerformance(Array.from(modelMap.values()));
      }

      // 4. City-level costs
      const { data: cities } = await supabase
        .from('v_city_ai_costs')
        .select('*')
        .order('total_cost_usd', { ascending: false })
        .limit(20);

      if (cities) {
        setCityCosts(cities as CityAICost[]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading AI cost metrics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">AI Cost & Model Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Monthly Cost</p>
              <p className="text-3xl font-bold text-gray-900">${totalMonthlyCost.toFixed(2)}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Cost Saved (30d)</p>
              <p className="text-3xl font-bold text-green-600">${totalSavings.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">vs all-Pro model</p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Daily Cost</p>
              <p className="text-3xl font-bold text-gray-900">
                ${(totalMonthlyCost / 30).toFixed(2)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total API Calls (30d)</p>
              <p className="text-3xl font-bold text-gray-900">
                {costData.reduce((sum, day) => sum + (day.total_calls || 0), 0)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Model Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Model Performance Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Model</th>
                <th className="text-right py-2 px-4">Usage</th>
                <th className="text-right py-2 px-4">Total Cost</th>
                <th className="text-right py-2 px-4">Avg Cost/Call</th>
                <th className="text-right py-2 px-4">Latency</th>
                <th className="text-right py-2 px-4">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {modelPerformance.map(model => (
                <tr key={model.model_selected} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4 font-mono text-xs">{model.model_selected}</td>
                  <td className="text-right py-2 px-4">{model.usage_count}</td>
                  <td className="text-right py-2 px-4 font-bold">
                    ${model.total_cost_usd?.toFixed(4)}
                  </td>
                  <td className="text-right py-2 px-4 text-xs">
                    ${(model.total_cost_usd / model.usage_count).toFixed(6)}
                  </td>
                  <td className="text-right py-2 px-4">{model.avg_latency_ms}ms</td>
                  <td className="text-right py-2 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-white text-xs ${
                        model.success_rate_pct >= 95
                          ? 'bg-green-600'
                          : model.success_rate_pct >= 80
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                    >
                      {model.success_rate_pct?.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Cities by Cost */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Cities by AI Cost</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">City</th>
                <th className="text-right py-2 px-4">API Calls</th>
                <th className="text-right py-2 px-4">Total Cost</th>
                <th className="text-right py-2 px-4">Success Rate</th>
                <th className="text-left py-2 px-4">Models Used</th>
              </tr>
            </thead>
            <tbody>
              {cityCosts.slice(0, 15).map(city => (
                <tr key={city.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4 font-medium">{city.name}</td>
                  <td className="text-right py-2 px-4">{city.total_calls}</td>
                  <td className="text-right py-2 px-4 font-bold">
                    ${city.total_cost_usd?.toFixed(4)}
                  </td>
                  <td className="text-right py-2 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-white text-xs ${
                        city.success_rate_pct >= 95
                          ? 'bg-green-600'
                          : city.success_rate_pct >= 80
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                    >
                      {city.success_rate_pct?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-left py-2 px-4 text-xs font-mono text-gray-600">
                    {city.models_used}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AICostDashboard;
