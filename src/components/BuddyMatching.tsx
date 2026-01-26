import React, { useState, useEffect } from 'react';
import { Loader, Heart, MessageSquare, User as UserIcon, Check, X } from 'lucide-react';
import { User, BuddyMatch } from '../types';
import { getBuddyMatches, sendBuddyRequest, getUserBuddies } from '../services/dbService';
import logger from '../utils/logger';

interface BuddyMatchingProps {
  user: User;
  onUpdate?: () => void;
}

/**
 * BuddyMatching Component - Suggests and manages friend connections
 * Phase 2 Social Feature - Buddy Matching System
 * Shows users with shared interests and helps build a friend network
 */
const BuddyMatching: React.FC<BuddyMatchingProps> = ({ user, onUpdate }) => {
  // State management
  const [matches, setMatches] = useState<BuddyMatch[]>([]);
  const [buddies, setBuddies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'friends'>('discover');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [dismissedMatches, setDismissedMatches] = useState<Set<string>>(new Set());

  // Load buddy matches on mount
  useEffect(() => {
    loadMatches();
  }, [user.id]);

  // Load matches and buddies
  const loadMatches = async () => {
    try {
      setIsLoading(true);
      
      // Fetch buddy match suggestions
      const matchesData = await getBuddyMatches(user.id, 15);
      setMatches(matchesData || []);
      
      // Fetch existing buddies
      const buddiesData = await getUserBuddies(user.id);
      setBuddies(buddiesData || []);
    } catch (error) {
      logger.error('Failed to load buddy matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send buddy request
  const handleSendRequest = async (targetUserId: string) => {
    setSendingRequest(targetUserId);
    try {
      const success = await sendBuddyRequest(user.id, targetUserId);
      if (success) {
        // Remove from suggestions
        setMatches(prev => prev.filter(m => m.user_id !== targetUserId));
        onUpdate?.();
      }
    } catch (error) {
      logger.error('Failed to send buddy request:', error);
    } finally {
      setSendingRequest(null);
    }
  };

  // Dismiss a match suggestion
  const handleDismiss = (userId: string) => {
    setDismissedMatches(prev => new Set([...prev, userId]));
    setMatches(prev => prev.filter(m => m.user_id !== userId));
  };

  // Get visible matches (exclude dismissed)
  const visibleMatches = matches.filter(m => !dismissedMatches.has(m.user_id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading buddy matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-6 py-3 font-bold uppercase text-xs tracking-wider border-b-2 transition-colors ${
            activeTab === 'discover'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-400'
          }`}
        >
          💡 Discover Buddies
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-6 py-3 font-bold uppercase text-xs tracking-wider border-b-2 transition-colors ${
            activeTab === 'friends'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-400'
          }`}
        >
          👥 My Friends ({buddies.length})
        </button>
      </div>

      {/* Discover Buddies Tab */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          {visibleMatches.length > 0 ? (
            visibleMatches.map(match => (
              <div
                key={match.user_id}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/30 transition-all flex items-start gap-4"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <img
                    src={match.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${match.name}`}
                    alt={match.name}
                    className="w-14 h-14 rounded-lg object-cover border-2 border-indigo-500/30"
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg">{match.name}</h3>
                  
                  {/* Similarity Score */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        style={{ width: `${Math.round(match.similarity_score * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-indigo-400">
                      {Math.round(match.similarity_score * 100)}% Match
                    </span>
                  </div>

                  {/* Common Interests */}
                  {match.common_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {match.common_categories.slice(0, 3).map((category, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30"
                        >
                          {category}
                        </span>
                      ))}
                      {match.common_categories.length > 3 && (
                        <span className="px-2 py-0.5 text-slate-400 text-xs">
                          +{match.common_categories.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <p className="text-xs text-slate-400">
                    Attending <span className="font-bold text-indigo-400">{match.common_event_count}</span> shared events
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSendRequest(match.user_id)}
                    disabled={sendingRequest === match.user_id}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    {sendingRequest === match.user_id ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDismiss(match.user_id)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <UserIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-2">
                {matches.length === 0
                  ? 'No buddy matches found yet'
                  : 'You dismissed all suggestions'}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                More matches will appear as you engage with events
              </p>
              {dismissedMatches.size > 0 && (
                <button
                  onClick={() => setDismissedMatches(new Set())}
                  className="px-4 py-2 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors"
                >
                  Reset Suggestions
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {buddies.length > 0 ? (
            buddies.map(buddy => {
              const friend = buddy.user_id_1 === user.id ? buddy.user2 : buddy.user1;
              return (
                <div
                  key={buddy.id}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/30 transition-all flex items-start gap-4"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <img
                      src={friend?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${friend?.name || 'User'}`}
                      alt={friend?.name}
                      className="w-14 h-14 rounded-lg object-cover border-2 border-emerald-500/30"
                    />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg">{friend?.name || 'User'}</h3>
                    
                    {buddy.common_interests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {buddy.common_interests.slice(0, 3).map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-400">
                      Connected <span className="font-semibold text-emerald-400">
                        {new Date(buddy.created_at).toLocaleDateString()}
                      </span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm rounded-lg transition-colors flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-2">No friends yet</p>
              <p className="text-slate-500 text-sm">
                Connect with people who share your interests
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuddyMatching;
