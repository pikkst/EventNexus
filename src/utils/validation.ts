/**
 * Input Validation Utilities for EventNexus
 * 
 * Provides reusable validation functions for forms and user input
 * Prevents invalid data from entering the system
 */

/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * URL validation
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Phone number validation (international format)
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  // Basic international format: +[country code][number]
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

/**
 * Password strength validation
 */
export const isStrongPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Required field validation
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Max length validation
 */
export const isMaxLength = (text: string, maxLength: number): boolean => {
  return text.length <= maxLength;
};

/**
 * Min length validation
 */
export const isMinLength = (text: string, minLength: number): boolean => {
  return text.length >= minLength;
};

/**
 * Number range validation
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Date validation
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Future date validation
 */
export const isFutureDate = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
};

/**
 * Past date validation
 */
export const isPastDate = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
};

/**
 * Credit card validation (Luhn algorithm)
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d+$/.test(cleaned)) return false;
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * File size validation
 */
export const isValidFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * File type validation
 */
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      // Wildcard type like 'image/*'
      const category = type.split('/')[0];
      return file.type.startsWith(category + '/');
    }
    return file.type === type;
  });
};

/**
 * Slug/URL-friendly string validation
 */
export const isValidSlug = (slug: string): boolean => {
  // Only lowercase letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

/**
 * Hexadecimal color validation
 */
export const isValidHexColor = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

/**
 * Composite validator - runs multiple validations
 */
export const validate = (
  value: any,
  rules: Array<{
    validator: (val: any) => boolean;
    message: string;
  }>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const rule of rules) {
    if (!rule.validator(value)) {
      errors.push(rule.message);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Form validation helper
 */
export class FormValidator {
  private errors: Record<string, string> = {};
  
  addError(field: string, message: string): void {
    this.errors[field] = message;
  }
  
  clearError(field: string): void {
    delete this.errors[field];
  }
  
  clearAll(): void {
    this.errors = {};
  }
  
  getError(field: string): string | undefined {
    return this.errors[field];
  }
  
  getErrors(): Record<string, string> {
    return { ...this.errors };
  }
  
  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }
  
  isValid(): boolean {
    return !this.hasErrors();
  }
}

/**
 * Export all validators as object for convenience
 */
export const validators = {
  email: isValidEmail,
  url: isValidUrl,
  phone: isValidPhone,
  password: isStrongPassword,
  required: isRequired,
  maxLength: isMaxLength,
  minLength: isMinLength,
  inRange: isInRange,
  date: isValidDate,
  futureDate: isFutureDate,
  pastDate: isPastDate,
  creditCard: isValidCreditCard,
  fileSize: isValidFileSize,
  fileType: isValidFileType,
  slug: isValidSlug,
  hexColor: isValidHexColor,
  validate
};

export default validators;
