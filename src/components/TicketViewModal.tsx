/**
 * TicketViewModal Component - Full-screen ticket display for easy scanning
 * 
 * Shows a large, clear view of a single ticket with QR code
 * Optimized for scanning at event venues
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Ticket as TicketIcon, CheckCircle, XCircle, Clock, Download, Share2, Maximize2 } from 'lucide-react';
import { generateTicketQRImage } from '../services/ticketService';

interface TicketViewModalProps {
  ticket: {
    id: string;
    event_id: string;
    user_id: string;
    ticket_type: string;
    price: number;
    status: 'valid' | 'used' | 'cancelled' | 'expired';
    qr_code: string;
    purchase_date: string;
    used_at?: string;
    event: {
      id: string;
      name: string;
      date: string;
      time: string;
      location: any;
      imageUrl?: string;
    };
  };
  onClose: () => void;
}

export const TicketViewModal: React.FC<TicketViewModalProps> = ({ ticket, onClose }) => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [brightness, setBrightness] = useState(1);

  // Removed debug log

  useEffect(() => {
    // Generate QR code image
    const loadQR = async () => {
      try {
        const qrDataUrl = await generateTicketQRImage(
          ticket.id,
          ticket.event_id,
          ticket.user_id
        );
        setQrImage(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQR();

    // Increase screen brightness for scanning (via CSS filter on body)
    document.body.style.filter = 'brightness(1.2)';
    
    return () => {
      document.body.style.filter = '';
    };
  }, [ticket.id, ticket.event_id, ticket.user_id]);

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'valid':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'used':
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      case 'cancelled':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'expired':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = () => {
    switch (ticket.status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5" />;
      case 'used':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      case 'expired':
        return <Clock className="w-5 h-5" />;
      default:
        return <TicketIcon className="w-5 h-5" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'FREE' : `€${price.toFixed(2)}`;
  };

  const handleDownload = () => {
    if (!qrImage) return;
    
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `ticket-${ticket.id}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!qrImage) return;

    try {
      // Convert data URL to blob
      const response = await fetch(qrImage);
      const blob = await response.blob();
      const file = new File([blob], `ticket-${ticket.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Ticket for ${ticket.event.name}`,
          text: `My ticket for ${ticket.event.name}`,
          files: [file],
        });
      } else {
        // Fallback: copy to clipboard
        alert('Ticket QR code ready to share! Use the download button to save it.');
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-800/90 hover:bg-slate-700 rounded-full transition-colors border border-slate-700"
        >
          <X className="w-6 h-6 text-slate-300" />
        </button>

        {/* Event Header Image */}
        <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-purple-600 overflow-hidden">
          {ticket.event.imageUrl && (
            <img 
              src={ticket.event.imageUrl} 
              alt={ticket.event.name}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase tracking-wider ${getStatusColor()}`}>
              {getStatusIcon()}
              {ticket.status}
            </div>
          </div>

          {/* Event Name */}
          <div className="absolute bottom-6 left-6 right-6">
            <h2 className="text-white font-black text-3xl leading-tight">
              {ticket.event.name}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Event Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-slate-300">
              <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Date & Time</p>
                <p className="font-semibold">{formatDate(ticket.event.date)}</p>
                <p className="text-indigo-400 font-bold">{ticket.event.time}</p>
              </div>
            </div>
            
            {ticket.event.location && (
              <div className="flex items-start gap-3 text-slate-300">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Location</p>
                  <p className="font-semibold">
                    {ticket.event.location.address || ticket.event.location.city}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* QR Code - Large and centered for easy scanning */}
          {ticket.status === 'valid' && (
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              {loading ? (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600" />
                </div>
              ) : qrImage ? (
                <div className="space-y-4">
                  <img 
                    src={qrImage} 
                    alt="Ticket QR Code"
                    className="w-full h-auto max-w-md mx-auto"
                  />
                  <div className="text-center">
                    <p className="text-sm text-slate-600 font-bold uppercase tracking-wider mb-2">
                      Scan this code at venue entrance
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      ID: {ticket.qr_code.substring(0, 16)}...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <p className="font-bold">QR Code Generation Error</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Used/Cancelled Info */}
          {ticket.status === 'used' && ticket.used_at && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-300 font-semibold">
                ✓ Ticket scanned on {new Date(ticket.used_at).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {ticket.status === 'cancelled' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 font-semibold">
                ⚠ This ticket has been cancelled and is no longer valid.
              </p>
            </div>
          )}

          {ticket.status === 'expired' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <p className="text-orange-400 font-semibold">
                ⏱ This ticket has expired.
              </p>
            </div>
          )}

          {/* Ticket Info Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Ticket Type</p>
              <p className="text-lg font-bold text-white capitalize">{ticket.ticket_type}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Price Paid</p>
              <p className="text-lg font-bold text-white">{formatPrice(ticket.price)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          {ticket.status === 'valid' && qrImage && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          )}

          {/* Purchase Info */}
          <div className="text-center text-xs text-slate-500 pt-2">
            Purchased on {formatDate(ticket.purchase_date)}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TicketViewModal;
