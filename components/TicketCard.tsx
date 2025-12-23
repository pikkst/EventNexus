/**
 * TicketCard Component - Displays ticket with QR code
 * 
 * Shows:
 * - Event details (name, date, location)
 * - Ticket status (valid, used, cancelled)
 * - QR code for scanning at venue
 * - Purchase information
 */

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Ticket as TicketIcon, CheckCircle, XCircle, Clock, Maximize2 } from 'lucide-react';
import { generateTicketQRImage } from '../services/ticketService';

interface TicketCardProps {
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
  onExpand?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onExpand }) => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        return <CheckCircle className="w-4 h-4" />;
      case 'used':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      default:
        return <TicketIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'FREE' : `€${price.toFixed(2)}`;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all relative group">
      {/* Expand Button */}
      {onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="absolute top-3 left-3 z-10 p-2 bg-slate-900/90 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-slate-700 hover:border-indigo-500"
          title="View full ticket"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
      
      {/* Event Header */}
      <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-purple-600 overflow-hidden">
        {ticket.event.imageUrl && (
          <img 
            src={ticket.event.imageUrl} 
            alt={ticket.event.name}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${getStatusColor()}`}>
            {getStatusIcon()}
            {ticket.status}
          </div>
        </div>

        {/* Event Name */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
            {ticket.event.name}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Event Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(ticket.event.date)} at {ticket.event.time}</span>
          </div>
          
          {ticket.event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">
                {ticket.event.location.address || ticket.event.location.city}
              </span>
            </div>
          )}
        </div>

        {/* QR Code */}
        {ticket.status === 'valid' && (
          <div className="bg-white p-3 rounded-xl">
            {loading ? (
              <div className="w-full aspect-square flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
              </div>
            ) : qrImage ? (
              <img 
                src={qrImage} 
                alt="Ticket QR Code"
                className="w-full h-auto"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-slate-400 text-sm">
                QR Code Error
              </div>
            )}
            <p className="text-center text-xs text-slate-600 mt-2 font-mono">
              {ticket.qr_code.substring(0, 20)}...
            </p>
          </div>
        )}

        {/* Used/Cancelled Info */}
        {ticket.status === 'used' && ticket.used_at && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm">
            <p className="text-slate-400">
              Scanned on {new Date(ticket.used_at).toLocaleString()}
            </p>
          </div>
        )}

        {ticket.status === 'cancelled' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
            <p className="text-red-400">
              This ticket has been cancelled and is no longer valid.
            </p>
          </div>
        )}

        {/* Ticket Info */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Ticket Type</p>
            <p className="text-sm font-bold text-white capitalize">{ticket.ticket_type}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Price</p>
            <p className="text-sm font-bold text-white">{formatPrice(ticket.price)}</p>
          </div>
        </div>

        {/* Purchase Date */}
        <div className="text-xs text-slate-500 text-center">
          Purchased on {formatDate(ticket.purchase_date)}
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
