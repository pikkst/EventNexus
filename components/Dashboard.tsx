
import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Calendar, ArrowUpRight, 
  Search, Download, Ticket as TicketIcon, MoreVertical, Scan, Lock, Zap,
  Sparkles, Globe, Share2, Rocket, BarChart3, Megaphone, Loader2, 
  Instagram, Linkedin, Twitter, Facebook, ExternalLink,
  LayoutDashboard, Wand2, CheckCircle2, CloudUpload, Link as LinkIcon,
  RefreshCcw, AlertCircle, Check, Briefcase, Send, MessageSquare,
  Cpu, Database, Key, ShieldCheck, Headphones, Smartphone, Paintbrush,
  Link2, Settings2, Bot, Layers, Terminal, Activity, Github, Play,
  ChevronRight, Box, User as UserIcon, Palette, Image as ImageIcon,
  Chrome, CheckCircle, Smartphone as TikTok, X, Globe2, Volume2, Lightbulb, Clock, Copy, Trash2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { User, EventNexusEvent, Notification, AgencyService, AffiliateStats, AffiliateReferralActivity } from '../types';
import { 
  getEvents, 
  getOrganizerEvents,
  getOrganizerRevenue, 
  getOrganizerRevenueSummary,
  getOrganizerAttendanceSummary,
  RevenueByEvent,
  RevenueSummary,
  verifyConnectOnboarding,
  safeDeleteEvent,
  AttendanceSummaryItem,
  createAffiliatePartner,
  getAffiliateStats,
  getAffiliateReferrals
} from '../services/dbService';
import { generateAdCampaign, generateAdImage, generatePosterDesign } from '../services/geminiService';
import { generatePrintablePoster, PosterDesign } from '../services/posterService';
import { supabase } from '../services/supabase';
import PayoutsHistory from './PayoutsHistory';
import EnterpriseSuccessManager from './EnterpriseSuccessManager';
// Lazy-load heavy social media SDK helpers when needed to reduce main bundle size
const loadSocialMediaService = () => import('../services/socialMediaService');

// Generate sales data from real revenue data (last 7 days)
const generateSalesData = (revenueByEvent: RevenueByEvent[]) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return days.map((day, index) => {
    const targetDate = last7Days[index];
    const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));

    const daySales = revenueByEvent
      .filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate >= dayStart && eventDate <= dayEnd;
      })
      .reduce((sum, event) => sum + event.gross_revenue, 0);

    const dayTickets = revenueByEvent
      .filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate >= dayStart && eventDate <= dayEnd;
      })
      .reduce((sum, event) => sum + event.tickets_sold, 0);

    return {
      name: day,
      sales: daySales,
      views: dayTickets * 8 // Estimate: 8 views per ticket sold
    };
  });
};

