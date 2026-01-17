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
  onEventClick?: (event: EventNexusEvent) => void;
}

export const RecommendationFeed: React.FC<RecommendationFeedProps> = ({
  userId,
  userLocation,
  limit = 8,
  onEventClick
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const recs = await getEventRecommendations(userId, userLocation, limit);
        setRecommendations(recs);
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [userId, userLocation, limit]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-48 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-8 text-center">
        <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No recommendations available yet. Explore more events!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Personalized for You</h2>
      </div>

      {recommendations.map(({ event, score, reasons }) => (
        <div
          key={event.id}
          className="group relative bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20"
          onClick={() => onEventClick?.(event)}
        >
          {/* Image */}
          {event.imageUrl && (
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
              <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content */}
          <div className="relative p-5 sm:p-6 flex gap-4">
            {/* Score Badge */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-indigo-400">{Math.round(score)}%</div>
                  <div className="text-xs text-indigo-300">Match</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                {event.name}
              </h3>

              <p className="text-sm text-slate-400 line-clamp-2 mt-1">{event.description}</p>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  {new Date(event.date).toLocaleDateString()}
                </div>

                {event.latitude && event.longitude && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </div>
                )}

                {event.price !== undefined && event.price > 0 && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <DollarSign className="w-4 h-4" />
                    €{event.price}
                  </div>
                )}

                {event.attendeesCount && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-4 h-4" />
                    {event.attendeesCount} going
                  </div>
                )}
              </div>

              {/* Reasons */}
              <div className="flex flex-wrap gap-2 mt-3">
                {reasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Arrow */}
            <div className="flex-shrink-0 flex items-center">
              <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
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

              <p className="text-xs text-slate-400 mt-2">{event.location}</p>

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
