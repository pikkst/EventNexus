import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, MapPin, Mail, User as UserIcon } from 'lucide-react';
import { User, EventNexusEvent } from '../types';
import UserProfileInterests from './UserProfileInterests';
import { getEvents } from '../services/dbService';
import logger from '../utils/logger';
import Breadcrumbs from './Breadcrumbs';

interface PublicUserProfileProps {
  currentUser: User | null;
}

/**
 * PublicUserProfile Component - Displays public user profile with interests and events
 * Accessible via /user/:username route
 * Shows user info, interests/preferences, and attended/upcoming events
 */
const PublicUserProfile: React.FC<PublicUserProfileProps> = ({ currentUser }) => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEvents, setUserEvents] = useState<EventNexusEvent[]>([]);
  const isOwnProfile = currentUser?.id === user?.id;

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setError('Username not provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get all events and find ones where user is organizer or attendee
        const allEvents = await getEvents();
        
        // Filter events by organizer name/username (simplified for now)
        const filteredEvents = allEvents?.filter(event => 
          event.organizerId === username || event.organizerName?.toLowerCase().includes(username.toLowerCase())
        ) || [];
        
        setUserEvents(filteredEvents);
        
        // Build user object from organizer info (this is a simplified approach)
        if (filteredEvents.length > 0) {
          const firstEvent = filteredEvents[0];
          const profileUser: User = {
            id: firstEvent.organizerId,
            email: '',
            name: firstEvent.organizerName || 'Event Organizer',
            avatar: firstEvent.organizerAvatar || null,
            bio: '',
            location: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Add other required fields with defaults
            role: 'user',
            subscription_tier: 'free',
            agency_slug: '',
            followedOrganizers: [],
            likedEvents: [],
          };
          setUser(profileUser);
        } else {
          setError(`No events found for "${username}"`);
        }
        
        setError(null);
      } catch (err) {
        logger.error('Failed to load user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: 'Events', path: '/map' }, { label: 'User Profile' }]} />
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 mt-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Go back
          </button>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-red-400 mb-4">{error || 'User not found'}</p>
            <button
              onClick={() => navigate('/map')}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Upcoming events (after today)
  const upcomingEvents = userEvents.filter(e => new Date(e.date) > new Date());
  // Past events (before today)
  const pastEvents = userEvents.filter(e => new Date(e.date) <= new Date());

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      {/* Header with breadcrumbs */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Breadcrumbs 
          items={[
            { label: 'Events', path: '/map' },
            { label: user.name || 'User Profile' }
          ]}
        />
      </div>

      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
        >
          <ArrowLeft className="w-5 h-5" />
          Go back
        </button>
      </div>

      {/* Profile Header */}
      <div className="max-w-6xl mx-auto px-4 mb-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-xl">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`}
              alt={user.name || 'User'}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-2 border-indigo-500/30"
            />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              {user.name || 'Event Organizer'}
            </h1>
            
            <div className="space-y-2 text-slate-400">
              {user.bio && (
                <div className="flex items-start gap-2">
                  <UserIcon className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
                  <p className="text-slate-300">{user.bio}</p>
                </div>
              )}
              
              {user.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <p className="text-slate-300">{user.location}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6">
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-400">{userEvents.length}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-400">{upcomingEvents.length}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Upcoming</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-amber-400">{pastEvents.length}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Attended</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 space-y-12">
        {/* User Interests - Phase 1 Social Feature (view-only for public profile) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6">Interests & Preferences</h2>
          <UserProfileInterests
            userId={user.id}
            isOwnProfile={false}
          />
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="flex items-center gap-4 p-4 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg border border-slate-700/50 cursor-pointer transition-all"
                >
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{event.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                      <span>{event.location.city}</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-indigo-400">
                    {event.price === 0 ? 'Free' : `€${event.price}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">Past Events ({pastEvents.length})</h2>
            <div className="space-y-4">
              {pastEvents.slice(0, 5).map(event => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="flex items-center gap-4 p-4 bg-slate-800/20 hover:bg-slate-800/40 rounded-lg border border-slate-700/30 cursor-pointer transition-all opacity-75"
                >
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-300 truncate">{event.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                      <span>{event.location.city}</span>
                    </div>
                  </div>
                </div>
              ))}
              {pastEvents.length > 5 && (
                <p className="text-center text-slate-500 text-sm pt-4">
                  ... and {pastEvents.length - 5} more events
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {userEvents.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <UserIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No events found for this user yet</p>
            <button
              onClick={() => navigate('/map')}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              Explore Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicUserProfile;
