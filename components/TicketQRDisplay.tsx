import React, { useEffect, useState, useRef } from 'react';
import { Download, Share2, Printer, Mail } from 'lucide-react';
import QRCode from 'qrcode';
import { Ticket, EventNexusEvent } from '../types';

interface TicketQRDisplayProps {
  ticket: Ticket;
  event: EventNexusEvent;
  showActions?: boolean;
}

export default function TicketQRDisplay({ ticket, event, showActions = true }: TicketQRDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [ticket.qr_code]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(ticket.qr_code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('QR code generation error:', error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `ticket-${ticket.id}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Escape HTML to prevent XSS
    const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${escapeHtml(event.name)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
            }
            .ticket-container {
              border: 2px solid #000;
              padding: 30px;
              border-radius: 10px;
            }
            .ticket-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px dashed #ccc;
              padding-bottom: 20px;
            }
            .event-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .ticket-type {
              font-size: 20px;
              color: #666;
              margin-bottom: 5px;
            }
            .ticket-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 30px;
            }
            .detail-item {
              margin-bottom: 10px;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            }
            .detail-value {
              font-size: 16px;
              margin-top: 2px;
            }
            .qr-section {
              text-align: center;
              padding-top: 20px;
              border-top: 2px dashed #ccc;
            }
            .qr-code {
              margin: 20px auto;
            }
            .qr-instructions {
              font-size: 14px;
              color: #666;
              margin-top: 10px;
            }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="ticket-header">
              <div class="event-name">${escapeHtml(event.name)}</div>
              <div class="ticket-type">${escapeHtml(ticket.ticket_name)}</div>
            </div>
            
            <div class="ticket-details">
              <div class="detail-item">
                <div class="detail-label">Holder Name</div>
                <div class="detail-value">${escapeHtml(ticket.holder_name)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Ticket Type</div>
                <div class="detail-value">${escapeHtml(ticket.ticket_type)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Event Date</div>
                <div class="detail-value">${escapeHtml(new Date(event.date).toLocaleDateString())} ${escapeHtml(event.time)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Location</div>
                <div class="detail-value">${escapeHtml(event.location.address)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Purchase Date</div>
                <div class="detail-value">${escapeHtml(new Date(ticket.purchased_at).toLocaleString())}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Ticket ID</div>
                <div class="detail-value">${escapeHtml(ticket.id.slice(0, 8).toUpperCase())}</div>
              </div>
            </div>
            
            <div class="qr-section">
              <img src="${escapeHtml(qrDataUrl)}" class="qr-code" alt="Ticket QR Code" />
              <div class="qr-instructions">
                Present this QR code at the venue entrance
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShare = async () => {
    if (navigator.share && qrDataUrl) {
      try {
        const blob = await (await fetch(qrDataUrl)).blob();
        const file = new File([blob], `ticket-${ticket.id}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: `${event.name} Ticket`,
          text: `My ticket for ${event.name}`,
          files: [file]
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Ticket Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{event.name}</h3>
            <p className="text-indigo-100">{ticket.ticket_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {ticket.status.toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-indigo-200 mb-1">Date & Time</p>
            <p className="font-medium">{new Date(event.date).toLocaleDateString()}</p>
            <p className="font-medium">{event.time}</p>
          </div>
          <div>
            <p className="text-indigo-200 mb-1">Location</p>
            <p className="font-medium">{event.location.city}</p>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="p-6 text-center">
        {qrDataUrl ? (
          <>
            <img 
              src={qrDataUrl} 
              alt="Ticket QR Code" 
              className="mx-auto mb-4 rounded-lg shadow-md"
              style={{ width: '300px', height: '300px' }}
            />
            <p className="text-sm text-gray-600 mb-2">Present this code at the entrance</p>
            <p className="text-xs text-gray-400 font-mono">{ticket.qr_code.slice(0, 20)}...</p>
          </>
        ) : (
          <div className="animate-pulse bg-gray-200 mx-auto rounded-lg" style={{ width: '300px', height: '300px' }} />
        )}
      </div>

      {/* Ticket Details */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Ticket Holder</p>
            <p className="font-medium text-gray-900">{ticket.holder_name}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Purchase Date</p>
            <p className="font-medium text-gray-900">
              {new Date(ticket.purchased_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Price Paid</p>
            <p className="font-medium text-gray-900">${ticket.price_paid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Ticket ID</p>
            <p className="font-medium text-gray-900 font-mono text-xs">
              {ticket.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {ticket.used_at && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-gray-500 text-sm mb-1">Used At</p>
            <p className="font-medium text-gray-900 text-sm">
              {new Date(ticket.used_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && ticket.status === 'valid' && (
        <div className="border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          {navigator.share && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
