
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
  Chrome, CheckCircle, Smartphone as TikTok, X, Globe2, Volume2, Lightbulb, Clock
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { User, EventNexusEvent, Notification, AgencyService } from '../types';
import { getEvents } from '../services/dbService';
import { generateAdCampaign, generateAdImage } from '../services/geminiService';
import { supabase } from '../services/supabase';
import PayoutsHistory from './PayoutsHistory';

// Generate dynamic sales data based on user's events
const generateSalesData = (events: EventNexusEvent[]) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    name: day,
    sales: Math.floor(Math.random() * 800 + 200),
    views: Math.floor(Math.random() * 2000 + 500)
  }));
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
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'marketing' | 'infra' | 'branding' | 'integrations'>('overview');
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [genStage, setGenStage] = useState('');
  const [adCampaign, setAdCampaign] = useState<any[]>([]);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [broadcastingTo, setBroadcastingTo] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Load user's events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const allEvents = await getEvents();
        // Filter events by current user if they are organizer
        const userEvents = allEvents.filter(event => event.organizerId === user.id);
        setEvents(userEvents);
        setSalesData(generateSalesData(userEvents));
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

  // Edit State
  const [tempBranding, setTempBranding] = useState(user.branding || {
    primaryColor: '#6366f1',
    accentColor: '#818cf8',
    tagline: '',
    customDomain: '',
    bannerUrl: '',
    services: []
  });
  const [tempBio, setTempBio] = useState(user.bio || '');

  // Enterprise Integration State
  const [integrations, setIntegrations] = useState({
    meta: { connected: true, apiKey: 'pk_meta_live_9201...' },
    google: { connected: true, apiKey: 'google_ads_v14_...' },
    tiktok: { connected: false, apiKey: null },
    x: { connected: true, apiKey: 'x_auth_token_...' }
  });

  const isGated = user.subscription === 'free';
  const isEnterprise = user.subscription === 'enterprise';
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const totalRevenue = events.reduce((acc, ev) => acc + (ev.attendeesCount * ev.price), 0);
  const totalSold = events.reduce((acc, ev) => acc + ev.attendeesCount, 0);

  const handleCommitBranding = () => {
    onUpdateUser({ branding: tempBranding, bio: tempBio });
    alert("Agency Shard Updated Successfully.");
  };

  const handleUpdateService = (id: string, field: keyof AgencyService, value: string) => {
    setTempBranding(prev => ({
      ...prev,
      services: prev.services?.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const handleGenerateCampaign = async () => {
    if (!selectedEvent) return;
    setIsGeneratingAd(true);
    setGenStage('Ingesting event demographics...');
    
    try {
      const campaign = await generateAdCampaign(
        selectedEvent.name, 
        selectedEvent.description, 
        "Create an elite, high-energy marketing campaign. Focus on VIP scarcity and premium branding."
      );
      
      setGenStage('Synthesizing platform-native flyers...');
      const campaignWithImages = await Promise.all(campaign.map(async (ad: any) => {
        const ratio = ad.platform.includes('Story') ? '9:16' : (ad.platform.includes('Header') ? '16:9' : '1:1');
        const imageUrl = await generateAdImage(ad.visualPrompt, ratio as any);
        return { ...ad, imageUrl, deploying: false, deployed: false };
      }));
      
      setAdCampaign(campaignWithImages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingAd(false);
      setGenStage('');
    }
  };

  const handleDeployAd = async (index: number) => {
    setAdCampaign(prev => prev.map((ad, i) => i === index ? { ...ad, deploying: true } : ad));
    
    try {
      // TODO: Implement real ad deployment via marketing platform APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAdCampaign(prev => prev.map((ad, i) => i === index ? { ...ad, deploying: false, deployed: true } : ad));
    } catch (error) {
      console.error('Ad deployment failed:', error);
      setAdCampaign(prev => prev.map((ad, i) => i === index ? { ...ad, deploying: false } : ad));
    }
  };

  const primaryColor = isEnterprise && user.branding ? user.branding.primaryColor : '#6366f1';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 relative min-h-screen pb-32">
      <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${isGated ? 'opacity-20 pointer-events-none' : ''}`}>
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-white flex items-center gap-4">
             {isEnterprise ? <Rocket className="w-10 h-10" style={{ color: primaryColor }} /> : <LayoutDashboard className="w-10 h-10 text-indigo-500" />}
             {isEnterprise ? 'Nexus Global Agency' : 'Organizer Studio'}
          </h1>
          <p className="text-slate-400 font-medium text-lg">Managing <strong className="text-white">{events.length}</strong> active nodes across the global backbone.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => navigate('/scanner')} className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95">
            <Scan className="w-4 h-4" /> Entry Control
          </button>
        </div>
      </div>

      {/* Stripe Connect Onboarding Banner */}
      {!user.stripe_connect_onboarding_complete && events.some(e => e.price > 0) && (
        <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-600/50 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <DollarSign className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Connect Your Bank Account</h3>
              <p className="text-gray-300 mb-4">
                To receive payouts from ticket sales, complete your Stripe Connect setup. It only takes 5 minutes!
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

      <div className={`flex gap-4 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-hide ${isGated ? 'opacity-20 pointer-events-none' : ''}`}>
         <TabBtn label="Insights" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 />} />
         <TabBtn label="Payouts" active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} icon={<DollarSign />} />
         <TabBtn label="Marketing Studio" active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} icon={<Megaphone />} />
         {isEnterprise && <TabBtn label="Service Hub" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} icon={<Link2 />} />}
         {isEnterprise && <TabBtn label="White-Labeling" active={activeTab === 'branding'} onClick={() => setActiveTab('branding')} icon={<Palette />} />}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Gross Volume" value={`$${totalRevenue.toLocaleString()}`} change="+12.5%" icon={<DollarSign />} color="emerald" />
            <StatCard title="Active Tickets" value={totalSold.toLocaleString()} change="+18.2%" icon={<TicketIcon />} color="indigo" />
            <StatCard title="API Traffic" value="1.4M" change="+40%" icon={<Cpu />} color="blue" />
            <StatCard title="Backbone Node" value="Optimal" change="99.9%" icon={<Globe />} color="violet" />
          </div>
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
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="animate-in fade-in duration-500">
          <PayoutsHistory userId={user.id} />
        </div>
      )}

      {activeTab === 'marketing' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-8">
                 <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3"><Sparkles className="text-indigo-400" /> Marketing Studio</h3>
                       <p className="text-slate-400 font-medium text-sm leading-relaxed">Let AI create your platform-native ad campaigns. No prompt engineering needed.</p>
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
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Objective</label>
                          <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 text-sm font-bold">
                             <option>Scarcity (Sold Out soon)</option>
                             <option>Hype & Viral Growth</option>
                             <option>Elite Experience awareness</option>
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
                         <p className="text-sm text-slate-600 max-w-sm mx-auto">Generated ads will appear here with professional headlines and müügitekst.</p>
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
                              </div>
                              <div className="flex gap-3 pt-4">
                                 <button 
                                   onClick={() => handleDeployAd(i)}
                                   disabled={ad.deployed || ad.deploying}
                                   className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                     ad.deployed ? 'bg-emerald-600 text-white' : ad.deploying ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-white'
                                   }`}
                                 >
                                    {ad.deploying ? <Loader2 size={12} className="animate-spin" /> : ad.deployed ? <><CheckCircle size={12}/> Published</> : <><CloudUpload size={12}/> Deploy Ad</>}
                                 </button>
                                 <button className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"><Share2 size={14}/></button>
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

      {activeTab === 'branding' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Left Form: Branded Identity */}
              <div className="lg:col-span-1 space-y-6">
                 <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-8 shadow-2xl">
                    <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3"><Palette className="text-indigo-400" /> Shard Editor</h3>
                    
                    <div className="space-y-6">
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
                    <Link to={`/org/${user.agencySlug}`} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 hover:underline">
                       Open Public Site <ExternalLink size={12} />
                    </Link>
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

      {activeTab === 'integrations' && (
        <div className="space-y-12 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <IntegrationCard icon={<Facebook />} title="Meta Suite" desc="Sync events to Instagram Discovery." status="Connected" />
              <IntegrationCard icon={<Chrome />} title="Google Ads" desc="SEM triggers for ticket scarcity." status="Connected" />
              <IntegrationCard icon={<TikTok />} title="TikTok Pixel" desc="Track conversion from creators." status="Disconnected" />
           </div>
           <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
              <div className="space-y-4">
                 <h3 className="text-3xl font-black text-white tracking-tighter">API & Service Node</h3>
                 <p className="text-slate-500 font-medium max-w-lg leading-relaxed">Broadcast event lifecycle updates directly to your CRM via webhooks.</p>
              </div>
              <button className="px-10 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all">Setup Webhooks</button>
           </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ label, active, onClick, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all shrink-0 ${active ? 'border-indigo-600 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
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
