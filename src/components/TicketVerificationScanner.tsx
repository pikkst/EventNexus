import React, { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle, XCircle, AlertCircle, Camera, Upload, Search } from 'lucide-react';
import { Ticket, TicketVerification, EventNexusEvent } from '../types';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

interface TicketVerificationScannerProps {
  event: EventNexusEvent;
  organizerId: string;
  onVerificationComplete: (verification: TicketVerification) => void;
}

export default function TicketVerificationScanner({
  event,
  organizerId,
  onVerificationComplete
}: TicketVerificationScannerProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    status: 'success' | 'error' | 'warning';
    message: string;
    ticket?: Ticket;
  } | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<TicketVerification[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (scanMode === 'camera' && scanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanMode, scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setVerificationResult({
        status: 'error',
        message: 'Unable to access camera. Please allow camera permissions.'
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        handleQRCodeDetected(code.data);
        return; // Stop scanning after successful detection
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanQRCode);
  };

  const handleQRCodeDetected = async (qrData: string) => {
    setScanning(false);
    await verifyTicket(qrData);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRCodeDetected(code.data);
        } else {
          setVerificationResult({
            status: 'error',
            message: 'No QR code found in the uploaded image.'
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const verifyTicket = async (qrCode: string) => {
    try {
      // Call Edge Function to verify ticket
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-ticket`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            qr_code: qrCode,
            event_id: event.id,
            verifier_id: organizerId
          })
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setVerificationResult({
          status: 'success',
          message: `Ticket verified! ${result.ticket.ticket_name} for ${result.ticket.holder_name}`,
          ticket: result.ticket
        });
        
        const verification: TicketVerification = {
          id: result.verification_id,
          ticket_id: result.ticket.id,
          event_id: event.id,
          verified_by: organizerId,
          verified_at: new Date().toISOString(),
          location: result.location
        };
        
        setRecentVerifications(prev => [verification, ...prev.slice(0, 9)]);
        onVerificationComplete(verification);
      } else if (result.warning) {
        setVerificationResult({
          status: 'warning',
          message: result.message,
          ticket: result.ticket
        });
      } else {
        setVerificationResult({
          status: 'error',
          message: result.message || 'Ticket verification failed.'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        status: 'error',
        message: 'Network error. Please check your connection.'
      });
    }
  };

  const handleManualVerify = () => {
    if (!manualCode.trim()) return;
    verifyTicket(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-8 h-8 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ticket Verification</h2>
          <p className="text-sm text-gray-600">{event.name}</p>
        </div>
      </div>

      {/* Scan Mode Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScanMode('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            scanMode === 'camera'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Camera className="w-5 h-5" />
          Camera
        </button>
        <button
          onClick={() => setScanMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            scanMode === 'upload'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Upload className="w-5 h-5" />
          Upload
        </button>
        <button
          onClick={() => setScanMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            scanMode === 'manual'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Search className="w-5 h-5" />
          Manual
        </button>
      </div>

      {/* Scanning Interface */}
      <div className="mb-6">
        {scanMode === 'camera' && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <button
                    onClick={() => setScanning(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Start Scanning
                  </button>
                </div>
              )}
              
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-4 border-white rounded-lg" style={{ width: '60%', height: '60%' }}>
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                  </div>
                </div>
              )}
            </div>
            
            {scanning && (
              <button
                onClick={() => setScanning(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
              >
                Stop Scanning
              </button>
            )}
          </div>
        )}

        {scanMode === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 transition-colors"
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-1">Click to upload QR code image</p>
            <p className="text-sm text-gray-400">PNG, JPG up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {scanMode === 'manual' && (
          <div className="space-y-3">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualVerify()}
              placeholder="Enter ticket code manually"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleManualVerify}
              disabled={!manualCode.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Verify Ticket
            </button>
          </div>
        )}
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div
          className={`rounded-lg p-4 mb-6 ${
            verificationResult.status === 'success'
              ? 'bg-green-50 border border-green-200'
              : verificationResult.status === 'warning'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {verificationResult.status === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : verificationResult.status === 'warning' ? (
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${
                  verificationResult.status === 'success'
                    ? 'text-green-900'
                    : verificationResult.status === 'warning'
                    ? 'text-yellow-900'
                    : 'text-red-900'
                }`}
              >
                {verificationResult.message}
              </p>
              {verificationResult.ticket && (
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  <p><strong>Type:</strong> {verificationResult.ticket.ticket_name}</p>
                  <p><strong>Holder:</strong> {verificationResult.ticket.holder_name}</p>
                  <p><strong>Email:</strong> {verificationResult.ticket.holder_email}</p>
                  <p><strong>Purchased:</strong> {new Date(verificationResult.ticket.purchased_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Verifications */}
      {recentVerifications.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Recent Verifications</h3>
          <div className="space-y-2">
            {recentVerifications.map((verification) => (
              <div
                key={verification.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    Ticket verified
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(verification.verified_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
