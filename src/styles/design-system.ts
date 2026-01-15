/**
 * EventNexus Design System
 * 
 * Centralized design tokens for consistent UI across the platform.
 * Used by Button, Table, and all UI components.
 * 
 * Colors: Dark theme optimized for event discovery and engagement
 * Typography: Clear hierarchy for readability and accessibility
 * Spacing: 4px base unit (Tailwind default) for predictable layouts
 * Breakpoints: Mobile-first responsive design
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Neutral
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Brand: Indigo (Primary)
  indigo: {
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Success: Emerald
  emerald: {
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },

  // Warning: Amber
  amber: {
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },

  // Danger: Red
  red: {
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Info: Blue
  blue: {
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families
  family: {
    sans: 'system-ui, -apple-system, sans-serif',
    mono: '"Monaco", "Menlo", monospace',
  },

  // Font sizes (px → rem conversion: divide by 16)
  size: {
    xs: '0.625rem', // 10px
    sm: '0.75rem', // 12px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },

  // Font weights
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ============================================================================
// SPACING SCALE
// ============================================================================

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0px',
  xs: '0.25rem', // 4px
  sm: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem', // 32px
  full: '9999px',
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

export const breakpoints = {
  // Mobile-first breakpoints (min-width)
  sm: '640px', // Small phones
  md: '768px', // Tablets
  lg: '1024px', // Desktops
  xl: '1280px', // Large desktops
  '2xl': '1536px', // Extra large desktops
};

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export const components = {
  // Button sizing & spacing
  button: {
    sizes: {
      sm: {
        padding: `${spacing.xs} ${spacing.md}`,
        height: '32px',
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
      },
      md: {
        padding: `${spacing.sm} ${spacing.lg}`,
        height: '44px', // WCAG AA minimum touch target
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
      },
      lg: {
        padding: `${spacing.md} ${spacing.xl}`,
        height: '52px',
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
      },
    },
    minHeight: '44px', // Touch accessibility
    minWidth: '44px', // Touch accessibility
  },

  // Input sizing
  input: {
    height: '44px',
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.size.sm,
    borderRadius: borderRadius.lg,
  },

  // Card/container padding
  card: {
    paddingSm: spacing.md,
    paddingMd: spacing.lg,
    paddingLg: spacing.xl,
    borderRadius: borderRadius['2xl'],
  },

  // Table/list items
  listItem: {
    height: '56px',
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: borderRadius.lg,
  },
};

// ============================================================================
// TRANSITION TIMING
// ============================================================================

export const transitions = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
};

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  hidden: '-1',
  base: '0',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  backdrop: '1040',
  offcanvas: '1050',
  modal: '1060',
  tooltip: '1070',
};

// ============================================================================
// SEMANTIC VARIANTS
// ============================================================================

export const variants = {
  button: {
    primary: {
      bg: colors.indigo[600],
      bgHover: colors.indigo[700],
      text: 'white',
      border: 'transparent',
    },
    secondary: {
      bg: colors.slate[800],
      bgHover: colors.slate[700],
      text: 'white',
      border: colors.slate[700],
    },
    danger: {
      bg: colors.red[600],
      bgHover: colors.red[700],
      text: 'white',
      border: 'transparent',
    },
    success: {
      bg: colors.emerald[600],
      bgHover: colors.emerald[700],
      text: 'white',
      border: 'transparent',
    },
    warning: {
      bg: colors.amber[600],
      bgHover: colors.amber[700],
      text: 'white',
      border: 'transparent',
    },
    ghost: {
      bg: 'transparent',
      bgHover: colors.slate[800],
      text: colors.slate[400],
      border: 'transparent',
    },
    outline: {
      bg: 'transparent',
      bgHover: colors.slate[900],
      text: colors.slate[400],
      border: colors.slate[700],
    },
  },

  alert: {
    info: {
      bg: colors.blue[500] + '10',
      border: colors.blue[500] + '30',
      text: colors.blue[400],
    },
    success: {
      bg: colors.emerald[500] + '10',
      border: colors.emerald[500] + '30',
      text: colors.emerald[400],
    },
    warning: {
      bg: colors.amber[500] + '10',
      border: colors.amber[500] + '30',
      text: colors.amber[400],
    },
    danger: {
      bg: colors.red[500] + '10',
      border: colors.red[500] + '30',
      text: colors.red[400],
    },
  },
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Get contrast-appropriate text color for a background
 * @param bgColor - Background color hex
 */
export const getContrastTextColor = (bgColor: string): string => {
  // Simple luminance calculation
  // If background is dark, return light text; if light, return dark text
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Responsive utility for padding based on breakpoint
 * Useful for layout components that adjust padding at different screen sizes
 */
export const getResponsivePadding = (
  sm: string,
  md: string,
  lg: string
): Record<string, string> => ({
  '--padding-sm': sm,
  '--padding-md': md,
  '--padding-lg': lg,
} as any);

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  components,
  transitions,
  zIndex,
  variants,
};
