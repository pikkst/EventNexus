import React, { useState } from 'react';
import { Heart, Users, Zap, CheckCircle, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { redeemBetaInvitation, signUpUser, createUser } from '../services/dbService';
import { getCurrentUser } from '../services/supabase';

const BetaInvitation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'info' | 'signup'>('info');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [betaCode, setBetaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate inputs
      if (!email || !password || !confirmPassword || !betaCode) {
        setMessage({ type: 'error', text: 'Please fill in all fields' });
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        setLoading(false);
        return;
      }

      // First, redeem the beta code to validate it
      const redemptionResult = await redeemBetaInvitation('temp-user-id', betaCode);
      
      if (!redemptionResult.success) {
        setMessage({ type: 'error', text: redemptionResult.message });
        setLoading(false);
        return;
      }

      // Sign up user
      const signupResult = await signUpUser(email, password);

      if (signupResult.error) {
        setMessage({ type: 'error', text: signupResult.error.message || 'Signup failed' });
        setLoading(false);
        return;
      }

      if (!signupResult.user) {
        setMessage({ type: 'error', text: 'Signup failed. Please try again.' });
        setLoading(false);
        return;
      }

      // Create user profile with beta credits
      const newUser = await createUser({
        id: signupResult.user.id,
        email: signupResult.user.email || '',
        name: '',
        role: 'attendee',
        subscription_tier: 'free',
        subscription: 'free',
        credits: 1000,
        credits_balance: 1000,
        bio: '',
        avatar_url: '',
        agency_name: '',
        agency_slug: '',
        follow_count: 0,
        followers: [],
        following: [],
        followed_events: []
      });

      if (newUser) {
        setMessage({ 
          type: 'success', 
          text: '🎉 Welcome to the beta! Check your email to confirm your account. You have 1000 credits ready to use!' 
        });
        
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setBetaCode('');
        
        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = '/#/';
        }, 3000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white pt-20 pb-12">
      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex gap-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'info'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            About Beta
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'signup'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Join Now
          </button>
        </div>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <div className="inline-block mb-6 px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-full">
          <span className="text-sm font-semibold text-indigo-300">🚀 Limited Beta Access</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
          Be Part of the Revolution
        </h1>
        
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          EventNexus is transforming how people discover and experience events. We're looking for passionate beta testers to shape the future of event discovery.
        </p>
        
        <button 
          onClick={() => setActiveTab('signup')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
        >
          Join Our Beta Program <ArrowRight size={20} />
        </button>
      </div>

      {/* Features Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Join EventNexus Beta?</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
            <Zap className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Lightning-Fast Discovery</h3>
            <p className="text-slate-300">
              Find events near you instantly with our advanced geospatial technology. Never miss an opportunity again.
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
            <Users className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Community Driven</h3>
            <p className="text-slate-300">
              Connect with event organizers and attendees. Build your network while discovering amazing experiences.
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
            <Heart className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-xl font-bold mb-3">Your Feedback Matters</h3>
            <p className="text-slate-300">
              As a beta tester, your input directly shapes the platform. Your voice makes a real difference.
            </p>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">What's Included in Beta</h2>
        
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-lg p-8 space-y-4">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Early Access Features</h4>
              <p className="text-slate-300">Get exclusive access to new features before public launch</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Direct Support Channel</h4>
              <p className="text-slate-300">Private support from our team with priority bug fixes</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Lifetime Perks</h4>
              <p className="text-slate-300">Special badges and benefits as a founding member</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Community Recognition</h4>
              <p className="text-slate-300">Featured on our beta testers page and social media</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Exclusive Events</h4>
              <p className="text-slate-300">Access to private beta tester meetups and networking events</p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Join */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">How to Join</h2>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">1</div>
            <h4 className="font-semibold mb-2">Sign Up</h4>
            <p className="text-sm text-slate-400">Create your EventNexus account</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">2</div>
            <h4 className="font-semibold mb-2">Apply</h4>
            <p className="text-sm text-slate-400">Fill out the beta tester form</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">3</div>
            <h4 className="font-semibold mb-2">Start Testing</h4>
            <p className="text-sm text-slate-400">Explore and share feedback</p>
          </div>

          <div className="flex items-center justify-center">
            <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-full mb-4 font-bold text-lg">4</div>
            <h4 className="font-semibold mb-2">Get Recognized</h4>
            <p className="text-sm text-slate-400">Join our community of founders</p>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-12">What We're Looking For</h2>
        
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
          <ul className="space-y-4 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Event enthusiasts and frequent attendees</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Event organizers and promoters</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Tech-savvy individuals who love trying new platforms</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>People passionate about community and networking</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-400 font-bold">✓</span>
              <span>Constructive feedback providers</span>
            </li>
          </ul>
        </div>
      </div>

      )}

      {/* Signup Tab */}
      {activeTab === 'signup' && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg p-8 backdrop-blur">
            <h2 className="text-3xl font-bold mb-2 text-center">Join the Beta</h2>
            <p className="text-center text-slate-300 mb-8">Create your account and get 1000 credits instantly!</p>

            {message && (
              <div className={`mb-6 p-4 rounded-lg flex gap-3 ${
                message.type === 'error' 
                  ? 'bg-red-500/20 border border-red-500/50 text-red-300' 
                  : 'bg-green-500/20 border border-green-500/50 text-green-300'
              }`}>
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p>{message.text}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Beta Invitation Code */}
              <div>
                <label className="block text-sm font-semibold mb-2">Beta Invitation Code</label>
                <input
                  type="text"
                  value={betaCode}
                  onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                  placeholder="BETA-XXXXXXXXXXXX"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">You'll receive this code via email or Facebook</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 px-6 py-3 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Claim My 1000 Credits <CheckCircle size={20} />
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-slate-400 text-center mt-4">
                By signing up, you agree to our{' '}
                <a href="/#/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a>
                {' '}and{' '}
                <a href="/#/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>
              </p>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <h3 className="font-semibold text-indigo-300 mb-2">🎁 What You Get:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>✓ 1000 credits to spend on events</li>
                <li>✓ Early access to beta features</li>
                <li>✓ Direct support from our team</li>
                <li>✓ Lifetime founder status</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BetaInvitation;

