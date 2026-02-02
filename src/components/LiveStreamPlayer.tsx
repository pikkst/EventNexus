import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings, 
  Users, 
  Eye,
  MessageSquare,
  BarChart3,
  Radio,
  AlertCircle,
  Loader2,
  Lock,
  ShoppingCart
} from 'lucide-react';
import { EventNexusEvent, LiveStreamAnalytics, StreamingPlatform } from '@/types';
import { 
  checkOnlineEventAccess, 
  joinOnlineEvent, 
  leaveOnlineEvent,
  getCurrentViewers 
} from '@/services/onlineEventAccessService';

interface LiveStreamPlayerProps {
  event: EventNexusEvent;
  onViewerJoin?: (sessionToken: string) => void;
  onViewerLeave?: (sessionToken: string) => void;
  showChat?: boolean;
  showAnalytics?: boolean;
  autoplay?: boolean;
  onPurchaseClick?: () => void; // Callback to show ticket purchase modal
}

/**
 * Live Stream Player Component
 * 
 * Supports multiple streaming platforms:
 * - YouTube Live (embedded player)
 * - Vimeo Live (embedded player)
 * - Twitch (embedded player)
 * - Zoom (meeting link)
 * - Custom RTMP/HLS streams (video.js)
 * 
 * Features:
 * - Real-time viewer count
 * - Live chat integration
 * - Analytics tracking
 * - Quality selection
 * - Fullscreen support
 * - Access control (ticket validation)
 */
