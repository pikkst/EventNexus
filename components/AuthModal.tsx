
import React, { useState } from 'react';
import { X, Mail, Lock, Github, Chrome, Facebook, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { signInUser, signUpUser, getUser, updateUser } from '../services/dbService';
import { User } from '../types';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (mode === 'login') {
        const { user: authUser, error: authError } = await signInUser(email, password);
        
        if (authError) {
          setError(authError.message || 'Login failed');
          setIsLoading(false);
          return;
        }
        
        if (authUser) {
          const userData = await getUser(authUser.id);
          if (userData) {
            onLogin(userData);
            onClose();
            setEmail('');
            setPassword('');
          } else {
            setError('User profile not found');
          }
        }
      } else {
        // Registration flow
        const { user: authUser, error: authError } = await signUpUser(email, password);
        
        if (authError) {
          setError(authError.message || 'Registration failed');
          setIsLoading(false);
          return;
        }
        
        if (authUser) {
          // Wait a moment for the database trigger to create the user profile
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Fetch the auto-created user profile
          const userData = await getUser(authUser.id);
          
          if (userData) {
            // Update the name if provided
            if (fullName && fullName !== email.split('@')[0]) {
              await updateUser(authUser.id, { name: fullName });
              userData.name = fullName;
            }
            
            onLogin(userData);
            onClose();
            setEmail('');
            setPassword('');
            setFullName('');
          } else {
            setError('Failed to load user profile. Please try logging in.');
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="p-8 sm:p-10 space-y-8 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-white">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-400 text-sm font-medium">Join the global Nexus network.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-12 py-4 text-sm text-white outline-none focus:border-indigo-500 transition-all"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
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

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-sm font-bold text-white">
              <Chrome className="w-4 h-4" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-sm font-bold text-white">
              <Facebook className="w-4 h-4" /> Facebook
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
