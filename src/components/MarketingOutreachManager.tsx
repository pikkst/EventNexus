import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Upload, Send, Eye, CheckCircle2, XCircle, Clock,
  TrendingUp, Users, Globe, Loader2, Sparkles, FileText,
  AlertCircle, RefreshCw, Filter, Download, MessageSquare,
  Target, BarChart3
} from 'lucide-react';
import {
  MarketingProspect,
  MarketingOutreach,
  MarketingTemplate,
  importMarketingProspects,
  getMarketingProspects,
  getMarketingTemplates,
  getProspectOutreach,
  createOutreachEmail,
  updateProspectStatus,
  getMarketingAnalytics
} from '../services/dbService';
import { generateOutreachEmail } from '../services/geminiService';
import logger from '../utils/logger';
import { User } from '../types';

interface MarketingOutreachManagerProps {
  user: User;
}

const MarketingOutreachManager: React.FC<MarketingOutreachManagerProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'prospects' | 'outreach' | 'analytics' | 'templates'>('prospects');
  const [prospects, setProspects] = useState<MarketingProspect[]>([]);
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<MarketingProspect | null>(null);
  const [prospectOutreach, setProspectOutreach] = useState<MarketingOutreach[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('Estonia');
  
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, countryFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (countryFilter !== 'all') filters.country = countryFilter;

      const [prospectsData, templatesData, analyticsData] = await Promise.all([
        getMarketingProspects(filters),
        getMarketingTemplates(),
        getMarketingAnalytics(30)
      ]);

      setProspects(prospectsData);
      setTemplates(templatesData);
      setAnalytics(analyticsData);
    } catch (error) {
      logger.error('Error loading marketing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('❌ Please select a CSV file');
      return;
    }

    setIsImporting(true);
    try {
      const content = await file.text();
      const results = await importMarketingProspects(content, selectedCountry);

      let message = `✅ Import completed for ${selectedCountry}!\n\n`;
      message += `• Successfully imported: ${results.success}\n`;
      message += `• Failed: ${results.failed}\n`;
      
      if (results.errors.length > 0) {
        message += `\n⚠️ Errors:\n`;
        message += results.errors.slice(0, 5).join('\n');
        if (results.errors.length > 5) {
          message += `\n... and ${results.errors.length - 5} more errors`;
        }
      }

      alert(message);
      await loadData();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      logger.error('Error importing CSV:', error);
      alert('❌ Failed to import CSV file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateEmail = async (prospect: MarketingProspect, template: MarketingTemplate) => {
    setIsGenerating(true);
    setSelectedProspect(prospect);
    setSelectedTemplate(template);
    
    try {
      const result = await generateOutreachEmail(
        {
          name: prospect.name,
          category: prospect.category,
          description: prospect.description || undefined,
          website: prospect.website || undefined
        },
        {
          subject_template: template.subject_template,
          body_template: template.body_template,
          ai_prompt: template.ai_prompt || undefined
        },
        prospect.language,
        user.id
      );

      if (result) {
        setGeneratedEmail(result);
        
        // Save as draft
        await createOutreachEmail({
          prospect_id: prospect.id,
          campaign_name: `${selectedCountry} Outreach - ${new Date().toLocaleDateString()}`,
          subject: result.subject,
          body: result.body,
          language: prospect.language,
          ai_generated: true,
          personalization_data: {
            template_id: template.id,
            generated_at: new Date().toISOString()
          }
        });

        alert('✅ Email generated and saved as draft!');
      } else {
        alert('❌ Failed to generate email. AI service may be unavailable. Check console for details.');
      }
    } catch (error) {
      logger.error('Error generating email:', error);
      alert('❌ Error generating email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewOutreach = async (prospect: MarketingProspect) => {
    setSelectedProspect(prospect);
    const history = await getProspectOutreach(prospect.id);
    setProspectOutreach(history);
  };

  const handleUpdateStatus = async (prospectId: string, status: MarketingProspect['status']) => {
    await updateProspectStatus(prospectId, status);
    await loadData();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'contacted': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      'responded': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'interested': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'converted': 'bg-green-600/20 text-green-400 border-green-500/40',
      'not_interested': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      'invalid': 'bg-red-500/10 text-red-400 border-red-500/30'
    };
    return colors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  const countries = ['Estonia', 'Finland', 'Latvia', 'Lithuania', 'Sweden', 'Norway', 'Denmark'];
  const statuses = ['all', 'new', 'contacted', 'responded', 'interested', 'converted', 'not_interested', 'invalid'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-2 flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-400" />
            Marketing Outreach
          </h2>
          <p className="text-sm text-slate-400">AI-powered B2B lead generation and relationship management</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Sent</p>
            </div>
            <p className="text-3xl font-black text-white">{analytics.totals.sent}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Open Rate</p>
            </div>
            <p className="text-3xl font-black text-emerald-400">{analytics.openRate}%</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Reply Rate</p>
            </div>
            <p className="text-3xl font-black text-purple-400">{analytics.replyRate}%</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Conversions</p>
            </div>
            <p className="text-3xl font-black text-green-400">{analytics.totals.conversions}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Conv. Rate</p>
            </div>
            <p className="text-3xl font-black text-orange-400">{analytics.conversionRate}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'prospects', label: 'Prospects', icon: <Users className="w-4 h-4" /> },
          { id: 'outreach', label: 'Email Campaigns', icon: <Mail className="w-4 h-4" /> },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prospects Tab */}
      {activeTab === 'prospects' && (
        <div className="space-y-6">
          {/* Import Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h3 className="text-xl font-black tracking-tighter mb-4">Import Prospects from CSV</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-400 mb-2">Select Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              CSV Format: Name, Website, Category, Email, Description, Source URL
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none"
            >
              <option value="all">All Statuses</option>
              {statuses.slice(1).map(status => (
                <option key={status} value={status}>{status.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none"
            >
              <option value="all">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Prospects List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h3 className="text-xl font-black tracking-tighter mb-6">
              Prospects ({prospects.length})
            </h3>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-4" />
                <p className="text-slate-400">Loading prospects...</p>
              </div>
            ) : prospects.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium">No prospects found</p>
                <p className="text-sm text-slate-500 mt-2">Import a CSV file to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase">Company</th>
                      <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase">Category</th>
                      <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase">Country</th>
                      <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase">Status</th>
                      <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase">Contacts</th>
                      <th className="text-right py-4 px-4 text-xs font-black text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((prospect) => (
                      <tr key={prospect.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-bold text-white">{prospect.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{prospect.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-300">
                            {prospect.category}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-400">{prospect.country}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 border rounded-full text-xs font-bold ${getStatusColor(prospect.status)}`}>
                            {prospect.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm font-bold text-slate-400">{prospect.contact_count}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewOutreach(prospect)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                              title="View outreach history"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {templates.length > 0 && (
                              <button
                                onClick={() => handleGenerateEmail(prospect, templates[0])}
                                disabled={isGenerating}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white transition-all"
                                title="Generate AI email"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Email Preview Modal */}
      {generatedEmail && selectedProspect && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  AI-Generated Email
                </h3>
                <p className="text-sm text-slate-400 mt-1">To: {selectedProspect.name}</p>
              </div>
              <button
                onClick={() => {
                  setGeneratedEmail(null);
                  setSelectedProspect(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-xl"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Subject</label>
                  <input
                    type="text"
                    value={generatedEmail.subject}
                    onChange={(e) => setGeneratedEmail({ ...generatedEmail, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Body</label>
                  <textarea
                    value={generatedEmail.body}
                    onChange={(e) => setGeneratedEmail({ ...generatedEmail, body: e.target.value })}
                    rows={15}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 resize-none font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertCircle className="w-4 h-4" />
                <span>Saved as draft - review before sending</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`);
                  alert('✅ Email copied to clipboard!');
                }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h3 className="text-xl font-black tracking-tighter mb-6">Email Templates</h3>
          <div className="grid gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-black text-white text-lg">{template.name}</h4>
                    <div className="flex gap-2 mt-2">
                      <span className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-xs font-bold text-indigo-400">
                        {template.language.toUpperCase()}
                      </span>
                      {template.category && (
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-400">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase mb-1">Subject Template</p>
                    <p className="text-sm text-slate-300 font-mono">{template.subject_template}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase mb-1">Body Preview</p>
                    <p className="text-sm text-slate-400 line-clamp-3">{template.body_template}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingOutreachManager;
