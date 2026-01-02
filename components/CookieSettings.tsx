
import React, { useState } from 'react';
import { Shield, Check, Info } from 'lucide-react';

const CookieSettings: React.FC = () => {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false,
    functional: true
  });

  const toggle = (key: keyof typeof preferences) => {
    if (key === 'essential') return;
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-24 space-y-12 animate-in fade-in duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black tracking-tighter text-white">Cookie <span className="text-indigo-500">Settings</span></h1>
        <p className="text-slate-400 font-medium">Manage how we use cookies and similar technologies to enhance your EventNexus experience.</p>
      </div>

      <div className="space-y-6">
        <CookieItem 
          title="Essential Cookies" 
          desc="Required for basic platform functionality, security, and ticket processing. These cannot be disabled."
          active={preferences.essential}
          disabled={true}
          onToggle={() => {}}
        />
        <CookieItem 
          title="Performance & Analytics" 
          desc="Helps us understand how users interact with our global map and event listings so we can improve the UI/UX."
          active={preferences.analytics}
          onToggle={() => toggle('analytics')}
        />
        <CookieItem 
          title="Functional Cookies" 
          desc="Remembers your preferences like language, currency, and search radius."
          active={preferences.functional}
          onToggle={() => toggle('functional')}
        />
        <CookieItem 
          title="Marketing & Targeted Ads" 
          desc="Used to show you events on other platforms that match your interests. Helps organizers reach the right audience."
          active={preferences.marketing}
          onToggle={() => toggle('marketing')}
        />
      </div>

      <div className="pt-10 flex flex-col sm:flex-row gap-4">
        <button className="flex-1 bg-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
          Save My Preferences
        </button>
        <button className="flex-1 bg-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all">
          Accept All Cookies
        </button>
      </div>

      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-start gap-4">
        <Info className="w-6 h-6 text-indigo-400 shrink-0" />
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Your preferences are stored locally on your device. Clearing your browser cache will reset these settings to their default values. For more details, see our <a href="/privacy" className="text-indigo-400 underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

const CookieItem = ({ title, desc, active, disabled, onToggle }: any) => (
  <div className={`p-8 bg-slate-900/50 border rounded-[32px] transition-all flex items-center justify-between gap-6 ${active ? 'border-indigo-500/30' : 'border-slate-800'}`}>
    <div className="space-y-2">
      <h3 className="font-bold text-white flex items-center gap-2">
        {title}
        {active && <Check className="w-4 h-4 text-emerald-500" />}
      </h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-lg">{desc}</p>
    </div>
    <button 
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-14 h-8 rounded-full transition-colors flex items-center px-1 shrink-0 ${active ? 'bg-indigo-600' : 'bg-slate-800'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

export default CookieSettings;
