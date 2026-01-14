import React from 'react';
import { X, BarChart3, Sparkles, Users, TrendingUp, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface FeatureTeaserModalProps {
  feature: 'analytics' | 'custom-branding' | 'featured-placement' | 'api-access';
  user: User;
  onClose: () => void;
}

const FEATURE_DETAILS = {
  analytics: {
    title: 'Advanced Analytics',
    description: 'Get deep insights into your event performance, audience demographics, and revenue trends.',
    icon: BarChart3,
    benefits: [
      'Real-time attendance tracking',
      'Revenue breakdown by event',
      'Audience demographics & interests',
      'Conversion funnel analysis',
      'Export reports as CSV/PDF',
      'Historical trend comparisons'
    ],
    requiredTier: 'Pro',
    preview: '/assets/analytics-preview.png'
  },
  'custom-branding': {
    title: 'Custom Branding',
    description: 'Make your events and profile uniquely yours with custom colors, logos, and branding.',
    icon: Sparkles,
    benefits: [
      'Custom brand colors',
      'Logo on tickets and profile',
      'Branded event pages',
      'Custom domain support (Premium+)',
      'White-label dashboard (Enterprise)',
      'Branded email notifications'
    ],
    requiredTier: 'Pro',
    preview: '/assets/branding-preview.png'
  },
  'featured-placement': {
    title: 'Featured Placement',
    description: 'Get your events prominently displayed on the map and discovery feed.',
    icon: TrendingUp,
    benefits: [
      'Priority map placement',
      'Highlighted event cards',
      '3x more visibility',
      'Featured badge on events',
      'Top of search results',
      'Homepage carousel inclusion'
    ],
    requiredTier: 'Premium',
    preview: '/assets/featured-preview.png'
  },
  'api-access': {
    title: 'Full API Access',
    description: 'Integrate EventNexus with your existing systems and build custom integrations.',
    icon: Users,
    benefits: [
      'RESTful API endpoints',
      '100k requests per day',
      'Webhook notifications',
      'Custom integrations',
      'Real-time event sync',
      'Developer documentation'
    ],
    requiredTier: 'Enterprise',
    preview: '/assets/api-preview.png'
  }
};

const FeatureTeaserModal: React.FC<FeatureTeaserModalProps> = ({ feature, user, onClose }) => {
  const navigate = useNavigate();
  const details = FEATURE_DETAILS[feature];
  const Icon = details.icon;

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  // Calculate savings
  const currentTier = user.subscription_tier;
  const savings = currentTier === 'free' ? 
    'Save €2 on platform fees per event' : 
    'Lower commission rates mean more revenue';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 zoom-in-95 duration-500 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 pb-12">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-black text-white/80 uppercase tracking-widest">
                    {details.requiredTier} Feature
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                  {details.title}
                </h2>
                <p className="text-white/90 font-medium leading-relaxed">
                  {details.description}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Benefits Grid */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                What You'll Get
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {details.benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 bg-slate-800/50 border border-slate-700 rounded-xl p-3"
                  >
                    <div className="w-5 h-5 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-300 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Proposition */}
            <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">ROI Impact</p>
                  <p className="text-xs text-slate-400">{savings}</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUpgrade}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                Upgrade to {details.requiredTier}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
              >
                Maybe Later
              </button>
            </div>

            {/* Trust Badge */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 font-medium">
                Join 1,000+ organizers who upgraded to unlock premium features
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeatureTeaserModal;
