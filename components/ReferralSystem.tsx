import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Gift, Share2, Mail, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';
import { User } from '../types';
import { getUserReferralStats, generateReferralCode } from '../services/dbService';

interface ReferralSystemProps {
  user: User;
}

interface ReferralStats {
  code: string;
  totalReferrals: number;
  creditsEarned: number;
  pendingReferrals: number;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ user }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralStats();
  }, [user.id]);

  const loadReferralStats = async () => {
    try {
      const data = await getUserReferralStats(user.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const referralUrl = stats ? `${window.location.origin}/beta?ref=${stats.code}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareVia = (platform: string) => {
    const text = encodeURIComponent(`Join me on EventNexus! Discover amazing events near you. We both get 50 bonus credits 🎉`);
    const url = encodeURIComponent(referralUrl);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=Join me on EventNexus&body=${text}%0A%0A${referralUrl}`
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded-xl w-1/3" />
          <div className="h-4 bg-slate-800 rounded-lg w-2/3" />
          <div className="h-20 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-3xl font-black tracking-tight text-white mb-2">Invite Friends</h3>
          <p className="text-slate-400 font-medium">Share EventNexus and earn rewards together</p>
        </div>
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <Gift className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
          <Users className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-white">{stats?.totalReferrals || 0}</div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Referrals</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
          <Sparkles className="w-6 h-6 text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-white">{stats?.creditsEarned || 0}</div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Credits Earned</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
          <Gift className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-white">{stats?.pendingReferrals || 0}</div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Pending</div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-6 space-y-3">
        <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest">How it Works</h4>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-black text-white">1</span>
            </div>
            <p>Share your unique referral link with friends</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-black text-white">2</span>
            </div>
            <p>They sign up and get <span className="text-orange-400 font-bold">50 bonus credits</span></p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-black text-white">3</span>
            </div>
            <p>You receive <span className="text-orange-400 font-bold">50 bonus credits</span> too!</p>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Referral Link</label>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-300 font-mono truncate">
            {referralUrl}
          </div>
          <button
            onClick={handleCopy}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Share Via</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => shareVia('twitter')}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Twitter
          </button>
          <button
            onClick={() => shareVia('facebook')}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Facebook
          </button>
          <button
            onClick={() => shareVia('whatsapp')}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={() => shareVia('email')}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;
