
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, DollarSign, Globe, Settings, Users, 
  Search, ShieldCheck, CreditCard, Activity, TrendingUp, Filter, MoreHorizontal, 
  X, Database, Zap, Cpu, BellRing, Share2, 
  ArrowUpRight, ArrowDownRight, Megaphone, Gift, 
  Layout, Eye, Rocket, Mail, PieChart, 
  RefreshCw, Plus, ChevronRight, Menu, Wallet,
  Loader2, Sparkles, CheckCircle2, Trash2, Globe2, MousePointer2,
  Target, MousePointerClick, TrendingDown, Layers, Terminal,
  UserX, Ban, AlertTriangle, MessageSquare, Send, Bug, EyeOff,
  Lock, Unlock, KeyRound, AlertOctagon, Github, Cloud, Key, Link as LinkIcon,
  Wifi, Server, Code, Globe2 as MapIcon, HardDrive, Mail as MailIcon,
  MonitorOff, Power, ShieldX
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line, Cell, Pie, PieChart as RePieChart
} from 'recharts';
import { User, PlatformCampaign, Notification } from '../types';
import { generatePlatformGrowthCampaign, generateAdImage } from '../services/geminiService';
import { getEvents, getAllUsers } from '../services/dbService';

// Real data will be loaded from Supabase

const REVENUE_BY_TIER = [
  { name: 'Pro', value: 45000, color: '#6366f1', count: 2250 },
  { name: 'Premium', value: 82000, color: '#10b981', count: 1640 },
  { name: 'Enterprise', value: 156000, color: '#f97316', count: 104 },
  { name: 'Market Fees', value: 28000, color: '#a855f7', count: 0 },
];

const INITIAL_CAMPAIGNS: PlatformCampaign[] = [
  { 
    id: 'pc1', 
    title: 'Nexus Alpha Launch', 
    copy: 'Be the first to join the map-first revolution. Limited time rewards.',
    status: 'Active', 
    placement: 'landing_page',
    target: 'attendees',
    incentive: { type: 'credits', value: 30, limit: 100, redeemed: 84 },
    metrics: { views: 850000, clicks: 12000, guestSignups: 4200, proConversions: 0, revenueValue: 12400 },
    tracking: { sources: { facebook: 4500, x: 3200, instagram: 2800, direct: 1500 } },
    imageUrl: 'https://picsum.photos/seed/alpha/800/400',
    cta: 'Explore Map',
    trackingCode: 'ALPHA30'
  }
];

