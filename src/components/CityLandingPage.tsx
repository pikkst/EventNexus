import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, Globe, Code, BookOpen, Database } from 'lucide-react';
import { getEvents } from '../services/dbService';
import { EventNexusEvent } from '../types';

/**
 * EventsInCityPage - Programmatic SEO Landing Pages for City-Specific Event Discovery
 * Generates unique landing pages for each city (e.g., /events-in-tallinn, /events-in-helsinki)
 * to improve keyword targeting and backlink potential
 * 
 * Implements recommendation: "Implement 'Programmatic SEO' to generate static landing pages 
 * for every city containing a map embed and event list"
 */

interface CityLandingPageProps {
  cityName?: string;
  countryName?: string;
}

const CityLandingPage: React.FC<CityLandingPageProps> = ({ cityName = '', countryName = '' }) => {
  const [events, setEvents] = useState<EventNexusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityInfo, setCityInfo] = useState({ city: cityName, country: countryName });

  useEffect(() => {
    // Extract city/country from URL path if not provided
    const pathMatch = window.location.pathname.match(/\/events-in-([a-z-]+)(?:\/([a-z-]+))?/i);
    if (pathMatch) {
      const urlCity = pathMatch[1].replace(/-/g, ' ');
      const urlCountry = pathMatch[2]?.replace(/-/g, ' ') || '';
      setCityInfo({ city: urlCity, country: urlCountry });
    }
  }, [cityName, countryName]);

  useEffect(() => {
    // Update page title and meta for SEO
    const cityTitle = cityInfo.city.charAt(0).toUpperCase() + cityInfo.city.slice(1);
    const countryTitle = cityInfo.country ? `${cityInfo.country.charAt(0).toUpperCase() + cityInfo.country.slice(1)}, ` : '';
    
    document.title = `Events in ${cityTitle}, ${countryTitle}Estonia | EventNexus.eu`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 
      `Discover upcoming events in ${cityTitle}, ${countryTitle}Estonia. Find concerts, conferences, and local experiences on EventNexus.eu with AI-powered recommendations.`
    );

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://eventnexus.eu/events-in-${cityInfo.city.toLowerCase().replace(/ /g, '-')}`);

    loadCityEvents();
  }, [cityInfo]);

  const loadCityEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await getEvents();
      
      // Filter events for this city
      const cityEvents = allEvents.filter(event => {
        const eventLocation = typeof event.location === 'string'
          ? event.location
          : event.location?.city || '';
        
        return eventLocation.toLowerCase().includes(cityInfo.city.toLowerCase());
      });

      // Sort by date
      cityEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(cityEvents);
    } catch (error) {
      console.error('Error loading city events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-24 px-4">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-12 bg-slate-700/50 rounded w-1/3"></div>
          <div className="h-4 bg-slate-700/50 rounded w-2/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-slate-700/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-24 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* SEO-Optimized Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-2">
            <MapPin className="w-4 h-4" />
            <span>{cityInfo.country || 'Estonia'}</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Events in {cityInfo.city.charAt(0).toUpperCase() + cityInfo.city.slice(1)}
          </h1>
          
          <p className="text-xl text-slate-300 mb-6">
            Discover {events.length} upcoming concerts, conferences, and local experiences in {cityInfo.city}. 
            Powered by AI-driven event discovery with Gemini 3.0 translation.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-indigo-600/20 backdrop-blur-sm rounded-lg p-4 border border-indigo-500/30">
              <Calendar className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="text-2xl font-bold text-white">{events.length}</div>
              <div className="text-sm text-slate-300">Upcoming Events</div>
            </div>
            
            <div className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
              <Users className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-white">
                {events.reduce((sum, e) => sum + (e.attendees_count || 0), 0)}
              </div>
              <div className="text-sm text-slate-300">Total Attendees</div>
            </div>

            <div className="bg-pink-600/20 backdrop-blur-sm rounded-lg p-4 border border-pink-500/30">
              <Globe className="w-5 h-5 text-pink-400 mb-2" />
              <div className="text-2xl font-bold text-white">
                {new Set(events.map(e => e.category)).size}
              </div>
              <div className="text-sm text-slate-300">Categories</div>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg mb-6">No events found in {cityInfo.city} at the moment.</p>
            <Link 
              to="/directory"
              className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Browse All Events
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Events */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Upcoming Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.slice(0, 9).map(event => (
                  <Link
                    key={event.id}
                    to={`/event/${event.id}`}
                    className="group bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300"
                  >
                    {event.image && (
                      <div className="aspect-video bg-slate-900 overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                        {event.name}
                      </h3>
                      <div className="space-y-2 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                        {event.price !== undefined && (
                          <div className="text-indigo-400 font-semibold">
                            {event.price === 0 ? 'Free' : `€${event.price}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* SEO-Friendly Text Content */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 mb-12">
              <h2 className="text-2xl font-bold text-white mb-4">Why Choose EventNexus for {cityInfo.city} Events?</h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  EventNexus.eu is {cityInfo.city}'s premier AI-powered event discovery platform. Using Google's Gemini 3.0 technology, 
                  we automatically translate event information into 17 languages, making it easier than ever to discover local 
                  experiences whether you're a local resident or visiting the area.
                </p>
                
                <p>
                  Our map-first interface shows you exactly where events are happening, letting you discover concerts, conferences, 
                  workshops, and cultural experiences happening right now in {cityInfo.city}. Unlike traditional event platforms, 
                  EventNexus combines geospatial intelligence with multilingual AI translation.
                </p>

                <p>
                  Whether you're looking for nightlife in {cityInfo.city}, cultural events, or professional conferences, 
                  EventNexus makes finding and booking tickets seamless. All events are verified and organized with rich details 
                  including venue information, pricing, and real-time attendance counts.
                </p>
              </div>
            </div>

            {/* View More CTA */}
            <div className="text-center">
              <Link 
                to={`/directory?location=${cityInfo.city}`}
                className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors mb-4"
              >
                View All Events in {cityInfo.city}
              </Link>
              <p className="text-slate-400">
                Not finding what you're looking for? <Link to="/map" className="text-indigo-400 hover:underline">Explore our interactive map</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CityLandingPage;
