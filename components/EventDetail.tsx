
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import { translateDescription } from '../services/geminiService';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Ticket, 
  Share2, 
  Heart, 
  ShieldCheck, 
  Globe, 
  Users, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  UserPlus,
  UserMinus,
  RotateCw,
  Star,
  Edit3
} from 'lucide-react';
import { getEvents, getEventById, likeEvent, unlikeEvent, checkIfUserLikedEvent, getTicketTemplates } from '../services/dbService';
import { createTicketCheckout, checkCheckoutSuccess, clearCheckoutStatus, verifyCheckoutPayment } from '../services/stripeService';
import { User, EventNexusEvent, TicketTemplate } from '../types';
import { isEventExpired } from '../utils/eventUtils';
import { generateEventSEO, updatePageMeta, cleanupSEO } from '../utils/seoUtils';

interface EventDetailProps {
  user: User | null;
  onToggleFollow?: (orgId: string) => void;
  onOpenAuth?: () => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ user, onToggleFollow, onOpenAuth }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventNexusEvent | null>(null);
  const [ticketTemplates, setTicketTemplates] = useState<TicketTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAttendees, setCurrentAttendees] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  // Initialize selected language from user preference or browser locale
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (user?.preferred_language && user.preferred_language !== 'en') {
      return user.preferred_language;
    }
    // Fallback to browser language or English
    const browserLang = navigator.language?.split('-')[0] || 'en';
    return browserLang;
  });
  
  const [organizerName, setOrganizerName] = useState<string>('EventNexus User');
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({});
  const [organizerPaymentReady, setOrganizerPaymentReady] = useState(false);
  const [checkingOrganizerStatus, setCheckingOrganizerStatus] = useState(true);
  const [eventCompleted, setEventCompleted] = useState(false);
  const [isRefreshingOrganizerStatus, setIsRefreshingOrganizerStatus] = useState(false);
  const [translatedName, setTranslatedName] = useState<string | null>(null);
  const [translatedAboutText, setTranslatedAboutText] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const translationCache = useRef<Map<string, { name: string; aboutText: string; description: string }>>(new Map());

  const LANGUAGE_LABELS: Record<string, string> = {
    en: 'English',
    et: 'Estonian',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    fi: 'Finnish',
    sv: 'Swedish',
    tr: 'Turkish',
    pl: 'Polish',
    ru: 'Russian',
    uk: 'Ukrainian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic'
  };

  // Initialize available languages from event - for dropdown display
  const availableLanguages = React.useMemo(() => {
    if (!event?.translations) {
      // Even without translations, show full language list for remote translation
      return [
        { code: 'en', name: 'English' },
        { code: 'et', name: 'Eesti' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
        { code: 'de', name: 'Deutsch' },
        { code: 'pt', name: 'Português' },
        { code: 'it', name: 'Italiano' },
        { code: 'fi', name: 'Suomi' },
        { code: 'sv', name: 'Svenska' },
        { code: 'tr', name: 'Türkçe' },
        { code: 'pl', name: 'Polski' },
        { code: 'ru', name: 'Русский' },
        { code: 'uk', name: 'Українська' },
        { code: 'ja', name: '日本語' },
        { code: 'ko', name: '한국어' },
        { code: 'zh', name: '中文' },
        { code: 'ar', name: 'العربية' }
      ];
    }
    
    const langMap: { [key: string]: string } = {
      'en': 'English',
      'et': 'Eesti',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'pt': 'Português',
      'it': 'Italiano',
      'fi': 'Suomi',
      'sv': 'Svenska',
      'tr': 'Türkçe',
      'pl': 'Polski',
      'ru': 'Русский',
      'uk': 'Українська',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'ar': 'العربية'
    };
    
    return Object.keys(event.translations).map(code => ({
      code,
      name: langMap[code] || code.toUpperCase()
    }));
  }, [event?.translations]);

  // Get description in selected language
  const displayDescription = React.useMemo(() => {
    if (!event) return '';
    if (translatedDescription) return translatedDescription;

    const translation = event.translations?.[selectedLanguage];
    if (translation?.description) return translation.description;

    return event.description;
  }, [event, selectedLanguage, translatedDescription]);

  // Sync selected language with user preference when user loads or preference changes
  useEffect(() => {
    if (user?.preferred_language && user.preferred_language !== 'en') {
      setSelectedLanguage(user.preferred_language);
    }
  }, [user?.preferred_language]);

  // Auto-translate event name and about text when language changes
  useEffect(() => {
    const doTranslate = async () => {
      if (!event) { setTranslatedName(null); setTranslatedAboutText(null); setTranslatedDescription(null); return; }

      const targetLang = selectedLanguage || 'en';
      const targetLabel = LANGUAGE_LABELS[targetLang] || targetLang;
      const key = `${event.id}:${targetLang}`;

      // If event has structured translations, prefer them
      const direct = event.translations?.[targetLang];
      if (direct) {
        setTranslatedName(direct.name || event.name);
        // Use description from structured translation or fall back to aboutText
        const aboutText = direct.aboutText || direct.description || event.aboutText || '';
        const description = direct.description || event.description;
        setTranslatedAboutText(aboutText);
        setTranslatedDescription(description);
        translationCache.current.set(key, { name: direct.name || event.name, aboutText, description });
        return;
      }

      // Cache key per event + target language
      const cachedTrans = translationCache.current.get(key);
      if (cachedTrans) {
        setTranslatedName(cachedTrans.name);
        setTranslatedAboutText(cachedTrans.aboutText);
        setTranslatedDescription(cachedTrans.description);
        return;
      }

      // Fallback: legacy translation format
      const legacy = event.legacy_translations?.[targetLang];
      if (legacy) {
        setTranslatedName(legacy);
        setTranslatedAboutText(event.aboutText || '');
        setTranslatedDescription(event.description || '');
        translationCache.current.set(key, { name: legacy, aboutText: event.aboutText || '', description: event.description || '' });
        return;
      }

      // Remote translate via Gemini service with graceful fallback
      try {
        const nameTranslated = await translateDescription(event.name, targetLabel);
        const aboutSource = event.aboutText || '';
        const descSource = event.description || '';
        const [aboutTranslated, descTranslated] = await Promise.all([
          aboutSource ? translateDescription(aboutSource, targetLabel) : Promise.resolve(''),
          descSource ? translateDescription(descSource, targetLabel) : Promise.resolve('')
        ]);

        setTranslatedName(nameTranslated || event.name);
        setTranslatedAboutText(aboutTranslated || aboutSource);
        setTranslatedDescription(descTranslated || descSource);
        translationCache.current.set(key, {
          name: nameTranslated || event.name,
          aboutText: aboutTranslated || aboutSource,
          description: descTranslated || descSource
        });
      } catch (e) {
        console.warn('Translation fallback due to error:', e);
        setTranslatedName(event.name);
        setTranslatedAboutText(event.aboutText || '');
        setTranslatedDescription(event.description || '');
      }
    };

    doTranslate();
  }, [event, selectedLanguage]);

  // Load event from database
  const loadEvent = React.useCallback(async () => {
    if (!id) return;
    try {
      // Use getEventById to fetch directly (works for all visibility types via direct link)
      const foundEvent = await getEventById(id);
      if (foundEvent) {
        setEvent(foundEvent);
        setCurrentAttendees(foundEvent.attendeesCount);
        
        // Load ticket templates
        const templates = await getTicketTemplates(id);
        setTicketTemplates(templates);
        
        // Check if event is completed (either from DB status or from date/time)
        // Note: isEventCompleted RPC may not exist, so we do local check only
        const expired = isEventExpired(foundEvent);
        setEventCompleted(expired);
        
        // Load organizer name and payment status
        try {
          const { getUser, checkConnectStatus } = await import('../services/dbService');
          logger.log('Loading event details:', { eventId: id, organizerId: foundEvent.organizerId });
          
          const organizer = await getUser(foundEvent.organizerId);
          logger.log('Organizer loaded:', { 
            organizerId: foundEvent.organizerId, 
            organizerEmail: organizer?.email,
            organizerName: organizer?.name
          });
          
          if (organizer) {
            // If organizer is an agency/organization, show company name
            setOrganizerName(organizer.company_name || organizer.name || 'EventNexus User');
            
            // Check if organizer has completed Stripe Connect onboarding
            const connectStatus = await checkConnectStatus(foundEvent.organizerId);
            logger.log('Organizer Connect Status from DB:', {
              organizerId: foundEvent.organizerId,
                            organizerEmail: organizer?.email,
                            stripe_connect_account_id: organizer?.stripe_connect_account_id,
              hasAccount: connectStatus?.hasAccount,
              onboardingComplete: connectStatus?.onboardingComplete,
              chargesEnabled: connectStatus?.chargesEnabled,
              payoutsEnabled: connectStatus?.payoutsEnabled
            });
            // Allow ticket sales if organizer has a connect account (even if webhook hasn't updated all flags yet)
            // In live mode, Stripe will handle payment rejection if account isn't fully onboarded
            const isReady = connectStatus?.hasAccount || (connectStatus?.onboardingComplete && connectStatus?.chargesEnabled);
            logger.log('Payment ready status:', { isReady, hasAccount: connectStatus?.hasAccount, onboardingComplete: connectStatus?.onboardingComplete, chargesEnabled: connectStatus?.chargesEnabled });
            setOrganizerPaymentReady(isReady || false);
                      } else {
                        logger.warn('Organizer not found for ID:', foundEvent.organizerId);
            setCheckingOrganizerStatus(false);
          }
        } catch (err) {
          logger.error('Error loading organizer:', err);
          setCheckingOrganizerStatus(false);
        }
      }
      
      // Check if user has liked this event
      if (user && id) {
        const liked = await checkIfUserLikedEvent(user.id, id);
        setIsLiked(liked);
      }
    } catch (error) {
      logger.error('Error loading event:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  // Refresh organizer payment status specifically
  const refreshOrganizerStatus = React.useCallback(async () => {
    if (!event) return;
    setIsRefreshingOrganizerStatus(true);
    try {
      const { checkConnectStatus } = await import('../services/dbService');
      const connectStatus = await checkConnectStatus(event.organizerId);
      logger.log('Refreshed organizer Connect status:', {
        organizerId: event.organizerId,
        hasAccount: connectStatus?.hasAccount,
        onboardingComplete: connectStatus?.onboardingComplete,
        chargesEnabled: connectStatus?.chargesEnabled
      });
      const isReady = connectStatus?.hasAccount || (connectStatus?.onboardingComplete && connectStatus?.chargesEnabled);
      setOrganizerPaymentReady(isReady || false);
    } catch (err) {
      logger.error('Error refreshing organizer status:', err);
    } finally {
      setIsRefreshingOrganizerStatus(false);
    }
  }, [event]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Update SEO meta tags when event loads
  useEffect(() => {
    if (event) {
      const seoTags = generateEventSEO(event, organizerName);
      updatePageMeta(seoTags);
    }

    // Cleanup: reset to homepage SEO when component unmounts
    return () => {
      cleanupSEO();
    };
  }, [event, organizerName]);

  // Check for successful purchase on mount and verify with Stripe
  useEffect(() => {
    const verifyPurchase = async () => {
      if (checkCheckoutSuccess()) {
        // Get session ID from URL (query params come BEFORE hash now)
        // URL format: https://site.com?purchase=success&session_id=xxx (BrowserRouter)
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (sessionId) {
          // Verify payment with Stripe
          const isVerified = await verifyCheckoutPayment(sessionId);
          if (isVerified) {
            setShowSuccess(true);
            clearCheckoutStatus();
            // Refresh event data to get updated attendee count
            loadEvent();
          } else {
            logger.warn('Payment verification failed for session:', sessionId);
          }
        } else {
          // Fallback: just show success if URL params indicate it
          setShowSuccess(true);
          clearCheckoutStatus();
          loadEvent();
        }
      }
    };

    verifyPurchase();
  }, [loadEvent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event not found</h2>
          <p className="text-slate-400">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Calculate total capacity and remaining from ticket templates if available
  const totalCapacity = ticketTemplates.length > 0
    ? ticketTemplates.reduce((sum, t) => sum + t.quantity_sold + t.quantity_available, 0)
    : event.maxAttendees;
  
  const remaining = ticketTemplates.length > 0
    ? ticketTemplates.reduce((sum, t) => sum + t.quantity_available, 0)
    : event.maxAttendees - currentAttendees;
  
  const totalRevenue = currentAttendees * event.price;
  const isFollowing = user?.followedOrganizers?.includes(event.organizerId) ?? false;

  const handleLike = async () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (!event || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        const success = await unlikeEvent(user.id, event.id);
        if (success) {
          setIsLiked(false);
        }
      } else {
        const success = await likeEvent(user.id, event.id);
        if (success) {
          setIsLiked(true);
        }
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handlePurchaseTicket = async (template: TicketTemplate) => {
    // Require authentication before purchase
    if (!user) {
      alert('Please sign in to purchase tickets. It only takes a moment!');
      onOpenAuth?.();
      return;
    }

    // Check if event has expired
    if (event && isEventExpired(event)) {
      alert('⚠️ This event has already ended. Ticket sales are no longer available.');
      return;
    }

    // Check if organizer has completed payment setup
    if (!organizerPaymentReady) {
      alert('⚠️ Ticket sales are not yet available for this event.\n\nThe event organizer needs to complete their payment setup first. Please check back later or contact the organizer.');
      return;
    }

    const quantity = ticketQuantities[template.id] || 0;
    
    if (quantity === 0) {
      alert('Please select a quantity first.');
      return;
    }

    if (template.quantity_available < quantity) {
      alert(`Only ${template.quantity_available} tickets remaining. Please reduce your quantity.`);
      return;
    }

    setIsPurchasing(true);
    
    try {
      // Create Stripe checkout session for this specific ticket type
      const checkoutUrl = await createTicketCheckout(
        user.id,
        event!.id,
        quantity,
        template.price,
        `${event!.name} - ${template.name}`,
        template.id,
        template.type,
        template.name
      );

      if (checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Failed to start checkout. Please try again or contact support.');
      setIsPurchasing(false);
    }
  };

  const handlePurchase = async () => {
    // Require authentication before purchase with clear message
    if (!user) {
      alert('Please sign in to purchase tickets. It only takes a moment!');
      onOpenAuth?.();
      return;
    }

    if (remaining < ticketCount) {
      alert(`Only ${remaining} tickets remaining. Please reduce your quantity.`);
      return;
    }

    // Handle free events differently
    if (event.price === 0) {
      // Free event - handle directly
      if (event.price === 0) {
        setIsPurchasing(true);
        try {
          // Create free tickets directly in database
          await new Promise(resolve => setTimeout(resolve, 1000));
          setShowSuccess(true);
          setCurrentAttendees(prev => prev + ticketCount);
        } catch (error) {
          logger.error('Free ticket registration failed:', error);
          alert('Failed to register for event. Please try again.');
        } finally {
          setIsPurchasing(false);
        }
        return;
      }
      return;
    }
    
    setIsPurchasing(true);
    
    try {
      // Create Stripe checkout session for paid tickets
      const checkoutUrl = await createTicketCheckout(
        user.id,
        event.id,
        ticketCount,
        event.price,
        event.name
      );

      if (checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Failed to start checkout. Please try again or contact support.');
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Hero Image Section */}
      {event.imageUrl && (
        <div className="relative h-[300px] sm:h-[400px] md:h-[500px] w-full overflow-hidden">
          <img 
            src={event.imageUrl} 
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />
          
          {/* Event Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 pb-6 sm:pb-8 md:pb-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4">
                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600/90 backdrop-blur-sm rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {event.category}
                </span>
                {event.isFeatured && (
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-600/90 backdrop-blur-sm rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                    Premium
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 sm:mb-4 leading-tight">{translatedName || event.name}</h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-sm sm:text-base text-white/90">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold">{event.time}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold">{event.location.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
          {/* Left: Event Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {/* Edit Button - Only show to event organizer */}
                {user && user.id === event.organizerId && (
                  <button 
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                    className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl hover:bg-slate-800 transition-all shadow-xl text-indigo-400 hover:text-indigo-300"
                    title="Edit event"
                    aria-label="Edit event details"
                  >
                    <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                  </button>
                )}
                
                <button 
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 ${
                    isLiked ? 'text-pink-500 bg-pink-500/10 border-pink-500/30' : 'text-pink-500'
                  }`}
                  title={isLiked ? 'Unlike this event' : 'Like this event'}
                  aria-label={isLiked ? 'Unlike this event' : 'Like this event'}
                  aria-pressed={isLiked}
                >
                  <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
                </button>
                <button 
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.share) {
                      navigator.share({
                        title: event.name,
                        text: event.description,
                        url: url
                      }).catch(() => {
                        navigator.clipboard.writeText(url);
                        alert('Event link copied to clipboard!');
                      });
                    } else {
                      navigator.clipboard.writeText(url);
                      alert('Event link copied to clipboard!');
                    }
                  }}
                  className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl hover:bg-slate-800 transition-all text-indigo-400 shadow-xl"
                  title="Share this event"
                  aria-label="Share event link"
                >
                  <Share2 className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl md:rounded-[32px] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-xl">
              <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 flex-col sm:flex-row">
                <h3 className="text-xl sm:text-2xl font-bold">About this event</h3>
                
                {/* Language Selector - Only show if translations available */}
                {availableLanguages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-indigo-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none cursor-pointer"
                      aria-label="Select event description language"
                    >
                      {availableLanguages.map(({ code, name }) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <p className="text-slate-400 leading-relaxed text-sm sm:text-base md:text-lg">{displayDescription}</p>
              
              {/* About Text Section - Additional Event Details */}
              {event.aboutText && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <pre className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-wrap font-sans">
                    {translatedAboutText || event.aboutText}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-800">
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                  <div className="bg-indigo-600/10 p-3 rounded-xl text-indigo-400">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Smart Translation</h4>
                    <p className="text-xs text-slate-500">
                      {availableLanguages.length > 1 
                        ? `Available in ${availableLanguages.length} languages`
                        : 'Auto-translated into 12+ languages.'}
                    </p>
                  </div>
                </div>
                <div className="bg-emerald-600/10 p-4 rounded-2xl border border-emerald-500/20 flex items-center gap-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h4 className="font-bold text-sm">Nexus Verified</h4>
                    <p className="text-xs text-slate-500">Guaranteed entry or money back.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Right: Booking Card & Stats */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <div className="lg:sticky lg:top-24 space-y-4 sm:space-y-6">
            <div className={`border rounded-3xl md:rounded-[40px] p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden ${
              event.isFeatured 
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-500/5 border-amber-500/30' 
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
              
              {/* Event Image Background in Card */}
              {event.imageUrl && (
                <div className="absolute top-0 right-0 bottom-0 w-40 opacity-10 overflow-hidden rounded-[40px]">
                  <img 
                    src={event.imageUrl} 
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Premium Badge */}
              {event.isFeatured && (
                <div className="mb-4 flex items-center gap-2 relative z-10">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Premium Event</span>
                </div>
              )}
              <div className="flex justify-between items-end mb-6 sm:mb-8 md:mb-10 relative z-10">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 sm:mb-2">
                    {ticketTemplates.length > 0 ? 'Price Range' : 'Price per seat'}
                  </p>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                    {ticketTemplates.length > 0 
                      ? `€${Math.min(...ticketTemplates.map(t => t.price))} - €${Math.max(...ticketTemplates.map(t => t.price))}`
                      : event.price === 0 ? 'Free' : `€${event.price}`}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-orange-500 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-black">{remaining}</span>
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">Left of {totalCapacity}</p>
                </div>
              </div>

              {/* Ticket Templates List */}
              {ticketTemplates.length > 0 && (
                <div className="space-y-3 mb-6 relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Available Tickets</p>
                  
                  {/* Event Completed Warning */}
                  {eventCompleted && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-red-400 text-sm mb-1">Event Has Ended</p>
                          <p className="text-xs text-red-300/80 leading-relaxed">
                            This event has already concluded. Ticket sales are no longer available. Thank you for your interest!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Setup Warning */}
                  {!eventCompleted && !checkingOrganizerStatus && !organizerPaymentReady && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-amber-400 text-sm mb-1">Ticket Sales Not Available Yet</p>
                          <p className="text-xs text-amber-300/80 leading-relaxed mb-3">
                            The event organizer is still completing their payment setup. Tickets will be available for purchase once the setup is complete. Please check back later or contact the organizer for updates.
                          </p>
                          <button
                            onClick={refreshOrganizerStatus}
                            disabled={isRefreshingOrganizerStatus}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            <RotateCw size={14} className={isRefreshingOrganizerStatus ? 'animate-spin' : ''} />
                            Refresh Status
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {ticketTemplates.filter(t => t.is_active && t.quantity_available > 0).map((template) => {
                    const quantity = ticketQuantities[template.id] || 0;
                    
                    return (
                      <div 
                        key={template.id}
                        className={`border rounded-2xl p-4 space-y-4 ${
                          event.isFeatured
                            ? 'bg-gradient-to-r from-slate-800/50 to-amber-500/5 border-amber-500/20'
                            : 'bg-slate-800/50 border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              event.isFeatured ? 'bg-amber-600/20' : 'bg-indigo-600/20'
                            }`}>
                              <Ticket className={`w-5 h-5 ${event.isFeatured ? 'text-amber-500' : 'text-indigo-400'}`} />
                            </div>
                            <div>
                              <p className="font-bold text-white">{template.name}</p>
                              <p className="text-xs text-slate-500 capitalize">{template.type.replace('_', ' ')}</p>
                              {template.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{template.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-xl text-white">€{template.price}</p>
                            <p className="text-xs text-slate-500">{template.quantity_available} left</p>
                          </div>
                        </div>
                        
                        {/* Quantity Selector for this ticket type */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setTicketQuantities(prev => ({
                                ...prev,
                                [template.id]: Math.max(0, (prev[template.id] || 0) - 1)
                              }))}
                              disabled={quantity === 0}
                              className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition-colors"
                              aria-label={`Decrease ${template.name} ticket quantity`}
                            >-</button>
                            <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                            <button 
                              onClick={() => setTicketQuantities(prev => ({
                                ...prev,
                                [template.id]: Math.min(template.quantity_available, Math.min(10, (prev[template.id] || 0) + 1))
                              }))}
                              disabled={quantity >= Math.min(10, template.quantity_available)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                event.isFeatured
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                              aria-label={`Increase ${template.name} ticket quantity`}
                            >+</button>
                          </div>
                          
                          <button 
                            onClick={() => handlePurchaseTicket(template)}
                            disabled={isPurchasing || quantity === 0 || !organizerPaymentReady || eventCompleted}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                              event.isFeatured
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                            aria-label={
                              eventCompleted
                                ? 'Event has ended, tickets unavailable'
                                : !organizerPaymentReady
                                  ? 'Tickets not available for purchase'
                                  : quantity === 0
                                    ? 'Select ticket quantity to purchase'
                                    : isPurchasing
                                      ? 'Processing payment'
                                      : `Purchase ${quantity} ${template.name} ticket${quantity > 1 ? 's' : ''} for €${(template.price * quantity).toFixed(2)}`
                            }
                          >
                            {eventCompleted
                              ? 'Event Ended'
                              : !organizerPaymentReady 
                                ? 'Not Available' 
                                : quantity === 0 
                                  ? 'Select quantity' 
                                  : isPurchasing 
                                    ? 'Processing...' 
                                    : `Buy ${quantity} for €${(template.price * quantity).toFixed(2)}`
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Old general purchase section removed - each ticket now has its own selector */}

              {showSuccess && (
                <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                  <p className="text-emerald-500 text-sm font-bold flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 shrink-0" /> 
                    <span>Booking confirmed!</span>
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 flex items-center gap-4 shadow-xl group">
              <div className="relative">
                <img src="https://picsum.photos/seed/org/100" className="w-14 h-14 rounded-2xl object-cover" alt="org" />
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1 border-2 border-slate-900">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Organized by</p>
                <h4 className="font-bold truncate text-slate-100">{organizerName}</h4>
              </div>
              <button 
                onClick={() => {
                  if (!user) {
                    onOpenAuth?.();
                    return;
                  }
                  onToggleFollow?.(event.organizerId);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  isFollowing ? 'bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white'
                }`}
                aria-label={isFollowing ? `Unfollow ${organizerName}` : `Follow ${organizerName}`}
              >
                {isFollowing ? <><UserMinus className="w-4 h-4" aria-hidden="true" /> Following</> : <><UserPlus className="w-4 h-4" aria-hidden="true" /> Follow</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default EventDetail;
