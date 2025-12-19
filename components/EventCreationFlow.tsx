
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  Sparkles, 
  Globe, 
  Lock, 
  Unlock,
  Zap,
  Rocket,
  ShieldAlert
} from 'lucide-react';
import { generateMarketingTagline, translateDescription } from '../services/geminiService';
import { CATEGORIES } from '../constants';
import { User } from '../types';

interface EventCreationFlowProps {
  user: User;
}

const EventCreationFlow: React.FC<EventCreationFlowProps> = ({ user }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    tagline: '',
    date: '',
    time: '',
    location: '',
    visibility: 'public',
    price: 0
  });

  const navigate = useNavigate();

  // Subscription Gate
  if (user.subscription_tier === 'free') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 animate-in fade-in duration-700">
        <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -ml-32 -mb-32" />
          
          <div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40 relative">
            <Zap className="w-12 h-12 text-white" />
            <div className="absolute -top-2 -right-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter">Become a Creator</h1>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed font-medium text-lg">
              Unlock event creation, global AI translation, and organizer analytics by upgrading to a <span className="text-indigo-400">Nexus Elite</span> plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Creation</p>
                <p className="text-sm font-bold text-white">Unlimited Event Hosting</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Promotion</p>
                <p className="text-sm font-bold text-white">Featured Map Listing</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Insights</p>
                <p className="text-sm font-bold text-white">Attendee Analytics</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Global</p>
                <p className="text-sm font-bold text-white">AI Auto-Translation</p>
             </div>
          </div>

          <div className="pt-6 flex flex-col gap-4">
            <Link 
              to="/pricing" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
            >
              View Elite Plans
            </Link>
            <Link to="/map" className="text-slate-500 hover:text-white font-bold text-sm transition-colors">
              Continue Exploring Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleGeminiTagline = async () => {
    if (!formData.name || !formData.category) return;
    setIsGenerating(true);
    const result = await generateMarketingTagline(formData.name, formData.category);
    setFormData(prev => ({ ...prev, tagline: result }));
    setIsGenerating(false);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">The Basics</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Event Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none" 
                  placeholder="e.g. Neon nights music festival"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setFormData({...formData, category: cat})}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        formData.category === cat ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-slate-400">Catchy Tagline</label>
                  <button 
                    onClick={handleGeminiTagline}
                    disabled={isGenerating || !formData.name || !formData.category}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" /> AI Generate
                  </button>
                </div>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 transition-all outline-none" 
                  placeholder="Generated tagline will appear here..."
                  value={isGenerating ? "Gemini is thinking..." : formData.tagline}
                  readOnly
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">When & Where</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="time" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Venue Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" placeholder="Search address or venue name" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 h-40 flex items-center justify-center text-slate-600">
              <p className="text-sm font-medium flex items-center gap-2 italic"><MapPin className="w-4 h-4" /> Interactive Map Preview Area</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">Privacy & Visibility</h2>
            <div className="space-y-3">
              <button 
                onClick={() => setFormData({...formData, visibility: 'public'})}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${formData.visibility === 'public' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <div className={`p-3 rounded-xl ${formData.visibility === 'public' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold">Public Event</h4>
                  <p className="text-xs text-slate-400">Visible to everyone on the map and searchable globally.</p>
                </div>
              </button>
              <button 
                onClick={() => setFormData({...formData, visibility: 'private'})}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${formData.visibility === 'private' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <div className={`p-3 rounded-xl ${formData.visibility === 'private' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold">Private / Invite Only</h4>
                  <p className="text-xs text-slate-400">Hidden from map. Only accessible via secret link or code.</p>
                </div>
              </button>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Ticket Price (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none font-bold"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">Review & Publish</h2>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{formData.category || 'CATEGORY'}</span>
                  <h3 className="text-xl font-bold">{formData.name || 'Untitled Event'}</h3>
                  <p className="text-sm text-slate-400">{formData.tagline}</p>
                </div>
                <div className="bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase">
                  {formData.visibility}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Price</p>
                  <p className="font-bold text-lg">{formData.price === 0 ? 'Free' : `$${formData.price}`}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Language</p>
                  <div className="flex items-center gap-1 font-bold">
                    <Globe className="w-4 h-4" /> Auto-Translate
                  </div>
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                <p className="text-xs text-yellow-500 font-medium leading-relaxed">
                  Your event will be automatically translated into 5+ languages using Gemini AI to ensure global visibility.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> Publish Event
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 min-h-screen">
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl">
              {step}
            </div>
            <div>
              <h1 className="text-xl font-bold">Create New Event</h1>
              <p className="text-xs text-slate-400">Step {step} of 4</p>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl min-h-[500px] flex flex-col justify-between">
        {renderStep()}

        <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-800">
          <button 
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-slate-400 font-semibold hover:bg-slate-800 transition-all disabled:opacity-0"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          {step < 4 && (
            <button 
              onClick={nextStep}
              className="bg-slate-100 text-slate-950 px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-all"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCreationFlow;
