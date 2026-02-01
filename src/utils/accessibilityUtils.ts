/**
 * Accessibility Utilities - WCAG 2.1 AA Compliance Support
 * Handles keyboard navigation, focus management, and ARIA attributes
 */

import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook for managing focus in modals and dropdowns
 * Traps focus within container and restores focus on close
 */
export const useFocusTrap = (
  isOpen: boolean,
  containerRef: RefObject<HTMLDivElement>,
  onClose?: () => void
) => {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      // Tab trap logic
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift + Tab (backwards)
        if (e.shiftKey) {
          if (activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        }
        // Tab (forwards)
        else {
          if (activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element in modal
    setTimeout(() => {
      const firstFocusable = containerRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      if (previouslyFocusedElement.current?.focus) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, containerRef, onClose]);
};

/**
 * Custom hook for keyboard navigation in lists/menus
 * Arrow keys move focus up/down, Enter/Space activates
 */
export const useKeyboardNavigation = (
  containerRef: RefObject<HTMLUListElement | HTMLDivElement>,
  itemSelector: string = 'li, [role="menuitem"]',
  onSelect?: (index: number) => void
) => {
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = containerRef.current?.querySelectorAll<HTMLElement>(itemSelector);
      if (!items || items.length === 0) return;

      const currentItem = document.activeElement as HTMLElement;
      let newIndex = Array.from(items).indexOf(currentItem);

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          newIndex = (newIndex + 1) % items.length;
          items[newIndex].focus();
          currentIndexRef.current = newIndex;
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = (newIndex - 1 + items.length) % items.length;
          items[newIndex].focus();
          currentIndexRef.current = newIndex;
          break;

        case 'Home':
          e.preventDefault();
          items[0].focus();
          currentIndexRef.current = 0;
          break;

        case 'End':
          e.preventDefault();
          items[items.length - 1].focus();
          currentIndexRef.current = items.length - 1;
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          items[newIndex].click();
          onSelect?.(newIndex);
          break;

        default:
          break;
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, itemSelector, onSelect]);
};

/**
 * Announce messages to screen readers
 * Uses aria-live region for dynamic announcements
 */
export const useScreenReaderAnnounce = () => {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create aria-live announcer if not exists
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only'; // Off-screen but readable by screen readers
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      announcerRef.current?.remove();
    };
  }, []);

  const announce = (message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  };

  return announce;
};

/**
 * Create accessible button with proper ARIA attributes
 */
export interface AccessibleButtonProps {
  label: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaHasPopup?: 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | boolean;
  ariaControls?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
}

export const getAccessibleButtonProps = (props: AccessibleButtonProps) => {
  const aria: Record<string, any> = {};

  if (props.ariaPressed !== undefined) aria['aria-pressed'] = props.ariaPressed;
  if (props.ariaExpanded !== undefined) aria['aria-expanded'] = props.ariaExpanded;
  if (props.ariaHasPopup !== undefined) aria['aria-haspopup'] = props.ariaHasPopup;
  if (props.ariaControls) aria['aria-controls'] = props.ariaControls;
  if (props.ariaDescribedBy) aria['aria-describedby'] = props.ariaDescribedBy;
  if (props.disabled) aria['aria-disabled'] = true;

  return {
    'aria-label': props.label,
    ...aria,
  };
};

/**
 * Ensure form field is accessible with label
 */
export interface AccessibleFormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

export const getAccessibleFieldProps = (props: AccessibleFormFieldProps) => {
  const aria: Record<string, any> = {};

  if (props.required) aria['aria-required'] = true;
  if (props.disabled) aria['aria-disabled'] = true;
  if (props.error) aria['aria-invalid'] = true;
  if (props.error) aria['aria-describedby'] = `${props.id}-error`;
  if (props.hint) aria['aria-describedby'] = `${props.id}-hint`;
  if (props.error && props.hint) {
    aria['aria-describedby'] = `${props.id}-error ${props.id}-hint`;
  }

  return {
    id: props.id,
    ...aria,
  };
};

/**
 * Skip link component - allows keyboard users to skip repetitive content
 */
export const SkipLink = ({ targetId = 'main-content' }: { targetId?: string }) => (
  <a
    href={`#${targetId}`}
    className="absolute top-0 left-0 -translate-y-12 focus:translate-y-0 bg-blue-600 text-white px-4 py-2 rounded z-50 transition-transform"
  >
    Skip to main content
  </a>
);

/**
 * Check if element is keyboard accessible
 */
export const isKeyboardAccessible = (element: HTMLElement): boolean => {
  const tagName = element.tagName.toLowerCase();
  const tabindex = element.getAttribute('tabindex');
  const isNativeButton = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName);
  const isFocusable = tabindex !== null && tabindex !== '-1';

  return isNativeButton || isFocusable;
};

/**
 * Get all focusable elements in a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), ' +
      '[href]:not([tabindex="-1"]), ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    )
  );
};

/**
 * Simulate click on element with keyboard
 */
export const makeElementKeyboardClickable = (element: HTMLElement, callback: () => void) => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  element.addEventListener('keydown', handleKeyPress);

  return () => {
    element.removeEventListener('keydown', handleKeyPress);
  };
};

/**
 * Check color contrast ratio (WCAG 2.1)
 * Returns contrast ratio and pass/fail for AA and AAA
 */
export const checkColorContrast = (
  foreground: string,
  background: string
): { ratio: number; passAA: boolean; passAAA: boolean } => {
  const getLuminance = (color: string): number => {
    // Parse color (simplified - assumes rgb or hex)
    let r, g, b;

    if (color.startsWith('#')) {
      const hex = color.substring(1);
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0]) / 255;
        g = parseInt(match[1]) / 255;
        b = parseInt(match[2]) / 255;
      } else {
        return 0.5; // fallback
      }
    } else {
      return 0.5; // unsupported color format
    }

    // Calculate relative luminance
    const [rs, gs, bs] = [r, g, b].map((val) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passAA: ratio >= 4.5, // Normal text: 4.5:1
    passAAA: ratio >= 7, // Normal text: 7:1
  };
};

/**
 * Focus management helper
 */
export const focusElement = (selector: string, delay = 0) => {
  setTimeout(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && element.focus) {
      element.focus();
      // For elements that don't focus naturally
      element.setAttribute('tabindex', '0');
    }
  }, delay);
};

/**
 * Announce to screen reader with delay
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.textContent = message;
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.style.width = '1px';
  announcer.style.height = '1px';
  announcer.style.overflow = 'hidden';

  document.body.appendChild(announcer);

  setTimeout(() => {
    announcer.remove();
  }, 3000);
};
