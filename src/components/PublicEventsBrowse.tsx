import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ExternalLink, Search, Filter, Loader, Globe, X, Sparkles, Compass, ChevronDown } from 'lucide-react';
import { EventNexusEvent, User } from '../types';
import { trackPageView } from '../services/analyticsService';
import { generateEventListStructuredData, injectStructuredData, removeStructuredData } from '../utils/structuredData';
import { getUserLanguagePreference, batchTranslateEvents } from '../services/languageService';

interface PublicEventsBrowseProps {
  onOpenAuth?: () => void;
  user?: User | null;
}

const PublicEventsBrowse: React.FC<PublicEventsBrowseProps> = ({ onOpenAuth, user }) => {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [displayCount, setDisplayCount] = useState(50); // How many to show
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userLanguage, setUserLanguage] = useState<string>('en');
  const [translatedEvents, setTranslatedEvents] = useState<Map<string, { name: string; description: string }>>(new Map());
  const EVENTS_PER_PAGE = 50;

  // Track page view for analytics (including AI crawlers)
  useEffect(() => {
    trackPageView(null, '/browse', document.referrer);
  }, []);

  // Detect user language preference
  useEffect(() => {
    const detectLanguage = async () => {
      const lang = await getUserLanguagePreference(user);
      setUserLanguage(lang);
      console.log('🌐 User language detected:', lang);
    };
    detectLanguage();
  }, [user]);

  // Translate events when language or events change
  useEffect(() => {
    const translateAllEvents = async () => {
      if (events.length === 0 || !userLanguage) return;
      
      // Filter events that need translation (not in original language)
      const eventsToTranslate = events.filter(e => e.original_language !== userLanguage);
      
      if (eventsToTranslate.length === 0) {
        console.log('✅ All events already in user language, no translation needed');
        return;
      }
      
      console.log(`🔄 Translating ${eventsToTranslate.length} events to ${userLanguage}...`);
      
      try {
        const translations = await batchTranslateEvents(
          eventsToTranslate.map(e => ({
            id: e.id,
            name: e.name,
            description: e.description || '',
            aboutText: e.aboutText
          })),
          userLanguage,
          user?.id,
          user?.subscription_tier
        );
        
        setTranslatedEvents(translations);
        console.log(`✅ Translated ${translations.size} events`);
      } catch (error) {
        console.error('Error translating events:', error);
      }
    };
    
    translateAllEvents();
  }, [events, userLanguage, user]);

  // Update SEO meta tags for /browse page
  useEffect(() => {
    document.title = 'Browse Events | EventNexus.eu - AI-Powered Event Discovery';
    
    // Update or create meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', `Browse upcoming events across Europe. Discover concerts, conferences, and local experiences with EventNexus.eu. Powered by Gemini 3.0 translation technology.`);

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://eventnexus.eu/browse');

    // Update Open Graph tags
    const updateMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaProperty('og:title', 'Browse Events - EventNexus.eu');
    updateMetaProperty('og:description', 'Discover upcoming events across Europe with AI-powered translation and geospatial discovery.');
    updateMetaProperty('og:url', 'https://eventnexus.eu/browse');
    updateMetaProperty('og:type', 'website');

    // Update Twitter tags
    const updateTwitter = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateTwitter('twitter:title', 'Browse Events - EventNexus.eu');
    updateTwitter('twitter:description', 'Discover events across Europe. Search by location, category, and date.');
  }, []);

  // Inject structured data for Google Rich Results
  useEffect(() => {
    if (events.length > 0) {
      // Generate single ItemList structured data (Google prefers one list per page)
      const structuredDataList = generateEventListStructuredData(events);
      
      // Inject the ItemList
      injectStructuredData(structuredDataList);

      console.log(`✅ Injected ItemList with ${events.length} events on /browse`);

      // Cleanup on unmount
      return () => {
        removeStructuredData();
      };
    }
  }, [events]);

  useEffect(() => {
    loadPublicEvents();
  }, []);

  const loadPublicEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load ALL events at once (AI crawlers need to see all)
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap?format=json&limit=10000',
        {
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to load events: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
      console.log(`✅ Loaded ${data.events?.length || 0} events from database`);
    } catch (err) {
      console.error('Error loading public events:', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEvents = () => {
    setDisplayCount(prev => prev + EVENTS_PER_PAGE);
  };

  // Extract unique values for filters
  const categories = ['all', ...Array.from(new Set(events.map(e => e.category).filter(Boolean)))];
  
  const countries = ['all', ...Array.from(new Set(events.map(e => {
    if (!e.location) return null;
    // Handle both string and object format
    if (typeof e.location === 'string') {
      const parts = e.location.split(',');
      return parts[parts.length - 1]?.trim();
    }
    return e.location.country;
  }).filter(Boolean)))];
  
  const cities = selectedCountry === 'all'
    ? ['all', ...Array.from(new Set(events.map(e => {
        if (!e.location) return null;
        if (typeof e.location === 'string') {
          return e.location.split(',')[0]?.trim();
        }
        return e.location.city;
      }).filter(Boolean)))]
    : ['all', ...Array.from(new Set(events.filter(e => {
        const country = typeof e.location === 'string' 
          ? e.location.split(',').pop()?.trim()
          : e.location?.country;
        return country === selectedCountry;
      }).map(e => {
        if (typeof e.location === 'string') {
          return e.location.split(',')[0]?.trim();
        }
        return e.location?.city;
      }).filter(Boolean)))];

  const filteredEvents = events.filter(event => {
    // Get location string for search
    const locationStr = typeof event.location === 'string' 
      ? event.location 
      : event.location?.address || `${event.location?.city || ''}, ${event.location?.country || ''}`;
    
    const matchesSearch = !searchTerm || 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationStr.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;

    const eventCountry = typeof event.location === 'string'
      ? event.location.split(',').pop()?.trim()
      : event.location?.country;
    const matchesCountry = selectedCountry === 'all' || eventCountry === selectedCountry;

    const eventCity = typeof event.location === 'string'
      ? event.location.split(',')[0]?.trim()
      : event.location?.city;
    const matchesCity = selectedCity === 'all' || eventCity === selectedCity;

    let matchesDate = true;
    if (dateFilter !== 'all' && event.date) {
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        matchesDate = eventDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        matchesDate = eventDate >= today && eventDate <= weekFromNow;
      } else if (dateFilter === 'month') {
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        matchesDate = eventDate >= today && eventDate <= monthFromNow;
      }
    }

    return matchesSearch && matchesCategory && matchesCountry && matchesCity && matchesDate;
  });

  // Display only first displayCount events (for performance)
  const displayedEvents = filteredEvents.slice(0, displayCount);
  const hasMoreToShow = filteredEvents.length > displayCount;

  const activeFiltersCount = [
    searchTerm,
    selectedCategory !== 'all',
    selectedCountry !== 'all',
    selectedCity !== 'all',
    dateFilter !== 'all'
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCountry('all');
    setSelectedCity('all');
    setDateFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">Discovering events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-950/50 border border-red-900 rounded-2xl p-8">
            <p className="text-red-400 mb-6 font-semibold">{error}</p>
            <button
              onClick={loadPublicEvents}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header Section - Dark Theme */}
      <div className="relative px-4 pt-8 pb-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-7xl mx-auto">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8">
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
              <Compass className="w-5 h-5" />
              <span className="font-semibold">Back to Home</span>
            </Link>
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Title & Stats */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-full text-indigo-400 text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" /> {events.length} events discovered
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
              Browse <span className="text-indigo-500">All Events</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
              Discover amazing events from around the world. Filter by category, location, and date.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search events by name, description, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Filters Toggle Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:border-indigo-500 transition-all font-bold"
            >
              <Filter className="w-5 h-5" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-black">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="max-w-5xl mx-auto bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="all">All Categories</option>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    <Globe className="w-3 h-3 inline mr-1" />
                    Country
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedCity('all');
                    }}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="all">All Countries</option>
                    {countries.filter(c => c !== 'all').map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                {/* City Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    City
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="all">All Cities</option>
                    {cities.filter(c => c !== 'all').map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    When
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-center pt-4 border-t border-slate-800">
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors font-bold text-sm"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters ({activeFiltersCount})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between max-w-7xl mx-auto mb-6">
            <p className="text-slate-400 font-medium">
              {filteredEvents.length > 0 ? (
                <>
                  Showing <span className="text-white font-bold">{filteredEvents.length}</span>{' '}
                  {filteredEvents.length === 1 ? 'event' : 'events'}
                </>
              ) : (
                <span className="text-slate-500">No events found</span>
              )}
            </p>
            {filteredEvents.length < events.length && (
              <p className="text-xs text-slate-500">
                ({events.length - filteredEvents.length} filtered out)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full mb-6">
              <Search className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No events found</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {activeFiltersCount > 0 
                ? "Try adjusting your filters to see more results" 
                : "No events are available at the moment"}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedEvents.map(event => {
              // Get translated content if available, otherwise use original
              const translation = translatedEvents.get(event.id);
              const displayName = translation?.name || event.name;
              const displayDescription = translation?.description || event.description;
              
              return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group"
              >
                {/* Event Image */}
                {event.image_url && (
                  <div className="aspect-video overflow-hidden bg-slate-800">
                    <img
                      src={event.image_url}
                      alt={displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Event Content */}
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-indigo-600/20 text-indigo-400 text-xs font-black uppercase tracking-wider rounded-full">
                      {event.category}
                    </span>
                  </div>

                  {/* Event Title */}
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {displayName}
                  </h3>

                  {/* Event Description */}
                  {displayDescription && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2 font-medium">
                      {displayDescription}
                    </p>
                  )}

                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    {event.date && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">{new Date(event.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="line-clamp-1 font-medium">
                          {typeof event.location === 'string' 
                            ? event.location 
                            : event.location.address || `${event.location.city || ''}, ${event.location.country || ''}`}
                        </span>
                      </div>
                    )}
                    {event.organizer_name && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Users className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{event.organizer_name}</span>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-indigo-400 font-bold group-hover:text-indigo-300">
                        View Details
                      </span>
                      <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
            })}
          </div>
        )}

        {/* Load More Button */}
        {!loading && displayedEvents.length > 0 && hasMoreToShow && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={loadMoreEvents}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              Load More Events ({filteredEvents.length - displayCount} remaining)
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Show total count */}
        {!loading && filteredEvents.length > 0 && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Showing {displayedEvents.length} of {filteredEvents.length} events
            {events.length > filteredEvents.length && ` (${events.length} total in database)`}
          </div>
        )}
      </div>

      {/* SEO Structured Data injected via useEffect hook above - no hardcoded script needed */}
    </div>
  );
};

export default PublicEventsBrowse;
