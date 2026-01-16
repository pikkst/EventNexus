import React, { useState } from 'react';
import { X, Zap, Image, Globe, DollarSign } from 'lucide-react';

interface CreditsPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number;
  userTier: string;
}

interface PricingItem {
  feature: string;
  cost: number;
  description: string;
  icon: React.ReactNode;
  required_tier?: string;
}

const CreditsPricingModal: React.FC<CreditsPricingModalProps> = ({ 
  isOpen, 
  onClose,
  userCredits,
  userTier
}) => {
  const [selectedTab, setSelectedTab] = useState<'ai' | 'info'>('ai');

  const aiPricing: PricingItem[] = [
    {
      feature: 'AI Tagline Generation',
      cost: 2,
      description: 'Auto-generate catchy event taglines using AI',
      icon: <Zap className="w-5 h-5" />
    },
    {
      feature: 'AI Image Generation',
      cost: 5,
      description: 'Create event poster images with AI (Imagen 3)',
      icon: <Image className="w-5 h-5" />,
      required_tier: 'premium'
    },
    {
      feature: 'AI Auto-Translation',
      cost: 3,
      description: 'Auto-translate event into 5+ languages',
      icon: <Globe className="w-5 h-5" />,
      required_tier: 'pro'
    },
    {
      feature: 'Event Creation Unlock',
      cost: 15,
      description: 'Unlock ability to create events (free tier)',
      icon: <DollarSign className="w-5 h-5" />
    }
  ];

  const creditInfo = [
    {
      title: 'How to Earn Credits',
      items: [
        '✅ Sign up: Get 10 free credits',
        '✅ Referral: Earn 50 credits per referred user',
        '✅ Purchase: Buy credit packages (starting €5)',
        '✅ Watch ads: Earn 5 credits per video (max 2/day)'
      ]
    },
    {
      title: 'Subscription Tiers',
      items: [
        '🎯 Free: 10 initial credits, limited AI features',
        '⭐ Pro: 100 monthly credits, full AI features',
        '💎 Premium: 500 monthly credits, priority support',
        '🚀 Enterprise: Custom credits, dedicated account'
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Event Credits</h2>
            <p className="text-sm text-slate-400 mt-1">Your balance: <span className="text-indigo-400 font-bold">{userCredits} credits</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-700">
          <button
            onClick={() => setSelectedTab('ai')}
            className={`flex-1 py-4 px-6 text-center font-semibold transition-all border-b-2 ${
              selectedTab === 'ai'
                ? 'text-indigo-400 border-indigo-500 bg-slate-800/50'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            AI Features Pricing
          </button>
          <button
            onClick={() => setSelectedTab('info')}
            className={`flex-1 py-4 px-6 text-center font-semibold transition-all border-b-2 ${
              selectedTab === 'info'
                ? 'text-indigo-400 border-indigo-500 bg-slate-800/50'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            How It Works
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {selectedTab === 'ai' && (
            <div className="space-y-4">
              {aiPricing.map((item) => {
                const isRestricted = item.required_tier && 
                  !(userTier === 'premium' || userTier === 'pro' || userTier === 'enterprise');
                
                return (
                  <div
                    key={item.feature}
                    className={`p-4 rounded-xl border transition-all ${
                      isRestricted
                        ? 'bg-slate-800/50 border-slate-700/50 opacity-60'
                        : userCredits >= item.cost
                        ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'
                        : 'bg-slate-800/50 border-slate-700/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          isRestricted 
                            ? 'bg-slate-700 text-slate-500' 
                            : 'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {item.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-1">{item.feature}</h3>
                          <p className="text-sm text-slate-400">{item.description}</p>
                          {isRestricted && (
                            <p className="text-xs text-amber-400 mt-2">
                              🔒 Requires {item.required_tier} tier
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-lg font-bold ${
                          userCredits >= item.cost && !isRestricted
                            ? 'text-indigo-400'
                            : 'text-slate-500'
                        }`}>
                          {item.cost}
                        </span>
                        <span className="text-xs text-slate-400">credits</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTab === 'info' && (
            <div className="space-y-6">
              {creditInfo.map((section) => (
                <div key={section.title}>
                  <h3 className="text-lg font-bold text-white mb-3">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-slate-300 text-sm">
                        <span className="text-indigo-400 mt-0.5">{item.charAt(0)}</span>
                        <span>{item.substring(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-800/50 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
          >
            Proceed to Create Event
          </button>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditsPricingModal;
