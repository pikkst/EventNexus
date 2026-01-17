
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import { usePageSEO } from '../hooks/useSEO';
import { Compass, Zap, Shield, Globe, Map as MapIcon, ChevronRight, Star, Plus, ArrowRight, Gift, Award, TrendingUp, Quote, Newspaper, ExternalLink, Users, Calendar, Ticket, Play, Check, Mail, Send, ChevronDown, DollarSign, Sparkles, Trophy, Heart, Target, Zap as ZapIcon, Bot, Languages, Paintbrush } from 'lucide-react';
import { User, PlatformCampaign, SuccessStory, PressMention, PlatformMedia } from '../types';
import { getCampaigns, getTopOrganizers, OrganizerRatingStats, getSuccessStories, getPressMentions, getPlatformStats, getPlatformMedia } from '../services/dbService';
import { supabase } from '../services/supabase';
import { SUBSCRIPTION_TIERS } from '../constants';
import { sanitizeUrl, sanitizeVideoUrl } from '../utils/security';
import { resetToHomepageSEO } from '../utils/seoUtils';
import { trackLandingPageView, trackCTAClick, trackScrollDepth, trackTimeOnPage, trackOrganizerClick, trackNewsletterSignup } from '../utils/conversionTracking';
import { FeaturedEventsCarousel } from './FeaturedEventsCarousel';
import { ExitIntentPopup } from './ExitIntentPopup';

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
  const [showExitIntentPopup, setShowExitIntentPopup] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);

  // SEO optimization for AI crawlers
  usePageSEO({
    path: '/',
    title: 'Discover Your Next Experience',
    description: 'Find amazing events near you. From concerts to conferences, discover and book tickets for unforgettable experiences.',
    image: 'https://www.eventnexus.eu/og-image.png',
    type: 'website'
  });

  // Reset to homepage SEO on mount
  useEffect(() => {
    resetToHomepageSEO();
    // Track landing page view
    trackLandingPageView();
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const scrollPercentage = ((scrollTop + windowHeight) / documentHeight) * 100;
      trackScrollDepth(Math.round(scrollPercentage));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track time on page
  useEffect(() => {
    let startTime = Date.now();
    
    const trackTimeInterval = setInterval(() => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
      trackTimeOnPage(timeOnPage);
    }, 5000); // Track every 5 seconds

    return () => clearInterval(trackTimeInterval);
  }, []);

  // Exit-intent popup detection
  useEffect(() => {
    if (exitIntentShown) return; // Only show once per session
    
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if:
      // 1. Mouse is leaving from top of the page (actual exit intent)
      // 2. User hasn't seen the popup yet this session
      if (e.clientY <= 10 && e.clientY >= 0) {
        // Additional check: ensure user has scrolled some content first (min 500px)
        if (window.scrollY < 500) {
          return; // Don't show if user hasn't engaged with the page yet
        }
        
        trackCTAClick('exit_intent_shown');
        setShowExitIntentPopup(true);
        setExitIntentShown(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [exitIntentShown]);

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
        logger.error('Error loading campaign:', error);
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
        logger.error('Error loading top organizers:', error);
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
          getPlatformStats(),          // Get live platform metrics (public endpoint)
          getPlatformMedia('landing_demo', 'walkthrough_video') // Get landing demo video
        ]);
        setSuccessStories(stories);
        setPressMentions(mentions);
        setPlatformStats(stats);
        setDemoVideo(videos && videos.length > 0 ? videos[0] : null);
      } catch (error) {
        logger.error('Error loading landing content:', error);
      }
    };
    loadLandingContent();
  }, []);

  const trackCampaignView = async (campaignId: string) => {
    try {
      // Validate UUID format before making RPC call
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!campaignId || !uuidRegex.test(campaignId)) {
        logger.warn('Invalid campaign ID format:', campaignId);
        return;
      }

      const { error } = await supabase.rpc('increment_campaign_metric', {
        p_campaign_id: campaignId,
        p_metric: 'views',
        p_amount: 1
      });
      if (error) throw error;
    } catch (error) {
      logger.error('Error tracking campaign view:', error);
    }
  };

  const trackCampaignClick = async (campaignId: string) => {
    try {
      // Validate UUID format before making RPC call
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!campaignId || !uuidRegex.test(campaignId)) {
        logger.warn('Invalid campaign ID format:', campaignId);
        return;
      }

      const { error } = await supabase.rpc('increment_campaign_metric', {
        p_campaign_id: campaignId,
        p_metric: 'clicks',
        p_amount: 1
      });
      if (error) throw error;
    } catch (error) {
      logger.error('Error tracking campaign click:', error);
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
      trackNewsletterSignup(false);
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
      trackNewsletterSignup(true);
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    } catch (error) {
      logger.error('Newsletter signup error:', error);
      trackNewsletterSignup(false);
      setNewsletterStatus('error');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-24 pb-24">
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
                   <button className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2" aria-label={`${activeBanner.cta} - Limited offer campaign`}>
                      {activeBanner.cta} <ArrowRight size={16} aria-hidden="true" />
                   </button>
                   <div className="flex flex-col">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incentive Status</p>
                      {activeBanner.incentive?.limit !== undefined && activeBanner.incentive?.redeemed !== undefined ? (
                        <p className="text-sm font-bold text-orange-500">{activeBanner.incentive.limit - activeBanner.incentive.redeemed} Spots Left</p>
                      ) : (
                        <p className="text-sm font-bold text-orange-500">Limited Time</p>
                      )}
                   </div>
                </div>
             </div>
             <div className="md:w-1/2 h-64 md:h-auto relative">
                <img src={activeBanner.imageUrl || activeBanner.image_url || '/logo for eventnexus.png'} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]" alt="" onError={(e) => { e.currentTarget.src = '/logo for eventnexus.png'; }} />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-transparent md:block hidden" />
                <div className="absolute bottom-6 right-8 bg-slate-950/80 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-800 flex items-center gap-4 shadow-2xl">
                   <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-500"><Gift size={24}/></div>
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reward Value</p>
                      <p className="text-xl font-black text-white">€{((activeBanner.incentive?.value || 0) * 0.5).toFixed(2)}</p>
                   </div>
                </div>
             </div>
          </div>
        </section>
      )}

      {/* Hero Section - OPTIMIZED FOR CONVERSIONS */}
      <section className="relative px-4 pt-12 pb-16 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-6xl mx-auto space-y-0">
          {/* Header Row */}
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-full text-indigo-400 text-sm font-bold animate-bounce mb-6">
            <Zap className="w-4 h-4 fill-current" /> {platformStats?.eventsLast24h || 531} events found in 24h
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center md:items-start">
            {/* Left: Text Content */}
            <div className="space-y-8 text-left md:pt-4">
              <div>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1] mb-6">
                  Find Your<br />
                  <span className="text-indigo-500">Next Vibe</span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed mb-4">
                  Browse {platformStats?.eventsLast24h || 531} events discovered daily across {platformStats?.totalCities || 1169} cities. From festivals to underground concerts—find exactly what's happening around you.
                </p>
                <p className="text-sm md:text-base text-slate-400 flex items-center gap-2 mb-8">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500/20 rounded-full text-emerald-400 flex-shrink-0">✓</span>
                  <span><strong>13,000+</strong> attendees discovering events right now</span>
                </p>
              </div>

              {/* Primary CTA - DOMINANT */}
              <div className="space-y-2 md:space-y-3">
                <Link 
                  to="/browse" 
                  onClick={() => trackCTAClick('browse_events')}
                  className="w-full block bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-base md:text-lg text-white transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-2 md:gap-3 group text-center"
                  aria-label="Browse all events catalog now"
                >
                  <Calendar className="w-5 md:w-6 h-5 md:h-6 group-hover:scale-110 transition-transform" aria-hidden="true" /> 
                  Browse All Events
                </Link>
                <p className="text-[10px] md:text-xs text-slate-500 text-center">👉 Discover events happening around the world</p>
              </div>

              {/* Secondary CTA - Map */}
              <Link 
                to="/map" 
                onClick={() => trackCTAClick('explore_map')}
                className="w-full block bg-slate-800 border border-slate-700 hover:border-indigo-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2"
                aria-label="Explore events on interactive map"
              >
                <MapIcon className="w-4 md:w-5 h-4 md:h-5" aria-hidden="true" /> 
                View on Map
              </Link>

              {/* Trust Badges - Enhanced with Context */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                <div className="group cursor-pointer rounded-2xl bg-slate-800/50 p-3 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 transition-all">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">This 24h</div>
                  <div className="text-2xl font-black text-indigo-400">{platformStats?.eventsLast24h?.toLocaleString() || '531'}</div>
                  <div className="text-xs text-slate-400 mt-1">New Events</div>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700">📈 Growing</div>
                </div>
                <div className="group cursor-pointer rounded-2xl bg-slate-800/50 p-3 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 transition-all">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Worldwide</div>
                  <div className="text-2xl font-black text-emerald-400">{platformStats?.totalCities?.toLocaleString() || '1169'}</div>
                  <div className="text-xs text-slate-400 mt-1">Active Cities</div>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700">🌍 Expanding</div>
                </div>
                <div className="group cursor-pointer rounded-2xl bg-slate-800/50 p-3 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-800 transition-all">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Zero Cost</div>
                  <div className="text-2xl font-black text-orange-400">{platformStats?.freeEventsActive?.toLocaleString() || '592'}</div>
                  <div className="text-xs text-slate-400 mt-1">Free Events</div>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700">💰 No fees</div>
                </div>
              </div>
            </div>

            {/* Right: Visual - Quick Stats or Feature Preview */}
            <div className="relative h-80 md:h-96 rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />
              
              {/* Live Stats Card */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-2xl mb-4">
                    <Calendar className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Live Right Now</h3>
                  <p className="text-slate-300 text-lg">{platformStats?.eventsLast24h?.toLocaleString() || '531'} new events found</p>
                  <p className="text-slate-500 text-xs mt-2">Updated continuously across all regions</p>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

                <div className="grid grid-cols-3 gap-4 w-full">
                  <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4 text-center hover:border-indigo-500/60 transition-all group/card">
                    <div className="text-3xl font-black text-indigo-400 mb-2">{platformStats?.totalCities?.toLocaleString() || '1169'}</div>
                    <p className="text-xs font-bold text-slate-400">Active Cities</p>
                    <p className="text-[10px] text-slate-500 mt-2">Worldwide coverage</p>
                  </div>
                  <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4 text-center hover:border-emerald-500/60 transition-all group/card">
                    <div className="text-3xl font-black text-emerald-400 mb-2">{platformStats?.freeEventsActive?.toLocaleString() || '592'}</div>
                    <p className="text-xs font-bold text-slate-400">Free Events</p>
                    <p className="text-[10px] text-slate-500 mt-2">No hidden costs</p>
                  </div>
                  <div className="bg-orange-600/10 border border-orange-500/30 rounded-2xl p-4 text-center hover:border-orange-500/60 transition-all group/card">
                    <div className="text-3xl font-black text-orange-400 mb-2">50+</div>
                    <p className="text-xs font-bold text-slate-400">Languages</p>
                    <p className="text-[10px] text-slate-500 mt-2">AI-powered translation</p>
                  </div>
                </div>

                <p className="text-center text-slate-400 text-sm">
                  🚀 <span className="font-semibold text-indigo-400">Join thousands</span> discovering events every day
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Platform Stats - NOW HIGHLIGHTED */}
      {platformStats && (
        <section className="max-w-7xl mx-auto px-4 relative">
          <div className="absolute -inset-8 bg-gradient-to-r from-indigo-600/5 via-purple-600/5 to-indigo-600/5 rounded-[48px] blur-3xl" />
          <div className="relative bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-2 border-indigo-500/30 rounded-[40px] p-12 md:p-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black mb-3">Trusted by Thousands</h2>
              <p className="text-slate-300 text-lg">Real numbers. Real growth. Real communities discovering events.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Events 24h - Shows platform activity */}
              <div className="group">
                <div className="bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 group-hover:shadow-xl group-hover:shadow-indigo-500/10 rounded-3xl p-6 text-center transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-indigo-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-indigo-400 mb-2">{platformStats.eventsLast24h?.toLocaleString() || '531'}</div>
                  <div className="text-sm font-bold text-slate-400">New Events Daily</div>
                  <p className="text-xs text-slate-500 mt-2">Constantly updated, always fresh</p>
                </div>
              </div>

              {/* Cities Active - Shows global reach */}
              <div className="group">
                <div className="bg-slate-950/50 border border-slate-800 hover:border-emerald-500/50 group-hover:shadow-xl group-hover:shadow-emerald-500/10 rounded-3xl p-6 text-center transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Globe className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-2">{platformStats.totalCities?.toLocaleString() || '1169'}</div>
                  <div className="text-sm font-bold text-slate-400">Cities Worldwide</div>
                  <p className="text-xs text-slate-500 mt-2">Everywhere you need to be</p>
                </div>
              </div>

              {/* Free Events - Conversion driver */}
              <div className="group">
                <div className="bg-slate-950/50 border border-slate-800 hover:border-orange-500/50 group-hover:shadow-xl group-hover:shadow-orange-500/10 rounded-3xl p-6 text-center transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Gift className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-orange-400 mb-2">{platformStats.freeEventsActive?.toLocaleString() || '592'}</div>
                  <div className="text-sm font-bold text-slate-400">Free Events Active</div>
                  <p className="text-xs text-slate-500 mt-2">Start attending today, zero cost</p>
                </div>
              </div>

              {/* Active Users / Attendees */}
              <div className="group">
                <div className="bg-slate-950/50 border border-slate-800 hover:border-purple-500/50 group-hover:shadow-xl group-hover:shadow-purple-500/10 rounded-3xl p-6 text-center transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-purple-400 mb-2">92%</div>
                  <div className="text-sm font-bold text-slate-400">Attendee Satisfaction</div>
                  <p className="text-xs text-slate-500 mt-2">Rating: 4.8/5 stars average</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works - Redesigned for clarity */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-2 rounded-full border border-indigo-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">3 Simple Steps</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Get to Your Next Event in 3 Minutes</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From discovering to attending—EventNexus makes it frictionless.
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines (hidden on mobile) */}
          <div className="hidden md:block absolute top-32 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 opacity-20" />

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Step 1 */}
            <div className="group">
              <div className="relative mb-6">
                <div className="absolute -top-3 -left-3 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/30 z-10">
                  1
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 pt-12 hover:border-indigo-500/50 transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/10">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <MapIcon className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Open the Map</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Tap "Explore Events" to see all live events on the interactive map. Use filters for category, date, or radius search.
                    </p>
                  </div>
                  <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4">
                    <p className="text-sm text-slate-300"><strong>💡 Tip:</strong> Use "Near Me" to find events within your radius</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group md:pt-8">
              <div className="relative mb-6">
                <div className="absolute -top-3 -left-3 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-600/30 z-10">
                  2
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 pt-12 hover:border-emerald-500/50 transition-all group-hover:shadow-xl group-hover:shadow-emerald-500/10">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Ticket className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Buy Instantly</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Click on any event to see details. Secure checkout powered by Stripe. Receive your fraud-proof QR code in seconds.
                    </p>
                  </div>
                  <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-sm text-slate-300"><strong>🔒 Safe:</strong> PCI-compliant, encrypted payments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group md:pt-16">
              <div className="relative mb-6">
                <div className="absolute -top-3 -left-3 w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-600/30 z-10">
                  3
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 pt-12 hover:border-orange-500/50 transition-all group-hover:shadow-xl group-hover:shadow-orange-500/10">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-orange-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="w-10 h-10 text-orange-400" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Enjoy!</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Show your QR code at entry. Instant validation. No lines, no paper—just pure event magic.
                    </p>
                  </div>
                  <div className="bg-orange-600/10 border border-orange-500/20 rounded-xl p-4">
                    <p className="text-sm text-slate-300"><strong>⭐ Rate the organizer</strong> after to help the community</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Below */}
        <div className="text-center mt-16">
          <p className="text-slate-400 mb-6">Ready to explore?</p>
          <Link
            to="/map"
            onClick={() => trackCTAClick('start_exploring')}
            className="inline-flex items-center gap-3 px-12 py-5 bg-indigo-600 hover:bg-indigo-700 rounded-3xl text-white font-black text-lg transition-all shadow-xl shadow-indigo-600/30 group"
          >
            <MapIcon className="w-6 h-6 group-hover:scale-110 transition-transform" /> Start Exploring Now
          </Link>
        </div>
      </section>

      {/* Featured Events Carousel */}
      <FeaturedEventsCarousel className="bg-slate-950/50 py-6" />

      {/* Why Choose EventNexus - Benefits Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800 rounded-[48px] p-12 md:p-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="text-center mb-16 space-y-3">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-2 rounded-full border border-indigo-500/30 mb-4">
                <Star className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Why EventNexus</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Built for Modern Event Discovery</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                We're not just another events platform. We're the future of how people discover and experience events.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <MapIcon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Visual, Not Lists</h3>
                    <p className="text-slate-400 leading-relaxed">
                      See events on an interactive map, not in boring lists. Filter by radius, category, date—discover events intuitively.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Global Reach, Local Feel</h3>
                    <p className="text-slate-400 leading-relaxed">
                      AI-powered translation in 50+ languages. Host in Estonian, reach audiences in Finnish, Swedish, German, and beyond.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-yellow-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Gamified Experience</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Earn badges, level up, compete on leaderboards. Make attending events fun and rewarding with our achievement system.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-pink-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Heart className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Community-Driven</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Join communities, connect with like-minded people, discover events through your network. Social discovery at its best.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">AI-Powered Everything</h3>
                    <p className="text-slate-400 leading-relaxed">
                      From marketing materials to personalized recommendations—our AI does the heavy lifting so you can focus on what matters.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Bank-Level Security</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Fraud-proof QR codes, Stripe-powered payments, encrypted storage. Your data and money are always protected.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-cyan-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Instant Everything</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Buy tickets, get QR codes, check in—all in seconds. No printing, no hassle, no delays. Just seamless experiences.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start group">
                  <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">Fair Pricing, Always</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Platform fees as low as 1.5%. No hidden costs. What you see is what you pay. Start free, upgrade when you grow.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-16 text-center">
              <p className="text-slate-400 mb-6 text-lg">Ready to experience the difference?</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/browse"
                  onClick={() => trackCTAClick('why_choose_browse')}
                  className="inline-flex items-center gap-2 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 rounded-3xl text-white font-black text-lg transition-all shadow-xl shadow-indigo-600/30"
                >
                  <Calendar className="w-6 h-6" /> Browse Events
                </Link>
                <button
                  onClick={handleCreateEvent}
                  className="inline-flex items-center gap-2 px-10 py-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 rounded-3xl text-white font-black text-lg transition-all"
                >
                  <Plus className="w-6 h-6" /> Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency / Quick Action Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-[40px] p-8 md:p-12 overflow-hidden shadow-2xl shadow-indigo-600/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-2">✨ Join Today</p>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  See What's Happening Around You
                </h2>
                <p className="text-indigo-50/90 text-lg leading-relaxed">
                  {platformStats?.eventsLast24h || 531} new events discovered daily across {platformStats?.totalCities || 1169} cities. Don't miss out—find your next experience in real-time.
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    trackCTAClick('explore_map');
                    navigate('/map');
                  }}
                  className="w-full bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-xl"
                  aria-label="Explore events on the map"
                >
                  <MapIcon className="w-5 h-5" /> Explore Events Now
                </button>
                <p className="text-indigo-100/70 text-sm text-center">👉 No sign-up needed to browse</p>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-black text-white mb-1">{platformStats?.eventsLast24h?.toLocaleString() || '531'}</div>
                <p className="text-sm text-indigo-100">Events in 24h</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-black text-white mb-1">{platformStats?.totalCities?.toLocaleString() || '1169'}</div>
                <p className="text-sm text-indigo-100">Cities covered</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-black text-white mb-1">{platformStats?.freeEventsActive?.toLocaleString() || '592'}</div>
                <p className="text-sm text-indigo-100">Free events</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-black text-white mb-1">100%</div>
                <p className="text-sm text-indigo-100">Secure payment</p>
              </div>
            </div>
          </div>
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
                  onClick={() => {
                    trackCTAClick('get_started_free');
                    onOpenAuth();
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-bold transition-all w-fit"
                  aria-label="Sign up for free EventNexus account"
                >
                  Get Started Free <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <div className="relative bg-slate-950 flex items-center justify-center p-8 md:p-12">
                {demoVideo.video_url ? (
                  <div className="relative w-full aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                    {sanitizeVideoUrl(demoVideo.video_url) ? (
                      <iframe
                        src={sanitizeVideoUrl(demoVideo.video_url) || ''}
                        title={demoVideo.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <p>Video unavailable</p>
                      </div>
                    )}
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
                onClick={() => trackOrganizerClick(org.organizer_id, org.organizer_name)}
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
              onClick={() => trackCTAClick('explore_all_organizers')}
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
            {pressMentions.map((mention) => {
              const safeUrl = sanitizeUrl(mention.article_url);
              const Component = safeUrl ? 'a' : 'div';
              const linkProps = safeUrl ? {
                href: safeUrl,
                target: '_blank' as const,
                rel: 'noopener noreferrer nofollow',
              } : {};
              
              return (
                <Component
                  key={mention.id}
                  {...linkProps}
                  className={`bg-slate-900/50 border border-slate-800 rounded-[24px] p-6 hover:border-blue-500/50 transition-all group block ${!safeUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                </Component>
              );
            })}
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
                onClick={() => {
                  trackCTAClick(`signup_${tier}_tier`);
                  onOpenAuth();
                }}
                className={`w-full py-3 rounded-2xl font-bold transition-all ${
                  tier === 'pro'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                aria-label={`Sign up for ${tier.toUpperCase()} plan`}
              >
                {tier === 'free' ? 'Start Free' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/pricing" onClick={() => trackCTAClick('view_pricing')} className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-2">
            View Full Pricing Details <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Platform Features Grid - NEW & GAMIFICATION */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/10 to-orange-500/10 px-4 py-2 rounded-full border border-pink-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">Powerful Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Everything You Need, Built In</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From discovery to gamification—EventNexus is your all-in-one events platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Core Features */}
          <FeatureCard 
            icon={<Compass className="w-8 h-8" />} 
            title="Map-First Discovery" 
            description="Forget lists. Explore events exactly where they are. Radius search and smart filters built-in."
            gradient="from-blue-500/10 to-cyan-500/10"
            borderColor="border-blue-500/30"
            iconBg="bg-blue-600/20"
            iconColor="text-blue-400"
            hoverBorder="hover:border-blue-500/50"
          />
          <FeatureCard 
            icon={<Globe className="w-8 h-8" />} 
            title="AI Translation" 
            description="Powered by Gemini. Host events in any language; reach a global audience automatically."
            gradient="from-emerald-500/10 to-green-500/10"
            borderColor="border-emerald-500/30"
            iconBg="bg-emerald-600/20"
            iconColor="text-emerald-400"
            hoverBorder="hover:border-emerald-500/50"
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8" />} 
            title="Secure Ticketing" 
            description="Fraud-proof QR codes and instant validation. Secure payments via Stripe."
            gradient="from-indigo-500/10 to-purple-500/10"
            borderColor="border-indigo-500/30"
            iconBg="bg-indigo-600/20"
            iconColor="text-indigo-400"
            hoverBorder="hover:border-indigo-500/50"
          />
          
          {/* NEW Phase 3 Features */}
          <FeatureCard 
            icon={<Trophy className="w-8 h-8" />} 
            title="Gamification & Badges" 
            description="Earn achievements, level up, and climb the leaderboard. Compete with friends and unlock exclusive rewards."
            gradient="from-yellow-500/10 to-orange-500/10"
            borderColor="border-yellow-500/30"
            iconBg="bg-yellow-600/20"
            iconColor="text-yellow-400"
            hoverBorder="hover:border-yellow-500/50"
            badge="NEW"
          />
          <FeatureCard 
            icon={<Heart className="w-8 h-8" />} 
            title="Communities & Groups" 
            description="Join event communities, connect with like-minded people, and discover events together with your tribe."
            gradient="from-pink-500/10 to-rose-500/10"
            borderColor="border-pink-500/30"
            iconBg="bg-pink-600/20"
            iconColor="text-pink-400"
            hoverBorder="hover:border-pink-500/50"
            badge="NEW"
          />
          <FeatureCard 
            icon={<Bot className="w-8 h-8" />} 
            title="AI Event Assistant" 
            description="NexusBot helps you find the perfect events, answers questions, and provides personalized recommendations 24/7."
            gradient="from-purple-500/10 to-violet-500/10"
            borderColor="border-purple-500/30"
            iconBg="bg-purple-600/20"
            iconColor="text-purple-400"
            hoverBorder="hover:border-purple-500/50"
          />
          
          {/* AI Marketing Tools */}
          <FeatureCard 
            icon={<Paintbrush className="w-8 h-8" />} 
            title="AI Marketing Suite" 
            description="Auto-generate posters, social ads, and campaigns with Gemini + Imagen. Professional designs in seconds."
            gradient="from-orange-500/10 to-red-500/10"
            borderColor="border-orange-500/30"
            iconBg="bg-orange-600/20"
            iconColor="text-orange-400"
            hoverBorder="hover:border-orange-500/50"
          />
          <FeatureCard 
            icon={<Languages className="w-8 h-8" />} 
            title="50+ Languages" 
            description="AI-powered translation for your events. Reach audiences in Estonian, Finnish, German, Swedish, and 40+ more."
            gradient="from-teal-500/10 to-cyan-500/10"
            borderColor="border-teal-500/30"
            iconBg="bg-teal-600/20"
            iconColor="text-teal-400"
            hoverBorder="hover:border-teal-500/50"
          />
          <FeatureCard 
            icon={<Target className="w-8 h-8" />} 
            title="Smart Recommendations" 
            description="Our AI learns your preferences and suggests events you'll love. Personalized discovery at its finest."
            gradient="from-red-500/10 to-pink-500/10"
            borderColor="border-red-500/30"
            iconBg="bg-red-600/20"
            iconColor="text-red-400"
            hoverBorder="hover:border-red-500/50"
          />
        </div>
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
              question: 'What happens during checkout?',
              answer: 'Checkout is secure and processed through Stripe, our trusted payment partner. You will receive a unique QR code via email instantly. Show it at the event entrance for instant validation. No printing needed!'
            },
            {
              question: 'Is EventNexus secure?',
              answer: 'Yes! EventNexus is fully secure and compliant with industry standards. All payments are processed through Stripe (PCI DSS Level 1 certified). Your data is encrypted and protected at all times.'
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

      {/* Newsletter Signup - ENHANCED */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-[48px] p-1 shadow-2xl shadow-indigo-600/30">
          <div className="bg-slate-950 rounded-[44px] p-12 md:p-16">
            <div className="text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-6">
                <Mail className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Join the Community</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                Never Miss an Event Again
              </h2>
              <p className="text-slate-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                Get personalized event recommendations delivered to your inbox. Be the first to know about new features, exclusive organizer tips, and limited-time offers.
              </p>
              
              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>13,000+ subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Weekly updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unsubscribe anytime</span>
                </div>
              </div>

              <form onSubmit={handleNewsletterSignup} className="max-w-xl mx-auto">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                    className="flex-1 px-6 py-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all disabled:opacity-50 text-lg"
                    required
                    aria-label="Email address for newsletter subscription"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                    className="px-8 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-emerald-500 disabled:to-emerald-600 disabled:cursor-not-allowed rounded-2xl font-black text-white text-lg transition-all flex items-center justify-center gap-3 whitespace-nowrap shadow-lg"
                    aria-label={
                      newsletterStatus === 'loading'
                        ? 'Subscribing to newsletter'
                        : newsletterStatus === 'success'
                          ? 'Successfully subscribed to newsletter'
                          : 'Subscribe to newsletter'
                    }
                  >
                    {newsletterStatus === 'loading' ? (
                      <><Zap className="w-5 h-5 animate-pulse" aria-hidden="true" /> Subscribing...</>
                    ) : newsletterStatus === 'success' ? (
                      <><Check className="w-6 h-6" aria-hidden="true" /> Subscribed!</>
                    ) : (
                      <><Send className="w-5 h-5" aria-hidden="true" /> Subscribe Free</>
                    )}
                  </button>
                </div>
                {newsletterStatus === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <p className="text-red-400 text-sm font-medium">⚠️ Invalid email or already subscribed. Please try again.</p>
                  </div>
                )}
                {newsletterStatus === 'success' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                    <p className="text-emerald-400 text-sm font-medium">✅ Success! Check your inbox for a confirmation email.</p>
                  </div>
                )}
                <p className="text-slate-500 text-xs">
                  🔒 No spam ever. We respect your privacy. By subscribing, you agree to our <Link to="/privacy" className="underline hover:text-slate-400">Privacy Policy</Link>.
                </p>
              </form>

              {/* Social proof */}
              <div className="mt-12 pt-8 border-t border-slate-800">
                <p className="text-slate-400 text-sm mb-4">Trusted by event lovers worldwide</p>
                <div className="flex items-center justify-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-white font-bold ml-2">4.9/5</span>
                  <span className="text-slate-500 text-sm ml-2">(2,400+ reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organizer Call to Action - Split messaging */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* For Attendees */}
          <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[40px] p-12 shadow-2xl shadow-indigo-600/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-3xl md:text-4xl font-black text-white">Ready to Explore?</h3>
              <p className="text-indigo-50 text-lg leading-relaxed">
                Discover 1,300+ live events on the map. Find exactly what's happening in your area right now.
              </p>
              <Link 
                to="/map"
                onClick={() => trackCTAClick('cta_explore_ready')}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all w-full md:w-auto justify-center"
                aria-label="Browse events on map"
              >
                <MapIcon className="w-5 h-5" /> Explore the Map
              </Link>
            </div>
          </div>

          {/* For Organizers */}
          <div className="relative bg-gradient-to-br from-orange-600 to-orange-700 rounded-[40px] p-12 shadow-2xl shadow-orange-600/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-3xl md:text-4xl font-black text-white">Ready to Host?</h3>
              <p className="text-orange-50 text-lg leading-relaxed">
                Create events, manage tickets, reach global audiences. Start your free plan today.
              </p>
              <button 
                onClick={handleCreateEvent}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-orange-600 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-all w-full md:w-auto justify-center"
                aria-label="Create an event as organizer"
              >
                <Plus className="w-5 h-5" /> Start Hosting
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* Exit-Intent Popup */}
      <ExitIntentPopup 
        isOpen={showExitIntentPopup} 
        onClose={() => setShowExitIntentPopup(false)}
      />

    </div>
  );
};

const FeatureCard = ({ icon, title, description, gradient, borderColor, iconBg, iconColor, hoverBorder, badge }: any) => (
  <div className={`relative bg-slate-900/50 border ${borderColor} p-8 rounded-[32px] ${hoverBorder} transition-all group`}>
    {badge && (
      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 rounded-full text-xs font-black text-white uppercase tracking-wider shadow-lg">
        {badge}
      </div>
    )}
    <div className={`${iconBg} ${iconColor} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
  </div>
);

export default LandingPage;
