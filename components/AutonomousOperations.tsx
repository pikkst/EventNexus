import React, { useState, useEffect } from 'react';
import { 
  Bot, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, 
  Zap, Settings, Play, Pause, RefreshCw, Activity, Target, DollarSign,
  BarChart3, Lightbulb, Shield, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';
import {
  getAutonomousStats,
  getRecentActions,
  getOpenOpportunities,
  getActiveRules,
  identifyUnderperformingCampaigns,
  identifyScalingCandidates,
  runAutonomousOperations,
  updateOpportunityStatus,
  toggleRuleActive,
  rollbackAction,
  type AutonomousAction,
  type OptimizationOpportunity,
  type AutonomousRule
} from '../services/autonomousCampaignService';

export default function AutonomousOperations() {
  // State
  const [stats, setStats] = useState({
    total_actions: 0,
    paused_campaigns: 0,
    scaled_campaigns: 0,
    open_opportunities: 0,
    avg_confidence: 0
  });
  const [recentActions, setRecentActions] = useState<AutonomousAction[]>([]);
  const [opportunities, setOpportunities] = useState<OptimizationOpportunity[]>([]);
  const [rules, setRules] = useState<AutonomousRule[]>([]);
  const [underperformers, setUnderperformers] = useState<any[]>([]);
  const [scalingCandidates, setScalingCandidates] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'opportunities' | 'rules'>('overview');

  // Load data
  const loadData = async () => {
    const [statsData, actionsData, oppsData, rulesData, underperf, scaling] = await Promise.all([
      getAutonomousStats(),
      getRecentActions(20),
      getOpenOpportunities(),
      getActiveRules(),
      identifyUnderperformingCampaigns(),
      identifyScalingCandidates()
    ]);

    setStats(statsData);
    setRecentActions(actionsData);
    setOpportunities(oppsData);
    setRules(rulesData);
    setUnderperformers(underperf);
    setScalingCandidates(scaling);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Run autonomous operations
  const handleRunAutonomous = async () => {
    setIsRunning(true);
    try {
      const result = await runAutonomousOperations();
      if (result) {
        setLastRun(new Date());
        await loadData();
        alert(`Autonomous cycle complete!\n✅ Paused: ${result.actions_taken.campaigns_paused}\n✅ Scaled: ${result.actions_taken.campaigns_scaled}\n✅ Opportunities: ${result.actions_taken.opportunities_detected}`);
      }
    } catch (error) {
      console.error('Error running autonomous operations:', error);
      alert('Error running autonomous operations');
    } finally {
      setIsRunning(false);
    }
  };

  // Rollback action
  const handleRollback = async (actionId: string) => {
    if (!confirm('Rollback this autonomous action? This will restore the previous campaign state.')) return;
    
    const success = await rollbackAction(actionId);
    if (success) {
      alert('Action rolled back successfully');
      loadData();
    } else {
      alert('Error rolling back action');
    }
  };

  // Update opportunity status
  const handleOpportunityAction = async (oppId: string, status: 'in_progress' | 'resolved' | 'dismissed') => {
    const success = await updateOpportunityStatus(oppId, status);
    if (success) {
      loadData();
    }
  };

  // Toggle rule
  const handleToggleRule = async (ruleId: string, currentState: boolean) => {
    const success = await toggleRuleActive(ruleId, !currentState);
    if (success) {
      loadData();
    }
  };

  // Severity badge
  const getSeverityBadge = (severity: string) => {
    const styles = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${styles[severity as keyof typeof styles] || styles.low}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  // Action type icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'auto_pause': return <Pause className="w-4 h-4 text-red-500" />;
      case 'auto_scale_up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'auto_scale_down': return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'optimization_applied': return <Zap className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-500" />
            Autonomous Operations
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            AI-powered self-optimizing campaign management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last run: {lastRun.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRunAutonomous}
            disabled={isRunning}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Autonomous Cycle
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border-2 border-slate-100 hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-semibold text-slate-500">TOTAL</span>
          </div>
          <div className="text-2xl font-black">{stats.total_actions}</div>
          <div className="text-xs text-slate-500 font-medium">Actions Taken</div>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-slate-100 hover:border-red-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Pause className="w-5 h-5 text-red-500" />
            <span className="text-xs font-semibold text-slate-500">PAUSED</span>
          </div>
          <div className="text-2xl font-black">{stats.paused_campaigns}</div>
          <div className="text-xs text-slate-500 font-medium">Auto-Paused</div>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-slate-100 hover:border-green-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-xs font-semibold text-slate-500">SCALED</span>
          </div>
          <div className="text-2xl font-black">{stats.scaled_campaigns}</div>
          <div className="text-xs text-slate-500 font-medium">Auto-Scaled</div>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-slate-100 hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Lightbulb className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-semibold text-slate-500">OPPORTUNITIES</span>
          </div>
          <div className="text-2xl font-black">{stats.open_opportunities}</div>
          <div className="text-xs text-slate-500 font-medium">Open Items</div>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-slate-100 hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-semibold text-slate-500">CONFIDENCE</span>
          </div>
          <div className="text-2xl font-black">{stats.avg_confidence}%</div>
          <div className="text-xs text-slate-500 font-medium">Avg. Confidence</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {(['overview', 'actions', 'opportunities', 'rules'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Underperformers */}
          <div className="bg-white rounded-xl p-6 border-2 border-slate-100">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Underperforming Campaigns
            </h3>
            {underperformers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                All campaigns performing well!
              </div>
            ) : (
              <div className="space-y-3">
                {underperformers.slice(0, 5).map((campaign) => (
                  <div key={campaign.campaign_id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-sm">{campaign.campaign_title}</div>
                      <span className="text-xs font-bold text-red-600">ROI: {campaign.roi.toFixed(2)}x</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-2">{campaign.recommendation}</div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span>Spend: ${campaign.total_spend.toFixed(2)}</span>
                      <span>CTR: {campaign.ctr.toFixed(2)}%</span>
                      <span>Running: {Math.floor(campaign.hours_running)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scaling Candidates */}
          <div className="bg-white rounded-xl p-6 border-2 border-slate-100">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Scaling Candidates
            </h3>
            {scalingCandidates.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Info className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                No campaigns ready for scaling yet
              </div>
            ) : (
              <div className="space-y-3">
                {scalingCandidates.slice(0, 5).map((campaign) => (
                  <div key={campaign.campaign_id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-sm">{campaign.campaign_title}</div>
                      <span className="text-xs font-bold text-green-600">ROI: {campaign.roi.toFixed(2)}x</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-2">{campaign.reasoning}</div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span>Current: ${campaign.current_budget}</span>
                        <span className="text-green-600 font-semibold">→ ${campaign.suggested_budget}</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                        {campaign.confidence_score.toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-white rounded-xl border-2 border-slate-100">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Recent Autonomous Actions</h3>
            <div className="space-y-3">
              {recentActions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No actions yet</div>
              ) : (
                recentActions.map((action) => (
                  <div key={action.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-all">
                    <div className="flex items-start gap-3">
                      {getActionIcon(action.action_type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm capitalize">
                            {action.action_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(action.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">{action.reason}</div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-center">
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                              {action.confidence_score.toFixed(0)}% confidence
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              action.status === 'executed' ? 'bg-green-100 text-green-700' :
                              action.status === 'failed' ? 'bg-red-100 text-red-700' :
                              action.status === 'rolled_back' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {action.status}
                            </span>
                          </div>
                          {action.status === 'executed' && (
                            <button
                              onClick={() => handleRollback(action.id)}
                              className="text-xs text-red-600 hover:text-red-700 font-semibold"
                            >
                              Rollback
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="bg-white rounded-xl border-2 border-slate-100">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Optimization Opportunities</h3>
            <div className="space-y-3">
              {opportunities.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No opportunities detected</div>
              ) : (
                opportunities.map((opp) => (
                  <div key={opp.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-sm capitalize">
                          {opp.opportunity_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {getSeverityBadge(opp.severity)}
                    </div>
                    <div className="text-sm text-slate-600 mb-2">{opp.description}</div>
                    <div className="text-sm text-slate-700 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                      💡 {opp.suggested_action}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                        {opp.confidence_score.toFixed(0)}% confidence
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpportunityAction(opp.id, 'in_progress')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleOpportunityAction(opp.id, 'resolved')}
                          className="text-xs text-green-600 hover:text-green-700 font-semibold"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleOpportunityAction(opp.id, 'dismissed')}
                          className="text-xs text-slate-600 hover:text-slate-700 font-semibold"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white rounded-xl border-2 border-slate-100">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Autonomous Rules</h3>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-purple-500" />
                      <span className="font-semibold">{rule.rule_name}</span>
                    </div>
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        rule.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span className="font-medium">Type: {rule.rule_type}</span>
                    <span className="font-medium">Priority: {rule.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
