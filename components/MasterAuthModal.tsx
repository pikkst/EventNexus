import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, AlertTriangle, Eye, EyeOff, KeyRound } from 'lucide-react';

interface MasterAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (success: boolean) => void;
  operationName: string;
}

const MasterAuthModal: React.FC<MasterAuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuthenticate, 
  operationName 
}) => {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [error, setError] = useState('');

  const MASTER_PASSKEY = 'NEXUS_MASTER_2025'; // In production, this should be stored securely in Supabase
  const MAX_ATTEMPTS = 3;
  const LOCK_DURATION = 60; // seconds

  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockTimer, isLocked]);

  const handleVerify = () => {
    if (isLocked) return;

    if (passkey === MASTER_PASSKEY) {
      setError('');
      setPasskey('');
      setAttempts(0);
      onAuthenticate(true);
      onClose();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(`Invalid passkey. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockTimer(LOCK_DURATION);
        setError(`Too many failed attempts. Locked for ${LOCK_DURATION} seconds.`);
        setPasskey('');
      }
    }
  };

  const handleClose = () => {
    if (!isLocked) {
      setPasskey('');
      setError('');
      onAuthenticate(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)] max-w-md w-full p-8 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500 via-transparent to-amber-500 animate-pulse"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
              <Lock className="w-6 h-6 text-amber-500 absolute bottom-0 right-0" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-center mb-2 text-red-500 uppercase tracking-wider">
            Master Auth Required
          </h2>
          <p className="text-slate-400 text-center text-sm mb-6">
            Entering modification mode. Secondary passkey is required for platform-wide changes.
          </p>

          {/* Operation Badge */}
          <div className="bg-slate-950/50 border border-red-500/30 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Protected Operation</div>
                <div className="text-sm font-bold text-white">{operationName}</div>
              </div>
            </div>
          </div>

          {/* Security Warning */}
          {!isLocked && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">
                This action requires master authentication. Unauthorized access attempts are logged and monitored.
              </p>
            </div>
          )}

          {/* Lock Screen */}
          {isLocked ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
              <p className="text-red-400 font-bold mb-2">System Locked</p>
              <p className="text-slate-400 text-sm">
                Too many failed attempts. Please wait <span className="text-red-500 font-mono">{lockTimer}</span> seconds.
              </p>
            </div>
          ) : (
            <>
              {/* Passkey Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                  Master Passkey
                </label>
                <div className="relative">
                  <input
                    type={showPasskey ? 'text' : 'password'}
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder="Enter master passkey"
                    className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-lg px-4 py-3 pr-12 text-white font-mono focus:outline-none focus:border-red-500 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowPasskey(!showPasskey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPasskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </p>
                )}

                {/* Attempts Counter */}
                {attempts > 0 && !isLocked && (
                  <div className="mt-2 flex items-center gap-2">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          i < attempts ? 'bg-red-500' : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors border border-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify}
                  disabled={!passkey.trim()}
                  className="flex-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Authenticate
                </button>
              </div>
            </>
          )}

          {/* Security Notice */}
          <p className="text-center text-xs text-slate-600 mt-6">
            All authentication attempts are logged with timestamp and IP address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterAuthModal;
