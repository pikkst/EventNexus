import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Zap, RefreshCw, Loader2, Award, Target } from 'lucide-react';
import {
  identifyUnderperformingCampaigns,
  getTopPerformingElements,
  generateCampaignInsights,
  getCampaignInsights,
  storeCampaignInsight,
  markInsightActed,
  createABTest,
  getABTests,
  generateABTestVariants,
  evaluateABTest,
  getCampaignLearningSummary,
  autoGenerateInsights,
  UnderperformingCampaign,
  PerformingElement,
  CampaignInsight,
  ABTest
} from '../services/campaignLearningService';

interface Props {
  campaignId?: string;
}

const CampaignLearning: React.FC<Props> = ({ campaignId }) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'patterns' | 'abtests'>('insights');
  
  // Insights State
  const [underperforming, setUnderperforming] = useState<UnderperformingCampaign[]>([]);
  const [insights, setInsights] = useState<CampaignInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  // Patterns State
  const [topPlatforms, setTopPlatforms] = useState<PerformingElement[]>([]);
  const [topAudiences, setTopAudiences] = useState<PerformingElement[]>([]);
  const [learningSummary, setLearningSummary] = useState<any[]>([]);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  
  // A/B Tests State
  const [abTests, setABTests] = useState<ABTest[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<'headline' | 'cta' | 'copy'>('headline');

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    await Promise.all([
      loadInsights(),
      loadPatterns(),
      loadABTests()
    ]);
  };

  const loadInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const [underperf, campaignInsights] = await Promise.all([
        identifyUnderperformingCampaigns(),
        campaignId ? getCampaignInsights(campaignId) : Promise.resolve([])
      ]);
      setUnderperforming(underperf);
      setInsights(campaignInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const loadPatterns = async () => {
    setIsLoadingPatterns(true);
    try {
      const [platforms, audiences, summary] = await Promise.all([
        getTopPerformingElements('platform', 5),
        getTopPerformingElements('audience', 5),
        getCampaignLearningSummary()
      ]);
      setTopPlatforms(platforms);
      setTopAudiences(audiences);
      setLearningSummary(summary);
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  const loadABTests = async () => {
    if (!campaignId) return;
    
    setIsLoadingTests(true);
    try {
      const tests = await getABTests(campaignId);
      setABTests(tests);
    } catch (error) {
      console.error('Error loading A/B tests:', error);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const handleAutoGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const count = await autoGenerateInsights();
      alert(`✅ Generated ${count} insights for underperforming campaigns`);
      await loadInsights();
    } catch (error) {
      alert('❌ Failed to generate insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleMarkActed = async (insightId: string, action: string) => {
    const success = await markInsightActed(insightId, action);
    if (success) {
      alert('✅ Insight marked as acted upon');
      await loadInsights();
    } else {
      alert('❌ Failed to mark insight');
    }
  };

  const handleCreateABTest = async (campaignId: string, testType: string) => {
    setIsCreatingTest(true);
    try {
      // Get campaign data (simplified - would need real data)
      const originalContent = prompt(`Enter original ${testType} to test:`);
      if (!originalContent) return;

      const variants = await generateABTestVariants(testType as any, originalContent);
      
      const testId = await createABTest(
        campaignId,
        testType as any,
        { content: variants.variant_a },
        { content: variants.variant_b }
      );

      if (testId) {
        alert(`✅ A/B test created!\n\nVariant A: ${variants.variant_a}\nVariant B: ${variants.variant_b}\n\nRationale: ${variants.rationale}`);
        await loadABTests();
      } else {
        alert('❌ Failed to create A/B test');
      }
    } catch (error) {
      alert('❌ Error creating A/B test');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleEvaluateTest = async (testId: string) => {
    const success = await evaluateABTest(testId);
    if (success) {
      alert('✅ A/B test evaluated');
      await loadABTests();
    } else {
      alert('❌ Failed to evaluate test');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'success': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'success': return <CheckCircle2 size={16} />;
      default: return <Lightbulb size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Brain className="text-orange-500" />
            AI Campaign Learning
          </h3>
          <p className="text-slate-400 text-sm">Pattern recognition, insights, and optimization</p>
        </div>
        <button
          onClick={handleAutoGenerateInsights}
          disabled={isGeneratingInsights}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
        >
          {isGeneratingInsights ? (
            <><Loader2 size={16} className="animate-spin" /> Generating...</>
          ) : (
            <><Zap size={16} /> Auto-Generate Insights</>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'insights'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lightbulb size={16} className="inline mr-2" />
          Insights ({underperforming.length + insights.length})
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'patterns'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Patterns
        </button>
        <button
          onClick={() => setActiveTab('abtests')}
          className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'abtests'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Target size={16} className="inline mr-2" />
          A/B Tests ({abTests.length})
        </button>
      </div>

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {isLoadingInsights ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin mx-auto text-slate-600" />
            </div>
          ) : (
            <>
              {/* Underperforming Campaigns */}
              {underperforming.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-lg font-black text-white flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={20} />
                    Needs Attention ({underperforming.length})
                  </h4>
                  {underperforming.map((campaign) => (
                    <div
                      key={campaign.campaign_id}
                      className={`border rounded-2xl p-4 ${getSeverityColor(campaign.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-bold text-white mb-1">{campaign.campaign_title}</h5>
                          <p className="text-xs opacity-75 uppercase font-black">
                            {campaign.issue_type.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-black/20 uppercase">
                          {campaign.severity}
                        </span>
                      </div>
                      <p className="text-sm mb-3">{campaign.recommendation}</p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="opacity-60">CTR</p>
                          <p className="font-bold">{campaign.current_ctr.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="opacity-60">ROI</p>
                          <p className="font-bold">{campaign.current_roi.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="opacity-60">Spend</p>
                          <p className="font-bold">€{campaign.total_spend.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Campaign-Specific Insights */}
              {insights.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-lg font-black text-white">Campaign Insights</h4>
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`border rounded-2xl p-4 ${getSeverityColor(insight.severity)}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {getSeverityIcon(insight.severity)}
                        <div className="flex-1">
                          <h5 className="font-bold text-white mb-1">{insight.title}</h5>
                          <p className="text-sm mb-2">{insight.description}</p>
                          {insight.ai_recommendation && (
                            <div className="bg-black/20 rounded-xl p-3 mt-2">
                              <p className="text-xs font-bold mb-1">🤖 AI Recommendation:</p>
                              <p className="text-sm">{insight.ai_recommendation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {!insight.is_acted_upon && (
                        <button
                          onClick={() => handleMarkActed(insight.id, insight.suggested_action)}
                          className="w-full py-2 bg-black/20 hover:bg-black/30 rounded-xl text-sm font-bold transition-all"
                        >
                          ✅ Mark as Acted Upon
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {underperforming.length === 0 && insights.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
                  <h4 className="text-xl font-black text-white mb-2">All Campaigns Performing Well!</h4>
                  <p className="text-slate-400">No critical issues detected. Keep up the great work!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          {/* Top Platforms */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Award className="text-orange-500" />
              Top Performing Platforms
            </h4>
            <div className="space-y-3">
              {topPlatforms.map((platform, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-orange-500">#{idx + 1}</span>
                    <div>
                      <p className="font-bold text-white capitalize">{platform.element_value}</p>
                      <p className="text-xs text-slate-400">{platform.campaign_count} campaigns</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{platform.avg_ctr.toFixed(2)}% CTR</p>
                    <p className="text-xs text-slate-400">{platform.total_impressions.toLocaleString()} views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Audiences */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Target className="text-orange-500" />
              Top Performing Audiences
            </h4>
            <div className="space-y-3">
              {topAudiences.map((audience, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-orange-500">#{idx + 1}</span>
                    <div>
                      <p className="font-bold text-white capitalize">{audience.element_value.replace('-', ' ')}</p>
                      <p className="text-xs text-slate-400">{audience.campaign_count} campaigns</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{audience.avg_ctr.toFixed(2)}% CTR</p>
                    <p className="text-xs text-slate-400">{audience.total_conversions.toLocaleString()} conversions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'abtests' && (
        <div className="space-y-4">
          {campaignId && (
            <button
              onClick={() => handleCreateABTest(campaignId, selectedTestType)}
              disabled={isCreatingTest}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              {isCreatingTest ? (
                <><Loader2 size={16} className="animate-spin" /> Creating Test...</>
              ) : (
                <><Zap size={16} /> Create New A/B Test</>
              )}
            </button>
          )}

          {isLoadingTests ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin mx-auto text-slate-600" />
            </div>
          ) : abTests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
              <Target size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No A/B tests yet. Create one to optimize your campaigns!</p>
            </div>
          ) : (
            abTests.map((test) => (
              <div key={test.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-bold text-white">{test.test_name}</h5>
                  <span className={`text-xs font-black px-3 py-1 rounded-full uppercase ${
                    test.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    test.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {test.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-2">Variant A</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-slate-500">Impressions:</span> <span className="text-white font-bold">{test.variant_a_impressions}</span></p>
                      <p><span className="text-slate-500">Clicks:</span> <span className="text-white font-bold">{test.variant_a_clicks}</span></p>
                      <p><span className="text-slate-500">Conversions:</span> <span className="text-white font-bold">{test.variant_a_conversions}</span></p>
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-2">Variant B</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-slate-500">Impressions:</span> <span className="text-white font-bold">{test.variant_b_impressions}</span></p>
                      <p><span className="text-slate-500">Clicks:</span> <span className="text-white font-bold">{test.variant_b_clicks}</span></p>
                      <p><span className="text-slate-500">Conversions:</span> <span className="text-white font-bold">{test.variant_b_conversions}</span></p>
                    </div>
                  </div>
                </div>

                {test.winner && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-3">
                    <p className="text-sm font-bold text-emerald-400 mb-1">
                      🏆 Winner: Variant {test.winner.toUpperCase()}
                    </p>
                    <p className="text-xs text-emerald-300">
                      {test.improvement_percentage?.toFixed(1)}% improvement • {test.confidence_level?.toFixed(0)}% confidence
                    </p>
                    {test.ai_recommendation && (
                      <p className="text-xs text-slate-300 mt-2">{test.ai_recommendation}</p>
                    )}
                  </div>
                )}

                {test.status === 'running' && (
                  <button
                    onClick={() => handleEvaluateTest(test.id)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold"
                  >
                    🔍 Evaluate Results
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignLearning;
