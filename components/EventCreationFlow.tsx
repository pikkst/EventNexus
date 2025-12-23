
import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  AlertTriangle,
  Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateMarketingTagline, translateDescription, generateAdImage } from '../services/geminiService';
import { createEvent, getEvents, getUser, deductUserCredits, uploadEventImage } from '../services/dbService';
import { CATEGORIES, SUBSCRIPTION_TIERS } from '../constants';
import { FEATURE_UNLOCK_COSTS } from '../services/featureUnlockService';
import { User, EventNexusEvent } from '../types';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface EventCreationFlowProps {
  user: User;
  onUpdateUser?: (updates: Partial<User>) => void;
}

const EventCreationFlow: React.FC<EventCreationFlowProps> = ({ user, onUpdateUser }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userEvents, setUserEvents] = useState<EventNexusEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(user.credits_balance || 0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEventUnlocked, setIsEventUnlocked] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    tagline: '',
    date: '',
    time: '',
    location: '',
    locationLat: 58.8934,
    locationLng: 25.9659,
    locationAddress: '',
    locationCity: '',
    visibility: 'public',
    price: 0,
    max_capacity: 100
  });

  const navigate = useNavigate();

  // Image handling functions
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          const MAX_FILE_SIZE = 800 * 1024; // 800KB target
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = height * (MAX_WIDTH / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = width * (MAX_HEIGHT / height);
              height = MAX_HEIGHT;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          const tryCompress = (quality: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'));
                  return;
                }
                
                if (blob.size > MAX_FILE_SIZE && quality > 0.5) {
                  tryCompress(quality - 0.1);
                  return;
                }
                
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          };
          
          tryCompress(0.85);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Failed to process image. Please try another file.');
    }
  };

  const handleGenerateAIImage = async () => {
    if (!formData.name || !formData.description) {
      alert('Please fill in event name and description first');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const prompt = `${formData.name}: ${formData.description}. Category: ${formData.category}`;
      const imageData = await generateAdImage(prompt, '16:9');
      
      if (imageData) {
        setImagePreview(imageData);
        // Convert base64 to File
        const base64Response = await fetch(imageData);
        const blob = await base64Response.blob();
        const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
        setImageFile(file);
      } else {
        alert('Failed to generate AI image. Please try uploading manually.');
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
      alert('AI image generation failed. Please upload an image manually.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Geocode address using Nominatim (OpenStreetMap)
  const geocodeAddress = async (address: string) => {
    if (!address || address.trim().length < 3) return;
    
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=ee&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EventNexus/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        setFormData(prev => ({
          ...prev,
          locationLat: parseFloat(result.lat),
          locationLng: parseFloat(result.lon),
          locationAddress: result.display_name,
          locationCity: result.address?.city || result.address?.town || result.address?.village || 'Estonia'
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Load user's events to check limits
  useEffect(() => {
    const loadUserEvents = async () => {
      try {
        const allEvents = await getEvents();
        const filtered = allEvents.filter(e => e.organizerId === user.id);
        setUserEvents(filtered);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    loadUserEvents();
  }, [user.id]);

  // Get tier limits
  const tierLimits = SUBSCRIPTION_TIERS[user.subscription_tier];
  const eventLimit = tierLimits.maxEvents;
  // Free tier users bypass limit check if they've unlocked with credits
  const hasReachedLimit = (user.subscription_tier === 'free' && isEventUnlocked) 
    ? false 
    : (eventLimit !== Infinity && userEvents.length >= eventLimit);

  // Subscription Gate - Free users
  if (user.subscription_tier === 'free' && !isEventUnlocked) {
    const eventCost = FEATURE_UNLOCK_COSTS.CREATE_SINGLE_EVENT;
    const canAfford = userCredits >= eventCost;

    const handleUnlockEvent = async () => {
      if (!canAfford) {
        alert(`You need ${eventCost} credits to create an event. You have ${userCredits} credits.\\n\\nUpgrade to Pro for unlimited event creation, or purchase more credits!`);
        return;
      }

      if (!confirm(`Use ${eventCost} credits (€${(eventCost * 0.5).toFixed(2)} value) to unlock event creation?\\n\\nYou have ${userCredits} credits.`)) {
        return;
      }

      try {
        const success = await deductUserCredits(user.id, eventCost);
        if (success) {
          const newBalance = userCredits - eventCost;
          setUserCredits(newBalance);
          
          // Update parent component's user state
          if (onUpdateUser) {
            onUpdateUser({ credits_balance: newBalance });
          }
          
          // Mark event as unlocked so gate disappears
          setIsEventUnlocked(true);
          
          alert('Event creation unlocked! You can now create 1 event.');
        } else {
          alert('Failed to unlock. Please try again.');
        }
      } catch (error) {
        console.error('Unlock error:', error);
        alert('Error unlocking feature. Please try again.');
      }
    };

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
              Free tier users can create events using <span className="text-orange-400 font-bold">credits</span>, or upgrade to <span className="text-indigo-400 font-bold">Pro</span> for unlimited creation.
            </p>
          </div>

          {/* Credit Balance Display */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 max-w-md mx-auto">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Your Credit Balance</p>
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-8 h-8 text-orange-400" />
              <p className="text-5xl font-black text-white">{userCredits}</p>
              <span className="text-slate-400 text-sm font-bold">credits</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">= €{(userCredits * 0.5).toFixed(2)} value</p>
          </div>

          {/* Unlock Options */}
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            <button
              onClick={handleUnlockEvent}
              disabled={!canAfford}
              className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${
                canAfford 
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30' 
                  : 'bg-slate-800 cursor-not-allowed opacity-50'
              }`}
            >
              {canAfford 
                ? `Unlock 1 Event (${eventCost} Credits)` 
                : `Need ${eventCost - userCredits} More Credits`}
            </button>
            
            <Link 
              to="/pricing" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
            >
              Upgrade to Pro (20 Events)
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Creation</p>
                <p className="text-sm font-bold text-white">Up to 20 Events (Pro)</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Promotion</p>
                <p className="text-sm font-bold text-white">Public Profile Page</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Insights</p>
                <p className="text-sm font-bold text-white">Analytics Dashboard</p>
             </div>
             <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 text-left">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Global</p>
                <p className="text-sm font-bold text-white">AI Auto-Translation</p>
             </div>
          </div>

          <div className="pt-4">
            <Link to="/map" className="text-slate-500 hover:text-white font-bold text-sm transition-colors">
              Continue Exploring Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Event Limit Gate - Pro/Premium users who reached their limit
  if (hasReachedLimit && !isLoadingEvents) {
    const upgradeMap: Record<string, string> = {
      'pro': 'Premium (100 events)',
      'premium': 'Enterprise (unlimited events)',
      'enterprise': ''
    };
    const suggestedTier = upgradeMap[user.subscription_tier];

    return (
      <div className="max-w-3xl mx-auto px-4 py-20 animate-in fade-in duration-700">
        <div className="bg-slate-900 border border-orange-800/50 rounded-[48px] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -ml-32 -mb-32" />
          
          <div className="w-24 h-24 bg-orange-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-orange-600/40 relative">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter">Event Limit Reached</h1>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed font-medium text-lg">
              You've created <span className="text-orange-400 font-black">{userEvents.length}</span> events, reaching your <span className="text-orange-400 font-black">{user.subscription_tier.toUpperCase()}</span> tier limit of <span className="text-orange-400 font-black">{eventLimit}</span> events.
            </p>
            {suggestedTier && (
              <p className="text-slate-500 max-w-md mx-auto font-medium">
                Upgrade to <span className="text-indigo-400 font-bold">{suggestedTier}</span> to create more events.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
             <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 text-center">
                <p className="text-sm font-bold text-white mb-2">Your Active Events</p>
                <p className="text-3xl font-black text-orange-400">{userEvents.length} / {eventLimit}</p>
             </div>
          </div>

          <div className="pt-6 flex flex-col gap-4">
            {suggestedTier && (
              <Link 
                to="/pricing" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
              >
                Upgrade to Create More
              </Link>
            )}
            <Link to="/dashboard" className="text-slate-500 hover:text-white font-bold text-sm transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleGeminiTagline = async () => {
    if (!formData.name || !formData.category) return;
    
    // Gate AI features for free users
    if (user.subscription_tier === 'free') {
      alert('AI-powered tagline generation is available for Pro tier and above. Upgrade to unlock this feature.');
      return;
    }
    
    setIsGenerating(true);
    const result = await generateMarketingTagline(formData.name, formData.category);
    setFormData(prev => ({ ...prev, tagline: result }));
    setIsGenerating(false);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handlePublish = async () => {
    if (!formData.name || !formData.category || !formData.date || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      // Use image preview if available (AI-generated or uploaded)
      // Skip Supabase storage upload for now to avoid "Upload is not defined" error
      let uploadedImageUrl = '';
      if (imagePreview) {
        // If it's a base64 data URL (AI-generated), use it directly
        if (imagePreview.startsWith('data:')) {
          uploadedImageUrl = imagePreview;
        }
        // For uploaded files, we'll add storage upload in a future update
        // For now, just skip it - events can be created without images
      }

      const eventData: Omit<EventNexusEvent, 'id'> = {
        name: formData.name,
        category: formData.category,
        description: formData.tagline || formData.name,
        date: formData.date,
        time: formData.time,
        location: {
          lat: formData.locationLat || 40.7128,
          lng: formData.locationLng || -74.0060,
          address: formData.locationAddress || formData.location,
          city: formData.locationCity || 'New York'
        },
        price: formData.price,
        visibility: formData.visibility as any,
        organizerId: user.id,
        imageUrl: uploadedImageUrl,
        attendeesCount: 0,
        maxAttendees: formData.max_capacity,
        isFeatured: user.subscription_tier === 'premium' || user.subscription_tier === 'enterprise',
        customBranding: (user.subscription_tier === 'premium' || user.subscription_tier === 'enterprise') && user.branding ? {
          primaryColor: user.branding.primaryColor,
          logo: user.avatar
        } : undefined
      };

      const created = await createEvent(eventData);
      if (created) {
        alert('Event created successfully!');
        navigate('/dashboard');
      } else {
        alert('Failed to create event. Please try again.');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

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
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" 
                  />
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" 
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Venue Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                  <input 
                    type="text" 
                    placeholder="Search address or venue name (e.g., Põltsamaa lossi 61)" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        geocodeAddress(formData.location);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-24 py-3 focus:border-indigo-500 outline-none" 
                  />
                  <button
                    type="button"
                    onClick={() => geocodeAddress(formData.location)}
                    disabled={isGeocoding}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {isGeocoding ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {formData.locationAddress && (
                  <p className="text-xs text-slate-500 mt-1.5 pl-1">
                    📍 {formData.locationAddress}
                  </p>
                )}
              </div>
            </div>
            
            {/* Interactive Map */}
            <div className="relative rounded-2xl border border-slate-800 overflow-hidden h-64">
              <MapContainer 
                center={[formData.locationLat, formData.locationLng]} 
                zoom={formData.locationAddress ? 15 : 7}
                style={{ height: '100%', width: '100%' }}
                key={`${formData.locationLat}-${formData.locationLng}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {formData.locationAddress && (
                  <Marker position={[formData.locationLat, formData.locationLng]}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{formData.name || 'Event Location'}</p>
                        <p className="text-xs text-slate-600 mt-1">{formData.locationCity}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
              {!formData.locationAddress && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                  <p className="text-sm font-medium flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" /> Enter address and click Search to preview location
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">Event Image</h2>
            <p className="text-sm text-slate-400">Add a compelling visual to attract attendees</p>
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 aspect-video">
                <img src={imagePreview} alt="Event preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setImagePreview('');
                    setImageFile(null);
                  }}
                  className="absolute top-3 right-3 p-2 bg-slate-900/90 hover:bg-red-600/90 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Upload Options */}
            {!imagePreview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload from Device */}
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="h-48 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors bg-slate-900/50">
                    <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center">
                      <Upload className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Upload Image</p>
                      <p className="text-xs text-slate-500 mt-1">Click to browse files</p>
                      <p className="text-xs text-slate-600 mt-1">Max 10MB, auto-compressed</p>
                    </div>
                  </div>
                </label>

                {/* AI Generate Image */}
                <button
                  type="button"
                  onClick={handleGenerateAIImage}
                  disabled={isGeneratingImage || !formData.name || !formData.category}
                  className="h-48 border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors bg-slate-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center">
                    {isGeneratingImage ? (
                      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-orange-400" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">
                      {isGeneratingImage ? 'Generating...' : 'AI Generate Image'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {!formData.name || !formData.category 
                        ? 'Fill name & category first'
                        : 'Powered by Gemini AI'}
                    </p>
                    {user.subscription_tier === 'free' && (
                      <p className="text-xs text-orange-400 mt-1">20 credits per image</p>
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* Skip Option */}
            {!imagePreview && (
              <p className="text-xs text-center text-slate-500">
                You can skip this step, but events with images get 3x more engagement!
              </p>
            )}
          </div>
        );
      case 4:
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
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div>
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
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Max Capacity (Tickets)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none font-bold"
                  placeholder="100"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({...formData, max_capacity: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">Review & Publish</h2>
            
            {/* Event Preview Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative aspect-video border-b border-slate-800">
                  <img src={imagePreview} alt={formData.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {formData.visibility}
                  </div>
                </div>
              )}
              
              {/* Event Details */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{formData.category || 'CATEGORY'}</span>
                    <h3 className="text-xl font-bold mt-1">{formData.name || 'Untitled Event'}</h3>
                    <p className="text-sm text-slate-400 mt-1">{formData.tagline}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Date & Time</p>
                    <p className="font-bold">{formData.date || 'TBD'}</p>
                    <p className="text-xs text-slate-400">{formData.time || 'TBD'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Location</p>
                    <p className="font-bold text-sm">{formData.locationCity || 'TBD'}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Price</p>
                    <p className="font-bold text-lg">{formData.price === 0 ? 'Free' : `€${formData.price}`}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Capacity</p>
                    <p className="font-bold text-lg">{formData.max_capacity}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Translation Info */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
              <p className="text-xs text-yellow-500 font-medium leading-relaxed flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {user.subscription_tier === 'pro' || user.subscription_tier === 'premium' || user.subscription_tier === 'enterprise' 
                  ? 'Your event will be automatically translated into 5+ languages using Gemini AI to ensure global visibility.'
                  : 'AI auto-translation is available for Pro tier and above. Upgrade to reach global audiences.'}
              </p>
            </div>

            {/* Publish Button */}
            <button 
              onClick={handlePublish}
              disabled={isCreating || isUploadingImage}
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" /> 
              {isCreating ? 'Publishing...' : isUploadingImage ? 'Uploading Image...' : 'Publish Event'}
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
              <p className="text-xs text-slate-400">Step {step} of 5</p>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
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
          {step < 5 && (
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
