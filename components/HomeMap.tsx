
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, MapPin, Calendar, 
  Star, Navigation2, LocateFixed, Compass, Route, X,
  Clock, ArrowRight, Radar, Sun, Moon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { CATEGORIES } from '../constants';
import { EventNexusEvent } from '../types';
import { getEvents } from '../services/dbService';

// Distance calculation helper (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapEffects = ({ center, isFollowing }: { center: [number, number], isFollowing: boolean }) => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 100);
  }, [map]);
  useEffect(() => {
    if (isFollowing) { map.setView(center, map.getZoom(), { animate: true }); }
  }, [center, isFollowing, map]);
  return null;
};

interface HomeMapProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const HomeMap: React.FC<HomeMapProps> = ({ theme = 'dark', onToggleTheme }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(25); // For proximity notifications only
  const [userLocation, setUserLocation] = useState<[number, number]>([59.4370, 24.7536]); // Default: Tallinn, Estonia
  const [selectedEvent, setSelectedEvent] = useState<EventNexusEvent | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [routeToEvent, setRouteToEvent] = useState<EventNexusEvent | null>(null);

  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => console.error("Geolocation denied", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Show ALL events on map (only filter by category, not distance)
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      return !activeCategory || event.category === activeCategory;
    });
  }, [events, activeCategory]);

  // Find nearest event within search radius (for proximity notifications)
  const nearestEvent = useMemo(() => {
    const eventsWithinRadius = events.filter(event => {
      const dist = calculateDistance(userLocation[0], userLocation[1], event.location.lat, event.location.lng);
      return dist <= searchRadius && (!activeCategory || event.category === activeCategory);
    });
    
    if (eventsWithinRadius.length === 0) return null;
    
    return [...eventsWithinRadius].sort((a, b) => {
      const distA = calculateDistance(userLocation[0], userLocation[1], a.location.lat, a.location.lng);
      const distB = calculateDistance(userLocation[0], userLocation[1], b.location.lat, b.location.lng);
      return distA - distB;
    })[0];
  }, [events, activeCategory, searchRadius, userLocation]);

  const eventIcon = (price: number, isFeatured: boolean) => L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="flex flex-col items-center gap-1">
        <div class="p-2.5 rounded-2xl ${isFeatured ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' : 'bg-indigo-600'} border-2 border-white text-white shadow-2xl relative">
          ${isFeatured ? '<div class="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>' : ''}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="${isFeatured ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-white text-indigo-600'} text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg border ${isFeatured ? 'border-yellow-200' : 'border-indigo-100'}">
          ${isFeatured ? '⭐ ' : ''}$${price}
        </div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50]
  });

  const userIcon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative w-10 h-10">
        <div class="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-30"></div>
        <div class="relative w-10 h-10 bg-indigo-600 border-4 border-white rounded-full flex items-center justify-center shadow-2xl">
          <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // Tile layer configuration based on theme
  const tileLayerUrl = theme === 'light' 
    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const bgClass = theme === 'light' ? 'bg-slate-50' : 'bg-slate-950';

  return (
    <div className={`relative flex flex-col h-[calc(100vh-64px)] w-full ${bgClass} overflow-hidden`}>
      <div className="absolute inset-0 z-0">
        <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer 
            url={tileLayerUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEffects center={userLocation} isFollowing={isFollowingUser} />
          <Circle center={userLocation} radius={searchRadius * 1000} pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.03, color: '#6366f1', weight: 1, dashArray: '8, 12' }} />
          <Marker position={userLocation} icon={userIcon} />
          {filteredEvents.map((event) => (
            <Marker 
              key={event.id} 
              position={[event.location.lat, event.location.lng]} 
              icon={eventIcon(event.price, event.isFeatured || false)}
              eventHandlers={{ click: () => { setSelectedEvent(event); setIsFollowingUser(false); } }}
            />
          ))}
          {routeToEvent && <Polyline positions={[userLocation, [routeToEvent.location.lat, routeToEvent.location.lng]]} pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.8, dashArray: '10, 15' }} />}
        </MapContainer>
        <div className="leaflet-vignette" />
      </div>

      {/* Vibe Radar - Mobile Floating Navigator */}
      {nearestEvent && !selectedEvent && (
        <div className="absolute left-4 md:left-6 bottom-6 md:bottom-10 z-[500] animate-in slide-in-from-left duration-700">
           <button 
             onClick={() => setSelectedEvent(nearestEvent)}
             className={`${
               theme === 'light'
                 ? 'bg-white border-slate-200 hover:border-indigo-400'
                 : 'bg-slate-900 border-slate-800 hover:border-indigo-500'
             } border p-3 md:p-4 rounded-2xl md:rounded-[32px] shadow-2xl flex items-center gap-3 md:gap-4 group transition-all`}
           >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white relative">
                 <Radar className="w-6 h-6 animate-pulse" />
                 <div className={`absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 ${
                   theme === 'light' ? 'border-white' : 'border-slate-900'
                 }`} />
              </div>
              <div className="text-left">
                 <p className={`text-[8px] font-black uppercase tracking-widest ${
                   theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                 }`}>Nearest Vibe</p>
                 <p className={`text-xs font-black ${
                   theme === 'light' ? 'text-slate-900' : 'text-white'
                 }`}>{calculateDistance(userLocation[0], userLocation[1], nearestEvent.location.lat, nearestEvent.location.lng).toFixed(1)} km away</p>
              </div>
           </button>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-2 sm:px-4 z-[400] space-y-3">
        <div className={`${
          theme === 'light'
            ? 'bg-white/95 border-slate-200'
            : 'bg-slate-900/90 border-slate-800'
        } border backdrop-blur-xl rounded-2xl md:rounded-[24px] shadow-2xl p-2 flex flex-col md:flex-row items-center gap-2`}>
          <div className="relative flex-1 w-full">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${
              theme === 'light' ? 'text-slate-400' : 'text-slate-500'
            }`} />
            <input 
              type="text" 
              placeholder="Explore events..." 
              className={`w-full ${
                theme === 'light'
                  ? 'bg-slate-50 text-slate-900 placeholder:text-slate-400'
                  : 'bg-slate-800/50 md:bg-transparent text-white placeholder:text-slate-500'
              } pl-12 pr-4 py-3 text-sm focus:outline-none rounded-xl`}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="px-6 py-3 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg shadow-indigo-600/30">
              {filteredEvents.length} Events Found
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center">
          {['All', ...CATEGORIES].map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat === 'All' ? null : cat)} 
              className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                (activeCategory === cat || (cat === 'All' && !activeCategory))
                  ? theme === 'light'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl'
                    : 'bg-white border-white text-slate-950 shadow-xl'
                  : theme === 'light'
                    ? 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute right-4 md:right-6 bottom-6 md:bottom-10 flex flex-col gap-2 md:gap-3 z-[600]">
        <button 
          onClick={onToggleTheme || (() => {})} 
          className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border ${
            theme === 'light' 
              ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50' 
              : 'bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-800'
          }`}
          title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
        >
          {theme === 'light' ? <Moon className="w-5 h-5 md:w-6 md:h-6" /> : <Sun className="w-5 h-5 md:w-6 md:h-6" />}
        </button>
        <button onClick={() => setIsFollowingUser(!isFollowingUser)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border ${isFollowingUser ? 'bg-indigo-600 text-white border-indigo-500' : theme === 'light' ? 'bg-white text-slate-400 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
          <LocateFixed className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <div className={`${
          theme === 'light'
            ? 'bg-white/95 border-slate-200'
            : 'bg-slate-900/90 border-slate-800'
        } border backdrop-blur-md p-4 rounded-3xl flex flex-col items-center gap-3`}>
          <input 
            type="range" 
            min="5" 
            max="100" 
            step="5" 
            value={searchRadius} 
            onChange={(e) => setSearchRadius(Number(e.target.value))} 
            className={`appearance-none w-1 h-32 rounded-lg accent-indigo-500 vertical-range cursor-pointer ${
              theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          />
        </div>
      </div>

      {selectedEvent && (
        <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-2 sm:px-4 z-[400] animate-in slide-in-from-bottom-10 duration-500">
          <div className={`${
            theme === 'light'
              ? 'bg-white border-slate-200'
              : 'bg-slate-900 border-slate-800'
          } border rounded-3xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col sm:flex-row p-2 gap-2`}>
            <div className="w-full sm:w-1/3 h-32 sm:h-auto relative shrink-0">
              <img src={selectedEvent.imageUrl} className="w-full h-full object-cover rounded-[32px]" alt="" />
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className={`font-black text-lg leading-tight tracking-tighter ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{selectedEvent.name}</h3>
                <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{selectedEvent.location.city} • {selectedEvent.date}</p>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <button onClick={() => navigate(`/event/${selectedEvent.id}`)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95">Book Access</button>
                <button onClick={() => setSelectedEvent(null)} className={`p-3 rounded-2xl ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}><X size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .vertical-range { -webkit-appearance: slider-vertical; width: 8px; height: 120px; }
        .custom-marker { background: transparent; border: none; }
      `}} />
    </div>
  );
};

export default HomeMap;