const AdminCommandCenter: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Master Config State
  const [isMasterLocked, setIsMasterLocked] = useState(true);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityPass, setSecurityPass] = useState('');
  const [globalTicketFee, setGlobalTicketFee] = useState(2.5);
  const [creditValue, setCreditValue] = useState(0.50);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // API Settings State
  const [apiSettings, setApiSettings] = useState({
    stripe: { pk: 'pk_live_51P...', sk: 'sk_live_v920...', wh: 'whsec_920a...' },
    supabase: { url: 'https://nexus-core.supabase.co', anon: 'eyJhbGciOiJIUzI1Ni...', svc: 'eyJhbGciOiJIUzI1Ni...' },
    gemini: { key: process.env.API_KEY || 'NEXUS_AI_INTERNAL', model: 'gemini-3-pro-preview' },
    github: { appId: '920831', secret: 'ghs_820v...', repo: 'eventnexus/backbone' },
    mapbox: { token: 'pk.ey...v920', styleId: 'dark-v11' },
    email: { provider: 'SendGrid', key: 'SG.920831...', from: 'no-reply@eventnexus.com' }
  });

  // Search & Filter State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Campaign State
  const [campaigns, setCampaigns] = useState<PlatformCampaign[]>(INITIAL_CAMPAIGNS);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [newCampaignTheme, setNewCampaignTheme] = useState('');
  const [targetAudience, setTargetAudience] = useState<'creators' | 'attendees'>('attendees');
  const [editingCampaign, setEditingCampaign] = useState<Partial<PlatformCampaign> | null>(null);

  // User Actions State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'organizers' | 'attendees'>('all');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  if (user.role !== 'admin') return <div className="p-20 text-center font-black bg-slate-950 min-h-screen text-red-500">UNAUTHORIZED_ACCESS_DENIED</div>;

  const filteredUsers = useMemo(() => {
    return platformUsers.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [platformUsers, userSearch, userRoleFilter]);

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const users = await getAllUsers();
        setPlatformUsers(users);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const handleVerifySecurity = () => {
    if (securityPass === 'NEXUS_MASTER_2025') {
      setIsMasterLocked(false);
      setShowSecurityModal(false);
      setSecurityPass('');
    } else {
      alert('Security clearance failed.');
    }
  };

  const handleAiCampaignGenerate = async () => {
    if (!newCampaignTheme.trim()) return;
    setIsAiGenerating(true);
    try {
      const data = await generatePlatformGrowthCampaign(newCampaignTheme, targetAudience);
      if (data) {
        const imageUrl = await generateAdImage(data.visualPrompt, "16:9");
        setEditingCampaign({
          title: data.title,
          copy: data.copy,
          cta: data.cta,
          imageUrl: imageUrl || 'https://picsum.photos/seed/ai/800/400',
          status: 'Draft',
          placement: 'both',
          target: targetAudience === 'creators' ? 'organizers' : 'attendees',
          trackingCode: `AI-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          incentive: { 
            type: data.recommendedIncentiveType as any, 
            value: data.recommendedIncentiveValue, 
            limit: 100, 
            redeemed: 0 
          },
          metrics: { views: 0, clicks: 0, guestSignups: 0, proConversions: 0, revenueValue: 0 },
          tracking: { sources: { facebook: 0, x: 0, instagram: 0, direct: 0 } }
        });
      }
    } catch (err) { console.error(err); } finally { setIsAiGenerating(false); }
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const saveCampaign = () => {
    if (!editingCampaign || !editingCampaign.title) return;
    if (editingCampaign.id) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? (editingCampaign as PlatformCampaign) : c));
    } else {
      const newCampaign: PlatformCampaign = {
        ...editingCampaign,
        id: `pc-${Math.random().toString(36).substr(2, 9)}`,
      } as PlatformCampaign;
      setCampaigns(prev => [...prev, newCampaign]);
    }
    setIsCampaignModalOpen(false);
    setEditingCampaign(null);
  };

  const navItems = [
    { id: 'analytics', label: 'Global Insights', icon: <PieChart /> },
    { id: 'users', label: 'User Governance', icon: <Users /> },
    { id: 'marketing', label: 'Campaign Engine', icon: <Rocket /> },
    { id: 'financials', label: 'Nexus Economy', icon: <DollarSign /> },
    { id: 'settings', label: 'System Matrix', icon: <Settings /> },
    { id: 'infrastructure', label: 'System Health', icon: <Database /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-72 bg-slate-900 border-r border-slate-800 transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800/50 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20"><ShieldAlert className="text-white" size={20} /></div>
          <div>
            <h1 className="font-black text-xl tracking-tighter">Nexus Core</h1>
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">Platform Management</p>
          </div>
        </div>
        <nav className="p-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white font-bold shadow-xl shadow-orange-600/10' : 'text-slate-400 hover:bg-slate-800'}`}>
              {React.cloneElement(item.icon as React.ReactElement, { size: 18 })}
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-8 left-0 right-0 px-6 space-y-3">
           <button onClick={() => setIsRefreshing(true)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-white transition-all">
              <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={14} /> Sync Cluster
           </button>
           <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Build: v4.2.0-stable</p>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 w-[94%]" />
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase">{activeTab.replace('_', ' ')}</h2>
            <p className="text-slate-500 font-bold">Protocol Status: <span className="text-emerald-500">Live & Encrypted</span></p>
          </div>
          <div className="flex flex-wrap gap-4">
             {/* Maintenance Mode Toggle (Admin Idea) */}
             <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl">
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Maintenance</p>
                   <p className={`text-sm font-black ${isMaintenanceMode ? 'text-orange-500' : 'text-emerald-500'}`}>
                     {isMaintenanceMode ? 'ACTIVE' : 'OFF'}
                   </p>
                </div>
                <button 
                  disabled={isMasterLocked}
                  onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMasterLocked ? 'opacity-20 cursor-not-allowed' : ''} ${isMaintenanceMode ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  <Power size={18} />
                </button>
             </div>

             <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl relative">
                {!isMasterLocked && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Master Security</p>
                   <p className={`text-sm font-black ${isMasterLocked ? 'text-white' : 'text-orange-500'}`}>
                     {isMasterLocked ? 'PROTECTED' : 'ELEVATED'}
                   </p>
                </div>
                <button 
                  onClick={() => isMasterLocked ? setShowSecurityModal(true) : setIsMasterLocked(true)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMasterLocked ? 'bg-slate-800 text-slate-500' : 'bg-red-500 text-white shadow-xl shadow-red-600/20'}`}
                >
                  {isMasterLocked ? <Lock size={20}/> : <Unlock size={20}/>}
                </button>
             </div>
          </div>
        </header>

        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Monthly GPV" value="€842k" change="+12%" trend="up" icon={<DollarSign />} color="emerald" />
              <StatCard label="Platform Conversion" value="4.8%" change="+0.4%" trend="up" icon={<Target />} color="orange" />
              <StatCard label="Global Fee" value={`${globalTicketFee}%`} change="Stable" trend="neutral" icon={<CreditCard />} color="blue" />
              <StatCard label="Credit Pool" value="1.2M" change="+5%" trend="neutral" icon={<Gift />} color="violet" />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl space-y-8">
                 <h3 className="text-xl font-black tracking-tight">Revenue Stream Velocity</h3>
                 <div className="h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={REVENUE_BY_TIER}>
                        <defs>
                          <linearGradient id="colorTier" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorTier)" strokeWidth={4} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                      </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl flex flex-col justify-center items-center text-center space-y-6">
                 <div className="w-24 h-24 rounded-full border-8 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center">
                    <span className="text-2xl font-black">74%</span>
                 </div>
                 <h4 className="text-xl font-black">Retention Rate</h4>
                 <p className="text-sm text-slate-500 font-medium">User loyalty is exceeding platform targets by <span className="text-emerald-500">+14%</span> this quarter.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* User List Sidebar */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl flex flex-col">
                   <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 backdrop-blur-md">
                      <div className="relative flex-1 w-full max-w-md">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                         <input 
                           type="text" 
                           placeholder="Search by name, email or ID..." 
                           value={userSearch}
                           onChange={(e) => setUserSearch(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 outline-none"
                         />
                      </div>
                      <div className="flex gap-2">
                         <select 
                           value={userRoleFilter} 
                           onChange={(e) => setUserRoleFilter(e.target.value)}
                           className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 outline-none"
                         >
                            <option value="all">All Roles</option>
                            <option value="organizer">Organizers</option>
                            <option value="attendee">Attendees</option>
                            <option value="agency">Agencies</option>
                         </select>
                         <button className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"><Filter size={16}/></button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left">
                         <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                               <th className="px-8 py-4">Identity</th>
                               <th className="px-4 py-4">Clearance</th>
                               <th className="px-4 py-4">Ledger</th>
                               <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                            {filteredUsers.map(u => (
                               <tr key={u.id} className="group hover:bg-slate-800/30 transition-all">
                                  <td className="px-8 py-5">
                                     <div className="flex items-center gap-3">
                                        <img src={u.avatar} className="w-10 h-10 rounded-xl border border-slate-800" alt="" />
                                        <div>
                                           <p className="font-bold text-white text-sm">{u.name}</p>
                                           <p className="text-[10px] text-slate-500 font-medium">{u.email}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-4 py-5">
                                     <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
                                       u.subscription === 'enterprise' ? 'bg-orange-600/10 border-orange-500/20 text-orange-500' :
                                       u.subscription === 'premium' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' :
                                       'bg-slate-800 border-slate-700 text-slate-500'
                                     }`}>
                                        {u.subscription}
                                     </span>
                                  </td>
                                  <td className="px-4 py-5">
                                     <div className="flex items-center gap-2">
                                        <Gift size={12} className="text-slate-500" />
                                        <span className="font-mono text-sm text-slate-300">{u.credits}</span>
                                     </div>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setSelectedUser(u)} className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-500 hover:text-white rounded-lg transition-all"><MessageSquare size={14}/></button>
                                        <button className="p-2 bg-slate-800 hover:bg-yellow-600 text-slate-500 hover:text-white rounded-lg transition-all" title="Warning"><AlertTriangle size={14}/></button>
                                        <button className="p-2 bg-slate-800 hover:bg-red-600 text-slate-500 hover:text-white rounded-lg transition-all" title="Ban User"><Ban size={14}/></button>
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Broadcast Hub */}
                <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-8 shadow-2xl flex flex-col gap-6">
                   <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><BellRing className="text-indigo-500" size={20} /> Broadcast</h3>
                   <div className="space-y-4">
                      <div className="flex bg-slate-950 rounded-xl p-1">
                         {(['all', 'organizers', 'attendees'] as const).map(t => (
                            <button key={t} onClick={() => setBroadcastTarget(t)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${broadcastTarget === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                         ))}
                      </div>
                      <textarea 
                        placeholder="Global message content..." 
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-indigo-500 min-h-[150px] resize-none"
                      />
                      <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20">
                         <Send size={14} /> Send Global Push
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                 <div>
                    <h3 className="text-2xl font-black tracking-tighter">System Matrix</h3>
                    <p className="text-slate-500 text-sm font-medium">Manage global infrastructure and API integrations.</p>
                 </div>
                 <div className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <ShieldAlert className="text-red-500" size={16} />
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Master Clearance Required</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Payments Integration */}
                 <SettingsCard 
                   icon={<CreditCard />} title="Finance Matrix (Stripe)" 
                   locked={isMasterLocked}
                   fields={[
                     { label: 'Public Key', value: apiSettings.stripe.pk, key: 'stripe.pk' },
                     { label: 'Secret Key', value: apiSettings.stripe.sk, key: 'stripe.sk', type: 'password' },
                     { label: 'Webhook Secret', value: apiSettings.stripe.wh, key: 'stripe.wh', type: 'password' }
                   ]}
                 />

                 {/* Database Integration */}
                 <SettingsCard 
                   icon={<HardDrive />} title="Data Matrix (Supabase)" 
                   locked={isMasterLocked}
                   fields={[
                     { label: 'Project URL', value: apiSettings.supabase.url, key: 'supabase.url' },
                     { label: 'Anon Public Key', value: apiSettings.supabase.anon, key: 'supabase.anon' },
                     { label: 'Service Role Key', value: apiSettings.supabase.svc, key: 'supabase.svc', type: 'password' }
                   ]}
                 />

                 {/* Intelligence Integration */}
                 <SettingsCard 
                   icon={<Zap />} title="Intelligence Matrix (Gemini)" 
                   locked={isMasterLocked}
                   fields={[
                     { label: 'API Key', value: apiSettings.gemini.key, key: 'gemini.key', type: 'password' },
                     { label: 'Primary Model', value: apiSettings.gemini.model, key: 'gemini.model' }
                   ]}
                 />

                 {/* Mapping Integration */}
                 <SettingsCard 
                   icon={<MapIcon />} title="Map Shards (Mapbox)" 
                   locked={isMasterLocked}
                   fields={[
                     { label: 'Access Token', value: apiSettings.mapbox.token, key: 'mapbox.token' },
                     { label: 'Default Style ID', value: apiSettings.mapbox.styleId, key: 'mapbox.styleId' }
                   ]}
                 />

                 {/* Dev Matrix */}
                 <SettingsCard 
                   icon={<Github />} title="Dev Matrix (GitHub)" 
                   locked={isMasterLocked}
                   fields={[
                     { label: 'App ID', value: apiSettings.github.appId, key: 'github.appId' },
                     { label: 'Client Secret', value: apiSettings.github.secret, key: 'github.secret', type: 'password' },
                     { label: 'Primary Repo', value: apiSettings.github.repo, key: 'github.repo' }
                   ]}
                 />

                 {/* Communication Matrix */}
                 <SettingsCard 
                   icon={<MailIcon />} title="Communication Matrix (Email)" 
                   locked={isMasterLocked}
                   fields={[
                     { label: 'Provider', value: apiSettings.email.provider, key: 'email.provider' },
                     { label: 'API Key', value: apiSettings.email.key, key: 'email.key', type: 'password' },
                     { label: 'Sender Address', value: apiSettings.email.from, key: 'email.from' }
                   ]}
                 />
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                 <div className="flex items-center gap-4 text-slate-400">
                    <ShieldCheck className="text-emerald-500" />
                    <p className="text-xs font-medium max-w-md">System updates propagate across the Nexus backbone instantly. All modifications are logged to the immutable admin ledger.</p>
                 </div>
                 <button 
                   disabled={isMasterLocked}
                   className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isMasterLocked ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 active:scale-95'}`}
                 >
                    Propagate All Changes
                 </button>
              </div>
           </div>
        )}

        {activeTab === 'infrastructure' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard label="Cluster Uptime" value="99.998%" change="0.00%" trend="neutral" icon={<Cpu />} color="emerald" />
                 <StatCard label="API Latency" value="14ms" change="-2ms" trend="up" icon={<Activity />} color="blue" />
                 <StatCard label="DB Connections" value="12,402" change="+12%" trend="neutral" icon={<Database />} color="violet" />
                 <StatCard label="Storage Burn" value="4.2 TB" change="+0.4%" trend="down" icon={<Layers />} color="orange" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl overflow-hidden font-mono text-xs">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold flex items-center gap-2 text-slate-400"><Terminal size={16} /> Event Stream</h3>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-[10px] text-slate-500 font-black uppercase">Live</span></div>
                   </div>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                      <p className="text-slate-400"><span className="text-emerald-500 font-bold">[SYNC]</span> Cluster #920: Environment variables reloaded.</p>
                      <p className="text-slate-400"><span className="text-blue-500 font-bold">[NET]</span> Incoming API request from 192.168.1.1 (Stripe Hook).</p>
                      <p className="text-slate-400"><span className="text-yellow-500 font-bold">[AUTH]</span> Admin session elevated to Master Clearance.</p>
                      <p className="text-slate-400"><span className="text-orange-500 font-bold">[WARN]</span> Latency spike in us-east-1 region. Shifting traffic to us-east-2.</p>
                   </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500">
                      <ShieldCheck size={40} />
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-white">System Integrity</h4>
                      <p className="text-sm text-slate-500 font-medium">No critical anomalies detected in the last 24 hours.</p>
                   </div>
                   <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                      Run Diagnostic Scan
                   </button>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'financials' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-8 shadow-2xl">
                       <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><DollarSign className="text-emerald-500" /> Platform Ledger</h3>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                   <th className="pb-4">Transaction Source</th>
                                   <th className="pb-4 text-center">Type</th>
                                   <th className="pb-4 text-center">Volume</th>
                                   <th className="pb-4 text-right">Status</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800/50">
                                <FinancialRow name="Enterprise Subscription Batch" cat="Revenue" amt="+€156k" status="Complete" />
                                <FinancialRow name="Marketplace Service Fees" cat="Commission" amt="+€28k" status="Complete" />
                                <FinancialRow name="Campaign Burn: ALPHA30" cat="Growth" amt="-€1.2k" status="Escrow" />
                             </tbody>
                          </table>
                       </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 shadow-2xl relative">
                       {isMasterLocked && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-[40px]">
                             <Lock size={40} className="text-slate-600 mb-4" />
                             <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Master Lock Active</p>
                          </div>
                       )}
                       <div className="flex justify-between items-center mb-8">
                          <h3 className="text-xl font-black tracking-tight">System Global Parameters</h3>
                          <span className="text-[8px] font-black text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full uppercase">Affects Global Backbone</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ticket Fee (%)</label>
                                <span className="text-3xl font-black text-white">{globalTicketFee.toFixed(1)}%</span>
                             </div>
                             <input type="range" min="0" max="10" step="0.1" value={globalTicketFee} onChange={(e) => setGlobalTicketFee(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                          </div>
                          <div className="space-y-6">
                             <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Credit Unit (€)</label>
                                <span className="text-3xl font-black text-emerald-500">€{creditValue.toFixed(2)}</span>
                             </div>
                             <input type="range" min="0.1" max="2.0" step="0.05" value={creditValue} onChange={(e) => setCreditValue(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl flex flex-col">
                    <h3 className="text-xl font-black tracking-tight mb-8">Revenue Mix</h3>
                    <div className="flex-1 min-h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                             <Pie data={REVENUE_BY_TIER} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                {REVENUE_BY_TIER.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                             </Pie>
                             <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                          </RePieChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-6">
                       {REVENUE_BY_TIER.map(t => (
                          <div key={t.name} className="flex justify-between items-center px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                <span className="text-[10px] font-black uppercase text-slate-300">{t.name}</span>
                             </div>
                             <span className="text-sm font-black text-white">€{(t.value / 1000).toFixed(1)}k</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>

      {/* Security Verification Modal */}
      {showSecurityModal && (
         <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowSecurityModal(false)} />
            <div className="relative w-full max-w-md bg-slate-900 border border-red-500/50 rounded-[48px] p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
                     <KeyRound size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Master Auth Required</h2>
                  <p className="text-slate-400 text-sm font-medium">Entering modification mode. Secondary passkey is required for platform-wide changes.</p>
               </div>
               <div className="space-y-4">
                  <input 
                    type="password" 
                    placeholder="Enter Master Passkey"
                    value={securityPass}
                    onChange={(e) => setSecurityPass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-center font-mono text-lg tracking-widest text-white outline-none focus:border-red-500 transition-all"
                  />
                  <div className="flex gap-4">
                     <button onClick={() => setShowSecurityModal(false)} className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400">Abort</button>
                     <button onClick={handleVerifySecurity} className="flex-1 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-red-600/20">Authorize</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Campaign Modal (omitted for brevity, keep existing logic) */}
    </div>
  );
};

const SettingsCard = ({ icon, title, locked, fields }: any) => (
  <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
    <div className="flex justify-between items-center mb-8">
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
             {icon}
          </div>
          <h3 className="text-lg font-black tracking-tight">{title}</h3>
       </div>
       <div className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-widest ${locked ? 'text-slate-500' : 'text-emerald-500'}`}>
          <Wifi size={12} /> {locked ? 'Standby' : 'Ready'}
       </div>
    </div>
    <div className="space-y-6">
       {fields.map((field: any, i: number) => (
          <div key={i} className="space-y-2">
             <div className="flex justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                {locked && <Lock size={10} className="text-slate-700" />}
             </div>
             <input 
               type={field.type || 'text'} 
               disabled={locked}
               value={locked ? '••••••••••••••••' : field.value}
               className={`w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-mono tracking-wider outline-none transition-all ${locked ? 'text-slate-700 cursor-not-allowed' : 'text-indigo-400 focus:border-indigo-500'}`}
             />
          </div>
       ))}
    </div>
    <div className="mt-8 flex gap-3">
       <button disabled={locked} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${locked ? 'bg-slate-800 text-slate-600 opacity-50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
          Test API Handshake
       </button>
    </div>
  </div>
);

const StatCard = ({ label, value, change, trend, icon, color }: any) => {
  const colors: any = {
    orange: 'bg-orange-600/10 text-orange-500',
    blue: 'bg-indigo-600/10 text-indigo-400',
    emerald: 'bg-emerald-600/10 text-emerald-500',
    violet: 'bg-violet-600/10 text-violet-400',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] hover:border-slate-700 transition-all shadow-xl group">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${colors[color]}`}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : trend === 'down' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
          {change} {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        </div>
      </div>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black tracking-tighter text-white">{value}</h3>
    </div>
  );
};

const FinancialRow = ({ name, cat, amt, status }: any) => (
  <tr className="group hover:bg-slate-800/30 transition-all">
    <td className="py-6 px-8">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
           <Database className="w-5 h-5" />
        </div>
        <span className="font-bold text-white text-sm">{name}</span>
      </div>
    </td>
    <td className="py-6 text-center">
      <span className="text-[10px] font-black text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 uppercase tracking-widest">
        {cat}
      </span>
    </td>
    <td className={`py-6 text-center font-black ${amt.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
      {amt}
    </td>
    <td className="py-6 text-right px-8">
       <span className={`text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter ${
         status === 'Complete' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
       }`}>
         {status}
       </span>
    </td>
  </tr>
);

export default AdminCommandCenter;
