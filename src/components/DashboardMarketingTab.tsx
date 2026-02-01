import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  CloudUpload,
  Download,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Link2,
  Loader2,
  Lock,
  Megaphone,
  Settings2,
  Share2,
  Sparkles,
  Twitter,
  Zap
} from 'lucide-react';
import { EventNexusEvent, User } from '../types';

interface DashboardMarketingTabProps {
  user: User;
  events: EventNexusEvent[];
  selectedEventId: string | null;
  setSelectedEventId: (value: string | null) => void;
  campaignTheme: string;
  setCampaignTheme: (value: string) => void;
  campaignAudience: string;
  setCampaignAudience: (value: string) => void;
  isGeneratingAd: boolean;
  adCampaign: any[];
  handleGenerateCampaign: () => void;
  handleDeployAd: (index: number) => void;
  handleGeneratePoster: (ad: any) => void;
  isGeneratingPoster: boolean;
  handleShareAd: (ad: any) => void;
  connectedAccounts: any[];
  loadingAccounts: boolean;
}

const DashboardMarketingTab: React.FC<DashboardMarketingTabProps> = ({
  user,
  events,
  selectedEventId,
  setSelectedEventId,
  campaignTheme,
  setCampaignTheme,
  campaignAudience,
  setCampaignAudience,
  isGeneratingAd,
  adCampaign,
  handleGenerateCampaign,
  handleDeployAd,
  handleGeneratePoster,
  isGeneratingPoster,
  handleShareAd,
  connectedAccounts,
  loadingAccounts
}) => {
  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
      {/* Free Tier Gate for Marketing Studio */}
      {user.subscription_tier === 'free' ? (
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="w-32 h-32 bg-slate-900 rounded-[48px] flex items-center justify-center mx-auto border border-slate-800">
            <Megaphone size={48} className="text-indigo-400" />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-white">Marketing Studio</h2>
            <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Let AI create platform-native ad campaigns for your events. Professional marketing materials generated in seconds.
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 max-w-2xl mx-auto space-y-6">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-orange-400 shrink-0 mt-1" />
              <div className="text-left space-y-2">
                <h3 className="text-xl font-black text-white">Premium Feature</h3>
                <p className="text-slate-400 leading-relaxed">
                  Marketing Studio is available for Pro, Premium, and Enterprise organizers. Upgrade to unlock AI-powered ad generation, social media content, and targeted campaigns.
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-3 px-8 py-5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
            >
              <Zap className="w-4 h-4" /> View Pricing Plans
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Social Media Connection Banner */}
          {connectedAccounts.length === 0 && !loadingAccounts && (
            <div className="bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-pink-600/10 border border-indigo-500/30 rounded-[40px] p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-indigo-600/40">
                    <Settings2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h3 className="text-xl font-black text-white tracking-tight">Connect Your Social Media Accounts</h3>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    To deploy AI-generated ads directly to Facebook, Instagram, LinkedIn, or Twitter, you need to connect your accounts first. Once connected, you can publish ads with a single click!
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="flex-shrink-0 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Link2 size={16} />
                  Connect Now
                </Link>
              </div>
            </div>
          )}

          {/* Connected Accounts Summary */}
          {connectedAccounts.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-xl font-black text-white">Connected Accounts</h3>
                </div>
                <Link
                  to="/profile"
                  className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2"
                >
                  Manage
                  <ExternalLink size={14} />
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {connectedAccounts.map((account, i) => {
                  const platformIcons: Record<string, React.ReactNode> = {
                    facebook: <Facebook size={16} />,
                    instagram: <Instagram size={16} />,
                    linkedin: <Linkedin size={16} />,
                    twitter: <Twitter size={16} />
                  };
                  return (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-full">
                      <div className="text-indigo-400">{platformIcons[account.platform]}</div>
                      <span className="text-sm font-bold text-white capitalize">{account.platform}</span>
                      <span className="text-xs text-slate-500">• {account.account_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3"><Sparkles className="text-indigo-400" /> Marketing Studio</h3>
                  <p className="text-slate-400 font-medium text-sm leading-relaxed">Let AI create your platform-native ad campaigns with specific targeting.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Event to Promote</label>
                    <select
                      value={selectedEventId || ''}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-bold"
                    >
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Campaign Theme</label>
                    <textarea
                      value={campaignTheme}
                      onChange={(e) => setCampaignTheme(e.target.value)}
                      placeholder="Describe what you want to emphasize: VIP experience, limited tickets, early bird pricing, exclusive lineup, etc."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-medium resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Audience</label>
                    <select
                      value={campaignAudience}
                      onChange={(e) => setCampaignAudience(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-bold"
                    >
                      <option value="general">General Audience</option>
                      <option value="young-adults">Young Adults (18-30)</option>
                      <option value="professionals">Professionals (30-50)</option>
                      <option value="families">Families</option>
                      <option value="students">Students</option>
                      <option value="luxury">Luxury/VIP Seekers</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateCampaign}
                    disabled={isGeneratingAd}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    aria-label="Generate AI-powered ad campaign"
                  >
                    {isGeneratingAd ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <><Sparkles size={18} aria-hidden="true" /> Generate Ads</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              {adCampaign.length === 0 ? (
                <div className="h-full bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[48px] flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <Megaphone size={48} className="text-slate-700" />
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-500">Campaign Results</h4>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto">Generated ads will appear here with professional headlines and copy.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {adCampaign.map((ad, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden flex flex-col shadow-2xl group">
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <img src={ad.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                        <div className="absolute top-4 left-4 bg-slate-950/80 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-indigo-400 border border-slate-800">
                          {ad.platform}
                        </div>
                      </div>
                      <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-white leading-tight tracking-tighter">{ad.headline}</h4>
                          <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-3">{ad.bodyCopy}</p>
                          {ad.deployed && ad.deployedTo && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                              <CheckCircle size={14} />
                              <span>Published to {ad.deployedTo.charAt(0).toUpperCase() + ad.deployedTo.slice(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() => handleDeployAd(i)}
                            disabled={ad.deployed || ad.deploying}
                            className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                              ad.deployed ? 'bg-emerald-600 text-white cursor-not-allowed' : ad.deploying ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                            aria-label={ad.deployed ? 'Ad already published' : 'Deploy ad to social media'}
                          >
                            {ad.deploying ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : ad.deployed ? <><CheckCircle size={12} aria-hidden="true" /> Published</> : <><CloudUpload size={12} aria-hidden="true" /> Deploy Ad</>}
                          </button>
                          <button
                            onClick={() => handleGeneratePoster(ad)}
                            disabled={isGeneratingPoster}
                            className="p-4 bg-slate-950 border border-slate-800 hover:border-orange-600 rounded-xl text-slate-500 hover:text-orange-400 transition-all"
                            title="Generate printable poster with QR code"
                            aria-label="Generate printable poster with QR code"
                          >
                            {isGeneratingPoster ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
                          </button>
                          <button
                            onClick={() => handleShareAd(ad)}
                            className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"
                            title="Copy event link"
                            aria-label="Copy event link to clipboard"
                          >
                            <Share2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardMarketingTab;
