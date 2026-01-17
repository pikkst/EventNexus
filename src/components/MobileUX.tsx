/**
 * Mobile UX Utilities
 * Responsive components and helpers for mobile-first design
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

/**
 * Collapsible Section Component
 * Great for mobile - saves viewport space by hiding non-critical content
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-800/50 transition-colors flex items-center justify-between font-medium text-slate-100"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-slate-700 bg-slate-950/30">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Mobile Touch-Friendly Button Group
 * Larger hit targets for touch on small screens
 */
interface TouchButtonGroupProps {
  children: React.ReactNode;
  vertical?: boolean; // Stack vertically on mobile
}

export const TouchButtonGroup: React.FC<TouchButtonGroupProps> = ({
  children,
  vertical = false
}) => {
  return (
    <div
      className={`flex ${
        vertical ? 'flex-col' : 'flex-wrap'
      } gap-3 sm:gap-2`}
    >
      {React.Children.map(children, (child) =>
        React.cloneElement(child as React.ReactElement, {
          className: `flex-1 sm:flex-none py-3 sm:py-2 px-4 sm:px-3 ${
            (child as React.ReactElement).props.className || ''
          }`.trim()
        })
      )}
    </div>
  );
};

/**
 * Responsive Grid for Mobile
 * Automatically stacks on mobile, grids on desktop
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number; // Desktop columns
  mobileColumns?: number; // Mobile columns (default: 1)
  gap?: 'sm' | 'md' | 'lg'; // Gap size
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 2,
  mobileColumns = 1,
  gap = 'md'
}) => {
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }[gap];

  const colClass =
    mobileColumns === 1
      ? `grid-cols-1 md:grid-cols-${columns}`
      : `grid-cols-${mobileColumns} md:grid-cols-${columns}`;

  return (
    <div className={`grid ${colClass} ${gapClass}`}>
      {children}
    </div>
  );
};

/**
 * Mobile-Safe Modal Overlay
 * Full-screen on mobile, centered on desktop
 */
interface MobileModalProps {
  isOpen: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  footer
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div
        className="w-full sm:max-w-2xl bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 sm:slide-in-from-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 bg-slate-950 border-b border-slate-700 px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors ml-auto"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-700 bg-slate-950 px-4 py-4 sm:px-6 sm:py-5">
            {footer}
          </div>
        )}
      </div>

      {/* Backdrop click to close */}
      <div className="fixed inset-0 z-40 sm:hidden" onClick={onClose} />
    </div>
  );
};

/**
 * Hook to detect mobile viewport
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

/**
 * Touch-safe spacing for buttons and interactive elements
 * Ensures minimum 44x44px touch target on mobile
 */
export const TOUCH_TARGET_SIZE = 'min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]';

/**
 * Responsive font sizes
 */
export const RESPONSIVE_FONT = {
  xs: 'text-xs sm:text-xs',
  sm: 'text-sm sm:text-sm',
  base: 'text-sm sm:text-base',
  lg: 'text-base sm:text-lg',
  xl: 'text-lg sm:text-xl',
  '2xl': 'text-xl sm:text-2xl',
  '3xl': 'text-2xl sm:text-3xl'
};

/**
 * Responsive padding
 */
export const RESPONSIVE_PAD = {
  xs: 'px-2 py-1.5 sm:px-3 sm:py-2',
  sm: 'px-3 py-2 sm:px-4 sm:py-2.5',
  md: 'px-4 py-3 sm:px-5 sm:py-3',
  lg: 'px-5 py-4 sm:px-6 sm:py-4'
};
