import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, Zap, ArrowRight } from 'lucide-react';
import { trackCTAClick } from '../utils/conversionTracking';

interface ExitIntentPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExitIntentPopup: React.FC<ExitIntentPopupProps> = ({ isOpen, onClose }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Optionally add analytics event
      trackCTAClick('exit_intent_shown');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  const handleExplore = () => {
    trackCTAClick('exit_intent_explore');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Popup Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header with close button */}
          <div className="flex items-start justify-between p-6 md:p-8 border-b border-slate-700/50">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-orange-600/20 border border-orange-500/50 rounded-full">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Wait!</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">Don't leave yet! 🎉</h2>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 ml-4 text-slate-400 hover:text-white transition-colors"
              aria-label="Close popup"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Main message */}
            <div className="space-y-3">
              <p className="text-lg text-slate-200 font-semibold">
                Over <span className="text-indigo-400 font-black">531 new events</span> discovered today
              </p>
              <p className="text-slate-400">
                Browse thousands of events happening right now across{' '}
                <span className="text-emerald-400 font-bold">1,169 cities worldwide</span>. Start your adventure today—it's completely free!
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-indigo-400 mb-1">592</div>
                <p className="text-xs text-slate-400">Free Events</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-emerald-400 mb-1">100%</div>
                <p className="text-xs text-slate-400">No Sign-up</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-4">
              {/* Primary CTA */}
              <Link
                to="/map"
                onClick={handleExplore}
                className="block w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-4 rounded-2xl font-bold text-center transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group"
                aria-label="Explore events on the map now"
              >
                <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Explore Events Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Secondary CTA - Just close */}
              <button
                onClick={handleClose}
                className="w-full text-slate-400 hover:text-slate-300 px-6 py-3 rounded-xl font-semibold transition-colors text-center"
              >
                Maybe later
              </button>
            </div>

            {/* Social proof / urgency */}
            <div className="bg-gradient-to-r from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-300">
                <span className="font-bold text-orange-400">✨ Hot right now:</span> 1,300+ attendees discovering new events today
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExitIntentPopup;
