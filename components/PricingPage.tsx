
import React, { useState, useEffect } from 'react';
import { Check, Zap, Sparkles, ShieldCheck, Globe, BarChart3, Star, Rocket, Loader2, Briefcase } from 'lucide-react';
import { User } from '../types';
import { createSubscriptionCheckout, checkCheckoutSuccess, clearCheckoutStatus } from '../services/stripeService';

const PLANS = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for exploring and attending events.',
    features: [
      '100 welcome credits (€50 value)',
      'Browse and attend events worldwide',
      'Purchase tickets securely',
      'Unlock event creation with credits',
      'Basic attendee profile',
      'Mobile ticket check-in'
    ],
    cta: 'Current Plan',
    highlight: false,
    tier: 'free' as const
  },
  {
    name: 'Pro',
    price: '19.99',
    description: 'The standard for creators and promoters.',
    features: [
      'Create up to 20 events per month',
      'Revenue & attendance analytics',
      'AI-powered event translations',
      'Public organizer profile page',
      'Social media auto-posting tools',
      'Reduced platform fees (3%)'
    ],
    cta: 'Get Started with Pro',
    highlight: false,
    tier: 'pro' as const
  },
  {
    name: 'Premium',
    price: '49.99',
    description: 'Ultimate power for professional agencies.',
    features: [
      'Create up to 100 events per month',
      'Featured placement on event map',
      'Custom branded tickets & logos',
      'Deep analytics & insights',
      'Priority email support (24h)',
      'Lowest platform fees (2.5%)',
      'Affiliate program & referrals'
    ],
    cta: 'Go Premium Elite',
    highlight: true,
    tier: 'premium' as const
  },
  {
    name: 'Enterprise',
    price: '149.99',
    description: 'White-labeling & Global Infrastructure.',
    features: [
      'Unlimited events & capacity',
      'Fully white-labeled dashboard',
      'Dedicated 24/7 success manager',
      'Full REST API access',
      'Custom public agency page',
      'Your own branded domain URL',
      'Best platform fees (1.5%)'
    ],
    cta: 'Launch Agency',
    highlight: false,
    tier: 'enterprise' as const
  }
];

interface PricingPageProps {
  user: User | null;
  onUpgrade: (tier: 'free' | 'pro' | 'premium' | 'enterprise') => void;
  onOpenAuth?: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ user, onUpgrade, onOpenAuth }) => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if returning from successful checkout
  useEffect(() => {
    const checkSuccess = async () => {
      if (checkCheckoutSuccess() && user) {
        setShowSuccess(true);
        clearCheckoutStatus();
        
        // Trigger parent to reload user data (App will handle the reload)
        console.log('✅ Subscription checkout completed');
        
        setTimeout(() => setShowSuccess(false), 5000);
      }
    };
    
    checkSuccess();
  }, [user]);

  const handleTierSwitch = async (tier: 'free' | 'pro' | 'premium' | 'enterprise') => {
    // Require authentication for any tier selection
    if (!user) {
      onOpenAuth?.();
      return;
    }

    // Free tier can be selected directly without payment
    if (tier === 'free') {
      setLoadingTier(tier);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        onUpgrade(tier);
      } finally {
        setLoadingTier(null);
      }
      return;
    }

    setLoadingTier(tier);
    
    try {
      // Create Stripe checkout session
      const checkoutUrl = await createSubscriptionCheckout(
        user.id,
        tier,
        user.email
      );

      if (checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription upgrade failed:', error);
      alert('Failed to start checkout. Please try again or contact support.');
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
            <Check className="w-5 h-5" />
            <span className="font-bold">Subscription upgraded successfully!</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-20">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Zap className="w-4 h-4" /> Pricing & Plans
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
            Choose Your <span className="text-indigo-500">Nexus Journey</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
          {PLANS.map((plan) => (
            <div 
              key={plan.name}
              className={`relative bg-slate-900 border ${plan.highlight ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10 scale-105 z-10' : 'border-slate-800'} rounded-[40px] p-8 transition-all hover:border-indigo-500/50 group`}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">€{plan.price}</span>
                  <span className="text-slate-500 font-bold">/mo</span>
                </div>

                <div className="h-px bg-slate-800" />

                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm font-medium text-slate-300">
                      <div className="p-1 bg-indigo-600/10 rounded-lg shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-indigo-400" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleTierSwitch(plan.tier)}
                  disabled={user?.subscription_tier === plan.tier || !!loadingTier}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    user?.subscription_tier === plan.tier 
                    ? 'bg-slate-800 text-slate-500 cursor-default border border-slate-700' 
                    : plan.highlight 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {loadingTier === plan.tier ? <Loader2 className="w-4 h-4 animate-spin" /> : (user?.subscription_tier === plan.tier ? 'Current Plan' : (!user ? 'Sign up to continue' : plan.cta))}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ComparisonItem = ({ icon, title, text }: any) => (
  <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
    <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500">
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
    </div>
    <h4 className="font-bold text-white">{title}</h4>
    <p className="text-sm text-slate-400 leading-relaxed font-medium">{text}</p>
  </div>
);

export default PricingPage;
