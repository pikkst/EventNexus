import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Loader,
  AlertCircle,
  Ticket,
  Heart,
  Share2,
  ChevronDown,
  Zap,
  Radar,
  Bell,
} from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWebNotifications } from '../hooks/useWebNotifications';
import { EventNexusEvent, User } from '../types';
import { supabase } from '../services/supabase';

interface ProximityEvent extends EventNexusEvent {
  distance_km: number;
  distance_m: number;
}

interface LiveMapAppProps {
  user: User | null;
  onOpenAuth: () => void;
}

/**
 * Live Map PWA Component
 * Real-time event discovery using proximity radar
 */
const LiveMapApp: React.FC<LiveMapAppProps> = ({ user, onOpenAuth }) => {
  const { coords, error: geoError, isLoading: geoLoading } = useGeolocation();
  const { sendNotification, requestPermission, isGranted } = useWebNotifications();

  // State
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'music',
    'sports',
  ]);
  const [proximityEvents, setProximityEvents] = useState<ProximityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProximityEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isBuyingTicket, setIsBuyingTicket] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Categories
  const categories = [
    { id: 'music', label: '🎵 Music', color: '#ec4899' },
    { id: 'sports', label: '⚽ Sports', color: '#06b6d4' },
    { id: 'arts', label: '🎨 Arts', color: '#f59e0b' },
    { id: 'tech', label: '💻 Tech', color: '#3b82f6' },
    { id: 'food', label: '🍽️ Food', color: '#10b981' },
    { id: 'nightlife', label: '🌙 Nightlife', color: '#8b5cf6' },
    { id: 'business', label: '💼 Business', color: '#6366f1' },
    { id: 'education', label: '📚 Education', color: '#14b8a6' },
  ];

  // Format radius display
  const radiusDisplay = radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`;

  // Fetch proximity events
  const fetchProximityEvents = useCallback(async () => {
    if (!coords || !user) return;

    // Throttle: only fetch if 30+ seconds since last update
    if (Date.now() - lastUpdate < 30000) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'proximity-radar',
        {
          body: {
            user_id: user.id,
            lat: coords.lat,
            lng: coords.lng,
            radius_km: radiusKm,
            categories: selectedCategories,
            lang: user.language || 'en',
          },
        }
      );

      if (error) {
        console.error('Proximity radar error:', error);
      } else if (data?.events) {
        // Find new events (not in previous list)
        const newEventIds = new Set(data.events.map((e: ProximityEvent) => e.id));
        const previousEventIds = new Set(proximityEvents.map((e) => e.id));
        const addedEvents = data.events.filter(
          (e: ProximityEvent) => !previousEventIds.has(e.id)
        );

        // Send notifications for new events
        if (addedEvents.length > 0 && isGranted) {
          addedEvents.slice(0, 3).forEach((event: ProximityEvent) => {
            sendNotification({
              title: `🎯 Event Found: ${event.name}`,
              body: `${event.distance_m > 0 ? `${Math.round(event.distance_m)}m away` : 'Near you'} • ${new Date(event.date).toLocaleDateString()}`,
              icon: event.image || '/favicon.ico',
              tag: `event-${event.id}`,
              data: { event_id: event.id },
              requireInteraction: false,
            });
          });

          if (addedEvents.length > 3) {
            setNotificationCount((prev) => prev + addedEvents.length - 3);
          }
        }

        setProximityEvents(data.events);
        setLastUpdate(Date.now());
      }
    } catch (err) {
      console.error('Proximity fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coords, user, radiusKm, selectedCategories, lastUpdate, proximityEvents, isGranted, sendNotification]);

  // Auto-fetch on location/settings change
  useEffect(() => {
    fetchProximityEvents();
  }, [coords?.lat, coords?.lng, radiusKm, selectedCategories, fetchProximityEvents]);

  // Load saved events from user profile
  useEffect(() => {
    if (user?.followedOrganizers) {
      setSavedEventIds(new Set(user.followedOrganizers));
    }
  }, [user?.followedOrganizers]);

  // Handle ticket purchase
  const handleBuyTicket = useCallback(async () => {
    if (!selectedEvent || !user) return;

    setIsBuyingTicket(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          event_id: selectedEvent.id,
          user_id: user.id,
          quantity: 1,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        alert('Failed to create checkout session');
      } else if (data?.url) {
        // Redirect to Stripe
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Ticket purchase failed:', err);
      alert('Failed to purchase ticket');
    } finally {
      setIsBuyingTicket(false);
    }
  }, [selectedEvent, user]);

  if (!user) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-slate-400 mb-6">Sign in to discover events near you</p>
          <button
            onClick={onOpenAuth}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (geoLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400">Accessing your location...</p>
        </div>
      </div>
    );
  }

  if (geoError || !coords) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Location Access Denied</h2>
          <p className="text-slate-400 mb-6">{geoError || 'Unable to get your location'}</p>
          <p className="text-sm text-slate-500">
            Enable location permissions in your browser settings to discover nearby events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={15}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />

          {/* User location */}
          <Marker position={[coords.lat, coords.lng]}>
            <Popup>Your location</Popup>
          </Marker>

          {/* Radius circle */}
          <Circle
            center={[coords.lat, coords.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#4f46e5',
              weight: 2,
              opacity: 0.3,
              fillOpacity: 0.05,
            }}
          />

          {/* Event markers */}
          {proximityEvents.map((event) => (
            <Marker
              key={event.id}
              position={[event.location.lat, event.location.lng]}
              onClick={() => {
                setSelectedEvent(event);
                setShowEventDetail(true);
              }}
            >
              <Popup>{event.name}</Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Current location button */}
        <button
          onClick={() => {
            // Re-fetch location
            fetchProximityEvents();
          }}
          className="absolute bottom-6 right-6 p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full text-white shadow-lg transition-all"
          aria-label="Refresh location"
        >
          <Navigation className="w-5 h-5" />
        </button>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg">
            <Loader className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-xs text-slate-300">Updating...</span>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-3 max-h-[40vh] overflow-y-auto">
        {/* Radius Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Radar className="w-4 h-4 text-indigo-400" />
              Search Radius
            </label>
            <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
              {radiusDisplay}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="50"
            step="0.1"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            aria-label="Search radius"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>100m</span>
            <span>50km</span>
          </div>
        </div>

        {/* Notifications Toggle */}
        <button
          onClick={requestPermission}
          className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-sm font-semibold transition-all ${
            isGranted
              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {isGranted ? 'Notifications enabled' : 'Enable notifications'}
          </span>
          {notificationCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              +{notificationCount}
            </span>
          )}
        </button>

        {/* Category Filter */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Categories</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategories((prev) =>
                    prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategories.includes(cat.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Count */}
        <div className="text-sm text-slate-400">
          Found <span className="font-bold text-indigo-400">{proximityEvents.length}</span> events
          nearby
        </div>
      </div>

      {/* Event Detail Slide-up */}
      {showEventDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-end animate-in fade-in">
          <div className="w-full bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-indigo-400 font-bold">
                  {selectedEvent.distance_m < 1000
                    ? `${Math.round(selectedEvent.distance_m)}m away`
                    : `${selectedEvent.distance_km.toFixed(1)}km away`}
                </p>
                <h2 className="text-2xl font-black text-white">{selectedEvent.name}</h2>
              </div>
              <button
                onClick={() => setShowEventDetail(false)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-slate-400">{selectedEvent.description}</p>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-indigo-400" />
                {selectedEvent.location.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Zap className="w-4 h-4 text-yellow-400" />
                {new Date(selectedEvent.date).toLocaleDateString()} at{' '}
                {selectedEvent.time}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleBuyTicket}
                disabled={isBuyingTicket}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Ticket className="w-5 h-5" />
                {isBuyingTicket ? 'Processing...' : 'Buy Ticket'}
              </button>
              <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2">
                <Heart
                  className={`w-5 h-5 ${
                    savedEventIds.has(selectedEvent.id) ? 'fill-red-500 text-red-500' : ''
                  }`}
                />
              </button>
              <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMapApp;
