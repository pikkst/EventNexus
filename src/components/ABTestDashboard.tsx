import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, CheckCircle, AlertCircle, Pause, Play, Archive } from 'lucide-react';
import {
  getActiveABTests,
  getABTest,
  getABTestResults,
  updateABTestStatus,
  exportABTestMetrics
} from '@/utils/abTestingService';

interface ABTestDashboardProps {
  onClose?: () => void;
}

const ABTestDashboard: React.FC<ABTestDashboardProps> = ({ onClose }) => {
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
    const interval = setInterval(loadTests, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTests = () => {
    try {
      const tests = getActiveABTests();
      setActiveTests(tests);
      
      if (selectedTestId && tests.find(t => t.id === selectedTestId)) {
        const test = getABTest(selectedTestId);
        if (test) {
          const testResults = getABTestResults(selectedTestId, test.controlVariant);
          setResults(testResults);
        }
      }
    } catch (error) {
      console.error('Error loading AB tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    const test = getABTest(testId);
    if (test) {
      const testResults = getABTestResults(testId, test.controlVariant);
      setResults(testResults);
    }
  };

  const handleToggleTest = (testId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updateABTestStatus(testId, newStatus as any);
    loadTests();
  };

  const handleCompleteTest = (testId: string) => {
    updateABTestStatus(testId, 'completed');
    loadTests();
    if (selectedTestId === testId) {
      setSelectedTestId(null);
    }
  };

  const handleExport = () => {
    const metrics = exportABTestMetrics();
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ab-test-metrics-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedTest = selectedTestId ? getABTest(selectedTestId) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            <h2 className="text-2xl font-bold">A/B Testing Dashboard</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
            >
              Export Data
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tests List */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Active Tests</h3>
            {loading ? (
              <div className="text-slate-400 text-sm">Loading...</div>
            ) : activeTests.length === 0 ? (
              <div className="text-slate-400 text-sm p-4 bg-slate-800/50 rounded-lg">
                No active tests. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {activeTests.map(test => (
                  <div
                    key={test.id}
                    onClick={() => handleSelectTest(test.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedTestId === test.id
                        ? 'bg-indigo-600/20 border border-indigo-500'
                        : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-sm">{test.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Status: <span className="text-indigo-400">{test.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {selectedTest && results.length > 0 ? (
              <div className="space-y-6">
                {/* Test Info */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="font-semibold mb-2">{selectedTest.name}</h4>
                  <p className="text-sm text-slate-400 mb-3">{selectedTest.description}</p>
                  <p className="text-xs text-slate-500 mb-4">
                    <strong>Hypothesis:</strong> {selectedTest.hypothesis}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleToggleTest(selectedTest.id, selectedTest.status)}
                      className={`px-3 py-1 rounded text-sm font-semibold flex items-center gap-2 transition-colors ${
                        selectedTest.status === 'active'
                          ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                          : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30'
                      }`}
                    >
                      {selectedTest.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Resume
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCompleteTest(selectedTest.id)}
                      className="px-3 py-1 rounded text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" /> Complete
                    </button>
                  </div>
                </div>

                {/* Results Table */}
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 border-b border-slate-700">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Variant</th>
                          <th className="px-4 py-2 text-right font-semibold">Impressions</th>
                          <th className="px-4 py-2 text-right font-semibold">Clicks</th>
                          <th className="px-4 py-2 text-right font-semibold">CTR</th>
                          <th className="px-4 py-2 text-right font-semibold">Conversions</th>
                          <th className="px-4 py-2 text-right font-semibold">Conv. Rate</th>
                          <th className="px-4 py-2 text-center font-semibold">Significance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {results.map((result, idx) => {
                          const isControl = result.variantId === selectedTest.controlVariant;
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-700/50 ${
                                isControl ? 'bg-slate-700/30' : ''
                              }`}
                            >
                              <td className="px-4 py-3 font-semibold">
                                {result.variantId}
                                {isControl && (
                                  <span className="ml-2 text-xs bg-indigo-600/30 text-indigo-400 px-2 py-0.5 rounded">
                                    Control
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">{result.impressions.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">{result.clicks.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">{result.ctr.toFixed(2)}%</td>
                              <td className="px-4 py-3 text-right">{result.conversions.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-semibold text-indigo-400">
                                {result.conversionRate.toFixed(2)}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                {result.isStatisticallySignificant ? (
                                  <div className="flex items-center justify-center gap-1 text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs">{result.confidence}%</span>
                                  </div>
                                ) : result.confidence > 0 ? (
                                  <div className="flex items-center justify-center gap-1 text-amber-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs">{result.confidence}%</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500">Collecting...</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Insights */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <h5 className="font-semibold">Quick Insights</h5>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    {results.length >= 2 && (
                      <>
                        <p>
                          • Variant with highest conversion rate:{' '}
                          <strong>
                            {results.reduce((best, curr) =>
                              curr.conversionRate > best.conversionRate ? curr : best
                            ).variantId}
                          </strong>{' '}
                          ({results.reduce((best, curr) =>
                            curr.conversionRate > best.conversionRate ? curr : best
                          ).conversionRate.toFixed(2)}%)
                        </p>
                        <p>
                          • Total impressions: <strong>{results.reduce((sum, r) => sum + r.impressions, 0).toLocaleString()}</strong>
                        </p>
                        <p>
                          • Overall conversion rate: <strong>
                            {(results.reduce((sum, r) => sum + r.conversions, 0) / 
                              results.reduce((sum, r) => sum + r.impressions, 0) * 100).toFixed(2)}%
                          </strong>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="mb-2">Select a test to view detailed results</p>
                <p className="text-sm">Results will update as users interact with the variants</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ABTestDashboard;
