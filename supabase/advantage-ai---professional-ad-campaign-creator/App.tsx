
import React, { useState, useRef, useEffect } from 'react';
import { AdCampaign, Step } from './types';
import { GeminiService } from './services/geminiService';
import PlatformSelector from './components/PlatformSelector';
import ProgressTracker from './components/ProgressTracker';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [step, setStep] = useState<Step>(Step.INPUT);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [error, setError] = useState<{ message: string; isQuota: boolean } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const openKeySelection = async () => {
    await aistudio.openSelectKey();
    setError(null);
  };

  const startCampaignCreation = async () => {
    if (!url) return;
    setError(null);
    try {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) await aistudio.openSelectKey();

      setStep(Step.ANALYZING);
      const analysisData = await GeminiService.analyzeWebsite(url, platform);
      
      setCampaign({
        websiteUrl: url,
        targetPlatform: platform,
        aspectRatio,
        analysis: analysisData,
        sources: analysisData.sources
      });

      const videoUrl = await GeminiService.generateMasterAd(
        analysisData,
        aspectRatio,
        (currentScene) => {
          if (currentScene === 1) setStep(Step.GENERATING_SCENE_1);
          if (currentScene === 2) setStep(Step.EXTENDING_SCENE_2);
          if (currentScene === 3) setStep(Step.EXTENDING_SCENE_3);
          if (currentScene === 4) setStep(Step.EXTENDING_SCENE_4);
          if (currentScene === 5) setStep(Step.GENERATING_AUDIO); 
        }
      );

      const audioBase64 = await GeminiService.generateVoiceover(analysisData.script);
      
      setCampaign(prev => prev ? { ...prev, videoUrl, audioBase64 } : null);
      setStep(Step.COMPLETED);
    } catch (err: any) {
      console.error("Campaign creation error:", err);
      const isQuota = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
      setError({
        message: isQuota 
          ? "API Quota Exceeded. Please use a different API key with an active billing project or wait a few minutes." 
          : err.message || "An unexpected production error occurred.",
        isQuota
      });
      setStep(Step.INPUT);
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
    a.download = `${campaign.analysis.brandName.replace(/\s+/g, '_')}_Master_60s.mp4`;
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${campaign?.analysis.brandName} - AdVantage Pro`,
          text: campaign?.analysis.socialCopy.headline,
          url: campaign?.websiteUrl
        });
        setShareStatus("Shared!");
      } catch (err) {
        setShareStatus("Copying link...");
        await navigator.clipboard.writeText(campaign?.websiteUrl || '');
      }
    } else {
      await navigator.clipboard.writeText(campaign?.websiteUrl || '');
      setShareStatus("Link copied!");
    }
    setTimeout(() => setShareStatus(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 selection:bg-indigo-500/40">
      <nav className="border-b border-zinc-900 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStep(Step.INPUT)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-xl shadow-indigo-600/30 group-hover:scale-105 transition-transform">A</div>
            <span className="text-xl font-black tracking-tighter uppercase">AdVantage <span className="text-indigo-500">Pro</span></span>
          </div>
          {step === Step.COMPLETED && (
            <div className="flex gap-6 items-center">
              <button onClick={() => setStep(Step.INPUT)} className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">Create New</button>
              <button 
                onClick={handleDownload} 
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg transition-all shadow-lg shadow-indigo-600/20 active:scale-95 uppercase tracking-widest"
              >
                Download Master
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {step === Step.INPUT && (
          <div className="max-w-4xl mx-auto py-20 space-y-16 animate-in fade-in duration-1000">
            <div className="space-y-6 text-center">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-full border border-indigo-500/20 uppercase tracking-[0.2em]">60s Cinematic Engine</span>
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase">
                Direct Your <br />
                <span className="gradient-text italic">Narrative</span>
              </h1>
              <p className="text-zinc-500 text-xl max-w-xl mx-auto font-medium">Create world-class 60s commercials with AI narration. Everything is generated in English for a global audience.</p>
            </div>

            <div className="bg-zinc-900/40 p-12 rounded-[2.5rem] border border-zinc-800/40 backdrop-blur-xl space-y-10 shadow-3xl">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Website Destination</label>
                <input
                  type="url"
                  placeholder="https://your-brand-hq.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-black border border-zinc-900 rounded-2xl px-8 py-6 focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600/50 outline-none text-xl transition-all placeholder:text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Optimized Platform</label>
                  <PlatformSelector selected={platform} onSelect={setPlatform} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Video Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setAspectRatio('16:9')} className={`py-4 rounded-xl border-2 font-black transition-all text-xs uppercase tracking-widest ${aspectRatio === '16:9' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black border-zinc-900 text-zinc-500'}`}>16:9 Landscape</button>
                    <button onClick={() => setAspectRatio('9:16')} className={`py-4 rounded-xl border-2 font-black transition-all text-xs uppercase tracking-widest ${aspectRatio === '9:16' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black border-zinc-900 text-zinc-500'}`}>9:16 Portrait</button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-4 animate-shake">
                  <p className="text-red-400 font-bold text-center text-sm">{error.message}</p>
                  {error.isQuota && (
                    <button 
                      onClick={openKeySelection}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-lg uppercase tracking-widest transition-all"
                    >
                      Select Different API Key
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={startCampaignCreation}
                disabled={!url}
                className="w-full py-8 bg-white text-black font-black rounded-2xl text-2xl uppercase tracking-tighter hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-20 shadow-2xl"
              >
                Begin 60s Production
              </button>
              
              <p className="text-center text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
                Production takes ~4-6 minutes for full 60s master rendering.
              </p>
            </div>
          </div>
        )}

        {step !== Step.INPUT && step !== Step.COMPLETED && (
          <div className="max-w-2xl mx-auto py-32 text-center space-y-16 animate-in fade-in duration-700">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-indigo-600/20 blur-[140px] rounded-full animate-pulse"></div>
               <div className="w-48 h-48 border-[14px] border-zinc-900 border-t-indigo-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white">60s</div>
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-black uppercase tracking-tighter italic">Rendering Legacy...</h2>
              <p className="text-zinc-500 text-lg">Directing stable 5-stage cinematic arc. Consistency check in progress.</p>
            </div>
            <ProgressTracker currentStep={step} />
          </div>
        )}

        {step === Step.COMPLETED && campaign && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            {/* Left: 60s Video Master */}
            <div className="lg:col-span-7 space-y-10">
              <div className={`relative bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden group shadow-4xl ${campaign.aspectRatio === '9:16' ? 'max-w-md mx-auto aspect-[9/16]' : 'aspect-video'}`}>
                {campaign.videoUrl && (
                  <video 
                    ref={videoRef}
                    src={campaign.videoUrl} 
                    className="w-full h-full object-cover" 
                    loop 
                    playsInline 
                    onClick={togglePlayback}
                  />
                )}
                {!isAudioPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md group-hover:bg-black/30 transition-all cursor-pointer" onClick={togglePlayback}>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-3xl hover:scale-110 transition-transform">
                       <div className="w-0 h-0 border-t-[14px] border-t-transparent border-l-[24px] border-l-black border-b-[14px] border-b-transparent ml-2"></div>
                    </div>
                  </div>
                )}
                {shareStatus && (
                  <div className="absolute top-8 right-8 bg-indigo-600 text-white text-[10px] font-black px-6 py-3 rounded-full shadow-2xl animate-in zoom-in duration-300 uppercase tracking-widest border border-indigo-400">
                    {shareStatus}
                  </div>
                )}
                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                   <div className="px-5 py-2.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">60S MASTER_COMMERCIAL</div>
                   <button onClick={handleShare} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-10 bg-zinc-900/40 rounded-[2.5rem] border border-zinc-800/60 backdrop-blur-sm space-y-6">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Global English Copy</p>
                    <h3 className="text-3xl font-black leading-[1.1] tracking-tighter">{campaign.analysis.socialCopy.headline}</h3>
                    <p className="text-zinc-400 text-lg leading-relaxed">{campaign.analysis.socialCopy.body}</p>
                    <div className="flex flex-wrap gap-3 pt-4">
                       {campaign.analysis.socialCopy.hashtags.map(tag => (
                         <span key={tag} className="text-[11px] font-bold text-zinc-600 hover:text-indigo-400 transition-colors">#{tag}</span>
                       ))}
                    </div>
                 </div>
                 <div className="p-10 bg-zinc-900/40 rounded-[2.5rem] border border-zinc-800/60 backdrop-blur-sm space-y-6">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Master Script (60s)</p>
                    <p className="text-zinc-300 text-lg italic leading-relaxed">"{campaign.analysis.script}"</p>
                    <div className="pt-8 border-t border-zinc-800 flex items-center gap-5">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                          <svg className="w-5 h-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a2 2 0 012 2v8a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2zm6 0a2 2 0 012 2v8a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2z"></path></svg>
                       </div>
                       <div>
                          <p className="text-xs font-black uppercase tracking-widest text-white">Deep Narrator Voice</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Sync-Embedded</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Right: Strategy */}
            <div className="lg:col-span-5 space-y-12">
               <div className="p-12 bg-indigo-600 rounded-[3rem] text-white shadow-3xl shadow-indigo-600/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-60">Visual Signature Anchor</p>
                  <p className="text-sm font-bold leading-relaxed opacity-90 mb-8">{campaign.analysis.visualSignature}</p>
                  <button onClick={handleDownload} className="w-full py-6 bg-white text-black font-black rounded-2xl uppercase tracking-tighter hover:bg-zinc-100 transition-all text-xl shadow-2xl active:scale-[0.98]">
                     Export 60s Master
                  </button>
               </div>

               <div className="space-y-8">
                  <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-900 pb-6 flex items-center justify-between">
                    Market Research Sources
                    <span className="text-[10px] bg-zinc-900 px-3 py-1 rounded-full text-zinc-400">Validated</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                     {campaign.sources?.map((s, idx) => (
                       <a key={idx} href={s.uri} target="_blank" className="flex items-center justify-between p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 hover:border-indigo-500/30 transition-all group">
                          <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors truncate max-w-[280px]">{s.title}</span>
                          <svg className="w-5 h-5 text-zinc-800 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                       </a>
                     ))}
                  </div>
               </div>

               <div className="p-10 bg-zinc-900/20 border border-zinc-800 rounded-[3rem] space-y-8">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Professional Strategy
                  </p>
                  <div className="space-y-8">
                     <div className="flex gap-6">
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-xl">📈</div>
                        <div className="space-y-2">
                           <p className="text-sm font-black text-white uppercase tracking-tighter italic">Core Benefit Focus</p>
                           <p className="text-xs text-zinc-500 leading-relaxed">The Põhituum analysis highlights: "{campaign.analysis.coreEssence}". Use this in your caption.</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default App;
