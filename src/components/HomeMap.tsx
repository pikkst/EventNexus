
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageSEO } from '../hooks/useSEO';
import { 
  Search, SlidersHorizontal, MapPin, Calendar, 
  Star, Navigation2, LocateFixed, Compass, Route, X,
  Clock, ArrowRight, Radar, Sun, Moon, Minimize2, Maximize2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { CATEGORIES } from '../constants';
import { EventNexusEvent } from '../types';
import { getEvents } from '../services/dbService';
import { filterActiveEvents } from '../utils/eventUtils';
import { generateMapSEO, updatePageMeta, cleanupSEO } from '../utils/seoUtils';
import { supabase } from '../services/supabase';
import { RecommendationFeed, TrendingEventsSection } from './RecommendationFeed';

interface MapEffectsProps {
  center: [number, number];
  isFollowing: boolean;
  onMapMove?: (center: [number, number], zoom: number) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  mapRef?: React.MutableRefObject<any>;
}

const MapEffects = ({ center, isFollowing, onMapMove, onBoundsChange, mapRef }: MapEffectsProps) => {
  // SEO optimization for AI crawlers
  usePageSEO({
    path: '/map',
    title: 'Event Map - Discover Events Nearby',
    description: 'Explore events on an interactive map. Find concerts, conferences, workshops, and more near you.',
    image: 'https://www.eventnexus.eu/og-image.png',
    type: 'website'
  });
  const map = useMap();
  
  // Expose map instance to parent via ref
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 100);
  }, [map]);
  
  useEffect(() => {
    if (isFollowing) { map.setView(center, map.getZoom(), { animate: true }); }
  }, [center, isFollowing, map]);
  
  // Save map position and bounds whenever it changes
  useEffect(() => {
    const handleMapMove = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      
      onMapMove?.([center.lat, center.lng], zoom);
      onBoundsChange?.(bounds); // Notify parent of bounds change
    };

    map.on('moveend', handleMapMove);
    return () => map.off('moveend', handleMapMove);
  }, [map, onMapMove, onBoundsChange]);
  
  return null;
};

interface HomeMapProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  events?: EventNexusEvent[]; // Optional: use events from parent if provided
}

