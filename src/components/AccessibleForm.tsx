/**
 * Form Accessibility Wrapper Components
 * Provides accessible form inputs with proper labels, error handling, and ARIA support
 * WCAG 2.1 Level AA compliant
 */

import React from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Accessible form field wrapper
 * Ensures proper label association, error messaging, and ARIA attributes
 */
interface AccessibleInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export const AccessibleInput = React.forwardRef<
  HTMLInputElement,
  AccessibleInputProps
>(
  (
    {
      label,
      error,
      hint,
      required,
      disabled,
      helperText,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const helperId = `${inputId}-helper`;

    const ariaDescribedBy = [
      error ? errorId : null,
      hint ? hintId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="block text-sm font-bold text-slate-300"
        >
          {label}
          {required && <span aria-label="required" className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy || undefined}
          className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-2 text-red-400 text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {hint && (
          <div id={hintId} className="text-xs text-slate-500">
            {hint}
          </div>
        )}
        {helperText && (
          <div id={helperId} className="text-xs text-slate-400">
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

/**
 * Accessible password input with toggle visibility
 */
interface AccessiblePasswordInputProps
  extends Omit<AccessibleInputProps, 'type'> {
  onVisibilityChange?: (visible: boolean) => void;
}

export const AccessiblePasswordInput = React.forwardRef<
  HTMLInputElement,
  AccessiblePasswordInputProps
>(
  (
    { label, onVisibilityChange, id, ...props },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const passwordId = id || `password-${Math.random().toString(36).substring(7)}`;
    const toggleId = `${passwordId}-toggle`;

    const handleToggle = () => {
      setShowPassword(!showPassword);
      onVisibilityChange?.(!showPassword);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor={passwordId}
            className="block text-sm font-bold text-slate-300"
          >
            {label}
          </label>
          <button
            id={toggleId}
            type="button"
            onClick={handleToggle}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="relative">
          <input
            ref={ref}
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            aria-describedby={toggleId}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
            {...props}
          />
        </div>
      </div>
    );
  }
);

AccessiblePasswordInput.displayName = 'AccessiblePasswordInput';

/**
 * Accessible select/dropdown input
 */
interface AccessibleSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const AccessibleSelect = React.forwardRef<
  HTMLSelectElement,
  AccessibleSelectProps
>(
  (
    {
      label,
      options,
      error,
      hint,
      required,
      disabled,
      id,
      placeholder,
      className = '',
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substring(7)}`;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    const ariaDescribedBy = [error ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-2">
        <label
          htmlFor={selectId}
          className="block text-sm font-bold text-slate-300"
        >
          {label}
          {required && <span aria-label="required" className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy || undefined}
          className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : ''
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-2 text-red-400 text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {hint && (
          <div id={hintId} className="text-xs text-slate-500">
            {hint}
          </div>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

/**
 * Accessible checkbox input
 */
interface AccessibleCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AccessibleCheckbox = React.forwardRef<
  HTMLInputElement,
  AccessibleCheckboxProps
>(({ label, error, id, className = '', ...props }, ref) => {
  const checkboxId =
    id || `checkbox-${Math.random().toString(36).substring(7)}`;
  const errorId = `${checkboxId}-error`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 min-h-[48px]">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-2 focus:ring-indigo-500 cursor-pointer ${className}`}
          {...props}
        />
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium text-slate-300 cursor-pointer"
        >
          {label}
        </label>
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-2 text-red-400 text-sm font-medium"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
});

AccessibleCheckbox.displayName = 'AccessibleCheckbox';

/**
 * Accessible textarea input
 */
interface AccessibleTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  charLimit?: number;
}

export const AccessibleTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AccessibleTextareaProps
>(
  (
    {
      label,
      error,
      hint,
      required,
      disabled,
      charLimit,
      id,
      value,
      className = '',
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(7)}`;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;
    const charCountId = `${textareaId}-count`;

    const charCount = typeof value === 'string' ? value.length : 0;
    const charCountMsg =
      charLimit && charCount > charLimit
        ? `${charCount} / ${charLimit} characters (exceeds limit)`
        : charLimit
          ? `${charCount} / ${charLimit}`
          : null;

    const ariaDescribedBy = [
      error ? errorId : null,
      hint ? hintId : null,
      charLimit ? charCountId : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor={textareaId}
            className="block text-sm font-bold text-slate-300"
          >
            {label}
            {required && <span aria-label="required" className="text-red-500 ml-1">*</span>}
          </label>
          {charCountMsg && (
            <span
              id={charCountId}
              className={`text-xs font-medium ${
                charCount > (charLimit || Infinity)
                  ? 'text-red-400'
                  : 'text-slate-500'
              }`}
            >
              {charCountMsg}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy || undefined}
          maxLength={charLimit}
          value={value}
          className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
            error ? 'border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-2 text-red-400 text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {hint && (
          <div id={hintId} className="text-xs text-slate-500">
            {hint}
          </div>
        )}
      </div>
    );
  }
);

AccessibleTextarea.displayName = 'AccessibleTextarea';

/**
 * Accessible form wrapper with fieldset support
 */
interface AccessibleFormProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  legend?: string;
  children: React.ReactNode;
}

export const AccessibleForm = ({
  legend,
  children,
  className = '',
  ...props
}: AccessibleFormProps) => {
  if (legend) {
    return (
      <fieldset className={`space-y-6 ${className}`} {...props}>
        <legend className="text-lg font-bold text-white">{legend}</legend>
        <div className="space-y-6">{children}</div>
      </fieldset>
    );
  }

  return (
    <form className={`space-y-6 ${className}`} {...props}>
      {children}
    </form>
  );
};

/**
 * Accessible form section with heading
 */
interface AccessibleFormSectionProps {
  title: string;
  children: React.ReactNode;
  description?: string;
  className?: string;
}

export const AccessibleFormSection = ({
  title,
  children,
  description,
  className = '',
}: AccessibleFormSectionProps) => (
  <section className={`space-y-4 ${className}`}>
    <div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      )}
    </div>
    <div className="space-y-6">{children}</div>
  </section>
);

/**
 * Accessible button with proper ARIA support
 */
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
}

export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText = 'Loading...',
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-600/50',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:bg-slate-800/50',
      danger:
        'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600/50',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-3 text-sm min-h-[44px]',
      lg: 'px-6 py-4 text-base min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? loadingText : children}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
