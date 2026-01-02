
import React from 'react';
import { Step } from '../types';

interface ProgressTrackerProps {
  currentStep: Step;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep }) => {
  const steps = [
    { id: Step.ANALYZING, label: 'Decoding Brand Essence' },
    { id: Step.GENERATING_SCENE_1, label: '0-12s: The Cinematic Hook' },
    { id: Step.EXTENDING_SCENE_2, label: '12-25s: Visual Journey' },
    { id: Step.EXTENDING_SCENE_3, label: '25-40s: Insight & Impact' },
    { id: Step.EXTENDING_SCENE_4, label: '40-52s: Core Power' },
    { id: Step.GENERATING_AUDIO, label: '52-60s: Epic Finale & Audio' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.id;
        const isCompleted = currentStep > s.id || (currentStep === Step.COMPLETED);
        
        return (
          <div key={s.id} className="flex items-center gap-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black transition-all duration-700 shadow-xl ${
              isCompleted ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 
              isActive ? 'bg-white text-black animate-pulse shadow-white/10' : 
              'bg-zinc-900 text-zinc-700 border border-zinc-800'
            }`}>
              {isCompleted ? '✓' : idx + 1}
            </div>
            <div className="flex-1 text-left">
              <div className="flex justify-between items-center mb-1">
                <p className={`text-sm font-black tracking-tight transition-colors uppercase ${isActive ? 'text-white' : isCompleted ? 'text-zinc-500' : 'text-zinc-800'}`}>
                  {s.label}
                </p>
                {isActive && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Processing...</span>}
              </div>
              {isActive && (
                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-2">
                  <div className="bg-indigo-500 h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ProgressTracker;
