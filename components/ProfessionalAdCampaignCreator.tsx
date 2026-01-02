/**
 * Professional Ad Campaign Creator - Integrated for EventNexus
 * Creates professional 60s video ads for events or platform marketing
 * Gated by subscription tier (Pro+) or available to admin users
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, Share2, Play, Pause, Film, ExternalLink } from 'lucide-react';
import { User, EventNexusEvent } from '../types';
import { generateProfessionalAdCampaign, generateAdVoiceover } from '../services/geminiService';
import { deductUserCredits, checkUserCredits } from '../services/dbService';

enum Step {
  INPUT,
  ANALYZING,
  GENERATING_SCENE_1,
  EXTENDING_SCENE_2,
  EXTENDING_SCENE_3,
  EXTENDING_SCENE_4,
  GENERATING_AUDIO,
  COMPLETED,
  ERROR
}

interface AdCampaignData {
  websiteUrl: string;
  targetPlatform: string;
  aspectRatio: '16:9' | '9:16';
  analysis: {
    brandName: string;
    coreEssence: string;
    visualSignature: string;
    painPoints: string[];
    emotionalDriver: string;
    keyFeatures: string[];
    script: string;
    scenes: {
      hook: string;
      conflict: string;
      resolution: string;
      power: string;
      closing: string;
    };
    socialCopy: {
      headline: string;
      body: string;
      cta: string;
      hashtags: string[];
    };
  };
  videoUrl?: string;
  audioBase64?: string;
  sources?: { uri: string; title: string }[];
}

interface ProfessionalAdCampaignCreatorProps {
  user: User;
  event?: EventNexusEvent; // If provided, generates ad for this event
  isAdmin?: boolean; // Admin users can generate platform ads
  onClose?: () => void;
}

const CREDIT_COST = 200; // Professional video ads cost 200 credits

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'FB' },
  { id: 'instagram', name: 'Instagram', icon: 'IG' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'IN' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT' },
  { id: 'youtube', name: 'YouTube', icon: 'YT' },
];

export const ProfessionalAdCampaignCreator: React.FC<ProfessionalAdCampaignCreatorProps> = ({
  user,
  event,
  isAdmin = false,
  onClose
}) => {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [step, setStep] = useState<Step>(Step.INPUT);
  const [campaign, setCampaign] = useState<AdCampaignData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check tier access
  const hasAccess = isAdmin || 
    user.subscription_tier === 'pro' || 
    user.subscription_tier === 'premium' || 
    user.subscription_tier === 'enterprise';

  useEffect(() => {
    // Pre-fill URL based on context
    if (event) {
      // User mode: Generate ad for their selected event
      const eventUrl = `${window.location.origin}/event/${event.id}`;
      setUrl(eventUrl);
    } else if (isAdmin) {
      // Admin mode: Generate ad for platform (www.eventnexus.eu)
      setUrl('https://www.eventnexus.eu');
    }
  }, [event, isAdmin]);

  const startCampaignCreation = async () => {
    if (!url) return;
    
    // Check tier access
    if (!hasAccess) {
      alert('Professional Ad Campaign Creator requires Pro tier or higher. Please upgrade your subscription.');
      return;
    }

    // Check credits (admin users don't need credits)
    if (!isAdmin) {
      const hasCredits = await checkUserCredits(user.id, CREDIT_COST);
      if (!hasCredits) {
        alert(`Insufficient credits. Professional video ads require ${CREDIT_COST} credits.`);
        return;
      }
    }

    setError(null);
    
    try {
      setStep(Step.ANALYZING);
      
      const analysisData = await generateProfessionalAdCampaign(
        url,
        platform,
        aspectRatio,
        event?.name,
        event?.description,
        (currentStep) => {
          setStep(currentStep);
        }
      );
      
      setCampaign({
        websiteUrl: url,
        targetPlatform: platform,
        aspectRatio,
        analysis: analysisData.analysis,
        videoUrl: analysisData.videoUrl,
        audioBase64: analysisData.audioBase64,
        sources: analysisData.sources
      });

      // Deduct credits for non-admin users
      if (!isAdmin) {
        await deductUserCredits(user.id, CREDIT_COST);
      }

      setStep(Step.COMPLETED);
    } catch (err: any) {
      console.error('Campaign creation error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setStep(Step.ERROR);
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsAudioPlaying(true);
      } else {
        videoRef.current.pause();
        setIsAudioPlaying(false);
      }
    }
  };

  const handleDownload = () => {
    if (!campaign?.videoUrl) return;
    const a = document.createElement('a');
    a.href = campaign.videoUrl;
    const fileName = event 
      ? `${event.name.replace(/\s+/g, '_')}_Ad_60s.mp4`
      : `${campaign.analysis.brandName.replace(/\s+/g, '_')}_Ad_60s.mp4`;
    a.download = fileName;
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share && campaign) {
      try {
        await navigator.share({
          title: event ? `${event.name} - EventNexus` : `${campaign.analysis.brandName}`,
          text: campaign.analysis.socialCopy.headline,
          url: campaign.websiteUrl
        });
        setShareStatus('Shared!');
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const getStepLabel = () => {
    const labels = {
      [Step.INPUT]: 'Ready to Create',
      [Step.ANALYZING]: 'Decoding Brand Essence',
      [Step.GENERATING_SCENE_1]: '0-12s: The Cinematic Hook',
      [Step.EXTENDING_SCENE_2]: '12-25s: Visual Journey',
      [Step.EXTENDING_SCENE_3]: '25-40s: Insight & Impact',
      [Step.EXTENDING_SCENE_4]: '40-52s: Core Power',
      [Step.GENERATING_AUDIO]: '52-60s: Epic Finale & Audio',
      [Step.COMPLETED]: 'Campaign Complete',
      [Step.ERROR]: 'Error Occurred'
    };
    return labels[step];
  };

  const isProcessing = step !== Step.INPUT && step !== Step.COMPLETED && step !== Step.ERROR;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-black tracking-tight">
              Professional Ad Campaign Creator
            </h1>
          </div>
          <p className="text-gray-400">
            {event 
              ? `Create a professional 60s video ad for: ${event.name}`
              : isAdmin 
              ? 'Create platform marketing videos for www.eventnexus.eu'
              : 'Generate professional video ads for your events'
            }
          </p>
          {!hasAccess && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400">
                🔒 Professional Ad Campaign Creator requires Pro tier or higher
              </p>
            </div>
          )}
        </div>

        {/* Input Section */}
        {step === Step.INPUT && (
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-8 mb-6">
            <div className="space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {event ? 'Event URL (Auto-filled)' : isAdmin ? 'Platform URL (www.eventnexus.eu)' : 'Event or Website URL'}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.eventnexus.eu"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  disabled={!!event || isAdmin}
                />
                {event && (
                  <p className="mt-2 text-xs text-gray-500">
                    ✓ Video will promote: {event.name}
                  </p>
                )}
                {isAdmin && (
                  <p className="mt-2 text-xs text-gray-500">
                    ✓ Video will promote EventNexus platform
                  </p>
                )}
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-semibold mb-2">Target Platform</label>
                <div className="grid grid-cols-5 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                        platform === p.id
                          ? 'bg-purple-600 border-purple-500 shadow-lg shadow-purple-500/20'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-semibold mb-2">Video Format</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                      aspectRatio === '16:9'
                        ? 'bg-purple-600 border-purple-500'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                      aspectRatio === '9:16'
                        ? 'bg-purple-600 border-purple-500'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    9:16 Portrait (Stories)
                  </button>
                </div>
              </div>

              {/* Credit Cost */}
              {!isAdmin && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-sm text-purple-300">
                    💎 Cost: {CREDIT_COST} credits for professional 60s video ad
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={startCampaignCreation}
                disabled={!url || !hasAccess}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                Generate Professional Ad Campaign
              </button>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        {isProcessing && (
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-8 mb-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{getStepLabel()}</h2>
              <p className="text-gray-400">Creating your professional video ad...</p>
            </div>
            <div className="space-y-4">
              {[
                { id: Step.ANALYZING, label: 'Analyzing Brand & Strategy' },
                { id: Step.GENERATING_SCENE_1, label: 'Scene 1: Hook (0-12s)' },
                { id: Step.EXTENDING_SCENE_2, label: 'Scene 2: Journey (12-25s)' },
                { id: Step.EXTENDING_SCENE_3, label: 'Scene 3: Insight (25-40s)' },
                { id: Step.EXTENDING_SCENE_4, label: 'Scene 4: Power (40-52s)' },
                { id: Step.GENERATING_AUDIO, label: 'Scene 5 & Audio (52-60s)' }
              ].map((s) => {
                const isActive = step === s.id;
                const isCompleted = step > s.id;
                
                return (
                  <div key={s.id} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isCompleted ? 'bg-green-600' :
                      isActive ? 'bg-purple-600 animate-pulse' :
                      'bg-gray-700'
                    }`}>
                      {isCompleted ? '✓' : s.id - 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {s.label}
                      </p>
                      {isActive && (
                        <div className="w-full bg-gray-700 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="bg-purple-500 h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed - Show Result */}
        {step === Step.COMPLETED && campaign && (
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">
              🎉 Your Professional Ad is Ready!
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Video Preview */}
              <div>
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    src={campaign.videoUrl}
                    className="w-full"
                    controls
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={togglePlayback}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isAudioPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  {navigator.share && (
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  )}
                </div>
              </div>

              {/* Campaign Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{campaign.analysis.brandName}</h3>
                  <p className="text-gray-400">{campaign.analysis.coreEssence}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Social Media Copy</h4>
                  <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                    <p className="font-bold">{campaign.analysis.socialCopy.headline}</p>
                    <p className="text-sm text-gray-400">{campaign.analysis.socialCopy.body}</p>
                    <p className="text-purple-400 font-medium">{campaign.analysis.socialCopy.cta}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {campaign.analysis.socialCopy.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-800 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {campaign.sources && campaign.sources.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Research Sources</h4>
                    <div className="space-y-2">
                      {campaign.sources.slice(0, 3).map((source, i) => (
                        <a
                          key={i}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium"
              >
                Close
              </button>
            )}
          </div>
        )}

        {/* Error State */}
        {step === Step.ERROR && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => {
                setStep(Step.INPUT);
                setError(null);
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
