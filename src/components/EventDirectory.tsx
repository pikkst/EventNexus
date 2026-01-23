import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, TrendingUp } from 'lucide-react';
import { getEvents } from '../services/dbService';
import { EventNexusEvent } from '../types';
import { generateEventListSchema } from '../utils/schemaMarkup';

/**
 * EventDirectory - Crawlable event listing page for search engines
 * Implements recommendation: "Create a 'Directory' sub-folder structure for events 
 * to give crawlers a clear path to content outside the map"
 */

interface EventDirectoryProps {
  category?: string;
  location?: string;
}

const EventDirectory: React.FC<EventDirectoryProps> = ({ category, location }) => {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [category, location]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const allEvents = await getEvents();
      
      // Filter published events only
      let filtered = allEvents.filter(e => e.visibility === 'public');
      
      // Apply category filter if specified
      if (category) {
        filtered = filtered.filter(e => e.category === category);
      }
      
      // Apply location filter if specified
      if (location) {
        filtered = filtered.filter(e => 
          e.location?.toLowerCase().includes(location.toLowerCase()) ||
          e.country?.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      // Sort by date (upcoming first)
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(filtered);
      
      // Inject ItemList Schema for SEO
      if (filtered.length > 0) {
        const schema = generateEventListSchema(filtered);
        const scriptElement = document.getElementById('event-list-schema');
        if (scriptElement) {
          scriptElement.textContent = JSON.stringify(schema, null, 2);
        } else {
          const newScript = document.createElement('script');
          newScript.type = 'application/ld+json';
          newScript.id = 'event-list-schema';
          newScript.textContent = JSON.stringify(schema, null, 2);
          document.head.appendChild(newScript);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Update page title and meta description for SEO
    const title = category && location
      ? `${category} Events in ${location} | EventNexus.eu`
      : category
      ? `${category} Events | EventNexus.eu`
      : location
      ? `Events in ${location} | EventNexus.eu`
      : 'Event Directory | EventNexus.eu';
    
    const description = category && location
      ? `Discover ${category.toLowerCase()} events in ${location}. Find tickets for concerts, conferences, and local experiences on EventNexus.eu.`
      : category
      ? `Browse ${category.toLowerCase()} events. Find and book tickets for ${category.toLowerCase()} near you on EventNexus.eu.`
      : location
      ? `Find events in ${location}. Discover concerts, conferences, workshops, and local experiences on EventNexus.eu.`
      : 'Browse all events on EventNexus.eu. Discover concerts, conferences, workshops, and local experiences near you.';
    
    document.title = title;
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
    
    // Cleanup ItemList schema on unmount
    return () => {
      const scriptElement = document.getElementById('event-list-schema');
      if (scriptElement) {
        scriptElement.textContent = '';
      }
    };
  }, [category, location, events]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/4"></div>
            <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-slate-700/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-24 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            {category && location
              ? `${category} Events in ${location}`
              : category
              ? `${category} Events`
              : location
              ? `Events in ${location}`
              : 'Event Directory'}
          </h1>
          <p className="text-slate-400 text-lg">
            {events.length} {events.length === 1 ? 'event' : 'events'} found
          </p>
        </div>

        {/* Event Grid */}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No events found matching your criteria.</p>
            <Link
              to="/events"
              className="inline-block mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              View All Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="group bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10"
              >
                {/* Event Image */}
                {event.image && (
                  <div className="aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Event Info */}
                <div className="p-5 space-y-3">
                  <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {event.name}
                  </h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{event.location || event.venue || 'TBA'}</span>
                    </div>

                    {event.category && (
                      <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium">
                        {event.category}
                      </div>
                    )}

                    {event.price !== undefined && (
                      <div className="text-lg font-bold text-indigo-400">
                        {event.price === 0 ? 'Free' : `${event.currency || 'EUR'} ${event.price}`}
                      </div>
                    )}

                    {event.attendees_count !== undefined && event.attendees_count > 0 && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{event.attendees_count} attending</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Map View
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventDirectory;
