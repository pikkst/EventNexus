
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Zap, Shield, Globe, Map as MapIcon, ChevronRight, Star, Plus, ArrowRight, Gift, Award, TrendingUp, Quote, Newspaper, ExternalLink, Users, Calendar, Ticket, Play, Check, Mail, Send, ChevronDown, DollarSign, Sparkles } from 'lucide-react';
import { User, PlatformCampaign, SuccessStory, PressMention, PlatformMedia } from '../types';
import { getCampaigns, getTopOrganizers, OrganizerRatingStats, getSuccessStories, getPressMentions, getPlatformStats, getPlatformMedia } from '../services/dbService';
import { supabase } from '../services/supabase';
import { SUBSCRIPTION_TIERS } from '../constants';

interface LandingPageProps {
  user: User | null;
  onOpenAuth: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ user, onOpenAuth }) => {
  const navigate = useNavigate();
  const [activeBanner, setActiveBanner] = useState<PlatformCampaign | null>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [topOrganizers, setTopOrganizers] = useState<OrganizerRatingStats[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [pressMentions, setPressMentions] = useState<PressMention[]>([]);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [demoVideo, setDemoVideo] = useState<PlatformMedia | null>(null);

  useEffect(() => {
    const loadActiveCampaign = async () => {
      try {
        // Fetch all campaigns and filter for active landing page campaigns
        const allCampaigns = await getCampaigns();
        const landingPageCampaigns = allCampaigns.filter(
          c => c.status === 'Active' && (c.placement === 'landing_page' || c.placement === 'both')
        );
        
        if (landingPageCampaigns.length > 0) {
          const campaign = landingPageCampaigns[0]; // Get the first active campaign
          setActiveBanner(campaign);
          
          // Track view (only once per session)
          if (!hasTrackedView && !user) {
            await trackCampaignView(campaign.id);
            setHasTrackedView(true);
          }
        }
      } catch (error) {
        console.error('Error loading campaign:', error);
      }
    };

    loadActiveCampaign();
  }, [user, hasTrackedView]);

  useEffect(() => {
    const loadTopOrganizers = async () => {
      setLoadingOrganizers(true);
      try {
        const organizers = await getTopOrganizers(6, 'enterprise'); // Top 6 Enterprise organizers
        setTopOrganizers(organizers);
      } catch (error) {
        console.error('Error loading top organizers:', error);
      } finally {
        setLoadingOrganizers(false);
      }
    };
    loadTopOrganizers();
  }, []);

  useEffect(() => {
    const loadLandingContent = async () => {
      try {
        const [stories, mentions, stats, videos] = await Promise.all([
          getSuccessStories(3, true), // Get top 3 featured stories
          getPressMentions(6, true),   // Get top 6 featured press mentions
          getPlatformStats().catch(() => ({
            totalEvents: 150,
            totalTickets: 4500,
            totalUsers: 2800,
            totalOrganizers: 85
          })),          // Get live platform metrics with fallback
          getPlatformMedia('landing_demo', 'walkthrough_video') // Get landing demo video
        ]);
        setSuccessStories(stories);
        setPressMentions(mentions);
        setPlatformStats(stats);
        setDemoVideo(videos && videos.length > 0 ? videos[0] : null);
      } catch (error) {
        console.error('Error loading landing content:', error);
        // Set fallback stats if everything fails
        setPlatformStats({
          totalEvents: 150,
          totalTickets: 4500,
          totalUsers: 2800,
          totalOrganizers: 85
        });
      }
    };
    loadLandingContent();
  }, []);

  const trackCampaignView = async (campaignId: string) => {
    try {
      const { error } = await supabase.rpc('increment_campaign_metric', {
        p_campaign_id: campaignId,
        p_metric: 'views',
        p_amount: 1
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error tracking campaign view:', error);
    }
  };

  const trackCampaignClick = async (campaignId: string) => {
    try {
      const { error } = await supabase.rpc('increment_campaign_metric', {
        p_campaign_id: campaignId,
        p_metric: 'clicks',
        p_amount: 1
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error tracking campaign click:', error);
    }
  };

  const handleCampaignClick = async () => {
    if (activeBanner) {
      await trackCampaignClick(activeBanner.id);
      // Store campaign ID in localStorage for claiming after registration
      localStorage.setItem('pendingCampaignClaim', activeBanner.id);
    }
    onOpenAuth();
  };

  const handleCreateEvent = () => {
    if (user) navigate('/create');
    else onOpenAuth();
  };

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
      setNewsletterStatus('error');
      return;
    }
    setNewsletterStatus('loading');
    try {
      // Store newsletter signup in database
      const { error } = await supabase
        .from('newsletter_signups')
        .insert({ email: newsletterEmail, source: 'landing_page' });
      
      if (error && error.code !== '23505') { // Ignore duplicate email error
        throw error;
      }
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    } catch (error) {
      console.error('Newsletter signup error:', error);
      setNewsletterStatus('error');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-24 pb-24">
      {/* Testing Phase Notice Banner */}
      <section className="px-4 pt-6">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-amber-900/40 via-yellow-900/40 to-amber-900/40 border-2 border-amber-500/60 rounded-2xl p-5 md:p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xl md:text-2xl font-bold text-amber-50">Testing Phase Active</h3>
                <span className="bg-amber-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-950">Beta</span>
              </div>
              <p className="text-amber-100/90 text-sm md:text-base leading-relaxed">
                EventNexus is currently in <strong>testing phase</strong>. All payments are processed through a <strong>secure sandbox environment</strong> — no real money is charged. 
                <span className="hidden md:inline"> You can explore all features risk-free and help us improve the platform.</span>
              </p>
              <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-4 mt-3">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-50 font-semibold text-sm md:text-base">Early Adopter Benefit</p>
                    <p className="text-amber-100/80 text-xs md:text-sm mt-1">
                      The first <strong>100 users</strong> will receive <strong>1 month of Pro access absolutely free</strong> when EventNexus officially launches. No credit card required during testing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Testing Banner */}
      <section className="px-4">
        <a href="/#/beta" className="block">
          <div className="max-w-7xl mx-auto bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/50 rounded-[32px] p-6 md:p-8 hover:border-purple-400 transition-all shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-3">
                  🚀 Join the Beta
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">Become a Beta Tester</h3>
                <p className="text-slate-300">Get 1000 credits, early access to features, and help shape EventNexus</p>
              </div>
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="text-sm font-semibold text-purple-300">Limited spots available</span>
                <ArrowRight size={20} className="text-purple-400" />
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Active Growth Campaign Banner */}
      {activeBanner && !user && (
        <section className="px-4">
          <div className="max-w-7xl mx-auto bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col md:flex-row relative group cursor-pointer hover:border-orange-500/50 transition-all shadow-2xl" onClick={handleCampaignClick}>
             <div className="md:w-1/2 p-10 md:p-14 space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 bg-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20">
                   <Zap size={12} className="fill-current" /> Limited Offer
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">{activeBanner.title}</h2>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">{activeBanner.copy}</p>
                <div className="pt-2 flex items-center gap-6">
                   <button className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2">
                      {activeBanner.cta} <ArrowRight size={16} />
                   </button>
                   <div className="flex flex-col">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incentive Status</p>
                      <p className="text-sm font-bold text-orange-500">{activeBanner.incentive.limit - activeBanner.incentive.redeemed} Spots Left</p>
                   </div>
                </div>
             </div>
             <div className="md:w-1/2 h-64 md:h-auto relative">
                <img src={activeBanner.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]" alt="" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-transparent md:block hidden" />
                <div className="absolute bottom-6 right-8 bg-slate-950/80 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-800 flex items-center gap-4 shadow-2xl">
                   <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-500"><Gift size={24}/></div>
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reward Value</p>
                      <p className="text-xl font-black text-white">€{(activeBanner.incentive.value * 0.5).toFixed(2)}</p>
                   </div>
                </div>
             </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-32 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-full text-indigo-400 text-sm font-bold animate-bounce">
            <Zap className="w-4 h-4 fill-current" /> New: AI Auto-Translation for Events
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
            Discover, Create, <br />
            <span className="text-indigo-500">Experience.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
            The world's first map-first event platform. From massive festivals to secret living room concerts — find your next vibe instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/map" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2">
              <MapIcon className="w-5 h-5" /> Explore Map
            </Link>
            <button 
              onClick={handleCreateEvent}
              className="w-full sm:w-auto bg-slate-100 text-slate-950 hover:bg-white px-10 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Host an Event
            </button>
          </div>
        </div>
      </section>

      {/* Live Platform Stats */}
      {platformStats && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-[32px] p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black mb-2">Growing Fast, Globally</h2>
              <p className="text-slate-400">Join thousands already using EventNexus</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{platformStats.totalEvents?.toLocaleString() || '0'}</div>
                <div className="text-sm text-slate-400 font-bold">Events Created</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-600/20 rounded-2xl flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{platformStats.totalTickets?.toLocaleString() || '0'}</div>
                <div className="text-sm text-slate-400 font-bold">Tickets Sold</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-600/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-orange-400" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{platformStats.totalUsers?.toLocaleString() || '0'}</div>
                <div className="text-sm text-slate-400 font-bold">Active Users</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-600/20 rounded-2xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{platformStats.totalOrganizers?.toLocaleString() || '0'}</div>
                <div className="text-sm text-slate-400 font-bold">Organizers</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-2 rounded-full border border-indigo-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Simple Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">How EventNexus Works</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Three simple steps to discover or host amazing events
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 hover:border-indigo-500/50 transition-all group h-full">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-600/20">
                1
              </div>
              <div className="mb-6 mt-4">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MapIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Explore the Map</h3>
                <p className="text-slate-400 leading-relaxed">
                  Browse events on an interactive map. Use filters, radius search, and categories to find exactly what you're looking for.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 hover:border-emerald-500/50 transition-all group h-full">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-emerald-600/20">
                2
              </div>
              <div className="mb-6 mt-4">
                <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Ticket className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Get Your Ticket</h3>
                <p className="text-slate-400 leading-relaxed">
                  Secure checkout with Stripe. Receive a fraud-proof QR code instantly via email. No paper needed.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 hover:border-orange-500/50 transition-all group h-full">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-orange-600/20">
                3
              </div>
              <div className="mb-6 mt-4">
                <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Enjoy the Event</h3>
                <p className="text-slate-400 leading-relaxed">
                  Show your QR code at entry. Rate the organizer after. Follow them to get notified about future events.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-bold text-lg transition-all shadow-xl shadow-indigo-500/20"
          >
            Start Exploring <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Video/Demo Section */}
      {demoVideo && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[48px] overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-12 md:p-16 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-indigo-600/10 px-4 py-2 rounded-full border border-indigo-500/30 mb-6 w-fit">
                  <Play className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Watch Demo</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
                  {demoVideo.title}
                </h2>
                {demoVideo.description && (
                  <p className="text-slate-400 text-lg leading-relaxed mb-8">
                    {demoVideo.description}
                  </p>
                )}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">Interactive map-based discovery</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">Instant ticket purchasing & QR codes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">AI-powered event translation</span>
                  </li>
                </ul>
                <button
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-bold transition-all w-fit"
                >
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative bg-slate-950 flex items-center justify-center p-8 md:p-12">
                {demoVideo.video_url ? (
                  <div className="relative w-full aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                    <iframe
                      src={demoVideo.video_url.includes('youtube.com') || demoVideo.video_url.includes('youtu.be') 
                        ? demoVideo.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                        : demoVideo.video_url
                      }
                      title={demoVideo.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    {demoVideo.duration && (
                      <div className="absolute bottom-6 left-6 right-6 bg-slate-950/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800">
                        <p className="text-sm font-bold text-white">{demoVideo.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{demoVideo.duration} • {demoVideo.media_type.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden group cursor-pointer hover:border-indigo-500/50 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-slate-950 ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Top Rated Enterprise Organizers */}
      {topOrganizers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-4 py-2 rounded-full border border-yellow-500/30 mb-4">
              <Award className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Top Rated</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Featured Event Organizers</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Trusted by the community. Rated by real attendees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topOrganizers.map((org) => (
              <Link
                key={org.organizer_id}
                to={`/agency/${org.agency_slug}`}
                className="group bg-slate-900/50 border border-slate-800 rounded-[32px] p-6 hover:border-indigo-500/50 transition-all hover:shadow-xl hover:shadow-indigo-500/10"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">
                      {org.organizer_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={`${
                              i < Math.round(org.avg_rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-white">
                        {org.avg_rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({org.total_ratings} {org.total_ratings === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">
                      {org.subscription_tier}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-2xl font-black text-indigo-400">{org.events_rated}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Events</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-2xl font-black text-emerald-400">{org.weighted_score.toFixed(1)}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Score</div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">View Profile</span>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>

          {/* View All Link */}
          <div className="text-center mt-12">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-white font-bold transition-all group"
            >
              <TrendingUp className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
              Explore All Organizers
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      )}

      {/* Success Stories */}
      {successStories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-4 py-2 rounded-full border border-green-500/30 mb-4">
              <Award className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Success Stories</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Real Results from Real Organizers</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              See how EventNexus helps organizers grow their events
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {successStories.map((story) => (
              <div
                key={story.id}
                className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 hover:border-green-500/50 transition-all group"
              >
                <div className="mb-6">
                  <Quote className="w-10 h-10 text-green-500/20 mb-4" />
                  <p className="text-slate-300 italic leading-relaxed mb-6">"{story.quote}"</p>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  {story.avatar_url && (
                    <img
                      src={story.avatar_url}
                      alt={story.organizer_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-bold text-white">{story.organizer_name}</p>
                    {story.organizer_role && (
                      <p className="text-sm text-slate-400">{story.organizer_role}</p>
                    )}
                  </div>
                </div>

                {story.event_type && (
                  <div className="inline-block bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-green-400">{story.event_type}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Press Mentions */}
      {pressMentions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2 rounded-full border border-blue-500/30 mb-4">
              <Newspaper className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">In the Press</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Media Coverage</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              What the media is saying about EventNexus
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pressMentions.map((mention) => (
              <a
                key={mention.id}
                href={mention.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900/50 border border-slate-800 rounded-[24px] p-6 hover:border-blue-500/50 transition-all group block"
              >
                {mention.publication_logo_url && (
                  <div className="mb-4 h-12 flex items-center">
                    <img
                      src={mention.publication_logo_url}
                      alt={mention.publication_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <p className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-2">
                  {mention.publication_name}
                </p>
                <h3 className="font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                  {mention.article_title}
                </h3>
                {mention.excerpt && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-3">{mention.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(mention.published_date).toLocaleDateString()}</span>
                  <ExternalLink className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Pricing Preview */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-4 py-2 rounded-full border border-emerald-500/30 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Transparent Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Choose Your Plan</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Start free, upgrade when you grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_TIERS).map(([tier, details]: [string, any]) => (
            <div
              key={tier}
              className={`bg-slate-900/50 border rounded-[32px] p-8 hover:border-indigo-500/50 transition-all group relative ${
                tier === 'pro' ? 'border-indigo-500 shadow-xl shadow-indigo-500/10' : 'border-slate-800'
              }`}
            >
              {tier === 'pro' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-1 rounded-full text-xs font-black text-white uppercase tracking-wider">
                  Popular
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black capitalize mb-2">{tier}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-black text-white">€{details.price}</span>
                  {details.price > 0 && <span className="text-slate-500">/mo</span>}
                </div>
                <p className="text-sm text-slate-400">{details.description}</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    {details.maxEvents === Infinity ? 'Unlimited' : details.maxEvents === 0 ? 'Attend events' : `${details.maxEvents} events`}
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{(details.commissionRate * 100).toFixed(1)}% platform fee</span>
                </li>
                {details.analytics && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Advanced analytics</span>
                  </li>
                )}
                {details.customBranding && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Custom branding</span>
                  </li>
                )}
                {details.welcomeCredits && (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{details.welcomeCredits} welcome credits</span>
                  </li>
                )}
              </ul>
              <button
                onClick={onOpenAuth}
                className={`w-full py-3 rounded-2xl font-bold transition-all ${
                  tier === 'pro'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {tier === 'free' ? 'Start Free' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/pricing" className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-2">
            View Full Pricing Details <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<Compass className="w-8 h-8" />} 
          title="Map-First Discovery" 
          description="Forget lists. Explore events exactly where they are. Radius search and smart filters built-in." 
        />
        <FeatureCard 
          icon={<Globe className="w-8 h-8" />} 
          title="AI Translation" 
          description="Powered by Gemini. Host events in any language; reach a global audience automatically." 
        />
        <FeatureCard 
          icon={<Shield className="w-8 h-8" />} 
          title="Secure Ticketing" 
          description="Fraud-proof QR codes and instant validation. Secure payments via Stripe." 
        />
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-2 rounded-full border border-purple-500/30 mb-4">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">FAQs</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Everything you need to know about EventNexus
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              question: 'Is EventNexus really free to use?',
              answer: 'Yes! You can create a free account and browse all events. Attendees pay no platform fees. Organizers can start with our Free tier (100 welcome credits) or upgrade to unlock more features.'
            },
            {
              question: 'How does ticketing work?',
              answer: 'Purchase tickets securely with Stripe. You will receive a unique QR code via email instantly. Show it at the event entrance for instant validation. No printing needed!'
            },
            {
              question: 'What happens during the testing phase?',
              answer: 'All payments are processed through a secure sandbox environment - no real money is charged. This allows you to test all features risk-free. The first 100 users get 1 month of Pro access free when we launch!'
            },
            {
              question: 'Can I translate my event to multiple languages?',
              answer: 'Absolutely! Our AI-powered translation (powered by Google Gemini) automatically translates your event description to 50+ languages, helping you reach a global audience instantly.'
            },
            {
              question: 'What are the platform fees?',
              answer: 'Platform fees range from 1.5% to 5% depending on your subscription tier. Free tier: 5%, Pro: 3%, Premium: 2.5%, Enterprise: 1.5%. No hidden costs - what you see is what you pay.'
            },
            {
              question: 'How do refunds work?',
              answer: 'Full refund if cancelled 7+ days before the event. 50% refund if 3-7 days before. No refund within 3 days of the event. Organizers receive payouts 2 days after the event completes.'
            },
            {
              question: 'Is my data secure?',
              answer: 'Yes! We use Supabase with PostgreSQL for database security, Stripe for secure payment processing, and implement Row Level Security (RLS) policies. All data is encrypted and GDPR-compliant.'
            },
            {
              question: 'Can I use EventNexus for private events?',
              answer: 'Yes! You can set event visibility to Public, Private, or Semi-Private. Private events are only visible to people with the direct link.'
            }
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left group"
              >
                <span className="font-bold text-white group-hover:text-indigo-400 transition-colors pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === index && (
                <div className="px-6 pb-6 text-slate-400 leading-relaxed animate-in slide-in-from-top-2">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">Still have questions?</p>
          <Link
            to="/help"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-white font-bold transition-all"
          >
            Visit Help Center <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-[40px] p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-indigo-600/20 px-4 py-2 rounded-full border border-indigo-500/30 mb-6">
              <Mail className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Stay Updated</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              Get Event Recommendations
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Subscribe to our newsletter and get personalized event recommendations, early access to new features, and exclusive organizer tips.
            </p>
            <form onSubmit={handleNewsletterSignup} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                  className="flex-1 px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-600 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {newsletterStatus === 'loading' ? (
                    'Subscribing...'
                  ) : newsletterStatus === 'success' ? (
                    <><Check className="w-5 h-5" /> Subscribed!</>
                  ) : (
                    <><Send className="w-5 h-5" /> Subscribe</>
                  )}
                </button>
              </div>
              {newsletterStatus === 'error' && (
                <p className="text-red-400 text-sm mt-3">Invalid email or already subscribed</p>
              )}
              <p className="text-slate-500 text-xs mt-4">
                No spam. Unsubscribe anytime. By subscribing, you agree to our Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Organizer Call to Action */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-indigo-600 rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-indigo-600/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Ready to host?</h2>
            <p className="text-indigo-100 text-lg max-w-2xl mx-auto">
              Join thousands of organizers using EventNexus to manage tickets, track analytics, and promote their experiences.
            </p>
            <div className="pt-6">
              <button 
                onClick={handleCreateEvent}
                className="bg-white text-indigo-600 px-12 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all inline-flex items-center gap-2"
              >
                Get Started <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: any) => (
  <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] hover:border-indigo-500/50 transition-all group">
    <div className="bg-indigo-600/10 text-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
  </div>
);

export default LandingPage;
