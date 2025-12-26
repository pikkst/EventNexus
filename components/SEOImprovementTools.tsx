import React, { useState, useEffect } from 'react';
import { AlertCircle, Target, Zap, TrendingUp, Lightbulb, ChevronDown, ChevronUp, RefreshCw, ArrowRight } from 'lucide-react';
import {
  fetchSEORecommendations,
  fetchKeywordOptimization,
  fetchMetaTagSuggestions,
  fetchSEOStrategy,
  fetchSEOMetrics,
  type SEOMetric,
} from '@/services/analyticsApiService';

interface Recommendation {
  type: 'keyword' | 'content' | 'meta' | 'technical' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
}

interface KeywordOpportunity {
  keyword: string;
  currentPosition: number;
  opportunity: 'quick_win' | 'medium_effort' | 'long_term';
  suggestion: string;
  expectedImprovement: string;
  action: string;
}

interface Strategy {
  phase1: string;
  phase2: string;
  phase3: string;
  quickWins: string[];
  monthlyGoals: string[];
}

const SEOImprovementTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'keywords' | 'strategy' | 'meta'>('recommendations');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [opportunities, setOpportunities] = useState<KeywordOpportunity[]>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [seoMetrics, setSeoMetrics] = useState<SEOMetric[]>([]);

  useEffect(() => {
    loadSEOData();
  }, []);

  const loadSEOData = async () => {
    setLoading(true);
    try {
      const metrics = await fetchSEOMetrics('', 30);
      if (Array.isArray(metrics)) {
        setSeoMetrics(metrics);
        
        if (activeTab === 'recommendations') {
          const recs = await fetchSEORecommendations(metrics);
          setRecommendations(recs || []);
        } else if (activeTab === 'keywords') {
          const opps = await fetchKeywordOptimization(metrics);
          setOpportunities(opps || []);
        } else if (activeTab === 'strategy') {
          const strat = await fetchSEOStrategy(metrics);
          setStrategy(strat);
        }
      }
    } catch (error) {
      console.error('Error loading SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (tab: typeof activeTab) => {
    setActiveTab(tab);
    setLoading(true);
    try {
      if (tab === 'recommendations') {
        const recs = await fetchSEORecommendations(seoMetrics);
        setRecommendations(recs || []);
      } else if (tab === 'keywords') {
        const opps = await fetchKeywordOptimization(seoMetrics);
        setOpportunities(opps || []);
      } else if (tab === 'strategy') {
        const strat = await fetchSEOStrategy(seoMetrics);
        setStrategy(strat);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Medium</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Low</span>;
    }
  };

  const getOpportunityColor = (opportunity: string) => {
    switch (opportunity) {
      case 'quick_win':
        return 'bg-green-100 text-green-700';
      case 'medium_effort':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-gray-900">AI SEO Optimizer</h2>
        </div>
        <button
          onClick={loadSEOData}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: 'recommendations', label: 'AI Recommendations', icon: Target },
          { id: 'keywords', label: 'Keyword Opportunities', icon: TrendingUp },
          { id: 'strategy', label: '90-Day Strategy', icon: Zap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as typeof activeTab)}
            className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <RefreshCw className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      ) : activeTab === 'recommendations' ? (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">Loading AI recommendations...</p>
            </div>
          ) : (
            recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`border rounded-lg overflow-hidden transition ${getPriorityColor(rec.priority)}`}
              >
                <button
                  onClick={() => setExpandedRec(expandedRec === `rec-${idx}` ? null : `rec-${idx}`)}
                  className="w-full p-4 flex items-start justify-between hover:opacity-80"
                >
                  <div className="flex items-start gap-3 text-left">
                    <div className="mt-1">
                      {rec.type === 'keyword' && <Target className="w-5 h-5 text-blue-600" />}
                      {rec.type === 'content' && <TrendingUp className="w-5 h-5 text-green-600" />}
                      {rec.type === 'meta' && <AlertCircle className="w-5 h-5 text-orange-600" />}
                      {rec.type === 'technical' && <Zap className="w-5 h-5 text-purple-600" />}
                      {rec.type === 'strategy' && <Lightbulb className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                        {getPriorityBadge(rec.priority)}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{rec.description}</p>
                    </div>
                  </div>
                  {expandedRec === `rec-${idx}` ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 ml-2 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 ml-2 flex-shrink-0" />
                  )}
                </button>

                {expandedRec === `rec-${idx}` && (
                  <div className="px-4 pb-4 border-t border-gray-300 bg-white">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Action Items:</h4>
                        <p className="text-sm text-gray-700">{rec.action}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Expected Impact:</h4>
                        <p className="text-sm text-gray-700">{rec.impact}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'keywords' ? (
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">Loading keyword opportunities...</p>
            </div>
          ) : (
            opportunities.map((opp, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">"{opp.keyword}"</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Currently at <span className="font-semibold">position {opp.currentPosition}</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getOpportunityColor(opp.opportunity)}`}>
                    {opp.opportunity === 'quick_win' ? '⚡ Quick Win' : opp.opportunity === 'medium_effort' ? '📈 Medium Effort' : '🎯 Long Term'}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-1">Strategy:</p>
                    <p className="text-sm text-gray-700">{opp.suggestion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-1">Expected Improvement:</p>
                    <p className="text-sm text-gray-700 text-green-700 font-medium">{opp.expectedImprovement}</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    {opp.action}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'strategy' ? (
        <div className="space-y-6">
          {!strategy ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">Loading 90-day SEO strategy...</p>
            </div>
          ) : (
            <>
              {/* Quick Wins */}
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Wins (Implement Now)
                </h3>
                <ul className="space-y-2">
                  {strategy.quickWins.map((win, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                      <span className="font-bold text-green-600 mt-1">•</span>
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3 Phases */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { phase: 'Phase 1 (Days 1-30)', content: strategy.phase1, color: 'border-blue-200 bg-blue-50' },
                  { phase: 'Phase 2 (Days 31-60)', content: strategy.phase2, color: 'border-purple-200 bg-purple-50' },
                  { phase: 'Phase 3 (Days 61-90)', content: strategy.phase3, color: 'border-pink-200 bg-pink-50' },
                ].map((item, idx) => (
                  <div key={idx} className={`border rounded-lg p-4 ${item.color}`}>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.phase}</h4>
                    <p className="text-sm text-gray-700">{item.content}</p>
                  </div>
                ))}
              </div>

              {/* Monthly Goals */}
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Monthly Goals
                </h3>
                <div className="space-y-2">
                  {strategy.monthlyGoals.map((goal, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded border border-orange-100">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-orange-900">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SEOImprovementTools;
