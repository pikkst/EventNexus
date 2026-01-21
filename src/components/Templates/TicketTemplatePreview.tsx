/**
 * TicketTemplatePreview Component
 * Shows a preview of how a ticket will look with the selected template
 */

import React from 'react';
import { QrCode, Calendar, MapPin, Clock, User } from 'lucide-react';
import type { TicketTemplate } from '../../types';
import { getTicketTemplateStyles, getTicketPatternClass } from '../../services/templateService';

interface TicketTemplatePreviewProps {
  template: TicketTemplate;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  ticketType?: string;
  attendeeName?: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const TicketTemplatePreview: React.FC<TicketTemplatePreviewProps> = ({
  template,
  eventName = 'Sample Event',
  eventDate = '2026-03-15',
  eventLocation = 'Tallinn, Estonia',
  ticketType = 'Standard',
  attendeeName = 'John Doe',
  showDetails = true,
  size = 'medium'
}) => {
  const styles = getTicketTemplateStyles(template);
  const patternClass = getTicketPatternClass(template);

  const sizeClasses = {
    small: 'w-64 p-3 text-xs',
    medium: 'w-80 p-4 text-sm',
    large: 'w-96 p-6 text-base'
  };

  return (
    <div className="relative">
      <div
        className={`ticket-preview ${sizeClasses[size]} ${patternClass} relative overflow-hidden`}
        style={styles}
      >
        {/* Overlay effects */}
        {template.overlay_effect === 'shine' && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
        )}
        {template.overlay_effect === 'holographic' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 pointer-events-none animate-holographic" />
        )}

        {/* Ticket Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold" style={{ color: template.text_color }}>
              {eventName}
            </h3>
            <p className="opacity-75 mt-1" style={{ color: template.text_color }}>
              {ticketType}
            </p>
          </div>
          {showDetails && (
            <div className="ml-3">
              <QrCode 
                size={size === 'small' ? 40 : size === 'medium' ? 50 : 60} 
                style={{ color: template.accent_color }}
              />
            </div>
          )}
        </div>

        {/* Ticket Details */}
        {showDetails && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: template.accent_color }} />
              <span style={{ color: template.text_color }}>{eventDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} style={{ color: template.accent_color }} />
              <span style={{ color: template.text_color }}>{eventLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: template.accent_color }} />
              <span style={{ color: template.text_color }}>19:00</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} style={{ color: template.accent_color }} />
              <span style={{ color: template.text_color }}>{attendeeName}</span>
            </div>
          </div>
        )}

        {/* Ticket Footer */}
        <div className="border-t pt-2 mt-3 opacity-60" style={{ borderColor: template.text_color }}>
          <p className="text-xs" style={{ color: template.text_color }}>
            Ticket ID: #TKT-{Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>

        {/* Decorative elements based on template type */}
        {template.template_type === 'vip' && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold" 
               style={{ backgroundColor: template.accent_color, color: '#ffffff' }}>
            VIP
          </div>
        )}
      </div>

      {/* Template name label */}
      <div className="mt-2 text-center text-sm text-gray-600">
        {template.display_name.en}
      </div>
    </div>
  );
};

export default TicketTemplatePreview;
