
import React from 'react';
import { 
  Bell, 
  MapPin, 
  Zap, 
  Smartphone, 
  Mail, 
  Settings2, 
  Check, 
  Radar, 
  Info,
  ChevronRight
} from 'lucide-react';
import { User, NotificationPreferences } from '../types';
import { CATEGORIES } from '../constants';

interface NotificationSettingsProps {
  user: User;
  onUpdatePrefs: (prefs: NotificationPreferences) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user, onUpdatePrefs }) => {
  const prefs = user.notificationPrefs;

  const toggleCategory = (cat: string) => {
    const newCats = prefs.interestedCategories.includes(cat)
      ? prefs.interestedCategories.filter(c => c !== cat)
      : [...prefs.interestedCategories, cat];
    onUpdatePrefs({ ...prefs, interestedCategories: newCats });
  };

  const updateSetting = (key: keyof NotificationPreferences, value: any) => {
    onUpdatePrefs({ ...prefs, [key]: value });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-5xl font-black tracking-tighter text-white">Notification <span className="text-indigo-500">Settings</span></h1>
        <p className="text-slate-400 font-medium">Manage your Nexus Radar preferences and app notifications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Proximity Radar Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-indigo-600/20 rounded-2xl text-indigo-400">
                <Radar className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Nexus Radar</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Real-time event detection</p>
              </div>
              <button 
                onClick={() => updateSetting('proximityAlerts', !prefs.proximityAlerts)}
                className={`ml-auto relative w-16 h-8 rounded-full transition-all flex items-center px-1.5 ${prefs.proximityAlerts ? 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${prefs.proximityAlerts ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detection Radius</label>
                  <span className="text-xl font-black text-white">{prefs.alertRadius} km</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="50"
                  value={prefs.alertRadius}
                  onChange={(e) => updateSetting('alertRadius', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase">
                  <span>High Precision (1km)</span>
                  <span>Wide Reach (50km)</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">My Interests</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-between gap-2 ${
                        prefs.interestedCategories.includes(cat)
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                      {prefs.interestedCategories.includes(cat) && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-10 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-8 tracking-tight">Notification Channels</h3>
            <div className="space-y-4">
              <ChannelToggle 
                icon={<Smartphone />} 
                title="Push Notifications" 
                desc="Receive alerts directly on your device in real-time." 
                active={prefs.pushEnabled} 
                onToggle={() => updateSetting('pushEnabled', !prefs.pushEnabled)}
              />
              <ChannelToggle 
                icon={<Mail />} 
                title="Email Notifications" 
                desc="Weekly summaries and important ticket updates." 
                active={prefs.emailEnabled} 
                onToggle={() => updateSetting('emailEnabled', !prefs.emailEnabled)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
            <h4 className="text-xl font-black mb-4 tracking-tight">How does Radar work?</h4>
            <div className="space-y-4 relative z-10">
              <p className="text-xs text-indigo-100 leading-relaxed">
                As you move, Nexus pings you when events matching your interests are nearby.
              </p>
              <div className="p-4 bg-white/10 rounded-2xl flex items-center gap-3">
                <MapPin className="w-5 h-5 shrink-0" />
                <p className="text-[10px] font-bold uppercase">Location is securely encrypted</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 space-y-4">
            <div className="flex items-center gap-3 text-indigo-400 mb-2">
              <Info className="w-5 h-5" />
              <h4 className="font-black text-[10px] uppercase tracking-widest">Good to know</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Radar alerts help you discover pop-up parties and last-minute deals you might otherwise miss.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChannelToggle = ({ icon, title, desc, active, onToggle }: any) => (
  <div className={`p-6 bg-slate-950 border rounded-3xl transition-all flex items-center gap-6 ${active ? 'border-indigo-500/30' : 'border-slate-800'}`}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-600'}`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-white text-sm">{title}</h4>
      <p className="text-xs text-slate-500 truncate">{desc}</p>
    </div>
    <button 
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-all flex items-center px-1 ${active ? 'bg-indigo-600' : 'bg-slate-800'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

export default NotificationSettings;
