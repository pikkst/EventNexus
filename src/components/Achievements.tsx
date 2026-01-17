import React, { useEffect, useState } from 'react';
import { Crown, Trophy, Medal, Flame, RefreshCw, Loader } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import { User, Achievement, UserAchievement, UserStats, LeaderboardEntry } from '../types';
import { getAchievements, getUserAchievements, getUserStats, refreshUserStats, getMonthlyLeaderboard } from '../services/dbService';

interface AchievementsProps {
  user: User | null;
  onOpenAuth?: () => void;
}

const tierIcon = (tier: number) => {
  switch (tier) {
    case 1: return <Medal className="w-5 h-5 text-yellow-400" />;
    case 2: return <Trophy className="w-5 h-5 text-indigo-400" />;
    case 3: return <Crown className="w-5 h-5 text-purple-400" />;
    default: return <Medal className="w-5 h-5 text-slate-400" />;
  }
};

const Achievements: React.FC<AchievementsProps> = ({ user, onOpenAuth }) => {
  const [catalog, setCatalog] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ach, lb] = await Promise.all([
        getAchievements(),
        getMonthlyLeaderboard()
      ]);
      setCatalog(ach || []);
      setLeaderboard(lb || []);
      if (user?.id) {
        const [ua, us] = await Promise.all([
          getUserAchievements(user.id),
          getUserStats(user.id)
        ]);
        setEarned(ua || []);
        setStats(us || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const handleSync = async () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    setSyncing(true);
    const ok = await refreshUserStats();
    if (ok) {
      await loadData();
    }
    setSyncing(false);
  };

  const earnedSet = new Set(earned.map(e => e.achievement_id));

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: 'Events', path: '/events' }, { label: 'Achievements' }]} />
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">Achievements</h1>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400 mb-4">Sign in to see your progress and unlock badges.</p>
            <button onClick={onOpenAuth} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Events', path: '/events' }, { label: 'Achievements' }]} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl sm:text-4xl font-black text-white">Achievements</h1>
          <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2">
            {syncing ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync Stats
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Level</div>
            <div className="text-3xl font-black text-indigo-400">{stats?.level ?? 1}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">XP</div>
            <div className="text-3xl font-black text-purple-400">{stats?.xp ?? 0}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Streak</div>
            <div className="text-3xl font-black text-orange-400 flex items-center justify-center gap-2"><Flame className="w-6 h-6" />{stats?.streak_days ?? 0}d</div>
          </div>
        </div>

        {/* Achievements grid */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-3">Your Badges</h2>
          {loading ? (
            <div className="flex justify-center py-6"><Loader className="w-5 h-5 animate-spin text-indigo-400" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {catalog.map(a => {
                const isEarned = earnedSet.has(a.id);
                return (
                  <div key={a.id} className={`bg-slate-900 border rounded-xl p-4 ${isEarned ? 'border-indigo-500' : 'border-slate-800'} transition-all`}>
                    <div className="flex items-center gap-2 mb-2">
                      {tierIcon(a.tier)}
                      <h3 className="font-bold text-white">{a.name}</h3>
                    </div>
                    <p className="text-slate-400 text-sm">{a.description}</p>
                    <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                      <span>+{a.points} XP</span>
                      {!isEarned && <span className="px-2 py-1 bg-slate-800 rounded-md">Locked</span>}
                      {isEarned && <span className="px-2 py-1 bg-indigo-600/20 text-indigo-300 rounded-md">Unlocked</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="text-xl font-bold mb-3">Monthly Leaderboard</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No leaderboard data yet.</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {leaderboard.map((e, idx) => (
                  <li key={`${e.user_id}-${idx}`} className="flex items-center gap-3 p-3">
                    <span className="w-8 text-slate-500">#{idx + 1}</span>
                    <img src={e.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${e.user?.name || e.user_id}`}
                         alt={e.user?.name || 'User'} className="w-8 h-8 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{e.user?.name || e.user_id.slice(0, 8)}</p>
                    </div>
                    <div className="text-indigo-400 font-bold">{e.points} XP</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
