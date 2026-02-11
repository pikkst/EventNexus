import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Chrome, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { signInUser, signUpUser, getUser, signInWithGoogle } from '../services/dbService';
import { User } from '../types';
import logger from '../utils/logger';

interface LoginPageProps {
  onLogin: (userData: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const returnUrl = (location.state as any)?.returnUrl || searchParams.get('returnUrl') || '/dashboard';

  useEffect(() => {
    // Clear error when switching modes
    setError('');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    let timeoutOccurred = false;
    const timeoutId = setTimeout(() => {
      timeoutOccurred = true;
      setIsLoading(false);
      setError('Connection timeout. Please check your internet connection and try again.');
    }, 12000);
    
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
          logger.log('Login successful, redirecting to:', returnUrl);
          clearTimeout(timeoutId);
          setIsLoading(false);
          onLogin(userData);
          navigate(returnUrl);
        } else {
          clearTimeout(timeoutId);
          setIsLoading(false);
          setError('User profile not found. Please contact support.');
        }
      } else {
        // Registration flow
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        logger.log('Attempting registration for:', email);
        const { user: authUser, error: authError } = await signUpUser(email, password, fullName);
        
        logger.log('Registration response:', { user: authUser?.id, error: authError });
        
        if (authError) {
          clearTimeout(timeoutId);
          const friendlyError = authError.message.includes('already registered')
            ? 'This email is already registered. Please use the login form or reset your password.'
            : authError.message || 'Registration failed. Please try again.';
          setError(friendlyError);
          setIsLoading(false);
          return;
        }
        
        if (!authUser) {
          clearTimeout(timeoutId);
          setError('No user returned from registration.');
          setIsLoading(false);
          return;
        }
        
        logger.log('Fetching newly created user profile...');
        const userData = await getUser(authUser.id);
        logger.log('New user profile result:', userData ? `✅ ${userData.email}` : '❌ null');
        
        if (timeoutOccurred) {
          logger.log('Registration attempt timed out, skipping');
          return;
        }
        
        if (userData) {
          logger.log('Registration successful, redirecting to:', returnUrl);
          clearTimeout(timeoutId);
          setIsLoading(false);
          onLogin(userData);
          navigate(returnUrl);
        } else {
          clearTimeout(timeoutId);
          setIsLoading(false);
          setError('User profile not found. Please contact support.');
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setIsLoading(false);
      logger.error('Auth error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setError('');
    try {
      logger.log('Attempting Google sign-in...');
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        logger.error('Google sign-in error:', error);
        setError('Google sign-in failed. Please try again.');
        setOauthLoading(false);
        return;
      }
      
      if (data?.url) {
        logger.log('Redirecting to Google OAuth...');
        window.location.href = data.url;
      }
    } catch (err: any) {
      setOauthLoading(false);
      logger.error('Google sign-in error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-300 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to home</span>
        </button>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">EventNexus</h1>
            </div>
            <h2 className="text-center text-xl font-semibold text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="text-center text-slate-400 text-sm">
              {mode === 'login' 
                ? 'Sign in to access your dashboard and discover events'
                : 'Join EventNexus and start discovering amazing events'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-600"></div>
            <span className="text-xs text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-600"></div>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={oauthLoading || isLoading}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-slate-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Chrome className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Toggle mode */}
          <p className="text-center text-slate-400 text-sm">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('register')}
                  disabled={isLoading}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:cursor-not-allowed"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  disabled={isLoading}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:cursor-not-allowed"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-slate-500 mt-8">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-blue-400 hover:text-blue-300">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/privacy" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
