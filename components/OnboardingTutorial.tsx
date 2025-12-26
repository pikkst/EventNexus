import React, { useState, useEffect } from 'react';
import { X, MapPin, Bell, Users, Sparkles, ArrowRight, Check, Rocket } from 'lucide-react';
import { User } from '../types';

interface OnboardingTutorialProps {
  user: User;
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to EventNexus!',
    description: 'Your gateway to discovering amazing events near you. Let\'s take a quick 60-second tour.',
    icon: Sparkles,
    action: 'Get Started'
  },
  {
    id: 'map',
    title: 'Discover on the Map',
    description: 'Find events happening around you. The map shows real-time locations of concerts, festivals, workshops, and more.',
    icon: MapPin,
    action: 'Next',
    highlight: 'map-container'
  },
  {
    id: 'radar',
    title: 'Vibe Radar',
    description: 'Enable proximity alerts to get notified when events matching your interests pop up nearby. Never miss out!',
    icon: Bell,
    action: 'Next',
    highlight: 'notifications-icon'
  },
  {
    id: 'follow',
    title: 'Follow Organizers',
    description: 'Found an organizer you love? Follow them to get updates when they create new events.',
    icon: Users,
    action: 'Next'
  },
  {
    id: 'bonus',
    title: 'First Action Bonus!',
    description: 'Complete your first action and get 20 bonus credits (€10 value). Use them to unlock event creation or AI features.',
    icon: Rocket,
    action: 'Start Exploring',
    bonus: true
  }
];

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ user, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Highlight elements based on current step
    const step = TUTORIAL_STEPS[currentStep];
    if (step.highlight) {
      const element = document.getElementById(step.highlight);
      if (element) {
        element.classList.add('tutorial-highlight');
      }
    }

    return () => {
      // Clean up highlights
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        onClick={handleSkip}
      />

      {/* Tutorial Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-500"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div className="h-1 bg-slate-800 rounded-t-3xl overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  step.bonus 
                    ? 'bg-gradient-to-br from-orange-600 to-pink-600' 
                    : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                }`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {step.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-slate-500 hover:text-slate-300 transition-colors p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-slate-300 text-lg leading-relaxed">
              {step.description}
            </p>

            {/* Bonus Badge */}
            {step.bonus && (
              <div className="bg-gradient-to-r from-orange-600/20 to-pink-600/20 border border-orange-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-400">+20 Bonus Credits</p>
                    <p className="text-xs text-slate-400">Complete any action to claim</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleNext}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                {step.action}
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
              {currentStep > 0 && (
                <button
                  onClick={handleSkip}
                  className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
                >
                  Skip
                </button>
              )}
            </div>

            {/* Step Indicators */}
            <div className="flex gap-2 justify-center pt-2">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'w-8 bg-indigo-500' 
                      : index < currentStep 
                      ? 'w-1.5 bg-indigo-700' 
                      : 'w-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Highlight Styles */}
      <style>{`
        .tutorial-highlight {
          position: relative;
          z-index: 9997;
          animation: pulse 2s ease-in-out infinite;
          border-radius: 12px;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5);
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.3);
          }
        }
      `}</style>
    </>
  );
};

export default OnboardingTutorial;