export default function LiveStreamPlayer({
  event,
  onViewerJoin,
  onViewerLeave,
  showChat = true,
  showAnalytics = true,
  autoplay = false,
  onPurchaseClick
}: LiveStreamPlayerProps) {
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentViewers, setCurrentViewers] = useState(0);
  const [analytics, setAnalytics] = useState<LiveStreamAnalytics | null>(null);
  const [sessionToken] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef<number>(Date.now());

  // Check access on mount
  useEffect(() => {
    const verifyAccess = async () => {
      setIsCheckingAccess(true);
      try {
        const accessResponse = await checkOnlineEventAccess(event.id, false);
        setHasAccess(accessResponse.hasAccess && accessResponse.canJoin);
        setAccessMessage(accessResponse.message);
        
        if (accessResponse.currentViewers !== undefined) {
          setCurrentViewers(accessResponse.currentViewers);
        }
      } catch (error) {
        console.error('Access check failed:', error);
        setHasAccess(false);
        setAccessMessage('Failed to verify access');
      } finally {
        setIsCheckingAccess(false);
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [event.id]);

  // Check if stream is currently live
  useEffect(() => {
    const checkStreamStatus = () => {
      if (!event.stream_starts_at) {
        setIsLive(true); // No start time means always live
        return;
      }

      const now = new Date();
      const streamStart = new Date(event.stream_starts_at);
      const streamEnd = event.stream_ends_at ? new Date(event.stream_ends_at) : null;

      const live = now >= streamStart && (!streamEnd || now <= streamEnd);
      setIsLive(live);
    };

    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [event.stream_starts_at, event.stream_ends_at]);

  // Join stream when user has access and stream is live
  useEffect(() => {
    if (!hasAccess || !isLive) return;

    const joinStream = async () => {
      try {
        const joinResponse = await joinOnlineEvent(event.id);
        console.log('Joined stream:', joinResponse);
        onViewerJoin?.(sessionToken);
      } catch (error) {
        console.error('Failed to join stream:', error);
      }
    };

    joinStream();

    // Cleanup on unmount
    return () => {
      const watchDuration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
      console.log(`Viewer session ended. Duration: ${watchDuration}s`);
      leaveOnlineEvent(event.id);
      onViewerLeave?.(sessionToken);
    };
  }, [hasAccess, isLive, event.id, sessionToken, onViewerJoin, onViewerLeave]);

  // Fetch live analytics
  useEffect(() => {
    if (!showAnalytics || !isLive || !hasAccess) return;

    const fetchAnalytics = async () => {
      try {
        const viewers = await getCurrentViewers(event.id);
        setCurrentViewers(viewers);
      } catch (error) {
        console.error('Failed to fetch stream analytics:', error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [event.id, isLive, hasAccess, showAnalytics]);

  // Generate embed code based on platform
  const generateEmbedCode = (): string | null => {
    if (!event.streaming_url) return null;

    // Use custom embed code if provided
    if (event.streaming_embed_code) {
      return event.streaming_embed_code;
    }

    const url = event.streaming_url;
    const platform = event.streaming_platform || detectPlatform(url);

    switch (platform) {
      case 'youtube': {
        // Extract video ID from YouTube URL
        const videoId = extractYouTubeId(url);
        if (!videoId) return null;
        return `<iframe 
          width="100%" 
          height="100%" 
          src="https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&modestbranding=1&rel=0" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
      }

      case 'vimeo': {
        // Extract video ID from Vimeo URL
        const videoId = extractVimeoId(url);
        if (!videoId) return null;
        return `<iframe 
          src="https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? 1 : 0}&title=0&byline=0&portrait=0" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allow="autoplay; fullscreen; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
      }

      case 'twitch': {
        // Extract channel name from Twitch URL
        const channel = extractTwitchChannel(url);
        if (!channel) return null;
        return `<iframe 
          src="https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=${autoplay}" 
          height="100%" 
          width="100%" 
          frameborder="0" 
          scrolling="no" 
          allowfullscreen
        ></iframe>`;
      }

      case 'zoom': {
        // Zoom doesn't support embedding, show join button
        return null;
      }

      case 'custom': {
        // For custom RTMP/HLS streams, use video.js or native HTML5 video
        return `<video 
          id="live-stream-player" 
          class="video-js vjs-default-skin" 
          controls 
          ${autoplay ? 'autoplay' : ''} 
          width="100%" 
          height="100%"
        >
          <source src="${url}" type="application/x-mpegURL">
          Your browser does not support the video tag.
        </video>`;
      }

      default:
        return null;
    }
  };

  const embedCode = generateEmbedCode();

  // Checking access...
  if (isCheckingAccess) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 text-center">
        <Loader2 className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-spin" />
        <h3 className="text-xl font-bold text-white mb-2">Verifying Access</h3>
        <p className="text-slate-400">Please wait...</p>
      </div>
    );
  }

  // Access denied - no ticket
  if (!hasAccess) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 text-center">
        <Lock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Ticket Required</h3>
        <p className="text-slate-400 mb-6">{accessMessage}</p>
        {onPurchaseClick && (
          <button
            onClick={onPurchaseClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Purchase Ticket
          </button>
        )}
      </div>
    );
  }

  // Stream not configured
  if (!event.streaming_url && !event.streaming_embed_code) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 text-center">
        <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Stream Not Configured</h3>
        <p className="text-slate-400">
          The organizer has not set up the live stream yet.
        </p>
      </div>
    );
  }

  // Stream scheduled but not live yet
  if (!isLive && event.stream_starts_at) {
    const timeUntilStart = new Date(event.stream_starts_at).getTime() - Date.now();
    const hoursUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60));
    const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

    return (
      <div className="bg-slate-900 rounded-xl p-8 text-center">
        <Radio className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-white mb-2">Stream Starts Soon</h3>
        <p className="text-slate-400 mb-4">
          Live in {hoursUntilStart > 0 && `${hoursUntilStart}h `}{minutesUntilStart}m
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-300">
          <Eye className="w-4 h-4" />
          <span>Waiting room: {currentViewers} viewers</span>
        </div>
      </div>
    );
  }

  // Zoom meeting - show join button
  if (event.streaming_platform === 'zoom') {
    return (
      <div className="bg-slate-900 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 9.13v5.74c0 1.06.86 1.92 1.92 1.92h7.15l7.01 4.27c.46.28 1.05-.08 1.05-.64V3.58c0-.56-.59-.92-1.05-.64L10.07 7.2H3.92C2.86 7.2 2 8.06 2 9.13z"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Join Zoom Meeting</h3>
        <p className="text-slate-400 mb-6">
          Click below to join the live video conference
        </p>
        <a
          href={event.streaming_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
        >
          <Play className="w-5 h-5" />
          Join Meeting
        </a>
        {showAnalytics && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-slate-300">
            <Users className="w-4 h-4" />
            <span>{currentViewers} participants</span>
          </div>
        )}
      </div>
    );
  }

  // Main streaming player
  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-xl overflow-hidden" ref={playerRef}>
        {/* Live Indicator */}
        {isLive && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg text-white font-semibold text-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}

        {/* Viewer Count */}
        {showAnalytics && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm">
            <Eye className="w-4 h-4" />
            <span>{currentViewers.toLocaleString()}</span>
          </div>
        )}

        {/* Embed Player */}
        {embedCode ? (
          <div 
            className="aspect-video w-full"
            dangerouslySetInnerHTML={{ __html: embedCode }}
          />
        ) : (
          <div className="aspect-video w-full flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Stream Info Bar */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Eye className="w-4 h-4" />
              Peak Viewers
            </div>
            <div className="text-2xl font-bold text-white">
              {analytics.peak_concurrent_viewers.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Users className="w-4 h-4" />
              Total Viewers
            </div>
            <div className="text-2xl font-bold text-white">
              {analytics.total_unique_viewers.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <MessageSquare className="w-4 h-4" />
              Chat Messages
            </div>
            <div className="text-2xl font-bold text-white">
              {analytics.chat_messages_count.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              Avg Watch Time
            </div>
            <div className="text-2xl font-bold text-white">
              {Math.floor(analytics.average_watch_time_seconds / 60)}m
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectPlatform(url: string): StreamingPlatform {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('twitch.tv')) return 'twitch';
  if (url.includes('zoom.us')) return 'zoom';
  return 'custom';
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([^&\n?#]+)$/ // Just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function extractTwitchChannel(url: string): string | null {
  const match = url.match(/twitch\.tv\/([^\/\s]+)/);
  return match ? match[1] : null;
}
