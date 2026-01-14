
import React, { useState } from 'react';
import { X, Mail, Lock, Github, Chrome, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { signInUser, signUpUser, getUser, updateUser, claimCampaignIncentive, signInWithGoogle } from '../services/dbService';
import { User } from '../types';
import logger from '../utils/logger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userData: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Add timeout protection
    let timeoutOccurred = false;
    const timeoutId = setTimeout(() => {
      timeoutOccurred = true;
      setIsLoading(false);
      setError('Connection timeout. Please check your internet connection and try again.');
    }, 12000); // 12 second timeout
    
    try {
      logger.log('Starting authentication...', mode);
      
      if (mode === 'login') {
        logger.log('Attempting login for:', email);
        const { user: authUser, error: authError } = await signInUser(email, password);
        
        logger.log('Login response:', { user: authUser?.id, error: authError });
        
        if (authError) {
          clearTimeout(timeoutId);
          const friendlyError = authError.message.includes('Invalid') 
            ? 'Incorrect email or password. Please check your credentials and try again.'
            : authError.message.includes('not confirmed')
            ? 'Please confirm your email address before signing in. Check your inbox for a confirmation link.'
            : authError.message || 'Sign in failed. Please try again.';
          setError(friendlyError);
          setIsLoading(false);
          return;
        }
        
        if (!authUser) {
          clearTimeout(timeoutId);
          setError('No user returned from authentication.');
          setIsLoading(false);
          return;
        }
        
        logger.log('Fetching user profile...');
        const profileStart = Date.now();
        const userData = await getUser(authUser.id);
        const profileDuration = Date.now() - profileStart;
        logger.log(`Profile fetch completed in ${profileDuration}ms`);
        logger.log('User profile result:', userData ? `✅ ${userData.email}` : '❌ null');
        
        if (timeoutOccurred) {
          logger.log('Login attempt timed out, skipping');
          return;
        }
        
        if (userData) {
          logger.log('Login successful, setting user state');
          clearTimeout(timeoutId);
          setIsLoading(false);
          onLogin(userData);
          onClose();
          setEmail('');
          setPassword('');
        } else {
          clearTimeout(timeoutId);
          setIsLoading(false);
          setError('User profile not found. Please contact support.');
        }
      } else {
        // Registration flow
        logger.log('Attempting registration for:', email);
        const { user: authUser, error: authError } = await signUpUser(email, password);
        
        logger.log('Registration response:', { user: authUser?.id, error: authError });
        
        if (authError) {
          clearTimeout(timeoutId);
          const friendlyError = authError.message.includes('already registered')
            ? 'This email is already registered. Please sign in instead.'
            : authError.message.includes('Password')
            ? 'Password must be at least 6 characters long.'
            : authError.message || 'Registration failed. Please try again.';
          setError(friendlyError);
          setIsLoading(false);
          return;
        }
        
        if (!authUser) {
          clearTimeout(timeoutId);
          setError('Registration failed. Please try again.');
          setIsLoading(false);
          return;
        }
        
        // Check if email confirmation is required
        if (!authUser.email_confirmed_at) {
          clearTimeout(timeoutId);
          setError('Registration successful! Please check your email to confirm your account before logging in.');
          setIsLoading(false);
          // Switch to login mode after showing message
          setTimeout(() => {
            setMode('login');
            setError('');
          }, 5000);
          return;
        }

        // If email is already confirmed (shouldn't happen in production)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const userData = await getUser(authUser.id);
        
        if (userData) {
          // Update the name if provided
          if (fullName && fullName !== email.split('@')[0]) {
            await updateUser(authUser.id, { name: fullName });
            userData.name = fullName;
          }
          
          // Check for pending campaign claim
          const pendingCampaignId = localStorage.getItem('pendingCampaignClaim');
          if (pendingCampaignId) {
            try {
              logger.log('Claiming campaign incentive...', pendingCampaignId);
              const claimResult = await claimCampaignIncentive(authUser.id, pendingCampaignId);
              
              if (claimResult?.success) {
                logger.log('Campaign incentive claimed:', claimResult);
                // Refresh user data to get updated credits
                const updatedUser = await getUser(authUser.id);
                if (updatedUser) {
                  userData.credits = updatedUser.credits;
                }
                // Clear the pending claim
                localStorage.removeItem('pendingCampaignClaim');
              } else {
                logger.error('Failed to claim campaign incentive:', claimResult?.error);
              }
            } catch (claimErr) {
              logger.error('Campaign claim error:', claimErr);
            }
          }
          
          clearTimeout(timeoutId);
          onLogin(userData);
          onClose();
          setEmail('');
          setPassword('');
          setFullName('');
        } else {
          clearTimeout(timeoutId);
          setError('Failed to load user profile. Please try logging in.');
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      logger.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setError('');
    
    try {
      logger.log('Starting Google OAuth...');
      const { data, error: oauthError } = await signInWithGoogle();
      
      if (oauthError) {
        logger.error('Google OAuth error:', oauthError);
        setError('Failed to sign in with Google. Please try again.');
        setOauthLoading(false);
        return;
      }
      
      // OAuth redirect will happen automatically
      logger.log('Google OAuth initiated, redirecting...');
      // Don't set loading to false - user will be redirected
    } catch (err) {
      logger.error('Google sign-in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setOauthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-4 sm:mx-0 bg-slate-900 border border-slate-800 rounded-3xl sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Join the global Nexus network.</p>
            </div>
            <button onClick={onClose} aria-label="Close dialog" className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-12 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            )}
            
            <div className="relative group">
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address"
                aria-required="true"
                aria-invalid={error && !error.includes('successful') ? "true" : "false"}
                aria-describedby={error ? "auth-error-message" : undefined}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-12 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
            </div>

            <div className="relative group">
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Password"
                aria-required="true"
                aria-invalid={error && !error.includes('successful') ? "true" : "false"}
                aria-describedby={error ? "auth-error-message" : undefined}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-12 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {error && (
              <div 
                id="auth-error-message"
                role="alert"
                aria-live="polite"
                className={`border rounded-xl p-3 text-sm text-center ${
                error.includes('successful') || error.includes('check your email')
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> {mode === 'login' ? 'Sign In' : 'Join Nexus'}</>}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-slate-900 px-4 text-slate-600">Or continue with</span></div>
          </div>

          <div className="flex justify-center">
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || oauthLoading}
              className="flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-xs"
            >
              {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />} Google
            </button>
          </div>

          <p className="text-center text-xs font-medium text-slate-500">
            {mode === 'login' ? "Don't have an account?" : "Already a member?"}{' '}
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-indigo-400 hover:underline font-bold"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
