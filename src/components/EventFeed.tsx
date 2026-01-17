import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Heart, MapPin, Calendar, Clock, User as UserIcon, Share2 } from 'lucide-react';
import { User, UserFeedItem } from '../types';
import { getGlobalFeed, getUserFeed } from '../services/dbService';
import logger from '../utils/logger';
import Breadcrumbs from './Breadcrumbs';

interface EventFeedProps {
  user: User | null;
}

/**
 * EventFeed Component - Displays social feed with check-ins, RSVPs, and user activity
 * Shows global activity or personalized feed based on user authentication
 * Phase 1 Social Feature - Feed aggregation
 */
const EventFeed: React.FC<EventFeedProps> = ({ user }) => {
  const navigate = useNavigate();
  
  // State management
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const ITEMS_PER_PAGE = 20;

  // Load initial feed on mount
  useEffect(() => {
    loadFeed();
  }, [user?.id]);

  // Load feed items
  const loadFeed = async (pageOffset = 0) => {
    try {
      if (pageOffset === 0) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }

      let items: any[];
      
      if (user?.id) {
        // Load personalized feed for authenticated users
        items = await getUserFeed(user.id, ITEMS_PER_PAGE * (pageOffset + 1));
      } else {
        // Load global feed for unauthenticated users
        items = await getGlobalFeed(ITEMS_PER_PAGE * (pageOffset + 1));
      }

      if (!items) {
        items = [];
      }

      if (pageOffset === 0) {
        setFeedItems(items);
      } else {
        setFeedItems(prev => [...prev, ...items]);
      }

      setHasMore(items.length >= ITEMS_PER_PAGE * (pageOffset + 1));
      setOffset(pageOffset);
      setError(null);
    } catch (err) {
      logger.error('Failed to load feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more items
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadFeed(offset + 1);
    }
  };

  // Render feed item based on type
  const renderFeedItem = (item: any) => {
    const createdAt = new Date(item.created_at);
    const timeAgo = getTimeAgo(createdAt);

    switch (item.type) {
      case 'checkin':
        return (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-indigo-500/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={item.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user?.name || 'User'}`}
                  alt={item.user?.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-semibold text-white">{item.user?.name || 'User'}</h3>
                  <p className="text-xs text-slate-500">{timeAgo}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
                Checked in
              </span>
            </div>

            {item.content?.post_text && (
              <p className="text-slate-300 mb-4 leading-relaxed">{item.content.post_text}</p>
            )}

            {item.event && (
              <div
                onClick={() => navigate(`/event/${item.event.id}`)}
                className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800/60 transition-all mb-4"
              >
                {item.event.imageUrl && (
                  <img
                    src={item.event.imageUrl}
                    alt={item.event.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{item.event.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{item.event.location?.city}</span>
                  </div>
                </div>
              </div>
            )}

            {item.content?.media_url && (
              <img
                src={item.content.media_url}
                alt="Check-in media"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
              <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm">
                <Heart className="w-4 h-4" />
                <span>Like</span>
              </button>
              <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        );

      case 'rsvp':
        return (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-indigo-500/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={item.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user?.name || 'User'}`}
                  alt={item.user?.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-semibold text-white">{item.user?.name || 'User'}</h3>
                  <p className="text-xs text-slate-500">{timeAgo}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-bold text-indigo-400">
                {item.content?.status === 'going' ? 'Going' : item.content?.status === 'interested' ? 'Interested' : 'Maybe'}
              </span>
            </div>

            {item.event && (
              <div
                onClick={() => navigate(`/event/${item.event.id}`)}
                className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800/60 transition-all"
              >
                {item.event.imageUrl && (
                  <img
                    src={item.event.imageUrl}
                    alt={item.event.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{item.event.name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.event.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.event.time}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-slate-700 mt-4">
              <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm">
                <Heart className="w-4 h-4" />
                <span>Like</span>
              </button>
              <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-slate-400">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Breadcrumbs items={[{ label: 'Events', path: '/map' }, { label: 'Social Feed' }]} />
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Social Feed</h1>
          <p className="text-slate-400">
            {user ? 'See what your friends are attending and their check-ins' : 'Discover what people are doing at events'}
          </p>
        </div>

        {/* Tab-like selector for feed type */}
        <div className="flex gap-2 mb-8">
          <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
            All Activity
          </button>
          <button className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold rounded-lg hover:border-slate-700 transition-colors">
            Check-ins
          </button>
          <button className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold rounded-lg hover:border-slate-700 transition-colors">
            RSVPs
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-semibold">{error}</p>
            <button
              onClick={() => loadFeed()}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Feed Items */}
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {feedItems.length > 0 ? (
          <>
            {feedItems.map(item => renderFeedItem(item))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <UserIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No activity yet</p>
            {user ? (
              <p className="text-slate-500 text-sm">Check-ins and RSVPs will appear here</p>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
              >
                Sign in to see activity
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return 'Just now';
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
  if (secondsAgo < 2592000) return `${Math.floor(secondsAgo / 604800)}w ago`;
  return `${Math.floor(secondsAgo / 2592000)}mo ago`;
}

export default EventFeed;
