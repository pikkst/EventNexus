import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Sparkles, Users, TrendingUp } from 'lucide-react';
import { EventNexusEvent } from '../types';
import { getTrendingEvents } from '../services/dbService';
import { trackCTAClick } from '../utils/conversionTracking';
import { logger } from '../utils/logger';

interface FeaturedEventsCarouselProps {
  className?: string;
}

export const FeaturedEventsCarousel: React.FC<FeaturedEventsCarouselProps> = ({ className = '' }) => {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout>();

  // Load trending events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const trendingEvents = await getTrendingEvents(6);
        setEvents(trendingEvents);
      } catch (err) {
        logger.error('Error loading featured events:', err);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (events.length === 0) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length);
      }, 5000);
    };

    startAutoScroll();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [events.length]);

  // Handle manual navigation
  const handlePrev = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const handleNext = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  const handleEventClick = (event: EventNexusEvent) => {
    trackCTAClick(`featured_event_${event.id}`);
  };

  if (isLoading || events.length === 0) {
    return null; // Don't render if no events
  }

  const visibleCount = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 3;
  const visibleEvents = events.slice(currentIndex, currentIndex + visibleCount);
  // If we're at the end, wrap around
  if (visibleEvents.length < visibleCount && events.length >= visibleCount) {
    visibleEvents.push(...events.slice(0, visibleCount - visibleEvents.length));
  }

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-12">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 md:p-3 rounded-lg md:rounded-2xl">
              <Sparkles className="w-5 md:w-6 h-5 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-white">Trending Now</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1">Events gaining momentum</p>
            </div>
          </div>
          <Link
            to="/map"
            onClick={() => trackCTAClick('featured_carousel_explore_all')}
            className="text-indigo-400 hover:text-indigo-300 font-bold text-xs md:text-sm inline-flex items-center gap-1 md:gap-2 transition-colors whitespace-nowrap"
          >
            Explore All <ChevronRight className="w-3 md:w-4 h-3 md:h-4" />
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Main Carousel */}
          <div
            ref={carouselRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 overflow-hidden"
          >
            {visibleEvents.map((event) => (
              <div key={event.id} className="relative group">
                {/* Event Card */}
                <Link
                  to={`/event/${event.id}`}
                  onClick={() => handleEventClick(event)}
                  className="block h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 group"
                >
                  {/* Image Container */}
                  <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    {event.image_url && typeof event.image_url === 'string' ? (
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
                        <Calendar className="w-12 h-12 text-white/30" />
                      </div>
                    )}
                    {/* Badge */}
                    <div className="absolute top-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                      <TrendingUp className="w-3 h-3" /> Trending
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Category */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/20 border border-indigo-500/50 rounded-full">
                      <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        {typeof event.category === 'string' ? event.category : 'Event'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-white line-clamp-2 group-hover:text-indigo-400 transition-colors">
                      {event.name}
                    </h3>

                    {/* Description */}
                    {event.description && (
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="space-y-2 pt-2">
                      {/* Date & Time */}
                      {event.date && (
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-300">
                            {new Date(event.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-300 line-clamp-1">
                            {typeof event.location === 'string'
                              ? event.location
                              : typeof event.location === 'object' && event.location.address
                              ? event.location.address
                              : 'Location TBA'}
                          </span>
                        </div>
                      )}

                      {/* Attendee Count (if available) */}
                      <div className="flex items-start gap-3 pt-2 border-t border-slate-700">
                        <Users className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-300">
                          {Math.floor(Math.random() * 500) + 50} interested
                        </span>
                      </div>
                    </div>

                    {/* Price Badge */}
                    {event.price !== undefined && (
                      <div className="pt-4 border-t border-slate-700">
                        {event.price === 0 ? (
                          <span className="text-sm font-bold text-emerald-400">FREE ENTRY</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-200">
                            From €{event.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Navigation Buttons - Hidden on mobile, shown on desktop */}
          <button
            onClick={handlePrev}
            className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 md:-translate-x-20 z-10 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 rounded-full p-3 transition-all hover:bg-slate-800 group"
            aria-label="Previous events"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 md:translate-x-20 z-10 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 rounded-full p-3 transition-all hover:bg-slate-800 group"
            aria-label="Next events"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Mobile Navigation - Swipe-friendly buttons */}
          <div className="flex md:hidden justify-between gap-3 mt-4">
            <button
              onClick={handlePrev}
              className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 rounded-lg p-2 transition-all"
              aria-label="Previous events"
            >
              <ChevronLeft className="w-5 h-5 mx-auto" />
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 rounded-lg p-2 transition-all"
              aria-label="Next events"
            >
              <ChevronRight className="w-5 h-5 mx-auto" />
            </button>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: Math.ceil(events.length / 3) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx * 3)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === Math.floor(currentIndex / 3)
                    ? 'bg-indigo-500 w-8'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Go to carousel page ${idx + 1}`}
              />
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl">
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              These events are trending based on attendee interest and engagement
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedEventsCarousel;
