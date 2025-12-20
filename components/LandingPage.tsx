
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Zap, Shield, Globe, Map as MapIcon, ChevronRight, Star, Plus, ArrowRight, Gift } from 'lucide-react';
import { User, PlatformCampaign } from '../types';
import { getCampaigns } from '../services/dbService';
import { supabase } from '../services/supabase';

interface LandingPageProps {
  user: User | null;
  onOpenAuth: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ user, onOpenAuth }) => {
  const navigate = useNavigate();
  const [activeBanner, setActiveBanner] = useState<PlatformCampaign | null>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

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
    }
    onOpenAuth();
  };

  const handleCreateEvent = () => {
    if (user) navigate('/create');
    else onOpenAuth();
  };

  return (
    <div className="space-y-24 pb-24">
      {/* Active Growth Campaign Banner */}
      {activeBanner && !user && (
        <section className="px-4 pt-10">
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
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
            Discover, Create, <br />
            <span className="text-indigo-500">Experience.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
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
          description="Fraud-proof QR codes and instant validation. Secure payments via Stripe and PayPal." 
        />
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
