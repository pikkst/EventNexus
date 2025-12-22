import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Target, Play, Pause, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  getOptimalPostingHours,
  getOptimalPostingDays,
  getPlatformOptimalTimes,
  getUpcomingPosts,
  scheduleCampaignAuto,
  scheduleCampaignManual,
  cancelScheduledPost,
  reschedulePost,
  getSchedulingRecommendations,
  getDayName,
  formatHour,
  getPlatformIcon,
  OptimalTime,
  OptimalDay,
  PlatformOptimalTime,
  ScheduledPost
} from '../services/campaignSchedulingService';

interface Props {
  campaignId?: string;
  onScheduled?: (scheduleId: string) => void;
}

const CampaignScheduler: React.FC<Props> = ({ campaignId, onScheduled }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'insights' | 'upcoming'>('schedule');
  
  // Schedule State
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [scheduleType, setScheduleType] = useState<'auto' | 'manual'>('auto');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [timezone, setTimezone] = useState('Europe/Tallinn');
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Insights State
  const [platformOptimalTimes, setPlatformOptimalTimes] = useState<PlatformOptimalTime[]>([]);
  const [optimalHours, setOptimalHours] = useState<OptimalTime[]>([]);
  const [optimalDays, setOptimalDays] = useState<OptimalDay[]>([]);
  const [selectedInsightPlatform, setSelectedInsightPlatform] = useState('facebook');
  
  // Upcoming Posts State
  const [upcomingPosts, setUpcomingPosts] = useState<ScheduledPost[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);

  useEffect(() => {
    loadInsights();
    loadUpcoming();
    
    // Auto-refresh upcoming posts every 30 seconds
    const interval = setInterval(loadUpcoming, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'insights' && selectedInsightPlatform) {
      loadPlatformInsights(selectedInsightPlatform);
    }
  }, [activeTab, selectedInsightPlatform]);

  const loadInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const times = await getPlatformOptimalTimes();
      setPlatformOptimalTimes(times);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const loadPlatformInsights = async (platform: string) => {
    try {
      const [hours, days] = await Promise.all([
        getOptimalPostingHours(platform, 30),
        getOptimalPostingDays(platform, 90)
      ]);
      setOptimalHours(hours);
      setOptimalDays(days);
    } catch (error) {
      console.error('Error loading platform insights:', error);
    }
  };

  const loadUpcoming = async () => {
    setIsLoadingUpcoming(true);
    try {
      const posts = await getUpcomingPosts();
      setUpcomingPosts(posts);
    } catch (error) {
      console.error('Error loading upcoming posts:', error);
    } finally {
      setIsLoadingUpcoming(false);
    }
  };

  const handleSchedule = async () => {
    if (!campaignId) {
      alert('⚠️ No campaign selected');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('⚠️ Please select at least one platform');
      return;
    }

    setIsScheduling(true);
    try {
      let scheduleId: string | null = null;

      if (scheduleType === 'auto') {
        // Auto-schedule at optimal time
        scheduleId = await scheduleCampaignAuto(
          campaignId,
          selectedPlatforms,
          timezone
        );
      } else {
        // Manual schedule
        if (!manualDate || !manualTime) {
          alert('⚠️ Please select date and time');
          return;
        }
        
        const scheduledFor = new Date(`${manualDate}T${manualTime}`);
        const result = await scheduleCampaignManual(
          campaignId,
          scheduledFor,
          selectedPlatforms,
          timezone
        );
        scheduleId = result?.id || null;
      }

      if (scheduleId) {
        alert('✅ Campaign scheduled successfully!');
        loadUpcoming();
        if (onScheduled) onScheduled(scheduleId);
      } else {
        alert('❌ Failed to schedule campaign');
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelPost = async (scheduleId: string) => {
    if (!confirm('Cancel this scheduled post?')) return;

    const success = await cancelScheduledPost(scheduleId);
    if (success) {
      alert('✅ Post cancelled');
      loadUpcoming();
    } else {
      alert('❌ Failed to cancel post');
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-500/10 text-blue-400',
      posting: 'bg-yellow-500/10 text-yellow-400',
      posted: 'bg-emerald-500/10 text-emerald-400',
      failed: 'bg-red-500/10 text-red-400',
      cancelled: 'bg-slate-500/10 text-slate-400'
    };
    return styles[status] || styles.scheduled;
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'schedule'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          Schedule
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'insights'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Insights
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'upcoming'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock size={16} className="inline mr-2" />
          Upcoming ({upcomingPosts.length})
        </button>
      </div>

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Schedule Type */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-lg font-black text-white mb-4">Scheduling Mode</h4>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setScheduleType('auto')}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  scheduleType === 'auto'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <Target size={24} className={scheduleType === 'auto' ? 'text-orange-500' : 'text-slate-400'} />
                <p className="font-bold text-white mt-2">AI Optimal</p>
                <p className="text-xs text-slate-400">Best time based on analytics</p>
              </button>
              <button
                onClick={() => setScheduleType('manual')}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  scheduleType === 'manual'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <Calendar size={24} className={scheduleType === 'manual' ? 'text-orange-500' : 'text-slate-400'} />
                <p className="font-bold text-white mt-2">Manual</p>
                <p className="text-xs text-slate-400">Choose specific date/time</p>
              </button>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-lg font-black text-white mb-4">Platforms</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['facebook', 'instagram', 'twitter', 'linkedin'].map(platform => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedPlatforms.includes(platform)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl">{getPlatformIcon(platform)}</span>
                  <p className="text-sm font-bold text-white mt-1 capitalize">{platform}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Date/Time */}
          {scheduleType === 'manual' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h4 className="text-lg font-black text-white mb-4">Date & Time</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Time</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timezone */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-lg font-black text-white mb-4">Timezone</h4>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            >
              <option value="Europe/Tallinn">Europe/Tallinn (EET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Schedule Button */}
          <button
            onClick={handleSchedule}
            disabled={isScheduling || !campaignId}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-600/20"
          >
            {isScheduling ? (
              <><Loader2 size={20} className="animate-spin" /> Scheduling...</>
            ) : (
              <><Play size={20} /> Schedule Campaign</>
            )}
          </button>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Platform Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['facebook', 'instagram', 'twitter', 'linkedin'].map(platform => (
              <button
                key={platform}
                onClick={() => setSelectedInsightPlatform(platform)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  selectedInsightPlatform === platform
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {getPlatformIcon(platform)} {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>

          {/* Optimal Times Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformOptimalTimes.map(pt => (
              <div key={pt.platform} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{getPlatformIcon(pt.platform)}</span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${
                    pt.confidence_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                    pt.confidence_score >= 50 ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {pt.confidence_score.toFixed(0)}% Confidence
                  </span>
                </div>
                <h5 className="font-bold text-white capitalize mb-2">{pt.platform}</h5>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-400">
                    <Clock size={14} className="inline mr-1" />
                    Best time: <span className="text-white font-bold">{pt.optimal_hour !== null ? formatHour(pt.optimal_hour) : 'N/A'}</span>
                  </p>
                  <p className="text-slate-400">
                    <Calendar size={14} className="inline mr-1" />
                    Best day: <span className="text-white font-bold">{pt.optimal_day !== null ? getDayName(pt.optimal_day) : 'N/A'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Hours */}
          {optimalHours.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h4 className="text-lg font-black text-white mb-4">Best Posting Hours</h4>
              <div className="space-y-2">
                {optimalHours.slice(0, 5).map((hour, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-orange-500">#{idx + 1}</span>
                      <div>
                        <p className="font-bold text-white">{formatHour(hour.hour_of_day)}</p>
                        <p className="text-xs text-slate-400">{hour.campaign_count} campaigns</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{hour.avg_ctr.toFixed(2)}% CTR</p>
                      <p className="text-xs text-slate-400">{hour.total_clicks.toLocaleString()} clicks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Days */}
          {optimalDays.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h4 className="text-lg font-black text-white mb-4">Best Posting Days</h4>
              <div className="space-y-2">
                {optimalDays.slice(0, 5).map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-orange-500">#{idx + 1}</span>
                      <div>
                        <p className="font-bold text-white">{day.day_name.trim()}</p>
                        <p className="text-xs text-slate-400">{day.campaign_count} campaigns</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{day.avg_ctr.toFixed(2)}% CTR</p>
                      <p className="text-xs text-slate-400">{day.total_impressions.toLocaleString()} views</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Tab */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {isLoadingUpcoming ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin mx-auto text-slate-600" />
            </div>
          ) : upcomingPosts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
              <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No upcoming posts scheduled</p>
            </div>
          ) : (
            upcomingPosts.map(post => (
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-bold text-white mb-1">
                      {new Date(post.scheduled_for).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-slate-400">Campaign ID: {post.campaign_id.slice(0, 8)}</p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full uppercase ${getStatusBadge(post.status)}`}>
                    {post.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {post.platforms.map(platform => (
                    <span key={platform} className="text-lg">{getPlatformIcon(platform)}</span>
                  ))}
                </div>
                {post.status === 'scheduled' && (
                  <button
                    onClick={() => handleCancelPost(post.id)}
                    className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-sm font-bold transition-all"
                  >
                    <X size={14} className="inline mr-1" /> Cancel
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignScheduler;
