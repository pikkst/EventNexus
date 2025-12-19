
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
import { User, Notification } from '../types';
import { generatePlatformGrowthCampaign, generateAdImage } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { 
  getEvents, 
  getAllUsers, 
  getPlatformStats, 
  getInfrastructureStats,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  broadcastNotification,
  suspendUser,
  banUser,
  updateUserCredits,
  updateUserSubscription,
  getSystemConfig,
  updateSystemConfig,
  Campaign,
  getFinancialLedger,
  FinancialTransaction
} from '../services/dbService';
import MasterAuthModal from './MasterAuthModal';

const AdminCommandCenter: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Master Auth State
  const [isMasterLocked, setIsMasterLocked] = useState(true);
  const [showMasterAuthModal, setShowMasterAuthModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<string>('');
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [newCampaignTheme, setNewCampaignTheme] = useState('');
  const [targetAudience, setTargetAudience] = useState<'creators' | 'attendees'>('attendees');
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  // User Actions State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'organizers' | 'attendees'>('all');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [infrastructureStats, setInfrastructureStats] = useState<any>(null);
  const [isLoadingInfra, setIsLoadingInfra] = useState(true);
  
  // Financial State
  const [financialLedger, setFinancialLedger] = useState<FinancialTransaction[]>([]);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(true);

  // Diagnostic Scan State
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  if (user.role !== 'admin') return <div className="p-20 text-center font-black bg-slate-950 min-h-screen text-red-500">UNAUTHORIZED_ACCESS_DENIED</div>;

  const filteredUsers = useMemo(() => {
    return platformUsers.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [platformUsers, userSearch, userRoleFilter]);

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingUsers(true);
      setIsLoadingStats(true);
      setIsLoadingInfra(true);
      setIsLoadingCampaigns(true);
      setIsLoadingFinancials(true);
      try {
        const [users, stats, infra, campaignsData, config, ledger] = await Promise.all([
          getAllUsers(),
          getPlatformStats(),
          getInfrastructureStats(),
          getCampaigns(),
          getSystemConfig(),
          getFinancialLedger()
        ]);
        setPlatformUsers(users);
        setPlatformStats(stats);
        setInfrastructureStats(infra);
        setCampaigns(campaignsData);
        setFinancialLedger(ledger);
        
        // Load system config
        if (config.global_ticket_fee) setGlobalTicketFee(parseFloat(config.global_ticket_fee));
        if (config.credit_value) setCreditValue(parseFloat(config.credit_value));
        if (config.maintenance_mode) setIsMaintenanceMode(config.maintenance_mode === 'true');
        
        // Load API settings from database
        if (config.stripe_pk || config.stripe_sk || config.stripe_wh) {
          setApiSettings(prev => ({
            ...prev,
            stripe: {
              pk: config.stripe_pk || prev.stripe.pk,
              sk: config.stripe_sk || prev.stripe.sk,
              wh: config.stripe_wh || prev.stripe.wh
            }
          }));
        }
        if (config.supabase_url || config.supabase_anon || config.supabase_svc) {
          setApiSettings(prev => ({
            ...prev,
            supabase: {
              url: config.supabase_url || prev.supabase.url,
              anon: config.supabase_anon || prev.supabase.anon,
              svc: config.supabase_svc || prev.supabase.svc
            }
          }));
        }
        if (config.gemini_key || config.gemini_model) {
          setApiSettings(prev => ({
            ...prev,
            gemini: {
              key: config.gemini_key || prev.gemini.key,
              model: config.gemini_model || prev.gemini.model
            }
          }));
        }
        if (config.mapbox_token || config.mapbox_styleId) {
          setApiSettings(prev => ({
            ...prev,
            mapbox: {
              token: config.mapbox_token || prev.mapbox.token,
              styleId: config.mapbox_styleId || prev.mapbox.styleId
            }
          }));
        }
        if (config.github_appId || config.github_secret || config.github_repo) {
          setApiSettings(prev => ({
            ...prev,
            github: {
              appId: config.github_appId || prev.github.appId,
              secret: config.github_secret || prev.github.secret,
              repo: config.github_repo || prev.github.repo
            }
          }));
        }
        if (config.email_provider || config.email_key || config.email_from) {
          setApiSettings(prev => ({
            ...prev,
            email: {
              provider: config.email_provider || prev.email.provider,
              key: config.email_key || prev.email.key,
              from: config.email_from || prev.email.from
            }
          }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingStats(false);
        setIsLoadingInfra(false);
        setIsLoadingCampaigns(false);
        setIsLoadingFinancials(false);
      }
    };

    loadData();

    // Auto-refresh infrastructure stats every 10 seconds
    const infraInterval = setInterval(async () => {
      if (activeTab === 'infrastructure') {
        try {
          const infra = await getInfrastructureStats();
          setInfrastructureStats(infra);
        } catch (error) {
          console.error('Error refreshing infrastructure stats:', error);
        }
      }
    }, 10000);

    return () => clearInterval(infraInterval);
  }, [activeTab]);

  const requestMasterAuth = (operationName: string) => {
    setPendingOperation(operationName);
    setShowMasterAuthModal(true);
  };

  const handleMasterAuth = (success: boolean) => {
    if (success) {
      setIsMasterLocked(false);
      // Auto-lock after 10 minutes of authenticated session
      setTimeout(() => setIsMasterLocked(true), 600000);
    }
    setPendingOperation('');
  };

  const handleRefreshInfra = async () => {
    setIsRefreshing(true);
    try {
      const infra = await getInfrastructureStats();
      setInfrastructureStats(infra);
    } catch (error) {
      console.error('Error refreshing infrastructure stats:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const runDiagnosticScan = async () => {
    setIsDiagnosticRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('diagnostic-scan', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      setDiagnosticResults(data);
      setShowDiagnosticModal(true);
    } catch (error) {
      console.error('Diagnostic scan error:', error);
      alert('Failed to run diagnostic scan. Check console for details.');
    } finally {
      setIsDiagnosticRunning(false);
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
          imageUrl: imageUrl || undefined,
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

  const handleDeleteCampaign = async (id: string) => {
    const success = await deleteCampaign(id);
    if (success) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSaveCampaign = async () => {
    if (!editingCampaign || !editingCampaign.title) return;
    
    if (editingCampaign.id) {
      const updated = await updateCampaign(editingCampaign.id, editingCampaign);
      if (updated) {
        setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      }
    } else {
      const created = await createCampaign(editingCampaign as Campaign);
      if (created) {
        setCampaigns(prev => [...prev, created]);
      }
    }
    setIsCampaignModalOpen(false);
    setEditingCampaign(null);
  };

  const handleApiFieldChange = (key: string, value: string) => {
    const [service, field] = key.split('.');
    setApiSettings(prev => ({
      ...prev,
      [service]: {
        ...prev[service as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleBroadcastNotification = async () => {
    if (!broadcastMsg.trim()) return;
    
    if (isMasterLocked) {
      requestMasterAuth('Broadcast Platform Notification');
      return;
    }
    
    const count = await broadcastNotification(
      'Platform Announcement',
      broadcastMsg,
      broadcastTarget
    );
    
    if (count > 0) {
      alert(`Successfully sent notification to ${count} users`);
      setBroadcastMsg('');
    } else {
      alert('Failed to send notifications');
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (isMasterLocked) {
      requestMasterAuth('Suspend User');
      return;
    }
    
    const reason = prompt('Reason for suspension:');
    if (!reason) return;
    
    const success = await suspendUser(userId, reason);
    if (success) {
      setPlatformUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, status: 'suspended' } : u)
      );
      alert('User suspended successfully');
    }
  };

  const handleBanUser = async (userId: string) => {
    if (isMasterLocked) {
      requestMasterAuth('Ban User');
      return;
    }
    
    const reason = prompt('Reason for ban:');
    if (!reason) return;
    
    if (!confirm('Are you sure you want to ban this user? This action is severe.')) return;
    
    const success = await banUser(userId, reason);
    if (success) {
      setPlatformUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, status: 'banned' } : u)
      );
      alert('User banned successfully');
    }
  };

  const handleSaveSystemConfig = async () => {
    if (isMasterLocked) {
      requestMasterAuth('Update System Configuration');
      return;
    }
    
    // Save system config and API settings
    await Promise.all([
      // System config
      updateSystemConfig('global_ticket_fee', globalTicketFee.toString()),
      updateSystemConfig('credit_value', creditValue.toString()),
      updateSystemConfig('maintenance_mode', isMaintenanceMode.toString()),
      // API settings - Stripe
      updateSystemConfig('stripe_pk', apiSettings.stripe.pk),
      updateSystemConfig('stripe_sk', apiSettings.stripe.sk),
      updateSystemConfig('stripe_wh', apiSettings.stripe.wh),
      // API settings - Supabase
      updateSystemConfig('supabase_url', apiSettings.supabase.url),
      updateSystemConfig('supabase_anon', apiSettings.supabase.anon),
      updateSystemConfig('supabase_svc', apiSettings.supabase.svc),
      // API settings - Gemini
      updateSystemConfig('gemini_key', apiSettings.gemini.key),
      updateSystemConfig('gemini_model', apiSettings.gemini.model),
      // API settings - Mapbox
      updateSystemConfig('mapbox_token', apiSettings.mapbox.token),
      updateSystemConfig('mapbox_styleId', apiSettings.mapbox.styleId),
      // API settings - GitHub
      updateSystemConfig('github_appId', apiSettings.github.appId),
      updateSystemConfig('github_secret', apiSettings.github.secret),
      updateSystemConfig('github_repo', apiSettings.github.repo),
      // API settings - Email
      updateSystemConfig('email_provider', apiSettings.email.provider),
      updateSystemConfig('email_key', apiSettings.email.key),
      updateSystemConfig('email_from', apiSettings.email.from)
    ]);
    
    alert('✅ Configuration saved successfully. Note: Some services may require restart to use new keys.');
    alert('System configuration updated successfully');
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
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
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
            <button 
              key={item.id} 
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false); // Close sidebar on mobile after selection
              }} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white font-bold shadow-xl shadow-orange-600/10' : 'text-slate-400 hover:bg-slate-800'}`}
            >
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

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 scrollbar-hide">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex-1">
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">{activeTab.replace('_', ' ')}</h2>
              <p className="text-xs md:text-sm text-slate-500 font-bold">Protocol Status: <span className="text-emerald-500">{infrastructureStats?.protocolStatus || 'Loading...'}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
             {/* Maintenance Mode Toggle (Admin Idea) */}
             <div className="bg-slate-900 border border-slate-800 px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-4 shadow-2xl flex-1 md:flex-none">
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Maintenance</p>
                   <p className={`text-xs md:text-sm font-black ${(infrastructureStats?.maintenanceMode || isMaintenanceMode) ? 'text-orange-500' : 'text-emerald-500'}`}>
                     {(infrastructureStats?.maintenanceMode || isMaintenanceMode) ? 'ACTIVE' : 'OFF'}
                   </p>
                </div>
                <button 
                  disabled={isMasterLocked}
                  onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isMasterLocked ? 'opacity-20 cursor-not-allowed' : ''} ${(infrastructureStats?.maintenanceMode || isMaintenanceMode) ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  <Power size={16} className="md:hidden" />
                  <Power size={18} className="hidden md:block" />
                </button>
             </div>

             <div className="bg-slate-900 border border-slate-800 px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-4 shadow-2xl relative flex-1 md:flex-none">
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Master Security</p>
                   <p className={`text-xs md:text-sm font-black ${isMasterLocked ? 'text-yellow-500' : 'text-red-500'}`}>
                     {infrastructureStats?.securityStatus || 'UNKNOWN'}
                   </p>
                </div>
                {!isMasterLocked && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Master Security</p>
                   <p className={`text-xs md:text-sm font-black ${isMasterLocked ? 'text-white' : 'text-orange-500'}`}>
                     {isMasterLocked ? 'PROTECTED' : 'ELEVATED'}
                   </p>
                </div>
                <button 
                  onClick={() => isMasterLocked ? requestMasterAuth('Unlock Master Controls') : setIsMasterLocked(true)}
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isMasterLocked ? 'bg-slate-800 text-slate-500 hover:bg-slate-700' : 'bg-red-500 text-white shadow-xl shadow-red-600/20 hover:bg-red-600'}`}
                  title={isMasterLocked ? 'Unlock Master Controls' : 'Lock Master Controls'}
                >
                  {isMasterLocked ? <Lock size={16} className="md:hidden"/> : <Unlock size={16} className="md:hidden"/>}
                  {isMasterLocked ? <Lock size={20} className="hidden md:block"/> : <Unlock size={20} className="hidden md:block"/>}
                </button>
             </div>
          </div>
        </header>

        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {isLoadingStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded mb-2"></div>
                    <div className="h-8 bg-slate-800 rounded mb-1"></div>
                    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : platformStats ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Monthly GPV" value={platformStats.monthlyGPV} change="+12%" trend="up" icon={<DollarSign />} color="emerald" />
                  <StatCard label="Platform Conversion" value={`${platformStats.platformConversion}%`} change="+0.4%" trend="up" icon={<Target />} color="orange" />
                  <StatCard label="Global Fee" value={`${platformStats.globalFee}%`} change="Stable" trend="neutral" icon={<CreditCard />} color="blue" />
                  <StatCard label="Credit Pool" value={platformStats.creditPool} change="+5%" trend="neutral" icon={<Gift />} color="violet" />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8">
                  <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[48px] p-4 md:p-10 shadow-2xl space-y-4 md:space-y-8">
                     <h3 className="text-lg md:text-xl font-black tracking-tight">Revenue Stream Velocity</h3>
                     <div className="h-[250px] md:h-[350px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={platformStats.revenueByTier}>
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
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[48px] p-6 md:p-10 shadow-2xl flex flex-col justify-center items-center text-center space-y-4 md:space-y-6">
                     <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-8 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center">
                        <span className="text-xl md:text-2xl font-black">{platformStats.retentionRate}%</span>
                     </div>
                     <h4 className="text-lg md:text-xl font-black">Retention Rate</h4>
                     <p className="text-xs md:text-sm text-slate-500 font-medium">User loyalty based on platform activity and engagement metrics.</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500">Unable to load analytics data</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
                {/* User List Sidebar */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col">
                   <div className="p-4 md:p-8 border-b border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 backdrop-blur-md">
                      <div className="relative flex-1 w-full max-w-md">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                         <input 
                           type="text" 
                           placeholder="Search by name, email or ID..." 
                           value={userSearch}
                           onChange={(e) => setUserSearch(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl pl-12 pr-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-indigo-500 outline-none"
                         />
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                         <select 
                           value={userRoleFilter} 
                           onChange={(e) => setUserRoleFilter(e.target.value)}
                           className="flex-1 md:flex-none bg-slate-950 border border-slate-800 rounded-lg md:rounded-xl px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 outline-none"
                         >
                            <option value="all">All Roles</option>
                            <option value="organizer">Organizers</option>
                            <option value="attendee">Attendees</option>
                            <option value="agency">Agencies</option>
                         </select>
                         <button className="p-2.5 md:p-3 bg-slate-800 rounded-lg md:rounded-xl text-slate-400 hover:text-white transition-all"><Filter size={16}/></button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                         <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                               <th className="px-4 md:px-8 py-3 md:py-4">Identity</th>
                               <th className="px-2 md:px-4 py-3 md:py-4">Clearance</th>
                               <th className="px-2 md:px-4 py-3 md:py-4">Ledger</th>
                               <th className="px-4 md:px-8 py-3 md:py-4 text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                            {filteredUsers.map(u => (
                               <tr key={u.id} className="group hover:bg-slate-800/30 transition-all">
                                  <td className="px-4 md:px-8 py-4 md:py-5">
                                     <div className="flex items-center gap-2 md:gap-3">
                                        <img src={u.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border border-slate-800" alt="" />
                                        <div className="min-w-0">
                                           <p className="font-bold text-white text-xs md:text-sm truncate">{u.name}</p>
                                           <p className="text-[10px] text-slate-500 font-medium truncate">{u.email}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-2 md:px-4 py-4 md:py-5">
                                     <span className={`text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase border whitespace-nowrap ${
                                       (u.subscription_tier || u.subscription) === 'enterprise' ? 'bg-orange-600/10 border-orange-500/20 text-orange-500' :
                                       (u.subscription_tier || u.subscription) === 'premium' ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500' :
                                       'bg-slate-800 border-slate-700 text-slate-500'
                                     }`}>
                                        {u.subscription_tier || u.subscription}
                                     </span>
                                  </td>
                                  <td className="px-2 md:px-4 py-4 md:py-5">
                                     <div className="flex items-center gap-1 md:gap-2">
                                        <Gift size={12} className="text-slate-500 flex-shrink-0" />
                                        <span className="font-mono text-xs md:text-sm text-slate-300">{u.credits}</span>
                                     </div>
                                  </td>
                                  <td className="px-4 md:px-8 py-4 md:py-5 text-right">
                                     <div className="flex justify-end gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setSelectedUser(u)} className="p-1.5 md:p-2 bg-slate-800 hover:bg-indigo-600 text-slate-500 hover:text-white rounded-lg transition-all" title="Message User"><MessageSquare size={14}/></button>
                                        <button onClick={() => handleSuspendUser(u.id)} className="p-1.5 md:p-2 bg-slate-800 hover:bg-yellow-600 text-slate-500 hover:text-white rounded-lg transition-all" title="Suspend User"><AlertTriangle size={14}/></button>
                                        <button onClick={() => handleBanUser(u.id)} className="p-1.5 md:p-2 bg-slate-800 hover:bg-red-600 text-slate-500 hover:text-white rounded-lg transition-all" title="Ban User"><Ban size={14}/></button>
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Broadcast Hub */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[48px] p-6 md:p-8 shadow-2xl flex flex-col gap-4 md:gap-6">
                   <h3 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-3"><BellRing className="text-indigo-500" size={20} /> Broadcast</h3>
                   <div className="space-y-3 md:space-y-4">
                      <div className="flex bg-slate-950 rounded-xl p-1">
                         {(['all', 'organizers', 'attendees'] as const).map(t => (
                            <button key={t} onClick={() => setBroadcastTarget(t)} className={`flex-1 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${broadcastTarget === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                         ))}
                      </div>
                      <textarea 
                        placeholder="Global message content..." 
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs text-white outline-none focus:border-indigo-500 min-h-[120px] md:min-h-[150px] resize-none"
                      />
                      <button 
                        onClick={handleBroadcastNotification}
                        disabled={!broadcastMsg.trim()}
                        className="w-full py-3 md:py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 md:gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
                      >
                         <Send size={14} /> Send Global Push
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'marketing' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                 <div>
                    <h3 className="text-2xl font-black tracking-tighter">Campaign Engine</h3>
                    <p className="text-slate-500 text-sm font-medium">Manage platform growth campaigns with AI-powered generation.</p>
                 </div>
                 <button 
                   onClick={() => { setEditingCampaign(null); setIsCampaignModalOpen(true); }}
                   className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
                 >
                    <Plus size={14} /> New Campaign
                 </button>
              </div>

              {isLoadingCampaigns ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-pulse">
                      <div className="h-40 bg-slate-800 rounded-xl mb-4"></div>
                      <div className="h-6 bg-slate-800 rounded mb-2"></div>
                      <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-16 text-center">
                  <Megaphone size={48} className="mx-auto mb-6 text-slate-600" />
                  <h4 className="text-xl font-black text-white mb-2">No Active Campaigns</h4>
                  <p className="text-slate-500 mb-8">Create your first growth campaign to engage users and drive platform adoption.</p>
                  <button 
                    onClick={() => { setEditingCampaign(null); setIsCampaignModalOpen(true); }}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all"
                  >
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden hover:border-slate-700 transition-all shadow-2xl group">
                      {campaign.imageUrl && (
                        <div className="h-48 overflow-hidden bg-slate-950">
                          <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="text-lg font-black text-white mb-1">{campaign.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2">{campaign.copy}</p>
                          </div>
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${
                            campaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                            campaign.status === 'Paused' ? 'bg-yellow-500/10 text-yellow-500' :
                            campaign.status === 'Draft' ? 'bg-slate-700 text-slate-400' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-slate-950 rounded-xl p-3">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Views</p>
                            <p className="text-lg font-black text-white">{campaign.metrics?.views.toLocaleString() || 0}</p>
                          </div>
                          <div className="bg-slate-950 rounded-xl p-3">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Clicks</p>
                            <p className="text-lg font-black text-indigo-400">{campaign.metrics?.clicks.toLocaleString() || 0}</p>
                          </div>
                          <div className="bg-slate-950 rounded-xl p-3">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Signups</p>
                            <p className="text-lg font-black text-emerald-400">{campaign.metrics?.guestSignups || 0}</p>
                          </div>
                          <div className="bg-slate-950 rounded-xl p-3">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Revenue</p>
                            <p className="text-lg font-black text-orange-400">€{((campaign.metrics?.revenueValue || 0) / 1000).toFixed(1)}k</p>
                          </div>
                        </div>

                        {campaign.incentive && (
                          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Gift size={14} className="text-violet-400" />
                                <span className="text-[10px] font-black text-violet-400 uppercase">{campaign.incentive.type}</span>
                              </div>
                              <span className="text-xs font-bold text-white">{campaign.incentive.value} × {campaign.incentive.redeemed}/{campaign.incentive.limit}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => { setEditingCampaign(campaign); setIsCampaignModalOpen(true); }}
                            className="flex-1 py-2.5 bg-slate-800 hover:bg-indigo-600 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCampaign(campaign.id!)}
                            className="flex-1 py-2.5 bg-slate-800 hover:bg-red-600 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              {/* Master Auth Info Banner */}
              <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border border-red-500/30 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                      Master Authentication Required
                      {isMasterLocked ? (
                        <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-400 rounded-full">LOCKED</span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 bg-red-500 text-white rounded-full animate-pulse">ELEVATED</span>
                      )}
                    </h4>
                    <p className="text-sm text-slate-400 mb-3">
                      Critical platform operations require secondary authentication. This includes:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Key className="w-3 h-3 text-red-500" />
                        <span>API Key Management</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Settings className="w-3 h-3 text-red-500" />
                        <span>System Configuration</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Ban className="w-3 h-3 text-red-500" />
                        <span>User Suspension/Ban</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <BellRing className="w-3 h-3 text-red-500" />
                        <span>Platform Broadcasts</span>
                      </div>
                    </div>
                    {isMasterLocked && (
                      <button
                        onClick={() => requestMasterAuth('Unlock Master Controls')}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        <KeyRound className="w-4 h-4" />
                        Unlock Master Controls
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
                   onFieldChange={handleApiFieldChange}
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
                   onFieldChange={handleApiFieldChange}
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
                   onFieldChange={handleApiFieldChange}
                   fields={[
                     { label: 'API Key', value: apiSettings.gemini.key, key: 'gemini.key', type: 'password' },
                     { label: 'Primary Model', value: apiSettings.gemini.model, key: 'gemini.model' }
                   ]}
                 />

                 {/* Mapping Integration */}
                 <SettingsCard 
                   icon={<MapIcon />} title="Map Shards (Mapbox)" 
                   locked={isMasterLocked}
                   onFieldChange={handleApiFieldChange}
                   fields={[
                     { label: 'Access Token', value: apiSettings.mapbox.token, key: 'mapbox.token' },
                     { label: 'Default Style ID', value: apiSettings.mapbox.styleId, key: 'mapbox.styleId' }
                   ]}
                 />

                 {/* Dev Matrix */}
                 <SettingsCard 
                   icon={<Github />} title="Dev Matrix (GitHub)" 
                   locked={isMasterLocked}
                   onFieldChange={handleApiFieldChange}
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
                   onFieldChange={handleApiFieldChange}
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
                   onClick={handleSaveSystemConfig}
                   className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isMasterLocked ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 active:scale-95 hover:bg-emerald-700'}`}
                 >
                    Save Configuration
                 </button>
              </div>
           </div>
        )}

        {activeTab === 'infrastructure' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              {/* Header with refresh button */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">System Health</h3>
                  <p className="text-slate-500 text-sm font-medium">Real-time infrastructure monitoring & diagnostics</p>
                </div>
                <button
                  onClick={handleRefreshInfra}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {isLoadingInfra ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-pulse">
                      <div className="h-4 bg-slate-800 rounded mb-2"></div>
                      <div className="h-8 bg-slate-800 rounded mb-1"></div>
                      <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : infrastructureStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <StatCard label="Cluster Uptime" value={`${infrastructureStats.clusterUptime.toFixed(2)}%`} change={`${(infrastructureStats.clusterUptime - 99.95).toFixed(2)}%`} trend={infrastructureStats.clusterUptime > 99.95 ? 'up' : 'neutral'} icon={<Cpu />} color="emerald" />
                     <StatCard label="API Latency" value={`${infrastructureStats.apiLatency}ms`} change={infrastructureStats.apiLatency < 15 ? '-optimal' : '+slow'} trend={infrastructureStats.apiLatency < 15 ? 'up' : 'down'} icon={<Activity />} color="blue" />
                     <StatCard label="DB Connections" value={infrastructureStats.dbConnections.toLocaleString()} change={`${infrastructureStats.dbConnections} active`} trend="neutral" icon={<Database />} color="violet" />
                     <StatCard label="Storage Burn" value={`${infrastructureStats.storageBurn} GB`} change={infrastructureStats.storageBurn < 1 ? 'optimal' : 'growing'} trend={infrastructureStats.storageBurn < 1 ? 'up' : 'down'} icon={<Layers />} color="orange" />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl overflow-hidden font-mono text-xs">
                       <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold flex items-center gap-2 text-slate-400"><Terminal size={16} /> Event Stream</h3>
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-[10px] text-slate-500 font-black uppercase">Live</span></div>
                       </div>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                          {infrastructureStats.systemLogs.map((log, index) => (
                            <p key={index} className="text-slate-400">
                              <span className={`font-bold ${
                                log.includes('[SYNC]') ? 'text-emerald-500' :
                                log.includes('[NET]') ? 'text-blue-500' :
                                log.includes('[AUTH]') ? 'text-yellow-500' :
                                log.includes('[WARN]') ? 'text-orange-500' :
                                log.includes('[INFO]') ? 'text-cyan-500' :
                                log.includes('[SYS]') ? 'text-purple-500' :
                                'text-red-500'
                              }`}>
                                {log.match(/\\[\\w+\\]/)?.[0] || '[LOG]'}
                              </span> {log.replace(/\\[\\w+\\]\\s*/, '')}
                            </p>
                          ))}
                       </div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
                       <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500">
                          <ShieldCheck size={40} />
                       </div>
                       <div>
                          <h4 className="text-xl font-black text-white">System Integrity</h4>
                          <p className="text-sm text-slate-500 font-medium">{infrastructureStats.systemIntegrity}</p>
                       </div>
                       <button 
                         onClick={runDiagnosticScan}
                         disabled={isDiagnosticRunning}
                         className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                       >
                          {isDiagnosticRunning ? (
                            <><Loader2 size={14} className="animate-spin" /> Scanning...</>
                          ) : (
                            'Run Diagnostic Scan'
                          )}
                       </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500">Unable to load infrastructure data</p>
                </div>
              )}
           </div>
        )}

        {activeTab === 'financials' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-8 shadow-2xl">
                       <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><DollarSign className="text-emerald-500" /> Platform Ledger</h3>
                       {isLoadingFinancials ? (
                         <div className="flex items-center justify-center py-12">
                           <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                         </div>
                       ) : financialLedger.length === 0 ? (
                         <div className="text-center py-12">
                           <p className="text-slate-500">No financial transactions yet</p>
                         </div>
                       ) : (
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
                                  {financialLedger.map((transaction, idx) => (
                                    <FinancialRow 
                                      key={idx}
                                      name={transaction.transaction_source} 
                                      cat={transaction.transaction_type} 
                                      amt={transaction.volume} 
                                      status={transaction.status} 
                                    />
                                  ))}
                               </tbody>
                            </table>
                         </div>
                       )}
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
                             <Pie data={platformStats?.revenueByTier || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                {(platformStats?.revenueByTier || []).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                             </Pie>
                             <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                          </RePieChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-6">
                       {(platformStats?.revenueByTier || []).map(t => (
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

      {/* Diagnostic Results Modal */}
      {showDiagnosticModal && diagnosticResults && (
        <DiagnosticModal results={diagnosticResults} onClose={() => setShowDiagnosticModal(false)} />
      )}

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

      {/* Campaign Creation/Edit Modal */}
      {isCampaignModalOpen && (
         <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsCampaignModalOpen(false)} />
            <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl space-y-8 my-8">
               <div className="flex justify-between items-start">
                  <div>
                     <h2 className="text-3xl font-black text-white tracking-tight">{editingCampaign?.id ? 'Edit Campaign' : 'New Campaign'}</h2>
                     <p className="text-slate-500 text-sm font-medium">Create engaging growth campaigns with AI assistance</p>
                  </div>
                  <button onClick={() => setIsCampaignModalOpen(false)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
                     <X size={20} className="text-slate-400" />
                  </button>
               </div>

               {/* AI Generator Section */}
               <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[32px] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                     <Sparkles className="text-indigo-400" size={20} />
                     <h3 className="text-lg font-black text-white">AI Campaign Generator</h3>
                  </div>
                  <div className="flex gap-4">
                     <input 
                       type="text"
                       placeholder="Campaign theme (e.g., 'Summer Festival Boost', 'Creator Onboarding')..."
                       value={newCampaignTheme}
                       onChange={(e) => setNewCampaignTheme(e.target.value)}
                       className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                     />
                     <select 
                       value={targetAudience}
                       onChange={(e) => setTargetAudience(e.target.value as 'creators' | 'attendees')}
                       className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white outline-none"
                     >
                        <option value="attendees">Attendees</option>
                        <option value="creators">Creators</option>
                     </select>
                     <button 
                       onClick={handleAiCampaignGenerate}
                       disabled={isAiGenerating || !newCampaignTheme.trim()}
                       className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all flex items-center gap-2"
                     >
                        {isAiGenerating ? (
                           <><Loader2 size={14} className="animate-spin" /> Generating...</>
                        ) : (
                           <><Sparkles size={14} /> Generate</>
                        )}
                     </button>
                  </div>
               </div>

               {/* Campaign Form */}
               {editingCampaign && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Campaign Title</label>
                           <input 
                             type="text"
                             value={editingCampaign.title || ''}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                             placeholder="Campaign title..."
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tracking Code</label>
                           <input 
                             type="text"
                             value={editingCampaign.trackingCode || ''}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, trackingCode: e.target.value })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm font-mono text-indigo-400 outline-none focus:border-indigo-500 transition-all"
                             placeholder="TRACK-CODE"
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Campaign Copy</label>
                        <textarea 
                          value={editingCampaign.copy || ''}
                          onChange={(e) => setEditingCampaign({ ...editingCampaign, copy: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all min-h-[100px] resize-none"
                          placeholder="Campaign message..."
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                           <select 
                             value={editingCampaign.status || 'Draft'}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, status: e.target.value as any })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-white outline-none"
                           >
                              <option value="Draft">Draft</option>
                              <option value="Active">Active</option>
                              <option value="Paused">Paused</option>
                              <option value="Completed">Completed</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Placement</label>
                           <select 
                             value={editingCampaign.placement || 'both'}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, placement: e.target.value as any })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-white outline-none"
                           >
                              <option value="landing_page">Landing Page</option>
                              <option value="dashboard">Dashboard</option>
                              <option value="both">Both</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target</label>
                           <select 
                             value={editingCampaign.target || 'attendees'}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, target: e.target.value as any })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-white outline-none"
                           >
                              <option value="attendees">Attendees</option>
                              <option value="organizers">Organizers</option>
                              <option value="all">All Users</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Call to Action</label>
                           <input 
                             type="text"
                             value={editingCampaign.cta || ''}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, cta: e.target.value })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                             placeholder="Learn More"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Image URL</label>
                           <input 
                             type="text"
                             value={editingCampaign.imageUrl || ''}
                             onChange={(e) => setEditingCampaign({ ...editingCampaign, imageUrl: e.target.value })}
                             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-indigo-400 font-mono outline-none focus:border-indigo-500 transition-all"
                             placeholder="https://..."
                           />
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => setIsCampaignModalOpen(false)}
                          className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 transition-all"
                        >
                           Cancel
                        </button>
                        <button 
                          onClick={handleSaveCampaign}
                          disabled={!editingCampaign.title || !editingCampaign.trackingCode}
                          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-xl shadow-indigo-600/20"
                        >
                           {editingCampaign.id ? 'Update Campaign' : 'Create Campaign'}
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      )}

      {/* Master Auth Modal */}
      <MasterAuthModal
        isOpen={showMasterAuthModal}
        onClose={() => setShowMasterAuthModal(false)}
        onAuthenticate={handleMasterAuth}
        operationName={pendingOperation}
      />
    </div>
  );
};

const SettingsCard = ({ icon, title, locked, fields, onFieldChange }: any) => (
  <div className="bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[40px] p-4 md:p-8 shadow-2xl relative overflow-hidden group">
    <div className="flex justify-between items-center mb-6 md:mb-8">
       <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors flex-shrink-0">
             {icon}
          </div>
          <h3 className="text-base md:text-lg font-black tracking-tight truncate">{title}</h3>
       </div>
       <div className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${locked ? 'text-slate-500' : 'text-emerald-500'}`}>
          <Wifi size={10} className="md:w-3 md:h-3" /> <span className="hidden sm:inline">{locked ? 'Standby' : 'Ready'}</span>
       </div>
    </div>
    <div className="space-y-4 md:space-y-6">
       {fields.map((field: any, i: number) => (
          <div key={i} className="space-y-2">
             <div className="flex justify-between px-1">
                <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                {locked && <Lock size={8} className="md:w-2.5 md:h-2.5 text-slate-700" />}
             </div>
             <input 
               type={field.type || 'text'} 
               disabled={locked}
               value={locked ? '••••••••••••••••' : field.value}
               onChange={(e) => !locked && onFieldChange && onFieldChange(field.key, e.target.value)}
               className={`w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl px-3 md:px-5 py-2.5 md:py-3.5 text-[10px] md:text-xs font-mono tracking-wider outline-none transition-all ${locked ? 'text-slate-700 cursor-not-allowed' : 'text-indigo-400 focus:border-indigo-500'}`}
               placeholder={locked ? '' : `Enter ${field.label.toLowerCase()}`}
             />
          </div>
       ))}
    </div>
    <div className="mt-6 md:mt-8 flex gap-2 md:gap-3">
       <button disabled={locked} className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${locked ? 'bg-slate-800 text-slate-600 opacity-50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
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
    <div className="bg-slate-900 border border-slate-800 p-4 md:p-8 rounded-2xl md:rounded-[32px] hover:border-slate-700 transition-all shadow-xl group">
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform ${colors[color]}`}>
          {React.cloneElement(icon, { size: 20, className: 'md:w-6 md:h-6' })}
        </div>
        <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-tighter ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : trend === 'down' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
          {change} {trend === 'up' ? <ArrowUpRight size={10} className="md:w-3 md:h-3" /> : <ArrowDownRight size={10} className="md:w-3 md:h-3" />}
        </div>
      </div>
      <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-white">{value}</h3>
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
    <td className={`py-6 text-center font-black ${amt && amt.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
      {amt || '€0'}
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

// Diagnostic Results Modal Component
const DiagnosticModal: React.FC<{
  results: any;
  onClose: () => void;
}> = ({ results, onClose }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-slate-900 border border-slate-800 rounded-[40px] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="p-8 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black tracking-tight">System Diagnostic Report</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Completed in {results.scanDuration}</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] scrollbar-hide">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className={`text-3xl font-black mb-1 ${results.overallStatus === 'healthy' ? 'text-emerald-500' : results.overallStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
              {results.overallStatus === 'healthy' ? '✓' : results.overallStatus === 'warning' ? '⚠' : '✕'}
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Overall</p>
            <p className="text-xs font-bold capitalize">{results.overallStatus}</p>
          </div>
          <div className="bg-slate-950 border border-emerald-900/20 rounded-2xl p-4">
            <div className="text-3xl font-black text-emerald-500 mb-1">{results.summary.healthy}</div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Healthy</p>
          </div>
          <div className="bg-slate-950 border border-yellow-900/20 rounded-2xl p-4">
            <div className="text-3xl font-black text-yellow-500 mb-1">{results.summary.warnings}</div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Warnings</p>
          </div>
          <div className="bg-slate-950 border border-red-900/20 rounded-2xl p-4">
            <div className="text-3xl font-black text-red-500 mb-1">{results.summary.critical}</div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Critical</p>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-3">
          {results.diagnostics.map((diag: any, idx: number) => (
            <div key={idx} className={`bg-slate-950 border rounded-2xl p-5 ${
              diag.status === 'healthy' ? 'border-emerald-900/20' :
              diag.status === 'warning' ? 'border-yellow-900/20' :
              'border-red-900/20'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                    diag.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500' :
                    diag.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {diag.status === 'healthy' ? '✓' : diag.status === 'warning' ? '⚠' : '✕'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm">{diag.category}</h4>
                    <p className="text-xs text-slate-400 mt-1">{diag.message}</p>
                    {diag.details && (
                      <div className="mt-2 p-3 bg-slate-900 rounded-xl">
                        <pre className="text-[10px] text-slate-500 font-mono overflow-x-auto scrollbar-hide">
                          {JSON.stringify(diag.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[8px] text-slate-600 font-mono whitespace-nowrap">
                  {new Date(diag.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-t border-slate-800 flex justify-between items-center">
        <p className="text-xs text-slate-500 font-mono">
          Timestamp: {new Date(results.timestamp).toLocaleString()}
        </p>
        <button 
          onClick={onClose}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all"
        >
          Close Report
        </button>
      </div>
    </div>
  </div>
);

export default AdminCommandCenter;
