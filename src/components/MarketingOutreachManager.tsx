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
  getAllOutreachEmails,
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
  const [allOutreach, setAllOutreach] = useState<(MarketingOutreach & { prospect?: MarketingProspect })[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<MarketingProspect | null>(null);
  const [prospectOutreach, setProspectOutreach] = useState<MarketingOutreach[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProspectId, setSendingProspectId] = useState<string | null>(null);
  
  // Bulk email state
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  
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

      const [prospectsData, templatesData, analyticsData, outreachData] = await Promise.all([
        getMarketingProspects(filters),
        getMarketingTemplates(),
        getMarketingAnalytics(30),
        getAllOutreachEmails()
      ]);

      setProspects(prospectsData);
      setTemplates(templatesData);
      setAnalytics(analyticsData);
      setAllOutreach(outreachData);
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

  const handleBulkSend = async () => {
    if (selectedProspectIds.size === 0 || templates.length === 0) {
      alert('❌ Please select prospects and ensure templates are loaded');
      return;
    }

    const confirmed = confirm(`📧 Send AI-generated emails to ${selectedProspectIds.size} prospects?\n\nEmails will be sent one by one with 2-second delays.`);
    if (!confirmed) return;

    setIsBulkSending(true);
    const selectedProspects = prospects.filter(p => selectedProspectIds.has(p.id));
    const template = templates[0]; // Use first template
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedProspects.length; i++) {
      const prospect = selectedProspects[i];
      setBulkProgress({ current: i + 1, total: selectedProspects.length });
      setSendingProspectId(prospect.id);

      try {
        const result = await generateOutreachEmail(
          {
            id: prospect.id,
            name: prospect.name,
            email: prospect.email,
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
          user.id,
          true // Always send immediately in bulk mode
        );

        if (result?.emailSent) {
          successCount++;
          await createOutreachEmail({
            prospect_id: prospect.id,
            template_id: template.id,
            subject: result.subject,
            body: result.body,
            status: 'sent',
            sent_at: new Date().toISOString(),
            personalization_data: {
              template_id: template.id,
              generated_at: new Date().toISOString(),
              email_id: result.emailId || null
            }
          });
        } else {
          failCount++;
        }
      } catch (error) {
        logger.error(`Bulk send failed for ${prospect.name}:`, error);
        failCount++;
      }

      // Wait 2 seconds between sends (rate limiting)
      if (i < selectedProspects.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsBulkSending(false);
    setBulkProgress(null);
    setSendingProspectId(null);
    setSelectedProspectIds(new Set());
    await loadData();

    alert(`✅ Bulk send complete!\n\n• Sent: ${successCount}\n• Failed: ${failCount}`);
  };

  const handleGenerateEmail = async (prospect: MarketingProspect, template: MarketingTemplate, sendImmediately: boolean = false) => {
    // Set loading states FIRST, before any other operations
    if (sendImmediately) {
      setIsSending(true);
      setSendingProspectId(prospect.id);
    } else {
      setIsGenerating(true);
    }
    setSelectedProspect(prospect);
    setSelectedTemplate(template);
    
    try {
      const result = await generateOutreachEmail(
        {
          id: prospect.id,
          name: prospect.name,
          email: prospect.email,
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
        user.id,
        sendImmediately
      );

      if (result) {
        setGeneratedEmail(result);
        
        // Save as draft or sent
        await createOutreachEmail({
          prospect_id: prospect.id,
          campaign_name: `${selectedCountry} Outreach - ${new Date().toLocaleDateString()}`,
          subject: result.subject,
          body: result.body,
          language: prospect.language,
          status: result.emailSent ? 'sent' : 'draft',
          sent_at: result.emailSent ? new Date().toISOString() : null,
          ai_generated: true,
          personalization_data: {
            template_id: template.id,
            generated_at: new Date().toISOString(),
            email_id: result.emailId || null
          }
        });

        if (result.emailSent) {
          alert(`✅ Email generated and sent to ${prospect.email}!`);
        } else {
          alert('✅ Email generated and saved as draft!');
        }
      } else {
        alert('❌ Failed to generate email. AI service may be unavailable. Check console for details.');
      }
    } catch (error) {
      logger.error('Error generating email:', error);
      alert('❌ Error generating email');
    } finally {
      setIsGenerating(false);
      setIsSending(false);
      setSendingProspectId(null);
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

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
    'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Honduras', 'Hungary',
    'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
    'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
    'Oman',
    'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
    'Qatar',
    'Romania', 'Russia', 'Rwanda',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
    'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
    'Yemen',
    'Zambia', 'Zimbabwe'
  ];
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
              <Users className="w-4 h-4 text-indigo-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Prospects</p>
            </div>
            <p className="text-3xl font-black text-white">{analytics.totalProspects || prospects.length || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Sent</p>
            </div>
            <p className="text-3xl font-black text-white">{analytics.emailStats?.sent || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Open Rate</p>
            </div>
            <p className="text-3xl font-black text-emerald-400">{analytics.openRate}%</p>
            <p className="text-xs text-emerald-300 mt-1">{analytics.emailStats?.opened || 0} opened</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Reply Rate</p>
            </div>
            <p className="text-3xl font-black text-purple-400">{analytics.replyRate}%</p>
            <p className="text-xs text-purple-300 mt-1">{analytics.emailStats?.replied || 0} replied</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <p className="text-xs font-black text-slate-500 uppercase">Conv. Rate</p>
            </div>
            <p className="text-3xl font-black text-orange-400">{analytics.conversionRate}%</p>
            <p className="text-xs text-orange-300 mt-1">{analytics.conversionFunnel?.converted || 0} converted</p>
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

            {/* Bulk Send Controls */}
            {selectedProspectIds.size > 0 && (
              <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <span className="text-sm font-bold text-white">
                        {selectedProspectIds.size} prospects selected
                      </span>
                    </div>
                    {bulkProgress && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span className="text-sm text-slate-400">
                          Sending {bulkProgress.current}/{bulkProgress.total}...
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Select all from specific country
                        const currentCountry = countryFilter !== 'all' ? countryFilter : null;
                        if (currentCountry) {
                          const countryProspects = prospects
                            .filter(p => p.country === currentCountry)
                            .map(p => p.id);
                          setSelectedProspectIds(new Set(countryProspects));
                        }
                      }}
                      disabled={isBulkSending || countryFilter === 'all'}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-all"
                    >
                      Select {countryFilter !== 'all' ? countryFilter : 'Country'}
                    </button>
                    <button
                      onClick={() => setSelectedProspectIds(new Set())}
                      disabled={isBulkSending}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-all"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleBulkSend}
                      disabled={isBulkSending || templates.length === 0}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-bold text-white transition-all flex items-center gap-2"
                    >
                      {isBulkSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send to {selectedProspectIds.size}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
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
                    <tr className="border-b border-slate-800">                      <th className="text-center py-4 px-4 text-xs font-black text-slate-500 uppercase w-12">
                        <input
                          type="checkbox"
                          checked={prospects.length > 0 && selectedProspectIds.size === prospects.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProspectIds(new Set(prospects.map(p => p.id)));
                            } else {
                              setSelectedProspectIds(new Set());
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        />
                      </th>                      <th className="text-left py-4 px-4 text-xs font-black text-slate-500 uppercase">Company</th>
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
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProspectIds.has(prospect.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedProspectIds);
                              if (e.target.checked) {
                                newSet.add(prospect.id);
                              } else {
                                newSet.delete(prospect.id);
                              }
                              setSelectedProspectIds(newSet);
                            }}
                            disabled={isBulkSending}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-2 focus:ring-indigo-500 disabled:opacity-30"
                          />
                        </td>
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
                              <>
                                <button
                                  onClick={() => handleGenerateEmail(prospect, templates[0], false)}
                                  disabled={isGenerating || (isSending && sendingProspectId === prospect.id)}
                                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white transition-all"
                                  title="Generate AI email (draft)"
                                >
                                  {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleGenerateEmail(prospect, templates[0], true)}
                                  disabled={isGenerating || isSending}
                                  className="p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white transition-all relative"
                                  title="Generate & Send email immediately"
                                >
                                  {isSending && sendingProspectId === prospect.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </button>
                              </>
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

      {/* Email Campaigns Tab */}
      {activeTab === 'outreach' && (
        <div className="space-y-6">
          {/* Real-time Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-green-400" />
                <p className="text-xs font-black text-slate-500 uppercase">Sent</p>
              </div>
              <p className="text-3xl font-black text-white">
                {allOutreach.filter(e => ['sent', 'delivered', 'opened', 'clicked', 'replied'].includes(e.status)).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-black text-slate-500 uppercase">Opened</p>
              </div>
              <p className="text-3xl font-black text-blue-400">
                {allOutreach.filter(e => e.opened_at).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-black text-slate-500 uppercase">Clicked</p>
              </div>
              <p className="text-3xl font-black text-purple-400">
                {allOutreach.filter(e => (e.personalization_data as any)?.clicked_at).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-black text-slate-500 uppercase">Replied</p>
              </div>
              <p className="text-3xl font-black text-emerald-400">
                {allOutreach.filter(e => e.replied_at).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-black text-slate-500 uppercase">Bounced</p>
              </div>
              <p className="text-3xl font-black text-red-400">
                {allOutreach.filter(e => e.status === 'bounced').length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black tracking-tighter">Email Campaigns</h3>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    const filtered = e.target.value === 'all' 
                      ? allOutreach 
                      : allOutreach.filter(o => o.status === e.target.value);
                    setAllOutreach(filtered);
                  }}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="draft">Draft</option>
                  <option value="delivered">Delivered</option>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="replied">Replied</option>
                  <option value="bounced">Bounced</option>
                </select>
                <button
                  onClick={loadData}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {allOutreach.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium">No emails yet</p>
                <p className="text-sm text-slate-500 mt-2">Start sending emails from the Prospects tab</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allOutreach.map((email) => {
                  const webhookEvents = (email.personalization_data as any)?.webhook_events || [];
                  const clickedAt = (email.personalization_data as any)?.clicked_at;
                  
                  return (
                    <div key={email.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-black text-white">{email.subject}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              email.status === 'sent' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              email.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              email.status === 'opened' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              email.status === 'clicked' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              email.status === 'replied' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                              email.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              email.status === 'bounced' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}>
                              {email.status.toUpperCase()}
                            </span>
                            {email.ai_generated && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI
                              </span>
                            )}
                          </div>
                          {email.prospect && (
                            <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {email.prospect.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {email.prospect.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="w-4 h-4" />
                                {email.prospect.country}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-slate-500 space-y-1">
                          {email.sent_at && (
                            <div className="flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span>Sent {new Date(email.sent_at).toLocaleString()}</span>
                            </div>
                          )}
                          {email.opened_at && (
                            <div className="flex items-center gap-1 justify-end">
                              <Eye className="w-4 h-4 text-blue-400" />
                              <span>Opened {new Date(email.opened_at).toLocaleString()}</span>
                            </div>
                          )}
                          {clickedAt && (
                            <div className="flex items-center gap-1 justify-end">
                              <Target className="w-4 h-4 text-purple-400" />
                              <span>Clicked {new Date(clickedAt).toLocaleString()}</span>
                            </div>
                          )}
                          {!email.sent_at && (
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-4 h-4 text-yellow-400" />
                              <span>Created {new Date(email.created_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/50 rounded-lg p-4 mb-3">
                        <p className="text-sm text-slate-300 line-clamp-3">{email.body}</p>
                      </div>

                      {/* Engagement Timeline */}
                      {webhookEvents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" />
                            Engagement Timeline ({webhookEvents.length} events)
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {webhookEvents.slice(0, 5).map((event: any, idx: number) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-400">
                                {event.type?.replace('email.', '')} • {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bounce/Failure Info */}
                      {(email as any).bounce_reason && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs font-bold text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Bounce: {(email as any).bounce_reason}
                          </p>
                        </div>
                      )}
                      {(email as any).failed_reason && (
                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                          <p className="text-xs font-bold text-orange-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Failed: {(email as any).failed_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && analytics.emailStats && analytics.conversionFunnel && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-3xl font-black text-white">{analytics?.totalProspects || 0}</p>
              <p className="text-xs text-white/80 font-medium">Prospects</p>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Send className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-3xl font-black text-white">{analytics.emailStats?.sent || 0}</p>
              <p className="text-xs text-white/80 font-medium">Sent</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-3xl font-black text-white">{analytics?.openRate || '0.0'}%</p>
              <p className="text-xs text-white/80 font-medium">Open Rate</p>
              <p className="text-xs text-white/60 mt-1">{analytics.emailStats?.opened || 0} opened</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-3xl font-black text-white">
                {analytics.emailStats?.sent > 0 
                  ? ((((analytics.emailStats?.clicked || 0) / analytics.emailStats.sent) * 100).toFixed(1))
                  : '0.0'}%
              </p>
              <p className="text-xs text-white/80 font-medium">Click Rate</p>
              <p className="text-xs text-white/60 mt-1">{analytics.emailStats?.clicked || 0} clicks</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-3xl font-black text-white">{analytics?.replyRate || '0.0'}%</p>
              <p className="text-xs text-white/80 font-medium">Reply Rate</p>
              <p className="text-xs text-white/60 mt-1">{analytics.emailStats?.replied || 0} replies</p>
            </div>

            <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-3xl font-black text-white">{analytics?.conversionRate || '0.0'}%</p>
              <p className="text-xs text-white/80 font-medium">Conversion</p>
              <p className="text-xs text-white/60 mt-1">{analytics.conversionFunnel?.converted || 0} converted</p>
            </div>
          </div>

          {/* Email Performance Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xl font-black tracking-tighter mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Email Performance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Send className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Sent</p>
                      <p className="text-xs text-slate-400">Successfully delivered</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">{analytics.emailStats?.sent || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Opened</p>
                      <p className="text-xs text-slate-400">Recipients viewed email</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-blue-400">{analytics.emailStats?.opened || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Clicked</p>
                      <p className="text-xs text-slate-400">Links clicked</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-purple-400">{analytics.emailStats?.clicked || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Replied</p>
                      <p className="text-xs text-slate-400">Got responses</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{analytics.emailStats?.replied || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Bounced</p>
                      <p className="text-xs text-slate-400">Failed delivery</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-red-400">{analytics.emailStats?.bounced || 0}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Draft</p>
                      <p className="text-xs text-slate-400">Not yet sent</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-yellow-400">{analytics.emailStats?.draft || 0}</p>
                </div>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xl font-black tracking-tighter mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                Conversion Funnel
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'New', count: analytics?.conversionFunnel?.new || 0, color: 'bg-blue-500' },
                  { label: 'Contacted', count: analytics?.conversionFunnel?.contacted || 0, color: 'bg-yellow-500' },
                  { label: 'Responded', count: analytics?.conversionFunnel?.responded || 0, color: 'bg-purple-500' },
                  { label: 'Interested', count: analytics?.conversionFunnel?.interested || 0, color: 'bg-emerald-500' },
                  { label: 'Converted', count: analytics?.conversionFunnel?.converted || 0, color: 'bg-green-600' },
                  { label: 'Not Interested', count: analytics?.conversionFunnel?.not_interested || 0, color: 'bg-orange-500' },
                ].map((stage) => {
                  const percentage = (analytics?.totalProspects || 0) > 0 
                    ? ((stage.count / (analytics?.totalProspects || 1)) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{stage.label}</span>
                        <span className="text-sm text-slate-400">{stage.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full ${stage.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                );
              })}
            </div>
          </div>
        </div>

          {/* Countries & Email Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Country */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xl font-black tracking-tighter mb-6">Prospects by Country</h3>
              <div className="space-y-3">
                {analytics?.byCountry && Object.entries(analytics.byCountry)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold text-white">{country}</span>
                      </div>
                      <span className="text-sm text-slate-400">{count as number}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Email Statistics */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xl font-black tracking-tighter mb-6">Email Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-sm font-bold text-slate-400">Total Emails</span>
                  <span className="text-lg font-black text-white">{analytics.emailStats?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-sm font-bold text-slate-400">Sent</span>
                  <span className="text-lg font-black text-green-400">{analytics.emailStats?.sent || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-sm font-bold text-slate-400">Opened</span>
                  <span className="text-lg font-black text-blue-400">{analytics.emailStats?.opened || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-sm font-bold text-slate-400">Replied</span>
                  <span className="text-lg font-black text-purple-400">{analytics.emailStats?.replied || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-sm font-bold text-slate-400">Drafts</span>
                  <span className="text-lg font-black text-yellow-400">{analytics.emailStats?.draft || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-sm font-bold text-slate-400">Bounced</span>
                  <span className="text-lg font-black text-red-400">{analytics.emailStats?.bounced || 0}</span>
                </div>
              </div>
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
