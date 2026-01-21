/**
 * TemplatedTicket Component
 * Renders a ticket with the selected template styling
 */

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, User, Download, Printer, Mail, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import type { Ticket, EventNexusEvent, TicketTemplate } from '../types';
import { getTicketTemplate } from '../services/templateService';
import { getTicketTemplateStyles, getTicketPatternClass } from '../services/templateService';

interface TemplatedTicketProps {
  ticket: Ticket;
  event: EventNexusEvent;
  templateId?: string;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const TemplatedTicket: React.FC<TemplatedTicketProps> = ({
  ticket,
  event,
  templateId,
  showActions = true,
  size = 'large'
}) => {
  const [template, setTemplate] = useState<TicketTemplate | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
    generateQRCode();
  }, [templateId, ticket.qr_code]);

  const loadTemplate = async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getTicketTemplate(templateId);
      setTemplate(data);
    } catch (error) {
      console.error('Error loading ticket template:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(ticket.qr_code, {
        width: 300,
        margin: 2,
        color: {
          dark: template?.text_color || '#000000',
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
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket - ${event.name}`,
          text: `My ticket for ${event.name}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    }
  };

  const sizeClasses = {
    small: 'max-w-md p-4',
    medium: 'max-w-lg p-6',
    large: 'max-w-2xl p-8'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Default styles if no template
  const styles = template ? getTicketTemplateStyles(template) : {
    backgroundColor: '#ffffff',
    color: '#000000',
    borderRadius: '16px',
    border: '2px solid #e5e7eb'
  };

  const patternClass = template ? getTicketPatternClass(template) : '';

  return (
    <div className="space-y-4">
      {/* Ticket */}
      <div
        className={`${sizeClasses[size]} ${patternClass} relative overflow-hidden mx-auto`}
        style={styles}
      >
        {/* Overlay effects */}
        {template?.overlay_effect === 'shine' && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
        )}
        {template?.overlay_effect === 'holographic' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 pointer-events-none animate-holographic" />
        )}

        {/* VIP Badge */}
        {template?.template_type === 'vip' && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase"
               style={{ backgroundColor: template.accent_color, color: '#ffffff' }}>
            VIP
          </div>
        )}

        {/* Header */}
        <div className="border-b pb-6 mb-6" style={{ borderColor: `${template?.text_color || '#000'}20` }}>
          <div className="text-center">
            <h2 className={`font-black ${size === 'small' ? 'text-2xl' : size === 'medium' ? 'text-3xl' : 'text-4xl'} mb-2`}
                style={{ color: template?.text_color || '#000' }}>
              {event.name}
            </h2>
            <p className={`${textSizeClasses[size]} opacity-75`}
               style={{ color: template?.text_color || '#000' }}>
              {ticket.ticket_type || 'General Admission'}
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left: Event Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: template?.accent_color || '#6366f1' }} />
              <div>
                <p className={`text-xs uppercase font-bold opacity-60 mb-1`} style={{ color: template?.text_color || '#000' }}>
                  Date & Time
                </p>
                <p className="font-bold" style={{ color: template?.text_color || '#000' }}>
                  {new Date(event.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="font-semibold" style={{ color: template?.accent_color || '#6366f1' }}>
                  {event.time}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: template?.accent_color || '#6366f1' }} />
              <div>
                <p className="text-xs uppercase font-bold opacity-60 mb-1" style={{ color: template?.text_color || '#000' }}>
                  Location
                </p>
                <p className="font-semibold" style={{ color: template?.text_color || '#000' }}>
                  {event.location.city}
                </p>
                <p className="text-sm opacity-75" style={{ color: template?.text_color || '#000' }}>
                  {event.location.address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: template?.accent_color || '#6366f1' }} />
              <div>
                <p className="text-xs uppercase font-bold opacity-60 mb-1" style={{ color: template?.text_color || '#000' }}>
                  Ticket Holder
                </p>
                <p className="font-semibold" style={{ color: template?.text_color || '#000' }}>
                  {ticket.attendee_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center justify-center">
            {qrDataUrl && (
              <div className="bg-white p-4 rounded-lg">
                <img src={qrDataUrl} alt="Ticket QR Code" className="w-48 h-48" />
              </div>
            )}
            <p className="text-xs mt-3 opacity-60 text-center" style={{ color: template?.text_color || '#000' }}>
              Scan at venue entrance
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex items-center justify-between"
             style={{ borderColor: `${template?.text_color || '#000'}20` }}>
          <div>
            <p className="text-xs opacity-60" style={{ color: template?.text_color || '#000' }}>
              Ticket ID
            </p>
            <p className="font-mono text-sm font-bold" style={{ color: template?.text_color || '#000' }}>
              {ticket.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-60" style={{ color: template?.text_color || '#000' }}>
              Status
            </p>
            <p className={`text-sm font-bold ${
              ticket.status === 'valid' ? '' : 'text-red-600'
            }`} style={{ color: ticket.status === 'valid' ? (template?.accent_color || '#10b981') : '#dc2626' }}>
              {ticket.status?.toUpperCase() || 'VALID'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Printer size={16} />
            Print
          </button>
          {navigator.share && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Share2 size={16} />
              Share
            </button>
          )}
        </div>
      )}

      {/* Template Info */}
      {template && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Template: {template.display_name.en}
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplatedTicket;
