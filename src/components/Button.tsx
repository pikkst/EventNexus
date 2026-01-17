import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline' | 'warning';
  /** Button size - responsive padding */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner and disable button */
  loading?: boolean;
  /** Make button full width */
  fullWidth?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Icon to display after text */
  iconRight?: React.ReactNode;
  /** Responsive: show icon only on desktop */
  iconResponsive?: boolean;
}

/**
 * Standard Button component for EventNexus platform
 * Ensures consistent styling, accessibility, and mobile-friendliness
 * 
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="danger" size="sm" icon={<Trash2 />}>Delete</Button>
 * <Button variant="ghost" loading>Processing...</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      iconRight,
      iconResponsive = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base classes applied to all buttons
    const baseClasses = 
      'font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
      'rounded-lg inline-flex items-center justify-center gap-2 min-h-[44px] ' +
      'disabled:opacity-50 disabled:cursor-not-allowed';

    // Variant styles
    const variants = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white ' +
        'focus:ring-indigo-500 shadow-md hover:shadow-lg dark:bg-indigo-500 dark:hover:bg-indigo-600',
      secondary:
        'bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 ' +
        'focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white ' +
        'focus:ring-red-500 shadow-md hover:shadow-lg',
      success:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white ' +
        'focus:ring-emerald-500 shadow-md hover:shadow-lg',
      warning:
        'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white ' +
        'focus:ring-amber-500 shadow-md hover:shadow-lg',
      ghost:
        'text-slate-700 hover:bg-slate-100 active:bg-slate-200 ' +
        'focus:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700',
      outline:
        'border-2 border-slate-300 text-slate-900 hover:bg-slate-50 active:bg-slate-100 ' +
        'focus:ring-slate-400 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800',
    };

    // Size styles - responsive padding
    const sizes = {
      sm: 'px-3 py-2 text-xs md:text-sm',
      md: 'px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base',
      lg: 'px-6 py-3 md:px-8 md:py-4 text-base md:text-lg',
    };

    const buttonClass = `${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

    return (
      <button
        ref={ref}
        className={buttonClass}
        disabled={loading || disabled}
        aria-busy={loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}

        {/* Left icon */}
        {!loading && icon && (
          <span className={iconResponsive ? 'hidden md:inline-flex' : ''} aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Text content */}
        {children}

        {/* Right icon */}
        {!loading && iconRight && (
          <span className={iconResponsive ? 'hidden md:inline-flex' : ''} aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
