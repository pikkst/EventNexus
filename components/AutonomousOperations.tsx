import React, { useState, useEffect } from 'react';
import { 
  Bot, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, 
  Zap, Settings, Play, Pause, RefreshCw, Activity, Target, DollarSign,
  BarChart3, Lightbulb, Shield, ArrowUpRight, ArrowDownRight, Info, Loader2, Share2
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
    posted_campaigns: 0,
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
        alert(`Autonomous cycle complete!\n✅ Paused: ${result.actions_taken.campaigns_paused}\n✅ Scaled: ${result.actions_taken.campaigns_scaled}\n📱 Posted: ${result.actions_taken.campaigns_posted || 0}\n✨ Opportunities: ${result.actions_taken.opportunities_detected}`);
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
      critical: 'bg-red-500/10 text-red-400 border-red-500/30',
      high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      low: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
    };
    return (
      <span className={`px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-widest ${styles[severity as keyof typeof styles] || styles.low}`}>
        {severity}
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-white">
            <Bot className="w-8 h-8 text-indigo-500" />
            Autonomous Operations
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1">
            AI-powered self-optimizing campaign management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
              <Clock className="w-3 h-3" />
              Last run: {lastRun.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRunAutonomous}
            disabled={isRunning}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Cycle
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total</span>
          </div>
          <div className="text-3xl font-black text-white">{stats.total_actions}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Actions Taken</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-red-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <Pause className="w-5 h-5 text-red-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Paused</span>
          </div>
          <div className="text-3xl font-black text-white">{stats.paused_campaigns}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Auto-Paused</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Scaled</span>
          </div>
          <div className="text-3xl font-black text-white">{stats.scaled_campaigns}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Auto-Scaled</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-pink-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <Share2 className="w-5 h-5 text-pink-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Posted</span>
          </div>
          <div className="text-3xl font-black text-white">{stats.posted_campaigns}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Auto-Posted</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-orange-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <Lightbulb className="w-5 h-5 text-orange-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Opps</span>
          </div>
          <div className="text-3xl font-black text-white">{stats.open_opportunities}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Open Items</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-violet-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <Shield className="w-5 h-5 text-violet-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Conf</span>
          </div>
          <div className="text-3xl font-black text-white">{stats.avg_confidence}%</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">Avg. Confidence</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-6">
          {(['overview', 'actions', 'opportunities', 'rules'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors uppercase tracking-widest text-[10px] ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-500'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Underperformers */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-lg font-black flex items-center gap-3 mb-6 text-white">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Underperforming
            </h3>
            {underperformers.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-slate-400 text-sm font-medium">All campaigns performing well!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {underperformers.slice(0, 5).map((campaign) => (
                  <div key={campaign.campaign_id} className="p-4 bg-slate-950 rounded-2xl border border-red-500/20 hover:border-red-500/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-sm text-white">{campaign.campaign_title}</div>
                      <span className="text-xs font-black text-red-400">ROI: {campaign.roi.toFixed(2)}x</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-3">{campaign.recommendation}</div>
                    <div className="flex gap-4 text-xs text-slate-500 font-mono">
                      <span>${campaign.total_spend.toFixed(2)}</span>
                      <span>CTR: {campaign.ctr.toFixed(2)}%</span>
                      <span>{Math.floor(campaign.hours_running)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scaling Candidates */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-lg font-black flex items-center gap-3 mb-6 text-white">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Scaling Ready
            </h3>
            {scalingCandidates.length === 0 ? (
              <div className="text-center py-12">
                <Info className="w-12 h-12 mx-auto mb-3 text-indigo-500" />
                <p className="text-slate-400 text-sm font-medium">No campaigns ready for scaling yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scalingCandidates.slice(0, 5).map((campaign) => (
                  <div key={campaign.campaign_id} className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-sm text-white">{campaign.campaign_title}</div>
                      <span className="text-xs font-black text-emerald-400">ROI: {campaign.roi.toFixed(2)}x</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-3">{campaign.reasoning}</div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3 text-xs text-slate-500 font-mono">
                        <span>${campaign.current_budget}</span>
                        <span className="text-emerald-400">→ ${campaign.suggested_budget}</span>
                      </div>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg font-black">
                        {campaign.confidence_score.toFixed(0)}%
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
          <div className="p-8 space-y-4">
            <h3 className="text-lg font-black text-white mb-6">Recent Actions</h3>
            <div className="space-y-3">
              {recentActions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No actions yet</div>
              ) : (
                recentActions.map((action) => (
                  <div key={action.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-start gap-3">
                      {getActionIcon(action.action_type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white capitalize">
                            {action.action_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(action.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 mb-3">{action.reason}</div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg font-black">
                              {action.confidence_score.toFixed(0)}%
                            </span>
                            <span className={`text-[10px] px-3 py-1 rounded-lg font-black ${
                              action.status === 'executed' ? 'bg-emerald-500/10 text-emerald-400' :
                              action.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                              action.status === 'rolled_back' ? 'bg-orange-500/10 text-orange-400' :
                              'bg-yellow-500/10 text-yellow-400'
                            }`}>
                              {action.status}
                            </span>
                          </div>
                          {action.status === 'executed' && (
                            <button
                              onClick={() => handleRollback(action.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-bold"
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
          <div className="p-8 space-y-4">
            <h3 className="text-lg font-black text-white mb-6">Opportunities</h3>
            <div className="space-y-3">
              {opportunities.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No opportunities detected</div>
              ) : (
                opportunities.map((opp) => (
                  <div key={opp.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-orange-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Lightbulb className="w-4 h-4 text-orange-500" />
                        <span className="font-bold text-sm text-white capitalize">
                          {opp.opportunity_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {getSeverityBadge(opp.severity)}
                    </div>
                    <div className="text-sm text-slate-400 mb-3">{opp.description}</div>
                    <div className="text-sm text-slate-300 mb-4 p-3 bg-slate-900/50 rounded-xl border border-orange-500/20">
                      💡 {opp.suggested_action}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg font-black">
                        {opp.confidence_score.toFixed(0)}%
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpportunityAction(opp.id, 'in_progress')}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleOpportunityAction(opp.id, 'resolved')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleOpportunityAction(opp.id, 'dismissed')}
                          className="text-xs text-slate-500 hover:text-slate-400 font-bold"
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
          <div className="p-8 space-y-4">
            <h3 className="text-lg font-black text-white mb-6">Rules</h3>
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No rules configured</div>
              ) : (
                rules.map((rule) => (
                  <div key={rule.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-indigo-500" />
                        <div>
                          <span className="font-bold text-white">{rule.rule_name}</span>
                          <div className="flex gap-3 text-xs text-slate-500 font-mono mt-1">
                            <span>Type: {rule.rule_type}</span>
                            <span>Priority: {rule.priority}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.is_active)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                          rule.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
