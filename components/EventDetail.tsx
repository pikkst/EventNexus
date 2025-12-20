
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
import { getEvents } from '../services/dbService';
import { createTicketCheckout, checkCheckoutSuccess, clearCheckoutStatus } from '../services/stripeService';
import { User, EventNexusEvent } from '../types';

interface EventDetailProps {
  user: User | null;
  onToggleFollow?: (orgId: string) => void;
  onOpenAuth?: () => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ user, onToggleFollow, onOpenAuth }) => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventNexusEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAttendees, setCurrentAttendees] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load event from database
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const events = await getEvents();
        const foundEvent = events.find(e => e.id === id);
        if (foundEvent) {
          setEvent(foundEvent);
          setCurrentAttendees(foundEvent.attendeesCount);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) loadEvent();
  }, [id]);

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

  // Check for successful purchase on mount
  useEffect(() => {
    if (checkCheckoutSuccess()) {
      setShowSuccess(true);
      clearCheckoutStatus();
      // Refresh event data to get updated attendee count
      loadEvent();
    }
  }, []);

  const handlePurchase = async () => {
    // Require authentication before purchase
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (remaining < ticketCount || event.price === 0) {
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Image & Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-[32px] overflow-hidden shadow-2xl aspect-video border border-slate-800 group">
            <img src={event.imageUrl} className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110" alt={event.name} />
            <div className="absolute top-6 left-6 flex gap-2">
              <span className="bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase border border-slate-700 text-indigo-400">{event.category}</span>
              <span className="bg-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase shadow-lg shadow-indigo-600/30">{event.visibility}</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">{event.name}</h1>
                <div className="flex flex-wrap gap-6 text-sm font-medium">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-5 h-5 text-indigo-500" /> {event.date}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-5 h-5 text-indigo-500" /> {event.time}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-5 h-5 text-indigo-500" /> {event.location.address}, {event.location.city}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-pink-500 shadow-xl"><Heart className="w-6 h-6" /></button>
                <button className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-indigo-400 shadow-xl"><Share2 className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-6 shadow-xl">
              <h3 className="text-2xl font-bold">About this event</h3>
              <p className="text-slate-400 leading-relaxed text-lg">{event.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-800">
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4">
                  <div className="bg-indigo-600/10 p-3 rounded-xl text-indigo-400">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Smart Translation</h4>
                    <p className="text-xs text-slate-500">Auto-translated into 12+ languages.</p>
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
        </div>

        {/* Right: Booking Card & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
              <div className="flex justify-between items-end mb-10">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Price per seat</p>
                  <h2 className="text-5xl font-black tracking-tighter">{event.price === 0 ? 'Free' : `$${event.price}`}</h2>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-orange-500 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-black">{remaining}</span>
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">Left of {event.maxAttendees}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-5 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-bold"
                    >-</button>
                    <span className="font-black text-xl w-6 text-center">{ticketCount}</span>
                    <button 
                      onClick={() => setTicketCount(Math.min(remaining, Math.min(10, ticketCount + 1)))}
                      className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold"
                    >+</button>
                  </div>
                </div>
                
                <button 
                  onClick={handlePurchase}
                  disabled={isPurchasing || remaining === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-[24px] font-black text-xl transition-all shadow-2xl active:scale-95 disabled:opacity-50"
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
  );
};

export default EventDetail;