interface DashboardProps {
  user: User;
  onBroadcast?: (notif: Partial<Notification>) => void;
  onUpdateUser: (data: Partial<User>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onBroadcast, onUpdateUser }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'marketing' | 'infra' | 'branding' | 'integrations' | 'affiliate'>('overview');
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [genStage, setGenStage] = useState('');
  const [adCampaign, setAdCampaign] = useState<any[]>([]);
  const [isSuccessManagerOpen, setIsSuccessManagerOpen] = useState(false);
  const [showConnectSuccess, setShowConnectSuccess] = useState(false);
  const [isVerifyingConnect, setIsVerifyingConnect] = useState(false);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [broadcastingTo, setBroadcastingTo] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [campaignTheme, setCampaignTheme] = useState('');
  const [campaignAudience, setCampaignAudience] = useState('general');
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [selectedAdForDeploy, setSelectedAdForDeploy] = useState<any>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Poster generation state
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterDesign, setPosterDesign] = useState<PosterDesign | null>(null);
  const [selectedAdForPoster, setSelectedAdForPoster] = useState<any>(null);

  // Check for Stripe Connect return and verify onboarding status
  useEffect(() => {
    const checkStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const connectStatus = params.get('connect');
      
      if (connectStatus === 'success' || connectStatus === 'refresh') {
        setIsVerifyingConnect(true);
        console.log('Returned from Stripe Connect onboarding, verifying status...');
        
        try {
          const result = await verifyConnectOnboarding(user.id);
          
          if (result?.success) {
            console.log('Connect verification result:', result);
            
            // Update user state with new Connect status
            onUpdateUser({
              stripe_connect_onboarding_complete: result.onboardingComplete,
              stripe_connect_charges_enabled: result.chargesEnabled,
              stripe_connect_payouts_enabled: result.payoutsEnabled,
            });
            
            // Show success message if onboarding completed
            if (result.onboardingComplete) {
              setShowConnectSuccess(true);
              setTimeout(() => setShowConnectSuccess(false), 8000);
            }
          } else {
            console.warn('Connect verification returned no result');
          }
        } catch (error) {
          console.error('Error verifying Connect status:', error);
        } finally {
          setIsVerifyingConnect(false);
          
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    
    checkStripeReturn();
  }, [user.id, onUpdateUser]);

  // Load user's events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const userEvents = await getOrganizerEvents(user.id);
        setEvents(userEvents);
        if (userEvents.length > 0 && !selectedEventId) {
          setSelectedEventId(userEvents[0].id);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    loadEvents();
  }, [user.id, selectedEventId]);

  // Load revenue data
  useEffect(() => {
    const loadRevenue = async () => {
      setIsLoadingRevenue(true);
      try {
        const [summary, byEvent, attendance] = await Promise.all([
          getOrganizerRevenueSummary(user.id),
          getOrganizerRevenue(user.id),
          getOrganizerAttendanceSummary(user.id)
        ]);
        setRevenueSummary(summary);
        setRevenueByEvent(byEvent);
        setAttendanceSummary(attendance);
        // Generate sales chart data from real revenue
        setSalesData(generateSalesData(byEvent));
      } catch (error) {
        console.error('Error loading revenue:', error);
      } finally {
        setIsLoadingRevenue(false);
      }
    };
    loadRevenue();
  }, [user.id]);

  // Load connected social media accounts
  useEffect(() => {
    const loadConnectedAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const { data, error } = await supabase
          .from('social_media_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_connected', true);
        
        if (error) throw error;
        setConnectedAccounts(data || []);
      } catch (error) {
        console.error('Error loading connected accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadConnectedAccounts();
  }, [user.id]);

  // Load affiliate data when affiliate tab is active
  useEffect(() => {
    const loadAffiliateData = async () => {
      if (activeTab !== 'affiliate') return;
      if (user.subscription_tier !== 'premium' && user.subscription_tier !== 'enterprise') return;

      setIsLoadingAffiliate(true);
      try {
        // Ensure user has affiliate partner account
        await createAffiliatePartner(user.id);
        
        // Load stats and referrals
        const [stats, referrals] = await Promise.all([
          getAffiliateStats(user.id),
          getAffiliateReferrals(user.id, 10)
        ]);

        setAffiliateStats(stats);
        setAffiliateReferrals(referrals);
      } catch (error) {
        console.error('Error loading affiliate data:', error);
      } finally {
        setIsLoadingAffiliate(false);
      }
    };

    loadAffiliateData();
  }, [user.id, activeTab, user.subscription_tier]);

  // Edit State
  const [tempBranding, setTempBranding] = useState(user.branding || {
    primaryColor: '#6366f1',
    accentColor: '#818cf8',
    tagline: '',
    customDomain: '',
    bannerUrl: '',
    services: [],
    pageConfig: {
      heroType: 'image',
      heroMedia: '',
      showStats: true,
      showTestimonials: true,
      showTeam: true,
      showPartners: true,
      showMediaCoverage: true,
      showEventHighlights: true,
      enableContactForm: true,
      enableNewsletter: true,
      enableSocialSharing: true,
      enableVIPAccess: false,
      customSections: [],
      layout: 'modern',
      theme: 'dark'
    }
  });
  const [tempBio, setTempBio] = useState(user.bio || '');
  const [tempSlug, setTempSlug] = useState(user.agency_slug || user.agencySlug || '');

  // Enterprise Integration State
  const [integrations, setIntegrations] = useState({
    meta: { connected: true, apiKey: 'pk_meta_live_9201...' },
    google: { connected: true, apiKey: 'google_ads_v14_...' },
    tiktok: { connected: false, apiKey: null },
    x: { connected: true, apiKey: 'x_auth_token_...' }
  });

  // Revenue State
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [revenueByEvent, setRevenueByEvent] = useState<RevenueByEvent[]>([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem[]>([]);

  // Affiliate State
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [affiliateReferrals, setAffiliateReferrals] = useState<AffiliateReferralActivity[]>([]);
  const [isLoadingAffiliate, setIsLoadingAffiliate] = useState(false);
  const [affiliateCodeCopied, setAffiliateCodeCopied] = useState(false);

  // Only gate free users when they have no events yet; free users with events unlocked via credits should have full access
  const isGated = user.subscription_tier === 'free' && !isLoadingEvents && events.length === 0;
  const isEnterprise = user.subscription_tier === 'enterprise';
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const totalRevenue = revenueSummary?.total_gross || 0;
  const totalSold = revenueSummary?.total_tickets_sold || 0;
  const totalTickets = attendanceSummary.reduce((sum, a) => sum + a.total_tickets, 0);
  const totalCheckedIn = attendanceSummary.reduce((sum, a) => sum + a.checked_in, 0);
  const totalCheckInRate = totalTickets > 0 ? Math.round((totalCheckedIn / totalTickets) * 100) : 0;

  // Gate ONLY free users from Dashboard if they have NO events
  // Paid tier users (pro, premium, enterprise) always have access to Dashboard
  // Free users who created events with credits can also manage them here
  if (user.subscription_tier === 'free' && !isLoadingEvents && events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 text-center space-y-8 shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40">
            <LayoutDashboard className="w-12 h-12 text-white" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter text-white">Organizer Dashboard</h1>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed font-medium text-lg">
              Create your first event to access the Dashboard! Free tier users can create events using <span className="text-orange-400 font-bold">15 credits</span> per event, or upgrade to <span className="text-indigo-400 font-bold">Pro</span> (€19.99/mo) for up to 20 events, analytics, and advanced tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <BarChart3 className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Analytics Dashboard</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <Megaphone className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Marketing Tools</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <DollarSign className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Payout History</p>
             </div>
          </div>

          <div className="pt-6 flex flex-col gap-4">
            <Link 
              to="/create" 
              className="w-full bg-orange-600 hover:bg-orange-700 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/30 active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" /> Create Your First Event (15 Credits)
            </Link>
            <Link 
              to="/pricing" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
            >
              Or Upgrade to Pro for Unlimited
            </Link>
            <Link to="/map" className="text-slate-500 hover:text-white font-bold text-sm transition-colors">
              Continue Exploring Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCommitBranding = () => {
    // Ensure pageConfig has all necessary defaults
    const finalBranding = {
      ...tempBranding,
      pageConfig: {
        heroType: tempBranding.pageConfig?.heroType || 'image',
        heroMedia: tempBranding.pageConfig?.heroMedia || '',
        showStats: tempBranding.pageConfig?.showStats !== false,
        showTestimonials: tempBranding.pageConfig?.showTestimonials !== false,
        showTeam: tempBranding.pageConfig?.showTeam !== false,
        showPartners: tempBranding.pageConfig?.showPartners !== false,
        showMediaCoverage: tempBranding.pageConfig?.showMediaCoverage !== false,
        showEventHighlights: tempBranding.pageConfig?.showEventHighlights !== false,
        enableContactForm: tempBranding.pageConfig?.enableContactForm !== false,
        enableNewsletter: tempBranding.pageConfig?.enableNewsletter !== false,
        enableSocialSharing: tempBranding.pageConfig?.enableSocialSharing !== false,
        enableVIPAccess: tempBranding.pageConfig?.enableVIPAccess || false,
        customSections: tempBranding.pageConfig?.customSections || [],
        layout: tempBranding.pageConfig?.layout || 'modern',
        theme: tempBranding.pageConfig?.theme || 'dark'
      }
    };
    
    onUpdateUser({ 
      branding: finalBranding, 
      bio: tempBio,
      agency_slug: tempSlug || undefined
    });
    alert("Agency Shard Updated Successfully.");
  };

  const handleUpdateService = (id: string, field: keyof AgencyService, value: string) => {
    setTempBranding(prev => ({
      ...prev,
      services: prev.services?.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const handleShareAd = async (ad: any) => {
    if (!ad.eventUrl) {
      alert('Event URL not available');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(ad.eventUrl);
      alert('Event link copied to clipboard! Share it with your audience.');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback: show the URL in an alert
      prompt('Copy this event URL:', ad.eventUrl);
    }
  };

  const handleGenerateCampaign = async () => {
    if (!selectedEvent) return;
    if (!campaignTheme.trim()) {
      alert('Please describe your campaign theme and what you want to emphasize.');
      return;
    }
    setIsGeneratingAd(true);
    setGenStage('Analyzing event and campaign theme...');
    
    try {
      // Build event URL for ticket purchases
      const eventUrl = `${window.location.origin}/event/${selectedEvent.id}`;
      
      const campaign = await generateAdCampaign(
        selectedEvent.name, 
        selectedEvent.description, 
        campaignTheme,
        campaignAudience,
        eventUrl,
        user.id,
        user.subscription_tier
      );
      
      setGenStage('Generating professional ad visuals...');
      const campaignWithImages = await Promise.all(campaign.map(async (ad: any) => {
        const platform = ad.platform || '';
        const ratio = platform.includes('Story') ? '9:16' : (platform.includes('Header') ? '16:9' : '1:1');
        const imageUrl = await generateAdImage(ad.visualPrompt, ratio as any, true, user.id, user.subscription_tier);
        return { ...ad, imageUrl, deploying: false, deployed: false, eventUrl };
      }));
      
      setAdCampaign(campaignWithImages);
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes('Insufficient credits')) {
        alert('Insufficient credits for AI generation. Please upgrade your plan.');
      }
    } finally {
      setIsGeneratingAd(false);
      setGenStage('');
    }
  };

  const handleGeneratePoster = async (ad: any) => {
    if (!selectedEvent) {
      alert('No event selected');
      return;
    }
    
    setIsGeneratingPoster(true);
    setSelectedAdForPoster(ad);
    
    try {
      // Generate poster design using AI
      const design = await generatePosterDesign(
        selectedEvent.name,
        selectedEvent.description,
        selectedEvent.category,
        campaignTheme || 'Professional event promotion',
        user.id,
        user.subscription_tier
      );

      if (design && design.colorScheme) {
        // Generate poster image based on design
        const posterImageUrl = await generateAdImage(
          design.imageUrl,
          '16:9',
          false,
          user.id,
          user.subscription_tier
        );

        const finalDesign: PosterDesign = {
          ...design,
          imageUrl: posterImageUrl || design.imageUrl
        };

        setPosterDesign(finalDesign);

        // Generate and download PDF
        await generatePrintablePoster(selectedEvent, finalDesign, true);
        
        alert('✅ Poster generated and downloaded! Ready to print and display.');
      } else {
        alert('Failed to generate poster design. Please try again.');
      }
    } catch (error) {
      console.error('Poster generation error:', error);
      if (error instanceof Error && error.message.includes('Insufficient credits')) {
        alert('Insufficient credits for poster generation. Please upgrade your plan.');
      } else {
        alert('Failed to generate poster. Please try again.');
      }
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleDeployAd = async (index: number) => {
    const ad = adCampaign[index];
    setSelectedAdForDeploy({ ...ad, index });
    setDeployModalOpen(true);
  };

  const handleConfirmDeploy = async (platform: string) => {
    if (!selectedAdForDeploy) return;
    
    const index = selectedAdForDeploy.index;
    setAdCampaign(prev => prev.map((ad, i) => i === index ? { ...ad, deploying: true } : ad));
    setDeployModalOpen(false);
    
    try {
      const account = connectedAccounts.find(acc => acc.platform === platform);
      if (!account) {
        throw new Error(`No connected account found for ${platform}. Please connect your account in the Profile > Social Media Manager section.`);
      }

      const ad = selectedAdForDeploy;
      const { postToFacebook, postToInstagram, postToTwitter, postToLinkedIn } = await loadSocialMediaService();
      let result;

      // Map platform names to deployment functions
      switch (platform) {
        case 'facebook':
          result = await postToFacebook(
            account.access_token,
            account.account_id,
            `${ad.headline}\n\n${ad.bodyCopy}\n\n${ad.cta}`,
            ad.imageUrl,
            ad.eventUrl
          );
          break;
        
        case 'instagram':
          if (!ad.imageUrl) {
            throw new Error('Instagram requires an image');
          }
          result = await postToInstagram(
            account.access_token,
            account.account_id,
            `${ad.headline}\n\n${ad.bodyCopy}\n\n${ad.cta}`,
            ad.imageUrl
          );
          break;
        
        case 'linkedin':
          result = await postToLinkedIn(
            account.access_token,
            account.account_id,
            `${ad.headline}\n\n${ad.bodyCopy}\n\n${ad.cta}`,
            ad.imageUrl
          );
          break;
        
        case 'twitter':
          result = await postToTwitter(
            account.access_token,
            `${ad.headline}\n\n${ad.bodyCopy}\n\n${ad.cta}`,
            ad.imageUrl
          );
          break;
        
        default:
          throw new Error(`Platform ${platform} not supported`);
      }

      if (result.success) {
        setAdCampaign(prev => prev.map((ad, i) => 
          i === index ? { ...ad, deploying: false, deployed: true, deployedTo: platform } : ad
        ));
        alert(`✅ Successfully posted to ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`);
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Ad deployment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Deployment failed: ${errorMessage}`);
      setAdCampaign(prev => prev.map((ad, i) => i === index ? { ...ad, deploying: false } : ad));
    }
  };

  const primaryColor = isEnterprise && user.branding ? user.branding.primaryColor : '#6366f1';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 relative min-h-screen pb-32">
      {/* Stripe Connect Success Banner */}
      {showConnectSuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-right duration-300">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl p-6 shadow-2xl border-2 border-emerald-400/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white mb-1">Bank Account Connected!</h3>
                <p className="text-emerald-50 text-sm font-medium">
                  ✓ Your Stripe Connect setup is complete. You'll receive payouts automatically 2 days after each event.
                </p>
              </div>
              <button 
                onClick={() => setShowConnectSuccess(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verifying Connect Status Indicator */}
      {isVerifyingConnect && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-4 shadow-xl border border-slate-700 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-white font-medium">Verifying bank connection...</span>
          </div>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6 ${isGated ? 'opacity-20 pointer-events-none' : ''}`}>
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white flex items-center gap-3 md:gap-4">
             {isEnterprise ? <Rocket className="w-10 h-10" style={{ color: primaryColor }} /> : <LayoutDashboard className="w-10 h-10 text-indigo-500" />}
             {isEnterprise ? 'Nexus Global Agency' : 'Organizer Studio'}
             {user.subscription_tier === 'premium' && <span className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full">Premium</span>}
          </h1>
          <p className="text-slate-400 font-medium text-lg">Managing <strong className="text-white">{events.length}</strong> active events across the global platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {/* Enterprise Success Manager Button */}
          {isEnterprise && (
            <button 
              onClick={() => setIsSuccessManagerOpen(true)} 
              className="flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Sparkles className="w-4 h-4 relative z-10" /> 
              <span className="relative z-10">Success Manager</span>
              <span className="text-[8px] bg-emerald-500 px-2 py-0.5 rounded-full relative z-10">24/7</span>
            </button>
          )}
          <button onClick={() => navigate('/scanner')} className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95">
            <Scan className="w-4 h-4" /> Entry Control
          </button>
        </div>
      </div>

      {/* Stripe Connect Onboarding Banner - Only show on Overview tab, not on Payouts tab */}
      {!user.stripe_connect_onboarding_complete && events.some(e => e.price > 0) && activeTab === 'overview' && (
        <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-600/50 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <DollarSign className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Connect Your Bank Account</h3>
              <p className="text-gray-300 mb-4">
                To receive payouts from ticket sales, complete your Stripe Connect setup. It only takes 5 minutes! Funds are automatically transferred to your bank account 2 days after each event concludes.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center text-sm text-gray-200">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Secure & encrypted
                </div>
                <div className="flex items-center text-sm text-gray-200">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Automated payouts 2 days after events
                </div>
                <div className="flex items-center text-sm text-gray-200">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Track all earnings
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('create-connect-account', {
                      body: { userId: user.id, email: user.email }
                    });
                    if (error) throw error;
                    if (data?.url) {
                      window.location.href = data.url;
                    }
                  } catch (error) {
                    console.error('Failed to create Connect account:', error);
                    alert('Failed to start setup. Please try again.');
                  }
                }}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold rounded-xl transition-all active:scale-95 shadow-lg"
              >
                Connect Bank Account (5 min)
              </button>
            </div>
            <button className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {user.stripe_connect_onboarding_complete && !user.stripe_connect_charges_enabled && (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-2 border-blue-600/50 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <Clock className="w-10 h-10 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Payment Setup In Progress</h3>
              <p className="text-gray-300">
                Your Stripe account is being reviewed. This usually takes 1-2 business days. You'll be notified when you can start receiving payments.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`flex gap-2 sm:gap-4 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-hide snap-x snap-mandatory ${isGated ? 'opacity-20 pointer-events-none' : ''}`}>
         <TabBtn label="Insights" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 />} title="View revenue, attendance, and event performance metrics" />
         <TabBtn label="Payouts" active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} icon={<DollarSign />} title="Track earnings and bank transfers from ticket sales" />
         <TabBtn label="Marketing Studio" active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} icon={<Megaphone />} title="AI-powered campaign creation and social media automation" />
         {(user.subscription_tier === 'premium' || user.subscription_tier === 'enterprise') && <TabBtn label="Affiliate Tools" active={activeTab === 'affiliate'} onClick={() => setActiveTab('affiliate')} icon={<Users />} title="Create referral links and track partner commissions" />}
         {isEnterprise && <TabBtn label="Service Hub" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} icon={<Link2 />} title="Manage social media integrations and API connections" />}
         {isEnterprise && <TabBtn label="White-Labeling" active={activeTab === 'branding'} onClick={() => setActiveTab('branding')} icon={<Palette />} title="Customize your dashboard appearance and public profile" />}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard title="Gross Volume" value={`€${totalRevenue.toLocaleString()}`} change="+12.5%" icon={<DollarSign />} color="emerald" />
            <StatCard title="Active Tickets" value={totalSold.toLocaleString()} change="+18.2%" icon={<TicketIcon />} color="indigo" />
            <StatCard
              title="Checked-in Attendees"
              value={`${totalCheckedIn.toLocaleString()} / ${totalTickets.toLocaleString()}`}
              change={`${totalCheckInRate}% checked in`}
              icon={<Users />}
              color="emerald"
            />
            <StatCard
              title="Check-in Rate"
              value={`${totalCheckInRate}%`}
              change={totalTickets > 0 ? `${totalCheckedIn.toLocaleString()} attendees` : 'Awaiting scans'}
              icon={<CheckCircle />}
              color="blue"
            />
          </div>

          {/* Revenue Breakdown Section */}
          {!isLoadingRevenue && revenueSummary && (
            <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-800/50 rounded-[48px] p-10 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3">
                    <DollarSign className="text-emerald-400" /> Revenue Breakdown
                  </h3>
                  <p className="text-slate-400 font-medium text-sm mt-2">Real-time ticket sales and payouts for all events</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full">
                  {revenueSummary.total_events} Events
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Gross</p>
                  <h4 className="text-3xl font-black text-white">€{revenueSummary.total_gross.toFixed(2)}</h4>
                  <p className="text-xs text-slate-400 font-medium">From {revenueSummary.total_tickets_sold} tickets</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Platform Fees</p>
                  <h4 className="text-3xl font-black text-orange-400">€{revenueSummary.total_platform_fees.toFixed(2)}</h4>
                  <p className="text-xs text-slate-400 font-medium">{user.subscription_tier} tier rate</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stripe Fees</p>
                  <h4 className="text-3xl font-black text-blue-400">€{revenueSummary.total_stripe_fees.toFixed(2)}</h4>
                  <p className="text-xs text-slate-400 font-medium">2.9% + €0.25/tx</p>
                </div>
                <div className="bg-slate-900/50 border border-emerald-800 rounded-2xl p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Net Revenue</p>
                  <h4 className="text-3xl font-black text-emerald-400">€{revenueSummary.total_net.toFixed(2)}</h4>
                  <p className="text-xs text-emerald-400 font-bold">Your earnings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Pending Payouts</p>
                    <Clock className="w-4 h-4 text-yellow-500" />
                  </div>
                  <h4 className="text-3xl font-black text-white">€{revenueSummary.pending_amount.toFixed(2)}</h4>
                  <p className="text-xs text-slate-400 font-medium">Processing soon</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Paid Out</p>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="text-3xl font-black text-white">€{revenueSummary.paid_amount.toFixed(2)}</h4>
                  <p className="text-xs text-slate-400 font-medium">Already transferred</p>
                </div>
              </div>

              {/* Per-Event Revenue Table */}
              {revenueByEvent.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h4 className="font-black text-white text-lg">Revenue by Event</h4>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-950 border-b border-slate-800">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Event</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Tickets</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Gross</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Fee</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Stripe</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Net</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Status</th>
                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {revenueByEvent.map((event) => (
                            <tr key={event.event_id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-3 sm:px-6 py-3 sm:py-4">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <div className="flex-1 min-w-[140px] sm:min-w-0">
                                    <div className="font-bold text-white text-xs sm:text-sm truncate">{event.event_name}</div>
                                    <div className="text-[10px] sm:text-xs text-slate-500">{new Date(event.event_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                                  </div>
                                  <Link 
                                    to={`/event/${event.event_id}`}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 transition-all text-xs font-bold whitespace-nowrap"
                                    target="_blank"
                                    title="View event page"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View
                                  </Link>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-white font-bold">{event.tickets_sold}</td>
                              <td className="px-6 py-4 text-right text-white font-bold">€{event.gross_revenue.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right text-orange-400 font-bold">-€{event.platform_fee_amount.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right text-blue-400 font-bold">-€{event.stripe_fee_amount.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right text-emerald-400 font-black">€{event.net_revenue.toFixed(2)}</td>
                              <td className="px-6 py-4 text-center">
                                {event.payout_status === 'paid' && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">
                                    <CheckCircle className="w-3 h-3" /> Paid
                                  </span>
                                )}
                                {event.payout_status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                )}
                                {event.payout_status === 'processing' && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase">
                                    <RefreshCcw className="w-3 h-3" /> Processing
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {event.tickets_sold === 0 ? (
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete "${event.event_name}"?\n\nThis action cannot be undone.`)) return;
                                      
                                      const result = await safeDeleteEvent(event.event_id);
                                      if (result.success) {
                                        alert('✅ Event deleted successfully');
                                        // Reload revenue data
                                        const newRevenue = await getOrganizerRevenue(user.id);
                                        setRevenueByEvent(newRevenue);
                                      } else {
                                        alert(`❌ ${result.message}`);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-all text-xs font-bold"
                                    title="Delete event (no tickets sold)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                ) : (
                                  <span 
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 text-xs font-bold cursor-not-allowed"
                                    title={`Cannot delete: ${event.tickets_sold} ticket${event.tickets_sold > 1 ? 's' : ''} sold`}
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    Locked
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {attendanceSummary.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3">
                    <Users className="text-emerald-400" /> Attendance
                  </h3>
                  <p className="text-slate-400 font-medium text-sm mt-2">Check-ins versus purchased tickets across your events</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full">
                    {totalCheckedIn.toLocaleString()} checked-in
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full">
                    {totalTickets.toLocaleString()} purchased
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full">
                    {totalCheckInRate}% rate
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden -mx-4 sm:mx-0">
                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full">
                    <thead className="bg-slate-950 border-b border-slate-800">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Event</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Purchased</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Checked-in</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Rate</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-slate-500 whitespace-nowrap">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {attendanceSummary.map((item) => {
                        const rate = item.total_tickets > 0 ? Math.round((item.checked_in / item.total_tickets) * 100) : 0;
                        return (
                          <tr key={item.event_id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <div className="font-bold text-white text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{item.name}</div>
                              <div className="text-[10px] sm:text-xs text-slate-500">{item.date ? new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-white font-bold text-xs sm:text-sm">{item.total_tickets.toLocaleString()}</td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-emerald-400 font-bold text-xs sm:text-sm">{item.checked_in.toLocaleString()}</td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <div className="w-16 sm:w-24 bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-white font-black text-xs sm:text-sm whitespace-nowrap">{rate}%</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-slate-400 font-medium text-[10px] sm:text-xs whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {isLoadingRevenue && (
            <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 flex items-center justify-center">
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Loading revenue data...</span>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl space-y-8">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight text-white">Experience Sales Velocity</h3>
                <div className="flex gap-2">
                   <button className="px-4 py-2 bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400">7D</button>
                   <button className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase text-white">30D</button>
                </div>
             </div>
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={salesData}>
                      <defs>
                         <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={4} fill="url(#colorSales)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Advanced Analytics for Premium+ */}
          {(user.subscription_tier === 'premium' || user.subscription_tier === 'enterprise') && (
            <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-800/50 rounded-[48px] p-10 space-y-8">
               <div className="flex justify-between items-center">
                  <div>
                     <h3 className="text-2xl font-black text-white flex items-center gap-3">
                        <Sparkles className="text-yellow-400" /> Advanced Attendee Analytics
                     </h3>
                     <p className="text-slate-400 font-medium text-sm mt-2">Premium-only deep insights and behavioral patterns</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-4 py-2 rounded-full">Premium Feature</span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avg. Ticket Value</p>
                     <h4 className="text-3xl font-black text-white">
                       €{revenueSummary && revenueSummary.total_tickets_sold > 0 
                         ? (revenueSummary.total_gross / revenueSummary.total_tickets_sold).toFixed(2)
                         : '0.00'}
                     </h4>
                     <p className="text-xs text-slate-400 font-medium">Per ticket sold</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Events</p>
                     <h4 className="text-3xl font-black text-white">{revenueSummary?.total_events || 0}</h4>
                     <p className="text-xs text-slate-400 font-medium">Events created</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Margin</p>
                     <h4 className="text-3xl font-black text-white">
                       {revenueSummary && revenueSummary.total_gross > 0
                         ? ((revenueSummary.total_net / revenueSummary.total_gross) * 100).toFixed(1)
                         : '0.0'}%
                     </h4>
                     <p className="text-xs text-emerald-400 font-bold">After fees</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tickets Sold</p>
                     <h4 className="text-3xl font-black text-white">{revenueSummary?.total_tickets_sold || 0}</h4>
                     <p className="text-xs text-indigo-400 font-bold">All events</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                     <h4 className="font-black text-white">Event Categories</h4>
                     <div className="space-y-3">
                        {(() => {
                          const categoryRevenue: Record<string, number> = {};
                          const total = revenueByEvent.reduce((sum, event) => {
                            const category = events.find(e => e.id === event.event_id)?.category || 'Other';
                            categoryRevenue[category] = (categoryRevenue[category] || 0) + event.gross_revenue;
                            return sum + event.gross_revenue;
                          }, 0);
                          
                          const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500'];
                          return Object.entries(categoryRevenue)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 4)
                            .map(([category, revenue], i) => {
                              const percent = total > 0 ? Math.round((revenue / total) * 100) : 0;
                              return (
                                <div key={i} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">{category}</span>
                                    <span className="text-white font-black">{percent}%</span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div className={`h-full ${colors[i % colors.length]}`} style={{ width: `${percent}%` }} />
                                  </div>
                                </div>
                              );
                            });
                        })()}
                     </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                     <h4 className="font-black text-white">Revenue by Status</h4>
                     <div className="space-y-3">
                        {(() => {
                          const statusRevenue: Record<string, { revenue: number; color: string }> = {
                            'paid': { revenue: 0, color: 'bg-emerald-500' },
                            'pending': { revenue: 0, color: 'bg-yellow-500' },
                            'processing': { revenue: 0, color: 'bg-blue-500' }
                          };
                          
                          const total = revenueByEvent.reduce((sum, event) => {
                            const status = event.payout_status || 'pending';
                            if (statusRevenue[status]) {
                              statusRevenue[status].revenue += event.net_revenue;
                            }
                            return sum + event.net_revenue;
                          }, 0);
                          
                          return Object.entries(statusRevenue)
                            .filter(([, data]) => data.revenue > 0)
                            .sort(([,a], [,b]) => b.revenue - a.revenue)
                            .map(([status, data], i) => {
                              const percent = total > 0 ? Math.round((data.revenue / total) * 100) : 0;
                              return (
                                <div key={i} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium capitalize">{status}</span>
                                    <span className="text-white font-black">{percent}%</span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div className={`h-full ${data.color}`} style={{ width: `${percent}%` }} />
                                  </div>
                                </div>
                              );
                            });
                        })()}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="animate-in fade-in duration-500">
          <PayoutsHistory userId={user.id} user={user} />
        </div>
      )}

      {activeTab === 'marketing' && (
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
                      const platformIcons: any = {
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
                       >
                          {isGeneratingAd ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles size={18} /> Generate Ads</>}
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
                                 >
                                    {ad.deploying ? <Loader2 size={12} className="animate-spin" /> : ad.deployed ? <><CheckCircle size={12}/> Published</> : <><CloudUpload size={12}/> Deploy Ad</>}
                                 </button>
                                 <button 
                                   onClick={() => handleGeneratePoster(ad)}
                                   disabled={isGeneratingPoster}
                                   className="p-4 bg-slate-950 border border-slate-800 hover:border-orange-600 rounded-xl text-slate-500 hover:text-orange-400 transition-all"
                                   title="Generate printable poster with QR code"
                                 >
                                   {isGeneratingPoster ? <Loader2 size={14} className="animate-spin" /> : <Download size={14}/>}
                                 </button>
                                 <button 
                                   onClick={() => handleShareAd(ad)}
                                   className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"
                                   title="Copy event link"
                                 >
                                   <Share2 size={14}/>
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
      )}

      {activeTab === 'branding' && (
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
                             <input type="color" value={tempBranding.primaryColor} onChange={(e) => setTempBranding({...tempBranding, primaryColor: e.target.value})} className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-xl" />
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
                            onChange={(e) => setTempBranding({...tempBranding, tagline: e.target.value})} 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-bold" 
                            placeholder="Experience Orchestrators"
                          />
                       </div>

                       <div className="pt-4 space-y-6 border-t border-slate-800">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Featured Service Shards</h4>
                          <div className="space-y-6">
                             {tempBranding.services?.map((service) => (
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
                            onChange={(e) => setTempBranding({...tempBranding, about: e.target.value})} 
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
                            onChange={(e) => setTempBranding({...tempBranding, videoReel: e.target.value})} 
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
                            onChange={(e) => setTempBranding({...tempBranding, customDomain: e.target.value})} 
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
                          {tempBranding.services?.slice(0, 2).map((s) => (
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
      )}

      {activeTab === 'affiliate' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-800/50 rounded-[48px] p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl">
                 <Users className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                 <h2 className="text-4xl font-black tracking-tighter text-white">Affiliate Marketing Tools</h2>
                 <p className="text-slate-400 max-w-2xl mx-auto font-medium text-lg leading-relaxed">
                    Grow your network and earn commissions by referring new organizers to EventNexus. Track performance in real-time.
                 </p>
              </div>
           </div>

           {isLoadingAffiliate ? (
              <div className="flex items-center justify-center py-20">
                 <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
           ) : affiliateStats ? (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-4">
                       <div className="flex justify-between items-start">
                          <div className="p-4 bg-emerald-500/10 rounded-2xl">
                             <DollarSign className="w-8 h-8 text-emerald-400" />
                          </div>
                          {affiliateStats.total_earnings > 0 && (
                             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                                ${affiliateStats.pending_payout.toFixed(2)} pending
                             </span>
                          )}
                       </div>
                       <div>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Earnings</p>
                          <h3 className="text-4xl font-black text-white mt-2">${affiliateStats.total_earnings.toFixed(2)}</h3>
                          <p className="text-slate-500 text-xs font-medium mt-1">From {affiliateStats.total_conversions} conversions</p>
                       </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-4">
                       <div className="flex justify-between items-start">
                          <div className="p-4 bg-indigo-500/10 rounded-2xl">
                             <Users className="w-8 h-8 text-indigo-400" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                             {affiliateStats.status}
                          </span>
                       </div>
                       <div>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Referrals</p>
                          <h3 className="text-4xl font-black text-white mt-2">{affiliateStats.active_referrals}</h3>
                          <p className="text-slate-500 text-xs font-medium mt-1">
                             {affiliateStats.pro_referrals} Pro, {affiliateStats.premium_referrals} Premium, {affiliateStats.enterprise_referrals} Enterprise
                          </p>
                       </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-4">
                       <div className="flex justify-between items-start">
                          <div className="p-4 bg-violet-500/10 rounded-2xl">
                             <TrendingUp className="w-8 h-8 text-violet-400" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">Lifetime</span>
                       </div>
                       <div>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Conversion Rate</p>
                          <h3 className="text-4xl font-black text-white mt-2">{affiliateStats.conversion_rate.toFixed(1)}%</h3>
                          <p className="text-slate-500 text-xs font-medium mt-1">
                             {affiliateStats.total_conversions} of {affiliateStats.total_referrals} referrals
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 space-y-8">
                    <div className="flex justify-between items-center">
                       <h3 className="text-2xl font-black text-white">Your Affiliate Link</h3>
                       <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full">Premium Feature</span>
                    </div>
                    <div className="flex gap-4 items-center">
                       <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 font-mono text-sm text-slate-400">
                          https://eventnexus.eu/signup?ref={affiliateStats.affiliate_code}
                       </div>
                       <button 
                          onClick={() => {
                             navigator.clipboard.writeText(`https://eventnexus.eu/signup?ref=${affiliateStats.affiliate_code}`);
                             setAffiliateCodeCopied(true);
                             setTimeout(() => setAffiliateCodeCopied(false), 2000);
                          }}
                          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 flex items-center gap-2"
                       >
                          {affiliateCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {affiliateCodeCopied ? 'Copied!' : 'Copy Link'}
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                       <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Commission Rate</p>
                          <p className="text-3xl font-black text-white">{affiliateStats.commission_rate}%</p>
                          <p className="text-slate-500 text-xs font-medium mt-1">Recurring monthly</p>
                       </div>
                       <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Cookie Duration</p>
                          <p className="text-3xl font-black text-white">{affiliateStats.cookie_duration_days} Days</p>
                          <p className="text-slate-500 text-xs font-medium mt-1">Attribution window</p>
                       </div>
                       <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Payout Cycle</p>
                          <p className="text-3xl font-black text-white">Monthly</p>
                          <p className="text-slate-500 text-xs font-medium mt-1">Via Stripe Connect</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 space-y-6">
                    <h3 className="text-2xl font-black text-white">Referral Activity</h3>
                    {affiliateReferrals.length === 0 ? (
                       <div className="text-center py-12">
                          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                          <p className="text-slate-500 font-medium">No referrals yet. Share your affiliate link to start earning!</p>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          {affiliateReferrals.map((ref) => {
                             const tierPrices: Record<string, number> = { pro: 19.99, premium: 49.99, enterprise: 199.99 };
                             const price = ref.subscription_tier ? tierPrices[ref.subscription_tier] || 0 : 0;
                             const commission = (price * affiliateStats.commission_rate / 100).toFixed(2);
                             
                             return (
                                <div key={ref.id} className="flex items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg">
                                         {ref.referred_user_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                         <p className="font-black text-white">{ref.referred_user_name}</p>
                                         <p className="text-sm text-slate-500 font-medium">
                                            {ref.subscription_tier ? `${ref.subscription_tier.charAt(0).toUpperCase() + ref.subscription_tier.slice(1)} Plan` : 'Pending'} • {ref.days_ago}
                                         </p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      {ref.conversion_status === 'converted' && ref.subscription_tier ? (
                                         <>
                                            <div className="text-right">
                                               <p className="font-black text-emerald-400">${price.toFixed(2)}</p>
                                               <p className="text-xs text-slate-500 font-medium">+${commission} commission</p>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                               Active
                                            </span>
                                         </>
                                      ) : (
                                         <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                                            Pending
                                         </span>
                                      )}
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    )}
                 </div>
              </>
           ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 text-center">
                 <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                 <p className="text-slate-400 font-medium">Unable to load affiliate data. Please try again later.</p>
              </div>
           )}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-12 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <IntegrationCard icon={<Facebook />} title="Meta Suite" desc="Sync events to Instagram Discovery." status="Connected" />
              <IntegrationCard icon={<Chrome />} title="Google Ads" desc="SEM triggers for ticket scarcity." status="Connected" />
              <IntegrationCard icon={<TikTok />} title="TikTok Pixel" desc="Track conversion from creators." status="Disconnected" />
           </div>
           <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
              <div className="space-y-4">
                 <h3 className="text-3xl font-black text-white tracking-tighter">API & Service Hub</h3>
                 <p className="text-slate-500 font-medium max-w-lg leading-relaxed">Broadcast event lifecycle updates directly to your CRM via webhooks.</p>
              </div>
              <button className="px-10 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all">Setup Webhooks</button>
           </div>
        </div>
      )}

      {/* Enterprise Success Manager Chat */}
      {isEnterprise && (
        <EnterpriseSuccessManager 
          user={user}
          isOpen={isSuccessManagerOpen}
          onClose={() => setIsSuccessManagerOpen(false)}
        />
      )}

      {/* Deploy Ad Modal */}
      {deployModalOpen && selectedAdForDeploy && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[48px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-8 space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter">Deploy Ad</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">Choose where to publish your ad</p>
                </div>
                <button 
                  onClick={() => setDeployModalOpen(false)}
                  className="p-3 bg-slate-950 rounded-xl text-slate-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Ad Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] overflow-hidden">
                <div className="aspect-[16/9] relative">
                  <img src={selectedAdForDeploy.imageUrl} className="w-full h-full object-cover opacity-60" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 bg-slate-950/80 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-indigo-400 border border-slate-800">
                    {selectedAdForDeploy.platform}
                  </div>
                </div>
                <div className="p-6 space-y-2">
                  <h4 className="text-lg font-black text-white">{selectedAdForDeploy.headline}</h4>
                  <p className="text-sm text-slate-400 font-medium line-clamp-2">{selectedAdForDeploy.bodyCopy}</p>
                </div>
              </div>

              {/* Connected Accounts Status */}
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Connected Accounts</h3>
                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  </div>
                ) : connectedAccounts.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <AlertCircle className="w-12 h-12 text-slate-700 mx-auto" />
                    <p className="text-slate-500 font-medium">No social media accounts connected</p>
                    <Link 
                      to="/profile"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all"
                    >
                      <Settings2 size={14} />
                      Connect Accounts
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['facebook', 'instagram', 'linkedin', 'twitter'].map(platform => {
                      const account = connectedAccounts.find(acc => acc.platform === platform);
                      const platformIcons: any = {
                        facebook: <Facebook size={20} />,
                        instagram: <Instagram size={20} />,
                        linkedin: <Linkedin size={20} />,
                        twitter: <Twitter size={20} />
                      };
                      const platformColors: any = {
                        facebook: 'from-blue-600 to-blue-700',
                        instagram: 'from-pink-600 via-purple-600 to-orange-600',
                        linkedin: 'from-blue-700 to-blue-800',
                        twitter: 'from-sky-500 to-blue-600'
                      };
                      
                      return (
                        <button
                          key={platform}
                          onClick={() => account ? handleConfirmDeploy(platform) : null}
                          disabled={!account}
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                            account 
                              ? `bg-gradient-to-br ${platformColors[platform]} border-transparent text-white hover:scale-105 shadow-lg cursor-pointer`
                              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {platformIcons[platform]}
                          <div className="flex-1 text-left">
                            <p className="font-black text-sm capitalize">{platform}</p>
                            <p className="text-xs font-medium opacity-80">
                              {account ? account.account_name : 'Not connected'}
                            </p>
                          </div>
                          {account && <CloudUpload size={16} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeployModalOpen(false)}
                  className="flex-1 py-4 bg-slate-950 border border-slate-800 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ label, active, onClick, icon, title }: any) => (
  <button onClick={onClick} title={title} className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all shrink-0 ${active ? 'border-indigo-600 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
    {React.cloneElement(icon, { className: 'w-4 h-4' })}
    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{label}</span>
  </button>
);

const StatCard = ({ title, value, change, icon, color }: any) => {
  const colorMap: any = {
    indigo: 'bg-indigo-500/10 text-indigo-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    violet: 'bg-violet-500/10 text-violet-400',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] hover:border-slate-700 transition-all group shadow-xl">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          {React.cloneElement(icon, { className: 'w-7 h-7' })}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full ${colorMap[color]} uppercase tracking-tighter`}>
          {change} <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-4xl font-black mt-2 tracking-tighter text-white">{value}</h3>
    </div>
  );
};

const IntegrationCard = ({ icon, title, desc, status }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] space-y-6 hover:border-indigo-500/50 transition-all shadow-xl group">
    <div className="flex justify-between items-start">
       <div className="p-5 bg-slate-950 rounded-[32px] border border-slate-800 text-slate-400 group-hover:text-indigo-400 transition-colors">
          {React.cloneElement(icon, { size: 32 })}
       </div>
       <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${status === 'Connected' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
          {status}
       </div>
    </div>
    <div className="space-y-2">
       <h4 className="text-xl font-black text-white tracking-tight">{title}</h4>
       <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
    <button className="w-full py-4 bg-slate-950 border border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
       Manage
    </button>
  </div>
);

export default Dashboard;
