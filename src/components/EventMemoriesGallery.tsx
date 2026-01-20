import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Eye, Users, Lock, Star, Calendar, MapPin, Image as ImageIcon, Video, FileText, Loader, ExternalLink } from 'lucide-react';
import { getEventMemories, getUserMemories, likeEventMemory, unlikeEventMemory, deleteEventMemory } from '../services/dbService';
import { EventMemory } from '../types';
import logger from '../utils/logger';

interface EventMemoriesGalleryProps {
  eventId?: string;
  userId?: string;
  currentUserId: string;
  showEventInfo?: boolean; // Show event details for user's memories
  onMemoryDeleted?: () => void;
}

const EventMemoriesGallery: React.FC<EventMemoriesGalleryProps> = ({
  eventId,
  userId,
  currentUserId,
  showEventInfo = false,
  onMemoryDeleted
}) => {
  const [memories, setMemories] = useState<EventMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'photo' | 'video' | 'review'>('all');

  useEffect(() => {
    loadMemories();
  }, [eventId, userId, filter]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      let data: any[] = [];
      
      if (eventId) {
        data = await getEventMemories(eventId);
      } else if (userId) {
        data = await getUserMemories(userId);
      }

      // Filter by type
      if (filter !== 'all') {
        data = data.filter((m: any) => m.memory_type === filter);
      }

      setMemories(data);
    } catch (error) {
      logger.error('Error loading memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (memory: EventMemory) => {
    if (!memory.id) return;

    try {
      if (memory.user_has_liked) {
        await unlikeEventMemory(memory.id, currentUserId);
      } else {
        await likeEventMemory(memory.id, currentUserId);
      }
      await loadMemories();
    } catch (error) {
      logger.error('Error toggling like:', error);
    }
  };

  const handleDelete = async (memory: EventMemory) => {
    if (!memory.id) return;
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      await deleteEventMemory(memory.id, memory.media_url);
      await loadMemories();
      if (onMemoryDeleted) {
        onMemoryDeleted();
      }
    } catch (error) {
      logger.error('Error deleting memory:', error);
      alert('Failed to delete memory. Please try again.');
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Eye className="w-4 h-4" />;
      case 'followers':
        return <Users className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getMemoryTypeIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'review':
        return <FileText className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-400 text-lg font-semibold mb-2">No Memories Yet</p>
        <p className="text-slate-500 text-sm">
          {eventId
            ? 'Be the first to share photos or reviews from this event!'
            : 'Your event memories will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'photo', 'video', 'review'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            aria-label="List view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.map((memory) => (
            <div key={memory.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group">
              {/* Media Preview */}
              {memory.memory_type === 'photo' && memory.media_url && (
                <div className="aspect-square overflow-hidden bg-slate-800">
                  <img
                    src={memory.media_url}
                    alt="Event memory"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              {memory.memory_type === 'video' && memory.media_url && (
                <div className="aspect-video overflow-hidden bg-slate-800">
                  <video
                    src={memory.media_url}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {memory.memory_type === 'review' && (
                <div className="aspect-square bg-gradient-to-br from-indigo-900/30 to-purple-900/30 flex items-center justify-center p-8">
                  <FileText className="w-16 h-16 text-indigo-400 opacity-50" />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={memory.user_avatar || '/default-avatar.png'}
                    alt={memory.username}
                    className="w-8 h-8 rounded-full border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{memory.username}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(memory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    {getVisibilityIcon(memory.visibility)}
                    {getMemoryTypeIcon(memory.memory_type)}
                  </div>
                </div>

                {/* Event Info (for user memories) */}
                {showEventInfo && memory.event_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 p-2 rounded-lg">
                    <Calendar className="w-4 h-4" />
                    <span className="truncate">{memory.event_name}</span>
                  </div>
                )}

                {/* Rating */}
                {memory.rating && memory.rating > 0 && (
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < memory.rating!
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Review Text */}
                {memory.review_text && (
                  <p className="text-sm text-slate-300 line-clamp-3">{memory.review_text}</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleLike(memory)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                      memory.user_has_liked
                        ? 'text-red-400 bg-red-500/10'
                        : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${memory.user_has_liked ? 'fill-current' : ''}`}
                    />
                    <span className="text-sm font-semibold">{memory.likes_count}</span>
                  </button>

                  {memory.user_id === currentUserId && (
                    <button
                      onClick={() => handleDelete(memory)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div key={memory.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex gap-6">
              {/* Thumbnail */}
              {memory.media_url && (
                <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                  {memory.memory_type === 'photo' ? (
                    <img
                      src={memory.media_url}
                      alt="Event memory"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={memory.media_url}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={memory.user_avatar || '/default-avatar.png'}
                      alt={memory.username}
                      className="w-10 h-10 rounded-full border border-slate-700"
                    />
                    <div>
                      <p className="font-bold">{memory.username}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          {getVisibilityIcon(memory.visibility)}
                          {memory.visibility}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(memory)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                        memory.user_has_liked
                          ? 'text-red-400 bg-red-500/10'
                          : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${memory.user_has_liked ? 'fill-current' : ''}`}
                      />
                      <span className="text-sm font-semibold">{memory.likes_count}</span>
                    </button>

                    {memory.user_id === currentUserId && (
                      <button
                        onClick={() => handleDelete(memory)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Event Info */}
                {showEventInfo && memory.event_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{memory.event_name}</span>
                  </div>
                )}

                {/* Rating */}
                {memory.rating && memory.rating > 0 && (
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < memory.rating!
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Review Text */}
                {memory.review_text && (
                  <p className="text-slate-300">{memory.review_text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventMemoriesGallery;
