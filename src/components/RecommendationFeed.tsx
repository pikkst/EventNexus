/**
 * Event Recommendation Feed Component
 * Displays AI-personalized event recommendations
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Calendar, DollarSign, Users, ArrowRight, Zap } from 'lucide-react';
import { EventNexusEvent } from '../types';
import { getEventRecommendations, getTrendingEvents, getSimilarEvents, RecommendationScore } from '../services/recommendationService';

interface RecommendationFeedProps {
  userId: string;
  userLocation: { lat: number; lng: number };
  limit?: number;
  isGuest?: boolean;
  theme?: 'dark' | 'light';
  onEventClick?: (event: EventNexusEvent) => void;
}

export const RecommendationFeed: React.FC<RecommendationFeedProps> = ({
  userId,
  userLocation,
  limit = 8,
  isGuest = false,
  theme = 'dark',
  onEventClick
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Validate location
        if (!userLocation?.lat || !userLocation?.lng) {
          console.warn('Invalid location for recommendations:', userLocation);
          if (isMounted) {
            setError('Location not available');
            setIsLoading(false);
          }
          return;
        }
        
        const recs = await getEventRecommendations(userId, userLocation, limit);
        
        if (isMounted) {
          setRecommendations(recs);
          console.log(`✅ Loaded ${recs.length} recommendations for location [${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}]`);
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
        if (isMounted) {
          setError('Failed to load recommendations');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Debounce: wait 500ms before loading to avoid rapid re-renders
    const timer = setTimeout(loadRecommendations, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [userId, userLocation.lat, userLocation.lng, limit]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`h-32 rounded-lg animate-pulse ${
              theme === 'light'
                ? 'bg-gradient-to-r from-slate-200 to-slate-100'
                : 'bg-gradient-to-r from-slate-800 to-slate-700'
            }`}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 rounded-lg text-sm ${
        theme === 'light'
          ? 'bg-red-50 border border-red-200 text-red-600'
          : 'bg-red-900/20 border border-red-800 text-red-400'
      }`}>
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-6 text-center">
        <Sparkles className={`w-10 h-10 mx-auto mb-3 ${
          theme === 'light' ? 'text-slate-400' : 'text-slate-600'
        }`} />
        <p className={`text-sm ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          {isGuest ? 'Sign in for personalized picks!' : 'Explore more to get recommendations'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${
            theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'
          }`} />
          <h2 className={`text-base md:text-lg font-bold ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            {isGuest ? 'Near You' : 'For You'}
          </h2>
        </div>
        {isGuest && (
          <MapPin className={`w-4 h-4 ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`} />
        )}
      </div>

      {recommendations.map(({ event, score, reasons }) => (
        <div
          key={event.id}
          className={`group relative rounded-lg overflow-hidden transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md'
              : 'bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20'
          }`}
          onClick={() => onEventClick?.(event)}
        >
          {/* Image */}
          {event.imageUrl && (
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content */}
          <div className="relative p-3 md:p-4 flex gap-3">
            {/* Score Badge */}
            <div className="flex-shrink-0">
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center ${
                theme === 'light'
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-indigo-600/20 border border-indigo-500/30'
              }`}>
                <div className="text-center">
                  <div className={`text-base md:text-lg font-bold ${
                    theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'
                  }`}>{Math.round(score)}%</div>
                  <div className={`text-[10px] ${
                    theme === 'light' ? 'text-indigo-500' : 'text-indigo-300'
                  }`}>Match</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className={`text-sm md:text-base font-bold truncate transition-colors ${
                theme === 'light'
                  ? 'text-slate-900 group-hover:text-indigo-600'
                  : 'text-white group-hover:text-indigo-400'
              }`}>
                {event.name}
              </h3>

              <p className={`text-xs line-clamp-1 mt-1 ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}>{event.description}</p>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-2 md:gap-3 mt-2 text-[11px]">
                <div className={`flex items-center gap-1 ${
                  theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">{new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>

                {event.latitude && event.longitude && (
                  <div className={`flex items-center gap-1 max-w-[120px] ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {typeof event.location === 'string'
                        ? event.location.split(',')[0]
                        : event.location?.city || 'Unknown'}
                    </span>
                  </div>
                )}

                {event.price !== undefined && event.price > 0 && (
                  <div className={`flex items-center gap-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    <DollarSign className="w-3 h-3" />
                    €{event.price}
                  </div>
                )}

                {event.attendeesCount && (
                  <div className={`flex items-center gap-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    <Users className="w-3 h-3" />
                    {event.attendeesCount}
                  </div>
                )}
              </div>

              {/* Reasons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {reasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      theme === 'light'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Arrow */}
            <div className="flex-shrink-0 flex items-center">
              <ArrowRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${
                theme === 'light' ? 'text-indigo-500' : 'text-indigo-400'
              }`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Trending Events Section
 */
export const TrendingEventsSection: React.FC<{ onEventClick?: (event: EventNexusEvent) => void }> = ({
  onEventClick
}) => {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const trending = await getTrendingEvents(6);
        setEvents(trending);
      } catch (error) {
        console.error('Error loading trending events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrending();
  }, []);

  if (isLoading) {
    return <div className="h-48 bg-slate-800 rounded-lg animate-pulse" />;
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">Trending Now</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => (
          <div
            key={event.id}
            onClick={() => onEventClick?.(event)}
            className="group relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-amber-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-amber-500/20"
          >
            {event.imageUrl && (
              <div className="relative h-40 overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent" />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors flex-1 line-clamp-2">
                  {event.name}
                </h4>
                <div className="flex-shrink-0 flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                  <Users className="w-3 h-3" />
                  {event.attendeesCount || 0}
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-2">{event.location?.address || event.location?.city || 'TBA'}</p>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                <span className="text-xs text-slate-300">{new Date(event.date).toLocaleDateString()}</span>
                {event.price && event.price > 0 && (
                  <span className="text-sm font-bold text-indigo-400">€{event.price}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
