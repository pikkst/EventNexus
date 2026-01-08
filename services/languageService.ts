/**
 * Language Detection and Management Service
 * Handles automatic language detection, user preferences, and browser locale
 */

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
];

/**
 * Detect user's preferred language from multiple sources
 * Priority: 1. URL param, 2. User profile, 3. Browser, 4. Location-based, 5. Default (en)
 */
export const detectUserLanguage = (
  urlLang?: string,
  userPreference?: string,
  eventLocation?: { city: string; address: string }
): string => {
  // 1. Check URL parameter (highest priority - for QR code scans)
  if (urlLang && isSupportedLanguage(urlLang)) {
    console.log('🌐 Language from URL:', urlLang);
    return urlLang;
  }

  // 2. Check user profile preference
  if (userPreference && isSupportedLanguage(userPreference)) {
    console.log('👤 Language from user preference:', userPreference);
    return userPreference;
  }

  // 3. Check browser language
  const browserLang = detectBrowserLanguage();
  if (browserLang) {
    console.log('🌍 Language from browser:', browserLang);
    return browserLang;
  }

  // 4. Check event location (for poster scans without user)
  if (eventLocation) {
    const locationLang = detectLanguageFromLocation(eventLocation.city, eventLocation.address);
    if (locationLang !== 'en') {
      console.log('📍 Language from event location:', locationLang);
      return locationLang;
    }
  }

  // 5. Default to English
  console.log('🌐 Using default language: en');
  return 'en';
};

/**
 * Detect language from browser settings
 */
export const detectBrowserLanguage = (): string | null => {
  if (typeof window === 'undefined') return null;

  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (!browserLang) return null;

  // Extract primary language code (e.g., 'en-US' -> 'en')
  const primaryLang = browserLang.split('-')[0].toLowerCase();

  return isSupportedLanguage(primaryLang) ? primaryLang : null;
};

/**
 * Detect language from location (city/country)
 */
export const detectLanguageFromLocation = (city: string, address: string): string => {
  const text = `${city} ${address}`.toLowerCase();

  // Estonian cities/keywords
  if (
    text.includes('tallinn') ||
    text.includes('tartu') ||
    text.includes('pärnu') ||
    text.includes('estonia') ||
    text.includes('eesti')
  ) {
    return 'et';
  }

  // Finnish cities/keywords
  if (
    text.includes('helsinki') ||
    text.includes('espoo') ||
    text.includes('tampere') ||
    text.includes('finland') ||
    text.includes('suomi')
  ) {
    return 'fi';
  }

  // Swedish cities/keywords
  if (
    text.includes('stockholm') ||
    text.includes('göteborg') ||
    text.includes('malmö') ||
    text.includes('sweden') ||
    text.includes('sverige')
  ) {
    return 'sv';
  }

  // German cities/keywords
  if (
    text.includes('berlin') ||
    text.includes('münchen') ||
    text.includes('hamburg') ||
    text.includes('germany') ||
    text.includes('deutschland')
  ) {
    return 'de';
  }

  // French cities/keywords
  if (
    text.includes('paris') ||
    text.includes('lyon') ||
    text.includes('marseille') ||
    text.includes('france')
  ) {
    return 'fr';
  }

  // Spanish cities/keywords
  if (
    text.includes('madrid') ||
    text.includes('barcelona') ||
    text.includes('valencia') ||
    text.includes('spain') ||
    text.includes('españa')
  ) {
    return 'es';
  }

  // Russian cities/keywords
  if (
    text.includes('moscow') ||
    text.includes('sankt') ||
    text.includes('petersburg') ||
    text.includes('russia')
  ) {
    return 'ru';
  }

  // Polish cities/keywords
  if (
    text.includes('warsaw') ||
    text.includes('kraków') ||
    text.includes('wrocław') ||
    text.includes('poland') ||
    text.includes('polska')
  ) {
    return 'pl';
  }

  return 'en'; // Default to English
};

/**
 * Check if language code is supported
 */
export const isSupportedLanguage = (code: string): boolean => {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
};

/**
 * Get language option by code
 */
export const getLanguageByCode = (code: string): LanguageOption | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

/**
 * Store user language preference in localStorage
 */
export const storeLanguagePreference = (languageCode: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eventnexus_language', languageCode);
  console.log('💾 Stored language preference:', languageCode);
};

/**
 * Get stored language preference from localStorage
 */
export const getStoredLanguagePreference = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('eventnexus_language');
};

/**
 * Build event URL with language parameter
 * Used for QR codes and sharing links
 */
export const buildEventUrlWithLanguage = (
  eventId: string,
  languageCode: string,
  baseUrl?: string
): string => {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://www.eventnexus.eu');
  return `${base}/event/${eventId}?lang=${languageCode}`;
};

/**
 * Parse language from URL query parameters
 */
export const getLanguageFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');

  return langParam && isSupportedLanguage(langParam) ? langParam : null;
};

/**
 * Get localized date format for a given language
 */
export const getLocalizedDateFormat = (locale: string): Intl.DateTimeFormatOptions => {
  return {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
};

/**
 * Format date in user's language
 */
export const formatLocalizedDate = (date: string, languageCode: string): string => {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    et: 'et-EE',
    fi: 'fi-FI',
    sv: 'sv-SE',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    ru: 'ru-RU',
    pl: 'pl-PL',
  };

  const locale = localeMap[languageCode] || 'en-US';
  return new Date(date).toLocaleDateString(locale, getLocalizedDateFormat(languageCode));
};

/**
 * Get appropriate languages for auto-translation based on tier
 * Free: No auto-translation
 * Pro: 3 languages (English + 2 major)
 * Premium/Enterprise: All supported languages
 */
export const getAutoTranslationLanguages = (
  tier: string,
  originalLanguage: string
): string[] => {
  if (tier === 'free') {
    return [originalLanguage]; // No auto-translation for free tier
  }

  if (tier === 'pro') {
    // Pro gets English + 2 most common languages in their region
    const base = ['en'];
    if (originalLanguage !== 'en') base.push(originalLanguage);
    
    // Add regional languages based on original language
    if (['et', 'fi', 'sv'].includes(originalLanguage)) {
      // Nordic/Baltic region
      base.push('fi', 'sv');
    } else if (['de', 'fr'].includes(originalLanguage)) {
      // Central Europe
      base.push('de', 'fr');
    } else if (['es', 'fr'].includes(originalLanguage)) {
      // Romance languages
      base.push('es', 'fr');
    } else {
      // Default: add German and Spanish
      base.push('de', 'es');
    }

    return [...new Set(base)].slice(0, 3);
  }

  // Premium/Enterprise: All languages
  return SUPPORTED_LANGUAGES.map(lang => lang.code);
};
