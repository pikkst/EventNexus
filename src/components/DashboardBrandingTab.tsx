import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CloudUpload, Copy, ExternalLink, Palette } from 'lucide-react';
import { User } from '../types';

interface DashboardBrandingTabProps {
  user: User;
  tempSlug: string;
  setTempSlug: (value: string) => void;
  tempBranding: any;
  setTempBranding: (value: any) => void;
  tempBio: string;
  setTempBio: (value: string) => void;
  handleUpdateService: (id: string, field: 'name' | 'desc', value: string) => void;
  handleCommitBranding: () => void;
}

const DashboardBrandingTab: React.FC<DashboardBrandingTabProps> = ({
  user,
  tempSlug,
  setTempSlug,
  tempBranding,
  setTempBranding,
  tempBio,
  setTempBio,
  handleUpdateService,
  handleCommitBranding
}) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Public URL Status - Prominent Display */}
      <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/30 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-lg font-black text-white">Your Public Page is Live! 🎉</div>
            <div className="text-xs text-slate-400 mt-1">Share this link with your audience</div>
          </div>
        </div>
        {(user.agencySlug || user.agency_slug) ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-slate-900/50 rounded-xl">
              <code className="flex-1 text-base text-purple-300 font-mono break-all">
                {window.location.origin}/agency/{user.agencySlug || user.agency_slug}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/agency/${user.agencySlug || user.agency_slug}`);
                  alert('✓ Link copied to clipboard!');
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <Link
              to={`/agency/${user.agencySlug || user.agency_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white text-sm font-bold transition-all shadow-lg hover:shadow-xl"
            >
              <ExternalLink className="w-5 h-5" />
              Open Your Public Page
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-sm text-yellow-300">⚠️ Configure your URL slug below to activate your public page</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Form: Branded Identity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-8 shadow-2xl">
            <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3"><Palette className="text-indigo-400" /> Shard Editor</h3>

            <div className="space-y-6">
              {/* URL Slug Configuration */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Public URL Slug</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">eventnexus.eu/agency/</span>
                    <input
                      type="text"
                      value={tempSlug}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                        setTempSlug(slug);
                      }}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono outline-none focus:border-indigo-500"
                      placeholder="your-agency-name"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 ml-1">Your unique URL path (letters, numbers, and dashes only)</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Primary Brand Color</label>
                <div className="flex gap-4 items-center">
                  <input type="color" value={tempBranding.primaryColor} onChange={(e) => setTempBranding({ ...tempBranding, primaryColor: e.target.value })} className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-xl" />
                  <span className="font-mono text-xs text-slate-400 font-bold uppercase">{tempBranding.primaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Landing Page Bio</label>
                <textarea
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-medium min-h-[100px]"
                  placeholder="Tell the world about your agency..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Agency Tagline</label>
                <input
                  type="text"
                  value={tempBranding.tagline}
                  onChange={(e) => setTempBranding({ ...tempBranding, tagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-bold"
                  placeholder="Experience Orchestrators"
                />
              </div>

              <div className="pt-4 space-y-6 border-t border-slate-800">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Featured Service Shards</h4>
                <div className="space-y-6">
                  {tempBranding.services?.map((service: any) => (
                    <div key={service.id} className="space-y-3 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => handleUpdateService(service.id, 'name', e.target.value)}
                        placeholder="Service Name"
                        className="w-full bg-transparent font-black text-xs uppercase tracking-widest text-white outline-none focus:text-indigo-400"
                      />
                      <textarea
                        value={service.desc}
                        onChange={(e) => handleUpdateService(service.id, 'desc', e.target.value)}
                        placeholder="Service Description"
                        className="w-full bg-transparent text-xs text-slate-500 font-medium outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Enterprise Settings */}
              <div className="pt-4 space-y-6 border-t border-slate-800">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Extended About (Public Page)</h4>
                <textarea
                  value={tempBranding.about || ''}
                  onChange={(e) => setTempBranding({ ...tempBranding, about: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-medium min-h-[120px]"
                  placeholder="Tell your story... What makes your events special? What's your mission? This will be displayed on your public landing page."
                />
                <p className="text-[10px] text-slate-500 ml-1">Rich description for public "About" section (defaults to bio if empty)</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Video Reel URL</label>
                <input
                  type="text"
                  value={tempBranding.videoReel || ''}
                  onChange={(e) => setTempBranding({ ...tempBranding, videoReel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-mono"
                  placeholder="https://example.com/video.mp4"
                />
                <p className="text-[10px] text-slate-500 ml-1">Video URL for your agency showcase</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custom Domain</label>
                <input
                  type="text"
                  value={tempBranding.customDomain || ''}
                  onChange={(e) => setTempBranding({ ...tempBranding, customDomain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-mono"
                  placeholder="events.yourbrand.com"
                />
                <p className="text-[10px] text-slate-500 ml-1">Point your own domain to your landing page</p>
              </div>

              {/* Hero Type Selection */}
              <div className="pt-4 space-y-3 border-t border-slate-800">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hero Section Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['image', 'video', 'slideshow'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTempBranding({
                        ...tempBranding,
                        pageConfig: {
                          ...tempBranding.pageConfig,
                          heroType: type as 'image' | 'video' | 'slideshow'
                        }
                      })}
                      className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        (tempBranding.pageConfig?.heroType || 'image') === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Sections Toggles */}
              <div className="pt-4 space-y-3 border-t border-slate-800">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Page Sections</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'showStats', label: 'Statistics Bar' },
                    { key: 'showEventHighlights', label: 'Event Highlights' },
                    { key: 'showTestimonials', label: 'Testimonials' },
                    { key: 'showTeam', label: 'Team Section' },
                    { key: 'showPartners', label: 'Partners Grid' },
                    { key: 'showMediaCoverage', label: 'Media Coverage' }
                  ].map(({ key, label }) => {
                    const isEnabled = tempBranding.pageConfig?.[key as keyof typeof tempBranding.pageConfig] !== false;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setTempBranding({
                            ...tempBranding,
                            pageConfig: {
                              ...tempBranding.pageConfig,
                              heroType: tempBranding.pageConfig?.heroType || 'image',
                              heroMedia: tempBranding.pageConfig?.heroMedia || '',
                              [key]: !isEnabled,
                              enableContactForm: tempBranding.pageConfig?.enableContactForm !== false,
                              enableNewsletter: tempBranding.pageConfig?.enableNewsletter !== false,
                              enableSocialSharing: tempBranding.pageConfig?.enableSocialSharing !== false,
                              enableVIPAccess: tempBranding.pageConfig?.enableVIPAccess || false,
                              customSections: tempBranding.pageConfig?.customSections || [],
                              layout: tempBranding.pageConfig?.layout || 'modern',
                              theme: tempBranding.pageConfig?.theme || 'dark'
                            }
                          });
                        }}
                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          isEnabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Features */}
              <div className="pt-4 space-y-3 border-t border-slate-800">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Interactive Features</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setTempBranding({
                      ...tempBranding,
                      pageConfig: {
                        ...tempBranding.pageConfig,
                        enableContactForm: !tempBranding.pageConfig?.enableContactForm
                      }
                    })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      tempBranding.pageConfig?.enableContactForm
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>Contact Form</span>
                    <span className="text-[10px]">Allow visitors to send direct inquiries</span>
                  </button>
                  <button
                    onClick={() => setTempBranding({
                      ...tempBranding,
                      pageConfig: {
                        ...tempBranding.pageConfig,
                        enableNewsletter: !tempBranding.pageConfig?.enableNewsletter
                      }
                    })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      tempBranding.pageConfig?.enableNewsletter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>Newsletter Signup</span>
                    <span className="text-[10px]">Inner Circle email collection</span>
                  </button>
                  <button
                    onClick={() => setTempBranding({
                      ...tempBranding,
                      pageConfig: {
                        ...tempBranding.pageConfig,
                        enableSocialSharing: !tempBranding.pageConfig?.enableSocialSharing
                      }
                    })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      tempBranding.pageConfig?.enableSocialSharing
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>Social Media Sharing</span>
                    <span className="text-[10px]">Show share buttons on public page</span>
                  </button>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="pt-4 space-y-3 border-t border-slate-800">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hero Media Upload</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple={tempBranding.pageConfig?.heroType === 'slideshow'}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      // Simple file upload placeholder - you can enhance this
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        if (tempBranding.pageConfig?.heroType === 'slideshow') {
                          setTempBranding({
                            ...tempBranding,
                            pageConfig: {
                              ...tempBranding.pageConfig,
                              heroMedia: [
                                ...(Array.isArray(tempBranding.pageConfig?.heroMedia) ? tempBranding.pageConfig.heroMedia : []),
                                dataUrl
                              ]
                            }
                          });
                        } else {
                          setTempBranding({
                            ...tempBranding,
                            pageConfig: {
                              ...tempBranding.pageConfig,
                              heroMedia: dataUrl
                            }
                          });
                        }
                      };
                      reader.readAsDataURL(files[0]);
                    }}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 ml-1">
                    Upload {tempBranding.pageConfig?.heroType === 'slideshow' ? 'multiple images' : tempBranding.pageConfig?.heroType === 'video' ? 'a video' : 'an image'} for your hero section
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCommitBranding}
              className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <CloudUpload size={18} /> Publish Agency Page
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-2xl font-black text-white tracking-tighter">Live Shard Preview</h3>
            {(user.subscription_tier === 'pro' || user.subscription_tier === 'premium' || user.subscription_tier === 'enterprise') && user.agencySlug && (
              <Link to={`/org/${user.agencySlug}`} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 hover:underline">
                Open Public Site <ExternalLink size={12} />
              </Link>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl relative min-h-[600px] pointer-events-none">
            <div className="h-56 relative overflow-hidden">
              <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${tempBranding.primaryColor}55, #0f172a)` }} />
              {tempBranding.bannerUrl && (
                <img src={tempBranding.bannerUrl} className="w-full h-full object-cover opacity-60 mix-blend-overlay" alt="" />
              )}
              <div className="absolute bottom-8 left-12">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Previewing: {user.name}</p>
                <h4 className="text-5xl font-black text-white tracking-tighter leading-none">{user.name}</h4>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-3">{tempBranding.tagline || 'Experience Orchestrators'}</p>
              </div>
            </div>

            <div className="p-12 space-y-12">
              <div className="flex items-center gap-8">
                <img src={user.avatar} className="w-24 h-24 rounded-[32px] border-4 border-slate-900 -mt-24 relative z-10 shadow-2xl" alt="" />
                <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xl italic">"{tempBio}"</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {tempBranding.services?.slice(0, 2).map((s: any) => (
                  <div key={s.id} className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-2">
                    <h5 className="font-black text-[10px] uppercase tracking-widest text-white">{s.name}</h5>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-slate-800 w-full" />

              <div className="grid grid-cols-2 gap-6">
                <div className="py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white text-center" style={{ backgroundColor: tempBranding.primaryColor }}>Follow Movement</div>
                <div className="py-5 rounded-2xl bg-slate-950 border border-slate-800 font-black text-xs uppercase tracking-widest text-slate-500 text-center">Contact Shard</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardBrandingTab;
