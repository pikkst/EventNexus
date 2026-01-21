import React from 'react';
import { VenueItem } from './types';

interface LayoutItemProps {
  item: VenueItem;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  isAttendeeMode?: boolean;
  onBook?: (id: string) => void;
  isAddingToCart?: boolean;
}

const LayoutItem: React.FC<LayoutItemProps> = ({ 
  item, 
  isSelected, 
  onSelect, 
  isAttendeeMode,
  onBook,
  isAddingToCart 
}) => {
  const isSeat = item.type === 'seat';
  const isStage = item.type === 'stage';
  const isWall = item.type === 'wall';
  const isDecoration = item.type === 'decoration';
  const isCircle = item.shape === 'circle';
  const radius = 9;
  const itemColor = item.color || '#6366f1';
  
  const getFillColor = () => {
    if (isStage) return '#f1f5f9';
    if (isWall) return '#64748b';
    if (isDecoration) return itemColor;
    if (isAttendeeMode) {
      if (item.isBooked) return '#cbd5e1'; 
      if (isAddingToCart) return '#10b981';
      return isSeat ? '#ffffff' : itemColor;
    }
    // For seats in designer mode: use custom color if set, otherwise white
    if (isSeat) {
      if (isSelected) return itemColor; // Use custom color when selected
      return item.color ? itemColor : '#ffffff'; // Use custom color or default white
    }
    return itemColor;
  };

  const getStrokeColor = () => {
    if (isStage) return isSelected ? '#4f46e5' : '#cbd5e1';
    if (isWall) return isSelected ? '#1e293b' : '#475569';
    if (isDecoration) return isSelected ? '#1e293b' : 'transparent';
    if (isAttendeeMode) {
      if (item.isBooked) return '#94a3b8';
      if (isAddingToCart) return '#059669';
      return isSeat ? '#3b82f6' : 'transparent';
    }
    // For seats: darker stroke when selected
    if (isSeat && isSelected) {
      // Darken the fill color for stroke
      return '#1e293b';
    }
    return isSelected ? '#1e1b4b' : '#cbd5e1';
  };

  const getOpacity = () => {
    if (isStage) return '1';
    if (isWall) return '1';
    if (isDecoration) return isSelected ? '0.9' : '0.6';
    if (isAttendeeMode) return '1';
    if (!isSeat) return isSelected ? '0.8' : '0.4';
    return '1';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isAttendeeMode) {
      e.stopPropagation();
      if (isStage || isWall || isDecoration) return;
      if (!item.isBooked && onBook) onBook(item.id);
    }
  };

  const commonProps = {
    onClick: handleClick,
    'data-item-id': item.id,
    className: `transition-all duration-150 ${(isStage || isWall || isDecoration) && isAttendeeMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${isSelected ? 'filter drop-shadow-md' : ''}`,
    style: { pointerEvents: 'all' as const, userSelect: 'none' as const }
  };

  if (isSeat) {
    // Calculate if the color is dark or light for text contrast
    const isDarkColor = () => {
      if (!item.color) return false;
      const hex = item.color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    };

    return (
      <g {...commonProps}>
        <circle
          cx={item.x}
          cy={item.y}
          r={radius}
          fill={getFillColor()}
          stroke={getStrokeColor()}
          strokeWidth="2"
        />
        <text
          x={item.x}
          y={item.y + 2.5}
          textAnchor="middle"
          fontSize="7"
          className={`${item.color && isDarkColor() ? 'fill-white' : 'fill-slate-700'} pointer-events-none font-bold`}
        >
          {item.seatNumber || ''}
        </text>
      </g>
    );
  }

  const width = item.width || 100;
  const height = item.height || 60;

  return (
    <g {...commonProps}>
      {isCircle ? (
        <ellipse
          cx={item.x}
          cy={item.y}
          rx={width / 2}
          ry={height / 2}
          fill={getFillColor()}
          fillOpacity={getOpacity()}
          stroke={getStrokeColor()}
          strokeWidth={isSelected ? "3" : "1"}
        />
      ) : (
        <rect
          x={item.x - width / 2}
          y={item.y - height / 2}
          width={width}
          height={height}
          rx={isStage ? "4" : "8"}
          fill={getFillColor()}
          fillOpacity={getOpacity()}
          stroke={getStrokeColor()}
          strokeWidth={isSelected ? "3" : "1"}
        />
      )}
      <text
        x={item.x}
        y={isStage ? item.y + 4 : item.y - 2}
        textAnchor="middle"
        fontSize={isStage ? "10" : "11"}
        className={`${isAttendeeMode && !isStage ? 'fill-white' : 'fill-slate-700'} ${isStage ? 'font-bold tracking-widest uppercase opacity-40' : 'font-bold'} pointer-events-none`}
      >
        {item.name}
      </text>
      {!isStage && !isWall && !isDecoration && (
        <>
          <text
            x={item.x}
            y={item.y + 12}
            textAnchor="middle"
            fontSize="9"
            className={`${isAttendeeMode ? 'fill-indigo-50' : 'fill-slate-500'} font-medium pointer-events-none`}
          >
            ${item.price}
          </text>
          {/* Show capacity info for zones in attendee mode */}
          {item.type === 'zone' && isAttendeeMode && item.capacity && (
            <text
              x={item.x}
              y={item.y + 24}
              textAnchor="middle"
              fontSize="8"
              className="fill-indigo-300 font-bold pointer-events-none"
            >
              {(item.capacity - (item.bookedCount || 0))} / {item.capacity}
            </text>
          )}
        </>
      )}
    </g>
  );
};

export default LayoutItem;
