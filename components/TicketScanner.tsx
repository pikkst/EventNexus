
import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, User as UserIcon, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import { User as UserType } from '../types';
import { validateTicket, getTicketById } from '../services/dbService';
import { parseQRCodeData } from '../services/ticketService';

interface TicketScannerProps {
  user?: UserType;
}

const TicketScanner: React.FC<TicketScannerProps> = ({ user }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<null | { success: boolean; message: string; data?: any }>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pendingScan, setPendingScan] = useState<null | { qrData: string; preview?: { name?: string; email?: string; eventName?: string } }>(null);
  const lastScanRef = useRef<{ data: string; ts: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const navigate = useNavigate();

  const isEnterprise = user?.subscription === 'enterprise';
  const brandColor = isEnterprise && user?.branding ? user.branding.primaryColor : '#6366f1';

  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => handleQRCodeScanned(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
      setScanning(true);
      setHasCamera(true);
    } catch (err) {
      console.error('Camera access denied', err);
      setHasCamera(false);
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
      setScanning(false);
    }
  };

  const handleQRCodeScanned = async (qrData: string) => {
    if (!user) return;
    // Throttle duplicate scans of same code within 3s
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.data === qrData && (now - lastScanRef.current.ts) < 3000) {
      return;
    }
    lastScanRef.current = { data: qrData, ts: now };

    if (processing || pendingScan) return;

    // Pause camera and ask for confirmation
    stopCamera();
    setPendingScan({ qrData });

    // Try to load a preview for confirmation
    const parsed = parseQRCodeData(qrData);
    if (parsed?.ticketId) {
      try {
        const ticket = await getTicketById(parsed.ticketId);
        if (ticket) {
          setPendingScan({
            qrData,
            preview: {
              name: ticket.user?.name || 'Attendee',
              email: ticket.user?.email || '',
              eventName: ticket.event?.name || 'Event'
            }
          });
        }
      } catch (e) {
        // Ignore preview errors
      }
    }
  };

  const confirmCheckIn = async () => {
    if (!pendingScan) return;
    setProcessing(true);
    try {
      const validation = await validateTicket(pendingScan.qrData);
      if (validation && validation.valid) {
        setResult({
          success: true,
          message: validation.message || 'Access Granted',
          data: {
            name: validation.ticket?.user?.name || 'Attendee',
            email: validation.ticket?.user?.email || '',
            type: validation.ticket?.ticket_type || 'General',
            eventName: validation.ticket?.event?.name || 'Event',
            ref: validation.ticket?.id || '',
            selfScan: validation.selfScan || false,
          }
        });
      } else {
        setResult({
          success: false,
          message: validation?.message || validation?.error || 'Invalid Ticket',
          data: validation?.ticket ? {
            name: validation.ticket.user?.name || 'Unknown',
            status: validation.ticket.status,
          } : null
        });
      }
    } catch (error) {
      console.error('Ticket validation failed:', error);
      setResult({ success: false, message: 'Validation Error', data: null });
    } finally {
      setPendingScan(null);
      // Auto-clear result after 4 seconds, then resume camera
      setTimeout(() => {
        setResult(null);
        setProcessing(false);
        startCamera();
      }, 4000);
    }
  };

  const cancelCheckIn = () => {
    setPendingScan(null);
    // Small delay to avoid immediate re-trigger
    setTimeout(() => startCamera(), 300);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  if (!user) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-slate-400 mb-6">Please sign in to use the ticket scanner</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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

        {/* Confirmation Overlay */}
        {pendingScan && !result && (
          <div className="absolute inset-0 flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl space-y-6">
              <div className="flex flex-col items-center text-center">
                <Camera className="w-14 h-14 text-indigo-400 mb-3" />
                <h2 className="text-2xl font-black tracking-tight text-white">Confirm Check-in</h2>
                <p className="text-slate-400 text-sm mt-1">Review attendee before marking ticket as used</p>
              </div>
              {pendingScan.preview && (
                <div className="bg-slate-800/50 rounded-2xl p-4 space-y-3 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Attendee</p>
                      <p className="font-bold text-white">{pendingScan.preview.name}</p>
                      {pendingScan.preview.email && (
                        <p className="text-xs text-slate-400">{pendingScan.preview.email}</p>
                      )}
                    </div>
                  </div>
                  {pendingScan.preview.eventName && (
                    <div className="text-left">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Event</p>
                      <p className="font-bold text-indigo-400">{pendingScan.preview.eventName}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={confirmCheckIn} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">Confirm Check-in</button>
                <button onClick={cancelCheckIn} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}

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
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Attendee</p>
                      <p className="font-bold text-white">{result.data.name}</p>
                      {result.data.email && (
                        <p className="text-xs text-slate-400">{result.data.email}</p>
                      )}
                    </div>
                  </div>
                  {result.data.type && (
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-xs text-slate-500">Ticket Type</p>
                      <p className="text-sm font-bold text-white capitalize">{result.data.type}</p>
                      {result.data.selfScan && (
                        <p className="text-xs text-emerald-400 font-bold mt-1">Self-scan recorded</p>
                      )}
                    </div>
                  )}
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
          onClick={() => !processing && handleQRCodeScanned('test')}
          className="relative group"
          disabled={processing}
        >
          <div className="absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: brandColor }}></div>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-2xl relative text-white ${processing ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ backgroundColor: brandColor }}>
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
