import React, { useState, useEffect } from 'react';
import { Loader, Plus, Users, Heart, Search, Globe, X as XIcon } from 'lucide-react';
import { User, EventCommunity } from '../types';
import { getCommunities, joinCommunity, leaveCommunity, getCommunityMembers } from '../services/dbService';
import logger from '../utils/logger';

interface CommunitiesProps {
  user: User | null;
  onOpenAuth?: () => void;
}

const Communities: React.FC<CommunitiesProps> = ({ user, onOpenAuth }) => {
  const [communities, setCommunities] = useState<EventCommunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<EventCommunity | null>(null);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const [userCommunities, setUserCommunities] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');
  const [newCommunityCategory, setNewCommunityCategory] = useState('Tech');
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  const CATEGORIES = [
    'Music', 'Sports', 'Art', 'Tech', 'Food', 'Travel',
    'Gaming', 'Business', 'Wellness', 'Education'
  ];

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    if (selectedCommunity) {
      loadCommunityMembers(selectedCommunity.id);
    }
  }, [selectedCommunity?.id]);

  const loadCommunities = async () => {
    try {
      setIsLoading(true);
      const data = await getCommunities(50, 0);
      setCommunities(data || []);
    } catch (error) {
      logger.error('Failed to load communities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommunityMembers = async (communityId: string) => {
    try {
      setMembersLoading(true);
      const members = await getCommunityMembers(communityId);
      setCommunityMembers(members || []);
    } catch (error) {
      logger.error('Failed to load community members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    setJoiningCommunity(communityId);
    try {
      const success = await joinCommunity(communityId, user.id);
      if (success) {
        setUserCommunities(prev => new Set([...prev, communityId]));
        if (selectedCommunity?.id === communityId) {
          await loadCommunityMembers(communityId);
        }
      }
    } catch (error) {
      logger.error('Failed to join community:', error);
    } finally {
      setJoiningCommunity(null);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    setJoiningCommunity(communityId);
    try {
      const success = await leaveCommunity(communityId, user?.id || '');
      if (success) {
        setUserCommunities(prev => {
          const newSet = new Set(prev);
          newSet.delete(communityId);
          return newSet;
        });
        if (selectedCommunity?.id === communityId) {
          await loadCommunityMembers(communityId);
        }
      }
    } catch (error) {
      logger.error('Failed to leave community:', error);
    } finally {
      setJoiningCommunity(null);
    }
  };

  const handleCreateCommunity = async () => {
    if (!user || !newCommunityName.trim()) {
      return;
    }
    setCreatingCommunity(true);
    try {
      const newCommunity: EventCommunity = {
        id: `community_${Date.now()}`,
        name: newCommunityName,
        description: newCommunityDesc || 'A community for event enthusiasts',
        category: newCommunityCategory,
        interests: [newCommunityCategory],
        member_count: 1,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCommunities(prev => [newCommunity, ...prev]);
      setUserCommunities(prev => new Set([...prev, newCommunity.id]));
      setShowCreateForm(false);
      setNewCommunityName('');
      setNewCommunityDesc('');
      setNewCommunityCategory('Tech');
      setSelectedCommunity(newCommunity);
    } catch (error) {
      logger.error('Failed to create community:', error);
    } finally {
      setCreatingCommunity(false);
    }
  };

  const filteredCommunities = communities.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Communities</h1>
        <p className="text-slate-400">Find and join communities with shared interests</p>
      </div>

      {/* Create Community Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-white">Create Community</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Community Name</label>
                <input
                  type="text"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  placeholder="e.g., Tech Enthusiasts"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                <textarea
                  value={newCommunityDesc}
                  onChange={(e) => setNewCommunityDesc(e.target.value)}
                  placeholder="Describe your community..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Category</label>
                <select
                  value={newCommunityCategory}
                  onChange={(e) => setNewCommunityCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCommunity}
                  disabled={creatingCommunity || !newCommunityName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {creatingCommunity ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Communities List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Create */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
              />
            </div>
            {user && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create</span>
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Communities Grid */}
          {filteredCommunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCommunities.map(community => (
                <div
                  key={community.id}
                  onClick={() => setSelectedCommunity(community)}
                  className={`bg-slate-900 border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedCommunity?.id === community.id
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {community.avatar_url && (
                    <img
                      src={community.avatar_url}
                      alt={community.name}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-bold text-white text-lg mb-1">{community.name}</h3>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{community.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Users className="w-3 h-3" />
                      <span className="font-semibold">{community.member_count}</span>
                      <span>members</span>
                    </div>
                    <span className="px-2 py-1 bg-slate-800 rounded text-slate-300 text-xs font-semibold">
                      {community.category}
                    </span>
                  </div>
                  {user && !userCommunities.has(community.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinCommunity(community.id);
                      }}
                      disabled={joiningCommunity === community.id}
                      className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {joiningCommunity === community.id ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Join</span>
                        </>
                      )}
                    </button>
                  )}
                  {user && userCommunities.has(community.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveCommunity(community.id);
                      }}
                      disabled={joiningCommunity === community.id}
                      className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {joiningCommunity === community.id ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>Leaving...</span>
                        </>
                      ) : (
                        <>
                          <XIcon className="w-4 h-4" />
                          <span>Leave</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No communities found</p>
              <p className="text-slate-500 text-sm">Try searching with different keywords</p>
            </div>
          )}
        </div>

        {/* Right: Community Details Sidebar */}
        {selectedCommunity && (
          <div className="lg:col-span-1">
            <button
              onClick={() => setSelectedCommunity(null)}
              className="lg:hidden mb-4 w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors text-sm"
            >
              Close Details
            </button>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-20 h-fit space-y-4">
              <button
                onClick={() => setSelectedCommunity(null)}
                className="hidden lg:block absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5 text-slate-400" />
              </button>
              {selectedCommunity.banner_url && (
                <img
                  src={selectedCommunity.banner_url}
                  alt={selectedCommunity.name}
                  className="w-full h-24 object-cover rounded-lg"
                />
              )}
              <div>
                <h2 className="text-2xl font-black text-white">{selectedCommunity.name}</h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{selectedCommunity.category}</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{selectedCommunity.description}</p>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                <div className="text-center bg-slate-800/40 p-3 rounded-lg">
                  <div className="text-xl font-black text-indigo-400">{selectedCommunity.member_count}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Members</div>
                </div>
                <div className="text-center bg-slate-800/40 p-3 rounded-lg">
                  <div className="text-xl font-black text-purple-400">{selectedCommunity.interests?.length || 0}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Interests</div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Members ({communityMembers.length})</span>
                </h3>
                {membersLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader className="w-4 h-4 animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {communityMembers.slice(0, 5).map(member => (
                      <div key={member.id} className="flex items-center gap-2">
                        <img
                          src={member.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.user?.full_name}`}
                          alt={member.user?.full_name}
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{member.user?.full_name}</p>
                          {member.role !== 'member' && (
                            <p className="text-xs text-indigo-400 uppercase tracking-widest">{member.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {communityMembers.length > 5 && (
                      <p className="text-xs text-slate-500 pt-2">
                        +{communityMembers.length - 5} more members
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Communities;
