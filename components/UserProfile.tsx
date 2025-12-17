
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket as TicketIcon, 
  Heart, 
  Star, 
  Settings, 
  Shield, 
  Download, 
  Share2, 
  Undo2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar,
  MapPin,
  Radar,
  ChevronRight,
  LogOut,
  Edit,
  Camera,
  Globe,
  Check,
  // Added X and Zap imports to fix "Cannot find name" errors
  X,
  Zap
} from 'lucide-react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (data: Partial<User>) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempUser, setTempUser] = useState<Partial<User>>({
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    location: user.location,
    branding: user.branding
  });

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleSaveProfile = () => {
    onUpdateUser(tempUser);
    setIsEditModalOpen(false);
  };

  const isPro = user.subscription !== 'free';

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Profile Header */}
      <div className="relative mb-16">
        <div 
          className="h-64 rounded-[40px] border border-slate-800 overflow-hidden relative"
          style={{ 
            background: user.branding?.primaryColor 
              ? `linear-gradient(to bottom right, ${user.branding.primaryColor}22, #020617)` 
              : 'linear-gradient(to bottom right, #1e293b, #020617)' 
          }}
        >
          {user.branding?.bannerUrl && (
            <img src={user.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" alt="" />
          )}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        
        <div className="absolute -bottom-12 left-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 rounded-[32px] blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
            <img src={user.avatar} className="w-32 h-32 rounded-[32px] border-4 border-slate-950 shadow-2xl relative z-10" alt="avatar" />
            <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2.5 rounded-2xl border-4 border-slate-950 z-20 shadow-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mb-4 space-y-1">
            <h1 className="text-4xl font-black tracking-tighter">{user.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                Nexus {user.subscription} • {user.role}
              </p>
              {user.location && (
                <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {user.location}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute top-4 right-8 flex items-center gap-3">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2 text-white"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20 sm:mt-16">
        <div className="lg:col-span-2 space-y-8">
          {/* Bio Section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] p-8 space-y-4">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Biography</h3>
             <p className="text-slate-300 font-medium leading-relaxed">
               {user.bio || "No biography provided yet. Tell the Nexus network about yourself!"}
             </p>
          </div>

          {/* Tickets Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
              <h3 className="font-black text-xl tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-xl">
                  <TicketIcon className="w-5 h-5 text-indigo-400" />
                </div>
                My Tickets
              </h3>
            </div>
            <div className="divide-y divide-slate-800">
              <TicketItem 
                name="Midnight Techno RAVE" 
                date="Fri, 15 Nov • 23:00" 
                location="78 Industrial Way, NYC"
                qrValue="TKT-A928-01"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-xl">
            <h3 className="font-black text-lg mb-6 uppercase tracking-widest text-slate-500 text-xs">Radar Status</h3>
            <div 
              onClick={() => navigate('/notifications')}
              className="p-5 rounded-3xl bg-slate-800/30 border border-slate-700/50 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${user.notificationPrefs.proximityAlerts ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  <Radar size={20} />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white">Radar {user.notificationPrefs.proximityAlerts ? 'Active' : 'Off'}</h4>
                  <p className="text-[9px] text-slate-500 font-bold">{user.notificationPrefs.alertRadius}km radius</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[40px] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-600/30">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-125 transition-transform duration-700" />
            <h3 className="font-black mb-2 text-2xl tracking-tighter">Nexus Pro</h3>
            <p className="text-sm text-indigo-100 mb-6 leading-relaxed font-medium">Create your own events and discover more. Only $19.99/mo.</p>
            <button className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95">Upgrade Plan</button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tighter">Edit Identity</h2>
                {/* Fixed: Added missing X import */}
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500"><X /></button>
              </div>

              <div className="space-y-8">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col sm:flex-row gap-8 items-center">
                   <div className="relative group cursor-pointer" onClick={() => setTempUser({...tempUser, avatar: `https://picsum.photos/seed/${Math.random()}/200` })}>
                      <img src={tempUser.avatar} className="w-24 h-24 rounded-[32px] border-2 border-slate-800 shadow-xl" alt="" />
                      <div className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Camera className="w-6 h-6 text-white" />
                      </div>
                   </div>
                   <div className="flex-1 space-y-4 w-full">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                         <input 
                           type="text" 
                           value={tempUser.name}
                           onChange={(e) => setTempUser({...tempUser, name: e.target.value})}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Location</label>
                         <input 
                           type="text" 
                           value={tempUser.location}
                           onChange={(e) => setTempUser({...tempUser, location: e.target.value})}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500"
                           placeholder="City, Country"
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Biography</label>
                   <textarea 
                     value={tempUser.bio}
                     onChange={(e) => setTempUser({...tempUser, bio: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-6 py-4 text-white outline-none focus:border-indigo-500 min-h-[120px]"
                   />
                </div>

                {/* Tiered Customization: Branding */}
                {isPro ? (
                  <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[40px] space-y-6">
                    <div className="flex items-center gap-3">
                      {/* Fixed: Added missing Zap import */}
                      <Zap className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-black text-sm uppercase tracking-widest">Nexus Elite Customization</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Theme Primary Color</label>
                        <div className="flex gap-4 items-center">
                          <input 
                            type="color" 
                            value={tempUser.branding?.primaryColor || '#6366f1'}
                            onChange={(e) => setTempUser({...tempUser, branding: { ...tempUser.branding!, primaryColor: e.target.value, accentColor: tempUser.branding?.accentColor || '#818cf8' }})}
                            className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                          />
                          <span className="font-mono text-xs text-slate-400">{tempUser.branding?.primaryColor}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Banner Image URL</label>
                        <input 
                          type="text" 
                          value={tempUser.branding?.bannerUrl}
                          onChange={(e) => setTempUser({...tempUser, branding: { ...tempUser.branding!, bannerUrl: e.target.value, primaryColor: tempUser.branding?.primaryColor || '#6366f1', accentColor: tempUser.branding?.accentColor || '#818cf8' }})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500 text-xs"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Public Tagline</label>
                       <input 
                         type="text" 
                         value={tempUser.branding?.tagline}
                         onChange={(e) => setTempUser({...tempUser, branding: { ...tempUser.branding!, tagline: e.target.value, primaryColor: tempUser.branding?.primaryColor || '#6366f1', accentColor: tempUser.branding?.accentColor || '#818cf8' }})}
                         className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500 text-sm"
                         placeholder="One line to define your brand"
                       />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-800/20 border border-slate-800 rounded-[40px] text-center space-y-4">
                     <p className="text-slate-500 text-sm font-medium">Upgrade to Pro to unlock custom colors, banners, and verified branding on your profile.</p>
                     <button className="text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:underline">View Plans</button>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TicketItem = ({ name, date, location, qrValue }: any) => {
  return (
    <div className={`p-8 flex flex-col sm:flex-row items-center gap-8 group transition-all relative overflow-hidden hover:bg-slate-800/20`}>
      <div className="w-24 h-24 bg-white p-2.5 rounded-[24px] shadow-2xl shrink-0">
        <div className="w-full h-full bg-slate-950 flex items-center justify-center rounded-xl">
           <div className="w-10 h-10 bg-indigo-500 rounded-sm" />
        </div>
      </div>

      <div className="flex-1 text-center sm:text-left space-y-1">
        <h4 className="font-black text-2xl tracking-tighter text-white">{name}</h4>
        <div className="space-y-1">
          <p className="text-sm text-indigo-400 font-bold flex items-center justify-center sm:justify-start gap-2">
            <Calendar className="w-4 h-4" /> {date}
          </p>
          <p className="text-xs text-slate-400 font-bold flex items-center justify-center sm:justify-start gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" /> {location}
          </p>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col gap-3">
         <button className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-slate-400">
            <Download className="w-5 h-5" />
         </button>
         <button className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-slate-400">
            <Share2 className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};

export default UserProfile;
