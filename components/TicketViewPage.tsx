import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { X, Calendar, MapPin, Ticket as TicketIcon, CheckCircle, XCircle, Clock, Download, Share2, ArrowLeft, Printer } from 'lucide-react';
import { generateTicketQRImage } from '../services/ticketService';
import { getTicketById } from '../services/dbService';

const TicketViewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [ticket, setTicket] = useState<any | null>((location.state as any)?.ticket || null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load ticket if coming from deep link
    if (!ticket && params.id) {
      (async () => {
        const t = await getTicketById(params.id!);
        if (t) setTicket(t);
      })();
    }
  }, [params.id, ticket]);

  useEffect(() => {
    if (!ticket) return;
    const loadQR = async () => {
      try {
        const qrDataUrl = await generateTicketQRImage(ticket.id, ticket.event_id, ticket.user_id);
        setQrImage(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQR();
    // Brightness for scanning
    document.body.style.filter = 'brightness(1.1)';
    return () => { document.body.style.filter = '' };
  }, [ticket]);

  // ESC key closes page (navigates back)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/profile');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const getStatusColor = () => {
    switch (ticket?.status) {
      case 'valid': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'used': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      case 'cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'expired': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = () => {
    switch (ticket?.status) {
      case 'valid': return <CheckCircle className="w-5 h-5" />;
      case 'used': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      case 'expired': return <Clock className="w-5 h-5" />;
      default: return <TicketIcon className="w-5 h-5" />;
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const formatPrice = (price: number) => price === 0 ? 'FREE' : `€${price.toFixed(2)}`;

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
      const response = await fetch(qrImage);
      const blob = await response.blob();
      const file = new File([blob], `ticket-${ticket.id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Ticket for ${ticket.event.name}`, text: `My ticket for ${ticket.event.name}`, files: [file] });
      } else {
        alert('Ticket QR code ready to share! Use the download button to save it.');
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  if (!ticket) {
    // If opened directly without state, go back to profile
    useEffect(() => { navigate('/profile'); }, [navigate]);
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </button>
        <div className="mt-6 text-slate-300">No ticket selected.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase tracking-wider ${getStatusColor()}`}>
            {getStatusIcon()}
            {ticket.status}
          </div>
        </div>

        <div className="relative h-40 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl overflow-hidden mb-6">
          {ticket.event?.imageUrl && (
            <img src={ticket.event.imageUrl} alt={ticket.event.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-white font-black text-2xl leading-tight">{ticket.event?.name}</h2>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(ticket.event?.date)} at {ticket.event?.time}</span>
            </div>
            {ticket.event?.location && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="w-4 h-4" />
                <span>{ticket.event.location.address || ticket.event.location.city}</span>
              </div>
            )}
          </div>

          {ticket.status === 'valid' && (
            <div className="bg-white p-6 rounded-2xl">
              {loading ? (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600" />
                </div>
              ) : qrImage ? (
                <div className="space-y-4">
                  <img src={qrImage} alt="Ticket QR Code" className="w-full h-auto max-w-md mx-auto" />
                  <div className="text-center">
                    <p className="text-sm text-slate-600 font-bold uppercase tracking-wider mb-2">Scan this code at venue entrance</p>
                    <p className="text-xs text-slate-500 font-mono">ID: {ticket.qr_code.substring(0, 16)}...</p>
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

          {ticket.status === 'used' && ticket.used_at && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-300 font-semibold">✓ Ticket scanned on {new Date(ticket.used_at).toLocaleString()}</p>
            </div>
          )}

          {ticket.status === 'cancelled' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 font-semibold">⚠ This ticket has been cancelled and is no longer valid.</p>
            </div>
          )}

          {ticket.status === 'expired' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <p className="text-orange-400 font-semibold">⏱ This ticket has expired.</p>
            </div>
          )}

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

          {ticket.status === 'valid' && qrImage && (
            <div className="flex gap-3 pt-2">
              <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700">
                <Printer className="w-5 h-5" />
                Print
              </button>
              <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700">
                <Download className="w-5 h-5" />
                Download
              </button>
              <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketViewPage;