const HomeMap: React.FC<HomeMapProps> = ({ theme = 'dark', onToggleTheme, events: propEvents }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(1); // 1km radius for urban proximity notifications
  // Date filter and sorting state for map events
  const [selectedDate, setSelectedDate] = useState<string>(''); // ISO format yyyy-mm-dd
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Normalize event date strings to ISO yyyy-mm-dd (supports dd.mm.yyyy and ISO)
  const normalizeDate = useCallback((dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    // If already ISO-like (yyyy-mm-dd), return first 10 chars
    const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(dateStr);
    if (isoMatch) return dateStr.substring(0, 10);
    // Support Estonian style: dd.mm.yyyy
    const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dotMatch) {
      const [, dd, mm, yyyy] = dotMatch;
      return `${yyyy}-${mm}-${dd}`;
    }
    // Fallback: try Date.parse then format
    const ms = Date.parse(dateStr);
    if (Number.isFinite(ms)) {
      const d = new Date(ms);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }, []);

  // Guest language preference - for unregistered visitors
  const [guestLanguage, setGuestLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('guest_language');
      return saved || 'en';
    } catch {
      return 'en';
    }
  });

  const handleGuestLanguageChange = (lang: string) => {
    setGuestLanguage(lang);
    localStorage.setItem('guest_language', lang);
  };

  // Update SEO meta tags on mount
  useEffect(() => {
    const seoTags = generateMapSEO();
    updatePageMeta(seoTags);

    // Cleanup: reset to homepage SEO when component unmounts
    return () => {
      cleanupSEO();
    };
  }, []);

  // Sync date/sort with URL query params for deep-linking
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const qDate = params.get('date');
      const qSort = params.get('sort');
      if (qDate) {
        // Accept ISO; normalize dd.mm.yyyy
        const norm = normalizeDate(qDate);
        if (norm && norm !== selectedDate) {
          setSelectedDate(norm);
        }
      }
      if (qSort === 'asc' || qSort === 'desc') {
        if (qSort !== sortOrder) {
          setSortOrder(qSort as 'asc' | 'desc');
        }
      }
    } catch {}
  }, [location.search, normalizeDate]);

  useEffect(() => {
    // Update URL query only when it differs to avoid loops
    try {
      const params = new URLSearchParams(location.search);
      const current = params.toString();
      if (selectedDate) {
        params.set('date', selectedDate);
      } else {
        params.delete('date');
      }
      params.set('sort', sortOrder);
      const next = params.toString();
      if (next !== current) {
        navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
      }
    } catch {}
  }, [selectedDate, sortOrder, location.pathname, location.search, navigate]);
  
  // Load saved map position from localStorage, or use geolocation if not available
  // Track zoom level for dynamic marker sizing
  const [currentZoom, setCurrentZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('homemap_last_zoom');
      return saved ? parseInt(saved, 10) : 13;
    } catch {
      return 13;
    }
  });

  const [showRecommendations, setShowRecommendations] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number]>(() => {
    // Try to restore from localStorage first
    try {
      const saved = localStorage.getItem('homemap_last_center');
      if (saved) {
        const [lat, lng] = JSON.parse(saved);
        console.log(`📍 Restored map position from localStorage: [${lat}, ${lng}]`);
        return [lat, lng];
      }
    } catch (error) {
      console.error('Failed to load saved map position:', error);
    }
    // Default to Tallinn, Estonia if no saved position
    return [59.4370, 24.7536];
  });
  
  const [mapZoom, setMapZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('homemap_last_zoom');
      return saved ? parseInt(saved, 10) : 13;
    } catch {
      return 13;
    }
  });

  const [selectedEvent, setSelectedEvent] = useState<EventNexusEvent | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false); // Default to false - don't auto-follow
  const [routeToEvent, setRouteToEvent] = useState<EventNexusEvent | null>(null);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [eventCardExpanded, setEventCardExpanded] = useState(true); // Mobile: track if card is expanded
  const translationCache = useRef<Map<string, { name: string; desc: string }>>(new Map());
  
  // Track newly added events for animation (Set of event IDs)
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [liveUpdateCount, setLiveUpdateCount] = useState(0); // Track how many live updates received
  
  // New features: Sound, auto-pan, nearby counter
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('homemap_sound_enabled');
      return saved !== null ? JSON.parse(saved) : true; // Default: enabled
    } catch {
      return true;
    }
  });
  
  const [autoPanEnabled, setAutoPanEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('homemap_autopan_enabled');
      return saved !== null ? JSON.parse(saved) : false; // Default: disabled
    } catch {
      return false;
    }
  });
  
  const [nearbyNewEventsCount, setNearbyNewEventsCount] = useState(0);
  const [nearbyNewEvents, setNearbyNewEvents] = useState<EventNexusEvent[]>([]);
  const mapRef = useRef<any>(null);
  
  // Compact UI mode: hide overlays to free viewport (mobile-friendly)
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('homemap_compact_mode');
      return saved !== null ? JSON.parse(saved) : false; // Default: expanded
    } catch {
      return false;
    }
  });
  
  const toggleCompactMode = useCallback(() => {
    const next = !compactMode;
    setCompactMode(next);
    try { localStorage.setItem('homemap_compact_mode', JSON.stringify(next)); } catch {}
  }, [compactMode]);

  // Map bounds filtering: track visible region and show only events in bounds
  const [allEvents, setAllEvents] = useState<EventNexusEvent[]>([]); // Cache all events
  const [visibleBounds, setVisibleBounds] = useState<L.LatLngBounds | null>(null); // Current map bounds
  const [visibleEventCount, setVisibleEventCount] = useState(0); // How many events are in bounds
  
  // Filter events based on map bounds
  const filterEventsByBounds = useCallback((evts: EventNexusEvent[], bounds: L.LatLngBounds | null): EventNexusEvent[] => {
    if (!bounds) return evts; // No bounds, show all
    return evts.filter(evt => {
      // Check both location object and direct properties for compatibility
      const lat = evt.location?.lat ?? evt.latitude;
      const lng = evt.location?.lng ?? evt.longitude;
      if (!lat || !lng) return false;
      return bounds.contains([lat, lng]);
    });
  }, []);
  
  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Use Web Audio API for a pleasant notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, [soundEnabled]);
  
  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  // Toggle sound preference
  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('homemap_sound_enabled', JSON.stringify(newValue));
  }, [soundEnabled]);
  
  // Toggle auto-pan preference
  const toggleAutoPan = useCallback(() => {
    const newValue = !autoPanEnabled;
    setAutoPanEnabled(newValue);
    localStorage.setItem('homemap_autopan_enabled', JSON.stringify(newValue));
  }, [autoPanEnabled]);
  
  // Save map position to localStorage whenever it changes
  const saveMapPosition = useCallback((center: [number, number], zoom: number) => {
    try {
      localStorage.setItem('homemap_last_center', JSON.stringify(center));
      localStorage.setItem('homemap_last_zoom', JSON.stringify(zoom));
      setCurrentZoom(zoom); // Update zoom state for dynamic marker sizing
    } catch (error) {
      console.error('Failed to save map position:', error);
    }
  }, []);


  // Load events from database with throttling to prevent map crashes
  // OR use events from parent if provided (for real-time updates)
  useEffect(() => {
    // If parent provides events, use them (for real-time updates after event creation)
    if (propEvents) {
      console.log(`📍 Using ${propEvents.length} events from parent (real-time mode)`);
      const activeEvents = filterActiveEvents(propEvents);
      setAllEvents(activeEvents); // Store in allEvents cache
      setEvents(filterEventsByBounds(activeEvents, visibleBounds)); // Show only visible
      setVisibleEventCount(events.length);
      setIsLoading(false);
      return;
    }

    // Otherwise, load from database (initial load)
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        // Filter out expired events automatically
        const activeEvents = filterActiveEvents(eventsData);
        
        // Throttled loading: Add events in batches of 10 every 500ms
        // This prevents map renderer from crashing when 100+ events load at once
        const BATCH_SIZE = 10;
        const BATCH_DELAY = 500; // ms
        
        if (activeEvents.length > BATCH_SIZE) {
          console.log(`📍 Loading ${activeEvents.length} events in batches of ${BATCH_SIZE}...`);
          setAllEvents(activeEvents); // Store all events in cache
          setEvents([]); // Clear first
          
          // Load only visible events in batches
          const visibleEvents = filterEventsByBounds(activeEvents, visibleBounds);
          for (let i = 0; i < visibleEvents.length; i += BATCH_SIZE) {
            const batch = visibleEvents.slice(i, i + BATCH_SIZE);
            setEvents(prev => [...prev, ...batch]);
            
            // Wait before next batch (except for last batch)
            if (i + BATCH_SIZE < visibleEvents.length) {
              await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
          }
          setVisibleEventCount(visibleEvents.length);
          console.log(`✅ All ${activeEvents.length} events loaded (${visibleEvents.length} visible in bounds)`);
        } else {
          // Small number of events, load directly
          setAllEvents(activeEvents);
          const visibleEvents = filterEventsByBounds(activeEvents, visibleBounds);
          setEvents(visibleEvents);
          setVisibleEventCount(visibleEvents.length);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, [propEvents, visibleBounds, filterEventsByBounds]);

  // When bounds change and we have all events cached, re-filter display events
  useEffect(() => {
    if (allEvents.length > 0 && visibleBounds) {
      const visibleEvents = filterEventsByBounds(allEvents, visibleBounds);
      
      // Keep recently-added new events visible regardless of bounds (for 10 seconds)
      const now = Date.now();
      const recentNewEvents = allEvents.filter(evt => {
        // Only include events added in the last 10 seconds
        const createdAtMs = new Date(evt.created_at || 0).getTime();
        return (now - createdAtMs) < 10000;
      });
      
      // Combine: visible by bounds + recently added new events (deduplicated)
      const visibleEventIds = new Set(visibleEvents.map(e => e.id));
      const combinedEvents = [
        ...visibleEvents,
        ...recentNewEvents.filter(e => !visibleEventIds.has(e.id))
      ];
      
      // Fallback: if nothing is visible AND no recent new events, show all events
      if (combinedEvents.length === 0) {
        console.log('📍 Bounds empty and no new events, showing all events (global fallback)');
        setEvents(allEvents);
        setVisibleEventCount(allEvents.length);
      } else {
        setEvents(combinedEvents);
        setVisibleEventCount(combinedEvents.length);
        if (recentNewEvents.length > 0) {
          console.log(`📍 Bounds: ${visibleEvents.length} visible + ${recentNewEvents.length} recent new = ${combinedEvents.length} total`);
        }
      }
    }
  }, [visibleBounds, allEvents, filterEventsByBounds]);


  // Fetch current user ID for recommendations
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          console.log(`👤 User loaded for recommendations: ${user.id}`);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUserId();
  }, []);

  // Real-time subscription: Listen for new/updated/deleted events
  useEffect(() => {
    console.log('🔴 Setting up real-time event subscription...');
    
    let isSubscribed = true;
    
    const setupRealtime = async () => {
      try {
        const channel = supabase
          .channel('events-channel', {
            config: {
              broadcast: { self: false },
            },
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'events'
            },
            (payload) => {
              if (!isSubscribed) return;
              console.log('🆕 REALTIME: New event added:', payload.new);
              const newEvent = payload.new as EventNexusEvent;
              
              // Only add if active and has valid location (check for lat/lng, not coordinates)
              if (newEvent.location && newEvent.location.lat && newEvent.location.lng) {
                setAllEvents(prev => {
                  const exists = prev.some(e => e.id === newEvent.id);
                  return exists ? prev.map(e => e.id === newEvent.id ? newEvent : e) : [...prev, newEvent];
                });
                setEvents(prev => {
                  const exists = prev.some(e => e.id === newEvent.id);
                  return exists ? prev.map(e => e.id === newEvent.id ? newEvent : e) : [...prev, newEvent];
                });
                setNewEventIds(prev => new Set(prev).add(newEvent.id));
                setLiveUpdateCount(c => c + 1);
                
                // Play notification sound
                playNotificationSound();
                
                // Check if event is nearby (within search radius)
                const distance = calculateDistance(
                  userLocation[0],
                  userLocation[1],
                  newEvent.location.lat,
                  newEvent.location.lng
                );
                
                if (distance <= searchRadius) {
                  setNearbyNewEvents(prev => [...prev, newEvent]);
                  setNearbyNewEventsCount(c => c + 1);
                }
                
                // Auto-pan to new event if enabled
                if (autoPanEnabled && mapRef.current) {
                  mapRef.current.flyTo([newEvent.location.lat, newEvent.location.lng], 14, {
                    duration: 1.5
                  });
                }
                
                // Remove animation flag after 5 seconds
                setTimeout(() => {
                  setNewEventIds(prev => {
                    const next = new Set(prev);
                    next.delete(newEvent.id);
                    return next;
                  });
                }, 5000);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'events'
            },
            (payload) => {
              if (!isSubscribed) return;
              console.log('🔄 REALTIME: Event updated:', payload.new);
              const updatedEvent = payload.new as EventNexusEvent;
              
              setAllEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
              setEvents(prev => prev.map(e => 
                e.id === updatedEvent.id ? updatedEvent : e
              ));
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'events'
            },
            (payload) => {
              if (!isSubscribed) return;
              console.log('🗑️ REALTIME: Event deleted:', payload.old);
              const deletedId = (payload.old as any).id;
              
              setAllEvents(prev => prev.filter(e => e.id !== deletedId));
              setEvents(prev => prev.filter(e => e.id !== deletedId));
              setLiveUpdateCount(c => c + 1);
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.error('❌ Realtime subscription error:', err);
            } else {
              console.log('✅ Realtime subscription status:', status);
            }
          });

        // Cleanup subscription
        return () => {
          isSubscribed = false;
          console.log('🔴 Cleaning up real-time subscription');
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up realtime:', error);
        return undefined;
      }
    };

    // Call setupRealtime and store cleanup function
    let cleanup: (() => void) | undefined;
    setupRealtime().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      isSubscribed = false;
      cleanup?.();
    };
  }, [playNotificationSound, calculateDistance, userLocation, searchRadius, autoPanEnabled]);

  // Fallback polling: Check for new events every 30 seconds
  // This catches AI-created events that might not trigger realtime
  useEffect(() => {
    console.log('📡 Starting fallback event polling (30s interval)...');
    
    let pollTimeout: NodeJS.Timeout;
    const pollForNewEvents = async () => {
      try {
        const { data: newData, error } = await supabase
          .from('events')
          .select('*')
          .eq('location', null, { negate: true }) // Only events with location
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) {
          console.error('❌ Polling error:', error);
          return;
        }

        if (!newData) return;

        // Find events that exist in new data but not in current state
        const newEventIds = new Set(newData.map((e: any) => e.id));
        const currentEventIds = new Set(events.map((e: any) => e.id));
        
        let addedCount = 0;
        newData.forEach((newEvent: any) => {
          // Check if event has valid location (lat/lng fields)
          if (!newEvent.location || !newEvent.location.lat || !newEvent.location.lng) {
            return; // Skip events without valid location
          }
          
          if (!currentEventIds.has(newEvent.id)) {
            console.log('📡 POLL: Found new event:', newEvent.name);
            setAllEvents(prev => {
              const exists = prev.some(e => e.id === newEvent.id);
              return exists ? prev.map(e => e.id === newEvent.id ? newEvent as EventNexusEvent : e) : [...prev, newEvent as EventNexusEvent];
            });
            setEvents(prev => [...prev, newEvent as EventNexusEvent]);
            setNewEventIds(prev => new Set(prev).add(newEvent.id));
            setLiveUpdateCount(c => c + 1);
            addedCount++;
            
            // Play sound for polled events too
            playNotificationSound();
            
            // Remove animation after 5 seconds
            setTimeout(() => {
              setNewEventIds(prev => {
                const next = new Set(prev);
                next.delete(newEvent.id);
                return next;
              });
            }, 5000);
          }
        });

        if (addedCount > 0) {
          console.log(`📡 Poll found ${addedCount} new event(s)`);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }

      // Schedule next poll
      pollTimeout = setTimeout(pollForNewEvents, 30000); // 30 seconds
    };

    // Start polling
    pollTimeout = setTimeout(pollForNewEvents, 30000);

    // Cleanup
    return () => {
      clearTimeout(pollTimeout);
      console.log('📡 Stopping fallback polling');
    };
  }, [events, playNotificationSound]);

  // Auto-hide live update toast after 3 seconds
  useEffect(() => {
    if (liveUpdateCount > 0) {
      const timer = setTimeout(() => {
        setLiveUpdateCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [liveUpdateCount]);

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
    console.log(`📍 HomeMap: Filtering ${events.length} events (category: ${activeCategory || 'all'})`);
    
    const filtered = events.filter(event => {
      // CRITICAL: Filter out events with null/invalid coordinates to prevent map crashes
      if (!event.location) {
        console.warn(`❌ Skipping event ${event.id} (${event.name}) - location is null/undefined`);
        return false;
      }
      
      if (typeof event.location.lat !== 'number' || typeof event.location.lng !== 'number') {
        console.warn(`❌ Skipping event ${event.id} (${event.name}) - invalid coordinates:`, 
          `lat=${event.location.lat} (${typeof event.location.lat}), lng=${event.location.lng} (${typeof event.location.lng})`);
        return false;
      }
      
      // Date filter: match events occurring on selectedDate (if set)
      if (selectedDate) {
        const evISO = normalizeDate(event.date || '');
        if (!evISO || evISO !== selectedDate) {
          return false;
        }
      }

      if (!activeCategory || event.category === activeCategory) {
        console.log(`✅ Event passes filter: ${event.name} at [${event.location.lat}, ${event.location.lng}]`);
        return true;
      }
      
      return false;
    });
    
    console.log(`📍 HomeMap: ${filtered.length} events will be displayed on map`);
    return filtered;
  }, [events, activeCategory, selectedDate, normalizeDate]);

  // Group events that share (roughly) the same location so one marker opens a stack
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { lat: number; lng: number; address: string; events: EventNexusEvent[] }>();
    // Round to 4 decimal places (~11m precision) - good for grouping by building/venue
    // Events at exactly same coordinates will be grouped even if addresses differ slightly
    const round = (n: number) => Number(n.toFixed(4));

    filteredEvents.forEach((ev) => {
      // Key by coordinates ONLY - ignore address differences
      // This ensures all events in same building are grouped even if address format varies
      const key = `${round(ev.location.lat)},${round(ev.location.lng)}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          lat: ev.location.lat,
          lng: ev.location.lng,
          address: ev.location.address,
          events: [],
        });
      }
      groups.get(key)!.events.push(ev);
    });

    const getStartMs = (ev: EventNexusEvent) => {
      const ts = `${ev.date}T${ev.time || '00:00'}`;
      const ms = Date.parse(ts);
      return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
    };

    // Sort events within each group by date (earliest first)
    return Array.from(groups.values()).map((group) => ({
      ...group,
      events: group.events.sort((a, b) => getStartMs(a) - getStartMs(b)),
    }));
  }, [filteredEvents]);

  // Sort groups by primary event date according to sortOrder
  const sortedGroupedEvents = useMemo(() => {
    const getStartMs = (ev: EventNexusEvent) => {
      const ts = `${ev.date}T${ev.time || '00:00'}`;
      const ms = Date.parse(ts);
      return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
    };
    const groupsCopy = [...groupedEvents];
    groupsCopy.sort((a, b) => {
      const aMs = a.events.length ? getStartMs(a.events[0]) : Number.MAX_SAFE_INTEGER;
      const bMs = b.events.length ? getStartMs(b.events[0]) : Number.MAX_SAFE_INTEGER;
      return sortOrder === 'asc' ? aMs - bMs : bMs - aMs;
    });
    return groupsCopy;
  }, [groupedEvents, sortOrder]);

  // Auto-translate selected event title/description based on viewer locale
  useEffect(() => {
    const doTranslate = async () => {
      if (!selectedEvent) { setTranslatedTitle(null); setTranslatedDesc(null); return; }

      // Determine target language: user preference → browser locale → default 'en'
      let targetLang = 'en';
      try {
        const cached = localStorage.getItem('eventnexus-user-cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const pref = parsed?.user?.preferred_language;
          if (typeof pref === 'string' && pref.length >= 2) {
            targetLang = pref.toLowerCase();
          }
        }
      } catch {}
      if (!targetLang || targetLang.length < 2) {
        const navLang = (navigator.language || 'en').toLowerCase();
        targetLang = navLang.split('-')[0];
      }

      // If event has structured translations, prefer them
      const direct = selectedEvent.translations?.[targetLang];
      if (direct) {
        setTranslatedTitle(direct.name || selectedEvent.name);
        setTranslatedDesc(direct.description || selectedEvent.description);
        return;
      }

      // If already in target language or original unknown, skip remote translation
      const orig = (selectedEvent.original_language || '').toLowerCase();
      if (orig && orig === targetLang) {
        setTranslatedTitle(selectedEvent.name);
        setTranslatedDesc(selectedEvent.description);
        return;
      }

      // Cache key per event + target language
      const key = `${selectedEvent.id}:${targetLang}`;
      const cachedTrans = translationCache.current.get(key);
      if (cachedTrans) {
        setTranslatedTitle(cachedTrans.name);
        setTranslatedDesc(cachedTrans.desc);
        return;
      }

      // Fallback: legacy translation format
      const legacy = selectedEvent.legacy_translations?.[targetLang];
      if (legacy) {
        setTranslatedTitle(legacy);
        setTranslatedDesc(selectedEvent.description);
        translationCache.current.set(key, { name: legacy, desc: selectedEvent.description });
        return;
      }

      // Remote translate via Gemini service with graceful fallback
      try {
        const descSource = selectedEvent.description || '';
        
        // Use batch translation to make a single API call instead of 2 separate calls
        const textsToTranslate = {
          name: selectedEvent.name,
          ...(descSource && { description: descSource })
        };
        
        const { translateDescriptionBatch } = await import('../services/geminiService');
        const translations = await translateDescriptionBatch(textsToTranslate, targetLang);
        
        setTranslatedTitle(translations.name || selectedEvent.name);
        setTranslatedDesc(translations.description || descSource);
        translationCache.current.set(key, { 
          name: translations.name || selectedEvent.name, 
          desc: translations.description || descSource 
        });
      } catch (e) {
        console.warn('Translation fallback due to error:', e);
        setTranslatedTitle(selectedEvent.name);
        setTranslatedDesc(selectedEvent.description || '');
      }
    };

    doTranslate();
  }, [selectedEvent]);

  // Find nearest event within search radius (for proximity notifications)
  const nearestEvent = useMemo(() => {
    const eventsWithinRadius = events.filter(event => {
      // Skip events without valid coordinates
      if (!event.location || !event.location.lat || !event.location.lng) return false;
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

  const eventIcon = (price: number, isFeatured: boolean, isNew: boolean = false) => {
    const priceDisplay = price === 0 ? 'FREE' : `FROM €${price}`;
    const newMarkerClass = isNew ? 'new-event-marker' : '';
    
    // Dynamic scaling based on zoom level
    // Zoom 5-10: 0.5x (small cities view)
    // Zoom 11-13: 0.75x (city view) 
    // Zoom 14-15: 1.0x (neighborhood view)
    // Zoom 16+: 1.25x (street view)
    const getScale = () => {
      if (currentZoom <= 10) return 0.5;
      if (currentZoom <= 12) return 0.65;
      if (currentZoom <= 13) return 0.8;
      if (currentZoom <= 15) return 1.0;
      return 1.2;
    };
    
    const scale = getScale();
    const iconSize = Math.round(20 * scale); // SVG icon size
    const padding = Math.round(2.5 * scale); // Padding
    const fontSize = Math.round(9 * scale); // Price text size
    const badgeSize = Math.round(10 * scale); // Star badge size
    const newBadgeFontSize = Math.round(8 * scale); // NEW badge font
    const containerWidth = Math.round(40 * scale);
    const containerHeight = Math.round(50 * scale);
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="flex flex-col items-center gap-1 ${newMarkerClass}" style="transform: scale(${scale}); transform-origin: bottom center;">
          <div style="padding: ${padding}px;" class="rounded-2xl ${isFeatured ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' : 'bg-indigo-600'} border-2 border-white text-white shadow-2xl relative">
            ${isFeatured ? `<div class="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1"><svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>` : ''}
            ${isNew ? `<div class="absolute -top-2 -right-2 bg-green-500 text-white font-black px-1.5 py-0.5 rounded-full shadow-lg border border-white" style="font-size: ${newBadgeFontSize}px;">NEW</div>` : ''}
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="${isFeatured ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-white text-indigo-600'} font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg border ${isFeatured ? 'border-yellow-200' : 'border-indigo-100'}" style="font-size: ${fontSize}px;">
            ${isFeatured ? '⭐ ' : ''}${priceDisplay}
          </div>
        </div>
      `,
      iconSize: [containerWidth, containerHeight],
      iconAnchor: [containerWidth / 2, containerHeight]
    });
  };

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
        <MapContainer center={userLocation} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer 
            url={tileLayerUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEffects 
            center={userLocation} 
            isFollowing={isFollowingUser}
            onMapMove={saveMapPosition}
            onBoundsChange={setVisibleBounds}
            mapRef={mapRef}
          />
          <Circle center={userLocation} radius={searchRadius * 1000} pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.03, color: '#6366f1', weight: 1, dashArray: '8, 12' }} />
          <Marker position={userLocation} icon={userIcon} />
          {sortedGroupedEvents.map((group, idx) => {
            const primary = group.events[0]; // soonest event at this location
            const totalCount = group.events.length;
            const isMultipleEvents = totalCount > 1;
            const isNewEvent = newEventIds.has(primary.id);

            return (
              <Marker
                key={`${group.lat}-${group.lng}-${idx}`}
                position={[group.lat, group.lng]}
                icon={eventIcon(primary.price, primary.isFeatured || false, isNewEvent)}
                eventHandlers={{ click: () => { setSelectedEvent(primary); setIsFollowingUser(false); } }}
              >
                <Popup minWidth={isMultipleEvents ? 280 : 260} className="rounded-xl">
                  <div className="space-y-3 text-sm">
                    {/* If multiple events at same location, show table of all events */}
                    {isMultipleEvents ? (
                      <>
                        <div className="font-black text-base text-slate-900 dark:text-white leading-tight">
                          {totalCount} Events at this location
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{group.address}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                          <div className="flex flex-col gap-1 max-h-64 overflow-auto pr-1">
                            {group.events.map((ev, i) => (
                              <button
                                key={ev.id}
                                onClick={() => { setSelectedEvent(ev); setIsFollowingUser(false); navigate(`/event/${ev.id}`); }}
                                className="text-left text-[11px] bg-slate-100 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg px-2 py-1.5 transition"
                              >
                                <span className="font-semibold text-slate-800 dark:text-slate-100 block">{ev.name}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {ev.date} {ev.time}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Single event - show normal popup */
                      <>
                        <div className="font-black text-base text-slate-900 dark:text-white leading-tight">{primary.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{primary.date} {primary.time}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{group.address}</span>
                        </div>
                        <button
                          onClick={() => navigate(`/event/${primary.id}`)}
                          className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-500 transition"
                        >
                          View details
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {routeToEvent && <Polyline positions={[userLocation, [routeToEvent.location.lat, routeToEvent.location.lng]]} pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.8, dashArray: '10, 15' }} />}
        </MapContainer>
        <div className="leaflet-vignette" />
      </div>

      {/* Vibe Radar - Mobile Floating Navigator */}
      {!compactMode && nearestEvent && !selectedEvent && (
        <div className="absolute left-4 md:left-6 bottom-6 md:bottom-10 z-[500] animate-in slide-in-from-left duration-700">
           <button 
             onClick={() => { setSelectedEvent(nearestEvent); }}
             className={`${
               theme === 'light'
                 ? 'bg-white border-slate-200 hover:border-indigo-400'
                 : 'bg-slate-900 border-slate-800 hover:border-indigo-500'
             } border p-3 md:p-4 rounded-2xl md:rounded-[32px] shadow-2xl flex items-center gap-3 md:gap-4 group transition-all`}
             aria-label={`View nearby event: ${nearestEvent.name}`}
           >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white relative">
                 <Radar className="w-6 h-6 animate-pulse" aria-hidden="true" />
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

      {/* Live Update Toast Notification */}
      {!compactMode && liveUpdateCount > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] live-update-toast">
          <div className={`${
            theme === 'light'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-green-600 to-emerald-700 text-white'
          } px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2`}>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-black uppercase tracking-widest">
              🎉 Live Update! Map Refreshed
            </span>
          </div>
        </div>
      )}
      
      {/* Nearby New Events Counter Badge */}
      {!compactMode && nearbyNewEventsCount > 0 && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[500]">
          <button
            onClick={() => {
              if (nearbyNewEvents.length > 0 && mapRef.current) {
                const latest = nearbyNewEvents[nearbyNewEvents.length - 1];
                mapRef.current.flyTo([latest.location.lat, latest.location.lng], 15, {
                  duration: 1.5
                });
                setSelectedEvent(latest);

              }
            }}
            className={`${
              theme === 'light'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white'
            } px-5 py-2.5 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2 hover:scale-105 transition-transform`}
          >
            <Radar className="w-5 h-5 animate-pulse" aria-hidden="true" />
            <span className="text-sm font-black uppercase tracking-widest">
              {nearbyNewEventsCount} New Event{nearbyNewEventsCount > 1 ? 's' : ''} Near You!
            </span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Overlays */}
      {!compactMode && (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-2 sm:px-4 z-[400] space-y-3">
        <div className={`$
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
              aria-label="Search events on map"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Date filter */}
            <div className={`relative flex items-center ${theme === 'light' ? 'bg-white' : 'bg-slate-800/60'} border ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'} rounded-xl px-3 py-2`}>
              <Calendar className={`w-4 h-4 mr-2 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`text-sm ${theme === 'light' ? 'bg-white text-slate-900' : 'bg-transparent text-white'} focus:outline-none`}
                aria-label="Filter events by date"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className={`ml-2 p-1 rounded ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-700'}`}
                  aria-label="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${
                theme === 'light' ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-800/60 border-slate-700 text-white hover:bg-slate-700'
              }`}
              aria-label={`Sort events by date ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">{sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}</span>
            </button>
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
              aria-label={`Filter events by ${cat} category`}
              aria-pressed={activeCategory === cat || (cat === 'All' && !activeCategory)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Guest Language Selector - Mobile Friendly */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-start md:justify-center">
          {[
            { code: 'en', label: '🇬🇧 English' },
            { code: 'et', label: '🇪🇪 Eesti' },
            { code: 'ru', label: '🇷🇺 Русский' },
            { code: 'es', label: '🇪🇸 Español' },
            { code: 'pt', label: '🇵🇹 Português' }
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleGuestLanguageChange(lang.code)}
              className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                guestLanguage === lang.code
                  ? theme === 'light'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                    : 'bg-white border-white text-slate-950 shadow-lg'
                  : theme === 'light'
                    ? 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
              aria-label={`Select ${lang.label} language`}
              aria-pressed={guestLanguage === lang.code}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {!compactMode && (
      <div className="absolute right-4 md:right-6 bottom-6 md:bottom-10 flex flex-col gap-2 md:gap-3 z-[600]">
        {/* Compact mode toggle */}
        <button
          onClick={toggleCompactMode}
          className={`${
            theme === 'light' 
              ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50' 
              : 'bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-800'
          } p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border inline-flex items-center gap-2`}
          title="Hide UI overlays"
          aria-label="Hide UI overlays"
        >
          <Minimize2 className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
        </button>
        <button 
          onClick={onToggleTheme || (() => {})} 
          className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border ${
            theme === 'light' 
              ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50' 
              : 'bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-800'
          }`}
          title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {theme === 'light' ? <Moon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" /> : <Sun className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />}
        </button>
        
        {/* Sound Notification Toggle */}
        <button 
          onClick={toggleSound} 
          className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border relative ${
            soundEnabled 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : theme === 'light' 
                ? 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
          }`}
          title={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
          aria-label={soundEnabled ? 'Sound notifications enabled' : 'Sound notifications disabled'}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? (
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>
        
        {/* Auto-Pan Toggle */}
        <button 
          onClick={toggleAutoPan} 
          className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border ${
            autoPanEnabled 
              ? 'bg-amber-600 text-white border-amber-500' 
              : theme === 'light' 
                ? 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
          }`}
          title={autoPanEnabled ? 'Disable auto-pan to new events' : 'Enable auto-pan to new events'}
          aria-label={autoPanEnabled ? 'Auto-pan enabled' : 'Auto-pan disabled'}
          aria-pressed={autoPanEnabled}
        >
          <Compass className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
        </button>
        
        <button onClick={() => setIsFollowingUser(!isFollowingUser)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border ${isFollowingUser ? 'bg-indigo-600 text-white border-indigo-500' : theme === 'light' ? 'bg-white text-slate-400 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'}`} aria-label={isFollowingUser ? "Stop following your location" : "Follow your location on map"} aria-pressed={isFollowingUser}>
          <LocateFixed className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
        </button>
        {/* Distance Radius Slider - Hidden on mobile to prevent overlap with event card */}
        <div className={`hidden md:flex ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200'
            : 'bg-slate-900/90 border-slate-800'
        } border backdrop-blur-md p-4 rounded-3xl flex-col items-center gap-3`}>
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
            aria-label={`Search radius: ${searchRadius} kilometers`}
          />
        </div>
      </div>
      )}

      {compactMode && (
        <div className="absolute right-4 md:right-6 bottom-6 md:bottom-10 z-[600]">
          <button
            onClick={toggleCompactMode}
            className={`${
              theme === 'light' 
                ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50' 
                : 'bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-800'
            } p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl transition-all border inline-flex items-center gap-2`}
            title="Show UI overlays"
            aria-label="Show UI overlays"
          >
            <Maximize2 className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Recommendations Floating Panel */}
      {!compactMode && userId && (
        <div className="absolute right-4 md:right-6 top-20 md:top-24 z-[500] max-w-xs max-h-[calc(100vh-200px)] overflow-hidden">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className={`w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-t-xl md:rounded-t-2xl shadow-xl transition-all border ${
              showRecommendations
                ? theme === 'light'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                : theme === 'light'
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-indigo-950'
            }`}
            title="Show personalized event recommendations"
            aria-label="Toggle personalized recommendations"
            aria-pressed={showRecommendations}
          >
            <span className="text-sm font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
              Smart Picks
            </span>
            <X className={`w-4 h-4 transition-transform ${showRecommendations ? 'rotate-90' : ''}`} aria-hidden="true" />
          </button>
          
          {showRecommendations && (
            <div className={`border-t rounded-b-xl md:rounded-b-2xl overflow-y-auto max-h-[calc(100vh-260px)] ${
              theme === 'light'
                ? 'bg-white border-slate-200'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="p-4">
                {userId ? (
                  <RecommendationFeed
                    userId={userId}
                    userLocation={{ lat: userLocation[0], lng: userLocation[1] }}
                    limit={5}
                    onEventClick={(event) => {
                      navigate(`/event/${event.id}`);
                      setShowRecommendations(false);
                    }}
                  />
                ) : (
                  <div className={`p-4 text-center text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sign in to see personalized recommendations
                  </div>
                )}
              </div>
            </div>
          )}
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
