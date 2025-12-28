
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  Star
} from 'lucide-react';
import { getEvents, likeEvent, unlikeEvent, checkIfUserLikedEvent, getTicketTemplates } from '../services/dbService';
import { createTicketCheckout, checkCheckoutSuccess, clearCheckoutStatus, verifyCheckoutPayment } from '../services/stripeService';
import { User, EventNexusEvent, TicketTemplate } from '../types';

interface EventDetailProps {
  user: User | null;
  onToggleFollow?: (orgId: string) => void;
  onOpenAuth?: () => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ user, onToggleFollow, onOpenAuth }) => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventNexusEvent | null>(null);
  const [ticketTemplates, setTicketTemplates] = useState<TicketTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAttendees, setCurrentAttendees] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Get available languages from event translations
  const availableLanguages = React.useMemo(() => {
    if (!event?.translations) return [{ code: 'en', name: 'English' }];
    
    const langMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'pt': 'Português',
      'it': 'Italiano'
    };
    
    return Object.keys(event.translations).map(code => ({
      code,
      name: langMap[code] || code.toUpperCase()
    }));
  }, [event?.translations]);

  // Get description in selected language
  const displayDescription = React.useMemo(() => {
    if (!event) return '';
    if (!event.translations || Object.keys(event.translations).length === 0) {
      return event.description;
    }
    return event.translations[selectedLanguage] || event.description;
  }, [event, selectedLanguage]);

  // Load event from database
  const loadEvent = React.useCallback(async () => {
    if (!id) return;
    try {
      const events = await getEvents();
      const foundEvent = events.find(e => e.id === id);
      if (foundEvent) {
        setEvent(foundEvent);
        setCurrentAttendees(foundEvent.attendeesCount);
        
        // Load ticket templates
        const templates = await getTicketTemplates(id);
        setTicketTemplates(templates);
      }
      
      // Check if user has liked this event
      if (user && id) {
        const liked = await checkIfUserLikedEvent(user.id, id);
        setIsLiked(liked);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Check for successful purchase on mount and verify with Stripe
  useEffect(() => {
    const verifyPurchase = async () => {
      if (checkCheckoutSuccess()) {
        // Get session ID from URL
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
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
            console.warn('Payment verification failed for session:', sessionId);
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

  const remaining = event.maxAttendees - currentAttendees;
  const totalRevenue = currentAttendees * event.price;
  const isFollowing = user?.followedOrganizers.includes(event.organizerId) ?? false;

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
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
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
          console.error('Free ticket registration failed:', error);
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
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 sm:mb-4 leading-tight">{event.name}</h1>
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
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 ${
                    isLiked ? 'text-pink-500 bg-pink-500/10 border-pink-500/30' : 'text-pink-500'
                  }`}
                  title={isLiked ? 'Unlike this event' : 'Like this event'}
                >
                  <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isLiked ? 'fill-current' : ''}`} />
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
                >
                  <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl md:rounded-[32px] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl sm:text-2xl font-bold">About this event</h3>
                
                {/* Language Selector - Only show if translations available */}
                {availableLanguages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-indigo-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none cursor-pointer"
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
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">Left of {event.maxAttendees}</p>
                </div>
              </div>

              {/* Ticket Templates List */}
              {ticketTemplates.length > 0 && (
                <div className="space-y-3 mb-6 relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Available Tickets</p>
                  {ticketTemplates.filter(t => t.is_active && t.quantity_available > 0).map((template) => (
                    <div 
                      key={template.id}
                      className={`border rounded-2xl p-4 flex items-center justify-between ${
                        event.isFeatured
                          ? 'bg-gradient-to-r from-slate-800/50 to-amber-500/5 border-amber-500/20'
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
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
                  ))}
                </div>
              )}

              <div className="space-y-6 relative z-10">
                <div className={`border rounded-[24px] p-5 flex items-center justify-between shadow-inner ${
                  event.isFeatured
                    ? 'bg-gradient-to-r from-slate-800/50 to-amber-500/10 border-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-bold"
                    >-</button>
                    <span className="font-black text-xl w-6 text-center">{ticketCount}</span>
                    <button 
                      onClick={() => setTicketCount(Math.min(remaining, Math.min(10, ticketCount + 1)))}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                        event.isFeatured
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >+</button>
                  </div>
                </div>
                
                <button 
                  onClick={handlePurchase}
                  disabled={isPurchasing || remaining === 0}
                  className={`w-full py-5 rounded-[24px] font-black text-xl transition-all shadow-2xl active:scale-95 disabled:opacity-50 ${
                    event.isFeatured
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {remaining === 0 ? 'Sold Out' : isPurchasing ? 'Processing...' : 'Secure Tickets Now'}
                </button>
              </div>

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
                <h4 className="font-bold truncate text-slate-100">Nexus Elite Promotions</h4>
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
              >
                {isFollowing ? <><UserMinus className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
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
