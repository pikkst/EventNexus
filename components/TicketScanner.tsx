
import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, User, Info, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User as UserType } from '../types';

interface TicketScannerProps {
  user?: UserType;
}

const TicketScanner: React.FC<TicketScannerProps> = ({ user }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<null | { success: boolean; message: string; data?: any }>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const isEnterprise = user?.subscription === 'enterprise';
  const brandColor = isEnterprise && user?.branding ? user.branding.primaryColor : '#6366f1';

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        setHasCamera(true);
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setScanning(false);
    }
  };

  const validateTicket = async (ticketId: string) => {
    try {
      // TODO: Implement real ticket validation via dbService
      // For now, simulate validation with realistic logic
      const isSuccess = Math.random() > 0.2;
      setResult({
        success: isSuccess,
        message: isSuccess ? "Access Granted" : "Invalid Ticket",
        data: isSuccess ? {
          name: "Event Attendee",
          type: "General Admission",
          ref: ticketId || "TKT-" + Math.random().toString(36).substr(2, 6).toUpperCase()
        } : null
      });
      
      // Auto-clear result after 4 seconds
      setTimeout(() => setResult(null), 4000);
    } catch (error) {
      console.error('Ticket validation failed:', error);
      setResult({
        success: false,
        message: "Validation Error",
        data: null
      });
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col">
      {/* Header - Branded */}
      <div className="p-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: brandColor }}>
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white">
              {isEnterprise ? 'Branded Entry Control' : 'Entry Control'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brandColor }}>
              {isEnterprise ? user?.name : 'Midnight Techno RAVE'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Scanner View */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {!hasCamera ? (
          <div className="text-center p-8 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Camera Access Required</h2>
            <p className="text-slate-400 text-sm">Please enable camera permissions in your browser settings to scan tickets.</p>
            <button 
              onClick={startCamera} 
              className="px-6 py-3 rounded-xl font-bold text-sm text-white" 
              style={{ backgroundColor: brandColor }}
            >
              Grant Access
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover opacity-60"
          />
        )}

        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 rounded-[40px] relative transition-all duration-700" style={{ borderColor: brandColor }}>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white translate-x-1 translate-y-1 rounded-br-xl"></div>
            
            <div className="absolute inset-x-4 h-0.5 shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-scan-line top-0" style={{ backgroundColor: brandColor }}></div>
          </div>
          <p className="mt-8 text-white/60 font-bold text-xs uppercase tracking-[0.3em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
            Align {isEnterprise ? user?.name : 'Nexus'} Ticket
          </p>
        </div>

        {/* Result Overlay */}
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300 ${result.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl space-y-6">
              <div className="flex flex-col items-center text-center">
                {result.success ? (
                  <CheckCircle className="w-20 h-20 text-emerald-500 mb-4" />
                ) : (
                  <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
                )}
                <h2 className={`text-3xl font-black tracking-tight ${result.success ? 'text-emerald-500' : 'text-red-500'}`}>
                  {result.message}
                </h2>
              </div>
              
              {result.data && (
                <div className="bg-slate-800/50 rounded-2xl p-4 space-y-3 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Attendee</p>
                      <p className="font-bold text-white">{result.data.name}</p>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setResult(null)} 
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all text-white"
              >
                Scan Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-8 bg-slate-950 border-t border-slate-800 flex items-center justify-around">
        <button className="flex flex-col items-center gap-2 group">
          <div className="p-4 bg-slate-900 group-hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-slate-400">
            <RefreshCw className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Switch</span>
        </button>
        
        <button 
          onClick={() => validateTicket('')}
          className="relative group"
        >
          <div className="absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: brandColor }}></div>
          <div className="w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-2xl relative text-white" style={{ backgroundColor: brandColor }}>
            <Camera className="w-10 h-10" />
          </div>
        </button>

        <button className="flex flex-col items-center gap-2 group">
          <div className="p-4 bg-slate-900 group-hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-slate-400">
            <Info className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Support</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}} />
    </div>
  );
};

export default TicketScanner;
