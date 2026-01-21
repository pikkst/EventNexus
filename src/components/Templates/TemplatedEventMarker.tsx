/**
 * TemplatedEventMarker Component
 * Renders an event marker on the map with template styling
 */

import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { divIcon } from 'leaflet';
import * as LucideIcons from 'lucide-react';
import type { EventNexusEvent, EventMarkerTemplate } from '../../types';
import { getMarkerTemplate } from '../../services/templateService';

interface TemplatedEventMarkerProps {
  event: EventNexusEvent;
  templateId?: string;
  onClick?: () => void;
}

export const TemplatedEventMarker: React.FC<TemplatedEventMarkerProps> = ({
  event,
  templateId,
  onClick
}) => {
  const [template, setTemplate] = useState<EventMarkerTemplate | null>(null);
  const [markerIcon, setMarkerIcon] = useState<any>(null);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  useEffect(() => {
    if (template) {
      createCustomIcon();
    }
  }, [template]);

  const loadTemplate = async () => {
    if (!templateId) return;

    try {
      const data = await getMarkerTemplate(templateId);
      setTemplate(data);
    } catch (error) {
      console.error('Error loading marker template:', error);
    }
  };

  const createCustomIcon = () => {
    if (!template) return;

    // Get the icon component
    const IconComponent = template.marker_icon 
      ? (LucideIcons as any)[template.marker_icon] || LucideIcons.MapPin
      : LucideIcons.MapPin;

    // Size mapping
    const sizeMap = {
      small: 24,
      medium: 32,
      large: 40,
      xl: 48
    };
    const size = sizeMap[template.marker_size as keyof typeof sizeMap] || 32;

    // Create marker HTML with animations
    const markerHtml = renderToStaticMarkup(
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: template.glow_effect 
            ? `drop-shadow(0 0 8px ${template.marker_color})`
            : template.shadow_style === 'light'
            ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
            : template.shadow_style === 'medium'
            ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
            : template.shadow_style === 'heavy'
            ? 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4))'
            : 'none',
          animation: template.pulse_effect ? 'pulse 2s ease-in-out infinite' : 'none'
        }}
      >
        {/* Background circle for pin style */}
        {template.marker_style === 'pin' && (
          <div
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50% 50% 50% 0',
              backgroundColor: template.marker_color,
              border: `${template.border_width}px solid ${template.border_color}`,
              transform: 'rotate(-45deg)',
            }}
          />
        )}
        
        {/* Circle style */}
        {template.marker_style === 'circle' && (
          <div
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: template.marker_color,
              border: `${template.border_width}px solid ${template.border_color}`,
            }}
          />
        )}

        {/* Icon */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            color: template.icon_color,
            transform: template.marker_style === 'pin' ? 'rotate(45deg)' : 'none'
          }}
        >
          <IconComponent size={size * 0.6} strokeWidth={2.5} />
        </div>
      </div>
    );

    // Create Leaflet DivIcon
    const icon = divIcon({
      html: markerHtml,
      className: 'custom-event-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, template.marker_style === 'pin' ? size : size / 2],
      popupAnchor: [0, template.marker_style === 'pin' ? -size : -size / 2]
    });

    setMarkerIcon(icon);
  };

  // Default icon if no template
  if (!markerIcon) {
    return (
      <Marker
        position={[event.location.lat, event.location.lng]}
        eventHandlers={{
          click: () => onClick?.()
        }}
      >
        <Popup>
          <div className="text-center">
            <h3 className="font-bold text-lg mb-1">{event.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{event.category}</p>
            <p className="text-xs text-gray-500">{event.location.city}</p>
          </div>
        </Popup>
      </Marker>
    );
  }

  return (
    <Marker
      position={[event.location.lat, event.location.lng]}
      icon={markerIcon}
      eventHandlers={{
        click: () => onClick?.(),
        mouseover: (e) => {
          if (template?.bounce_on_hover) {
            e.target.getElement()?.classList.add('marker-bounce');
          }
        },
        mouseout: (e) => {
          if (template?.bounce_on_hover) {
            e.target.getElement()?.classList.remove('marker-bounce');
          }
        }
      }}
    >
      <Popup>
        <div className="text-center">
          <h3 className="font-bold text-lg mb-1">{event.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{event.category}</p>
          <p className="text-xs text-gray-500 mb-2">{event.location.city}</p>
          {template && (
            <p className="text-xs text-indigo-600 font-medium">
              {template.display_name.en}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

// CSS animations (add to global CSS or component)
export const markerAnimationStyles = `
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  @keyframes markerBounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .marker-bounce {
    animation: markerBounce 0.5s ease-in-out;
  }

  .custom-event-marker {
    background: none !important;
    border: none !important;
  }
`;

export default TemplatedEventMarker;
