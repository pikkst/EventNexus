
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
  Search,
  Upload,
  X,
  Ticket as TicketIcon
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
  onEventCreated?: () => void; // Callback to reload events in parent
}

const EventCreationFlow: React.FC<EventCreationFlowProps> = ({ user, onUpdateUser, onEventCreated }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userEvents, setUserEvents] = useState<EventNexusEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(user.credits || 0);
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
    end_date: '',
    end_time: '',
    location: '',
    locationLat: 58.8934,
    locationLng: 25.9659,
    locationAddress: '',
    locationCity: '',
    visibility: 'public',
    price: 0,
    max_capacity: 100
  });

  const [ticketTemplates, setTicketTemplates] = useState<Array<{
    name: string;
    type: 'general' | 'vip' | 'early_bird' | 'day_pass' | 'multi_day' | 'backstage' | 'student' | 'group';
    price: number;
    quantity: number;
    description?: string;
  }>>([
    { name: 'General Admission', type: 'general', price: 0, quantity: 100 }
  ]);

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
    console.log('🎨 AI Image generation started');
    console.log('📝 Event name:', formData.name);
    console.log('📝 Description:', formData.description);
    console.log('📝 Tagline:', formData.tagline);
    console.log('🏷️ Category:', formData.category);
    
    // Use tagline as description if description is empty
    const descriptionText = formData.description || formData.tagline || formData.name;
    
    if (!formData.name || !descriptionText) {
      console.warn('⚠️ Missing name or description/tagline');
      alert('Please fill in event name and tagline first (use AI Generate to create a tagline)');
      return;
    }

    // AI features included in the 15 credit event unlock for free tier
    if (user.subscription_tier === 'free' && !isEventUnlocked) {
      console.warn('🔒 Event not unlocked for free tier user');
      alert('AI image generation is included when you unlock event creation (15 credits). Unlock to use AI features!');
      return;
    }

    console.log('✅ Validation passed, generating image...');
    setIsGeneratingImage(true);
    try {
      const prompt = `${formData.name}: ${descriptionText}. Category: ${formData.category}`;
      console.log('🎯 Calling generateAdImage with prompt:', prompt.substring(0, 100) + '...');
      
      // Don't save to storage (avoid Upload error) - use base64 directly
      const imageData = await generateAdImage(prompt, '16:9', false);
      
      console.log('📦 Image data received:', imageData ? `${imageData.substring(0, 50)}... (${imageData.length} chars)` : 'null');
      
      if (imageData) {
        console.log('✅ Setting image preview');
        // Just set the preview - no need to convert to File since we're not uploading
        setImagePreview(imageData);
        // Clear any previously uploaded file
        setImageFile(null);
        console.log('✅ AI image generation complete!');
      } else {
        console.error('❌ No image data returned');
        alert('Failed to generate AI image. Please try again or upload manually.');
      }
    } catch (error) {
      console.error('💥 Error generating AI image:', error);
      alert('AI image generation failed. Please try again or upload manually.');
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

  // Refresh user credits from database on mount
  useEffect(() => {
    const refreshCredits = async () => {
      try {
        const freshUser = await getUser(user.id);
        if (freshUser && freshUser.credits !== undefined) {
          setUserCredits(freshUser.credits);
        }
      } catch (error) {
        console.error('Error refreshing credits:', error);
      }
    };
    refreshCredits();
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
        alert(`You need ${eventCost} credits to create an event. You currently have ${userCredits} credits.\n\nOptions:\n✓ Upgrade to Pro for unlimited event creation\n✓ Complete platform actions to earn more credits`);
        return;
      }

      if (!confirm(`Unlock event creation for ${eventCost} credits?\n\nIncludes:\n✓ Event creation with full features\n✓ AI image generation\n✓ Multilingual translations\n✓ Marketing taglines\n\nCurrent balance: ${userCredits} credits\nNew balance: ${userCredits - eventCost} credits`)) {
        return;
      }

      try {
        const success = await deductUserCredits(user.id, eventCost);
        if (success) {
          const newBalance = userCredits - eventCost;
          setUserCredits(newBalance);
          
          // Update parent component's user state
          if (onUpdateUser) {
            onUpdateUser({ credits: newBalance });
          }
          
          // Mark event as unlocked so gate disappears
          setIsEventUnlocked(true);
          
          alert('🎉 Event creation unlocked!\n\nYou can now create 1 event with all AI features included. Fill in your event details below to get started.');
        } else {
          alert('Failed to unlock feature. Please check your connection and try again.');
        }
      } catch (error) {
        console.error('Unlock error:', error);
        alert('Error unlocking feature. Please refresh the page and try again.');
      }
    };

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-700">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[48px] p-6 md:p-12 text-center space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden">
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
              Free tier users can create events using <span className="text-orange-400 font-bold">credits</span>. Unlock includes <span className="text-green-400 font-bold">all AI features</span> (image generation, translations, taglines) for that event, or upgrade to <span className="text-indigo-400 font-bold">Pro</span> for unlimited creation.
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
    
    // AI features included in the 15 credit event unlock for free tier
    if (user.subscription_tier === 'free' && !isEventUnlocked) {
      alert('AI features are included when you unlock event creation (15 credits). Unlock to use AI tagline generation!');
      return;
    }
    
    setIsGenerating(true);
    const result = await generateMarketingTagline(formData.name, formData.category);
    setFormData(prev => ({ ...prev, tagline: result }));
    setIsGenerating(false);
  };

  const nextStep = () => {
    console.log(`📍 Moving from step ${step} to step ${step + 1}`);
    console.log('📋 Form data at step change:', formData);
    console.log('🖼️ Image preview exists:', !!imagePreview);
    console.log('📁 Image file exists:', !!imageFile);
    setStep(s => Math.min(s + 1, 5));
  };
  
  const prevStep = () => {
    console.log(`📍 Moving back from step ${step} to step ${step - 1}`);
    setStep(s => Math.max(s - 1, 1));
  };

  const handlePublish = async () => {
    console.log('🚀 Publish button clicked');
    console.log('📋 Form data:', formData);
    console.log('🖼️ Image preview:', imagePreview ? 'exists' : 'none');
    
    if (!formData.name || !formData.category || !formData.date || !formData.time) {
      console.error('❌ Missing required fields:', {
        name: !!formData.name,
        category: !!formData.category,
        date: !!formData.date,
        time: !!formData.time
      });
      alert('Please fill in all required fields');
      return;
    }

    console.log('✅ Validation passed, creating event...');
    setIsCreating(true);
    try {
      // Upload image to Storage if available (AI-generated or user uploaded)
      let uploadedImageUrl = '';
      if (imagePreview) {
        console.log('🖼️ Image preview found, uploading to Storage...');
        setIsUploadingImage(true);
        
        try {
          // Convert base64 data URL to Blob
          if (imagePreview.startsWith('data:')) {
            console.log(`📦 Converting base64 image (${imagePreview.length} chars) to Blob...`);
            const response = await fetch(imagePreview);
            const blob = await response.blob();
            console.log(`✅ Blob created: ${blob.size} bytes, type: ${blob.type}`);
            
            // Create File from Blob for upload
            const tempEventId = crypto.randomUUID();
            const file = new File([blob], `${tempEventId}.png`, { type: blob.type || 'image/png' });
            console.log(`📤 Uploading to Storage as ${file.name}...`);
            
            // Upload to Supabase Storage
            uploadedImageUrl = await uploadEventImage(tempEventId, file) || '';
            console.log(`✅ Image uploaded to Storage: ${uploadedImageUrl ? 'success' : 'failed'}`);
          }
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError);
          // Continue without image if upload fails
          uploadedImageUrl = '';
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        console.log('ℹ️ No image preview, creating event without image');
      }

      // AUTO-TRANSLATE FOR PRO+ USERS
      let translations: { [key: string]: string } = {};
      const description = formData.tagline || formData.name;
      
      if (user.subscription_tier !== 'free') {
        console.log('🌐 Auto-translating event description for Pro+ tier...');
        
        const targetLanguages = [
          { code: 'es', name: 'Spanish' },
          { code: 'fr', name: 'French' },
          { code: 'de', name: 'German' },
          { code: 'pt', name: 'Portuguese' },
          { code: 'it', name: 'Italian' }
        ];
        
        try {
          const translationPromises = targetLanguages.map(async ({ code, name }) => {
            try {
              console.log(`🔄 Translating to ${name}...`);
              const translated = await translateDescription(
                description,
                name,
                user.id,
                user.subscription_tier
              );
              console.log(`✅ ${name} translation complete`);
              return { lang: code, text: translated };
            } catch (error) {
              console.error(`⚠️ ${name} translation failed:`, error);
              return { lang: code, text: description }; // Fallback to original
            }
          });
          
          const results = await Promise.all(translationPromises);
          results.forEach(({ lang, text }) => {
            translations[lang] = text;
          });
          
          // Add original English
          translations['en'] = description;
          
          console.log('✅ All translations complete:', Object.keys(translations));
        } catch (error) {
          console.error('⚠️ Translation process failed, continuing without translations:', error);
          // Continue without translations if the whole process fails
        }
      } else {
        console.log('ℹ️ Free tier - skipping auto-translation');
      }

      console.log('📦 Preparing event data...');
      const eventData: Omit<EventNexusEvent, 'id'> = {
        name: formData.name,
        category: formData.category,
        description: description,
        date: formData.date,
        time: formData.time,
        end_date: formData.end_date || undefined,
        end_time: formData.end_time || undefined,
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
        } : undefined,
        translations: Object.keys(translations).length > 0 ? translations : undefined
      };

      console.log('📤 Calling createEvent()...');
      const created = await createEvent(eventData);
      console.log('📥 createEvent() response:', created ? 'success' : 'failed');
      
      if (created) {
        console.log('✅ Event created successfully!');
        
        // Create ticket templates if any were defined
        if (ticketTemplates && ticketTemplates.length > 0) {
          console.log(`🎫 Creating ${ticketTemplates.length} ticket templates...`);
          try {
            const { createTicketTemplates } = await import('../services/dbService');
            const templates = ticketTemplates.map(template => ({
              name: template.name,
              type: template.type as any,
              price: template.price || 0,
              quantity_total: template.quantity || 50,
              quantity_available: template.quantity || 50,
              quantity_sold: 0,
              description: template.description,
              is_active: true
            }));
            
            await createTicketTemplates(created.id, templates);
            console.log('✅ Ticket templates created successfully!');
          } catch (ticketError) {
            console.error('⚠️ Failed to create ticket templates:', ticketError);
            // Don't fail the whole event creation if tickets fail
          }
        }
        
        console.log('🎉 Navigating to dashboard...');
        const translationCount = Object.keys(translations).length;
        const successMessage = translationCount > 0 
          ? `Event created successfully!\n\n🌐 Auto-translated into ${translationCount} languages: ${Object.keys(translations).join(', ').toUpperCase()}`
          : 'Event created successfully!';
        alert(successMessage);
        // Notify parent to reload events
        if (onEventCreated) {
          onEventCreated();
        }
        navigate('/dashboard');
      } else {
        console.error('❌ Event creation failed');
        alert('Failed to create event. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error creating event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      console.log('🏁 Event creation process finished');
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
                    title="AI will generate a catchy tagline based on your event name and category"
                  >
                    <Sparkles className="w-3 h-3" /> AI Generate
                  </button>
                </div>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-indigo-500 transition-all outline-none" 
                  placeholder="Let AI create an engaging tagline for your event..."
                  value={isGenerating ? "Gemini is thinking..." : formData.tagline}
                  readOnly
                />
                <p className="text-xs text-slate-500 mt-1.5">A short, memorable phrase that captures the essence of your event</p>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold">When & Where</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Start Date</label>
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
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Start Time</label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">End Date <span className="text-slate-600">(optional)</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="date" 
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      min={formData.date}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" 
                    />
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">End Time <span className="text-slate-600">(optional)</span></label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="time" 
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:border-indigo-500 outline-none" 
                    />
                  </div>
                </div>
              </div>
              
              <div>
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
                        : 'Create unique artwork instantly'}
                    </p>
                    {user.subscription_tier === 'free' && !isEventUnlocked && (
                      <p className="text-xs text-orange-400 mt-1">Included with event unlock</p>
                    )}
                    {user.subscription_tier === 'free' && isEventUnlocked && (
                      <p className="text-xs text-green-400 mt-1">✓ Unlocked & Ready</p>
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
            <h2 className="text-2xl font-bold">Tickets & Pricing</h2>
            <p className="text-sm text-slate-400">Create different ticket types for your event</p>
            
            {/* Ticket Templates List */}
            <div className="space-y-3">
              {ticketTemplates.map((ticket, index) => (
                <div key={index} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Ticket {index + 1}</h4>
                    {ticketTemplates.length > 1 && (
                      <button
                        onClick={() => setTicketTemplates(ticketTemplates.filter((_, i) => i !== index))}
                        className="p-1.5 hover:bg-red-600/20 rounded-lg text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Ticket Name</label>
                      <input 
                        type="text"
                        value={ticket.name}
                        onChange={(e) => {
                          const newTemplates = [...ticketTemplates];
                          newTemplates[index].name = e.target.value;
                          setTicketTemplates(newTemplates);
                        }}
                        placeholder="e.g., VIP Pass, Early Bird"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Ticket Type</label>
                      <select
                        value={ticket.type}
                        onChange={(e) => {
                          const newTemplates = [...ticketTemplates];
                          newTemplates[index].type = e.target.value as any;
                          setTicketTemplates(newTemplates);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                      >
                        <option value="general">General Admission</option>
                        <option value="vip">VIP</option>
                        <option value="early_bird">Early Bird</option>
                        <option value="day_pass">Day Pass</option>
                        <option value="multi_day">Multi-Day Pass</option>
                        <option value="backstage">Backstage Access</option>
                        <option value="student">Student</option>
                        <option value="group">Group</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Price ($)</label>
                      <input 
                        type="number"
                        value={ticket.price}
                        onChange={(e) => {
                          const newTemplates = [...ticketTemplates];
                          newTemplates[index].price = Number(e.target.value);
                          setTicketTemplates(newTemplates);
                        }}
                        min="0"
                        step="0.01"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Quantity</label>
                      <input 
                        type="number"
                        value={ticket.quantity}
                        onChange={(e) => {
                          const newTemplates = [...ticketTemplates];
                          newTemplates[index].quantity = Number(e.target.value);
                          setTicketTemplates(newTemplates);
                        }}
                        min="1"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Description (optional)</label>
                      <input 
                        type="text"
                        value={ticket.description || ''}
                        onChange={(e) => {
                          const newTemplates = [...ticketTemplates];
                          newTemplates[index].description = e.target.value;
                          setTicketTemplates(newTemplates);
                        }}
                        placeholder="e.g., Includes backstage access and meet & greet"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Ticket Button */}
              <button
                onClick={() => setTicketTemplates([
                  ...ticketTemplates,
                  { name: `Ticket ${ticketTemplates.length + 1}`, type: 'general', price: 0, quantity: 50 }
                ])}
                className="w-full p-4 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl text-sm font-bold text-slate-400 hover:text-white transition-all"
              >
                + Add Another Ticket Type
              </button>
            </div>

            {/* Total Summary */}
            <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Total Capacity</span>
                <span className="text-xl font-black text-white">
                  {ticketTemplates.reduce((sum, t) => sum + t.quantity, 0)} tickets
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-slate-400">Price Range</span>
                <span className="text-xl font-black text-white">
                  ${Math.min(...ticketTemplates.map(t => t.price))} - ${Math.max(...ticketTemplates.map(t => t.price))}
                </span>
              </div>
            </div>

            {/* Privacy & Visibility */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-lg font-bold">Privacy & Visibility</h3>
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
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Price Range</p>
                    <p className="font-bold text-lg">
                      {ticketTemplates.length > 0 
                        ? (() => {
                            const prices = ticketTemplates.map(t => t.price || 0).filter(p => p > 0);
                            if (prices.length === 0) return 'Free';
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            return minPrice === maxPrice ? `€${minPrice}` : `€${minPrice} - €${maxPrice}`;
                          })()
                        : formData.price === 0 ? 'Free' : `€${formData.price}`}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Total Capacity</p>
                    <p className="font-bold text-lg">
                      {ticketTemplates.length > 0 
                        ? ticketTemplates.reduce((sum, t) => sum + (t.quantity || 0), 0)
                        : formData.max_capacity}
                    </p>
                  </div>
                </div>

                {/* Ticket Templates Preview */}
                {ticketTemplates.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-slate-500 text-[10px] uppercase font-bold">Ticket Types ({ticketTemplates.length})</p>
                    <div className="space-y-2">
                      {ticketTemplates.map((ticket, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-4 py-2.5 border border-slate-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                              <TicketIcon className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{ticket.name}</p>
                              <p className="text-xs text-slate-500 capitalize">{ticket.type.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">€{ticket.price}</p>
                            <p className="text-xs text-slate-500">{ticket.quantity} available</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
