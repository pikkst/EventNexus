/**
 * Language Detection and Management Service
 * Handles automatic language detection, user preferences, and browser locale
 * With intelligent caching to minimize API costs for high traffic
 */

import { supabase } from './supabase';
import { translateDescription, translateDescriptionBatch } from './geminiService';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region?: string; // Optional: for grouping languages by region
}

export interface EventTranslation {
  name: string;
  description: string;
  about_text?: string;
}

// UI Languages - Limited to 9 major languages for platform interface
// These are used for navigation, buttons, labels, etc.
export const UI_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'Global' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', region: 'Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'Europe' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Europe' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'Europe' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'Europe' },
];

// Content Languages - ALL WORLD LANGUAGES for event translations
// Registered users can select ANY language for content translation
// Guest users are limited to UI_LANGUAGES
export const CONTENT_LANGUAGES: LanguageOption[] = [
  // Major Global Languages
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'Global' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'Asia' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'Asia' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Europe' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Middle East' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', region: 'Asia' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'Europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Europe' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Asia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Europe' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'Europe' },
  
  // European Languages
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'Europe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', region: 'Europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', region: 'Europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'Europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', region: 'Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'Europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'Europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', region: 'Europe' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', region: 'Europe' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', region: 'Europe' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', region: 'Europe' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', region: 'Europe' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', region: 'Europe' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', region: 'Europe' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', region: 'Europe' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', region: 'Europe' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', region: 'Europe' },
  
  // Asian Languages
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Asia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'Asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'Asia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', region: 'Asia' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭', region: 'Asia' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', region: 'Asia' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'Asia' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'Asia' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', region: 'Asia' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'Asia' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', region: 'Asia' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'Asia' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', region: 'Asia' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', region: 'Asia' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲', region: 'Asia' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', region: 'Asia' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦', region: 'Asia' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', region: 'Asia' },
  
  // Middle Eastern Languages
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', region: 'Middle East' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'Middle East' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', region: 'Middle East' },
  
  // African Languages
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'Africa' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', region: 'Africa' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', region: 'Africa' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', region: 'Africa' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', region: 'Africa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬', region: 'Africa' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', flag: '🇳🇬', region: 'Africa' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', region: 'Africa' },
  
  // Other Languages
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󐁧󐁢󐁷󐁬󐁳󐁿', region: 'Europe' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', region: 'Europe' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', region: 'Europe' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', region: 'Europe' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', region: 'Europe' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', region: 'Europe' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', region: 'Europe' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', region: 'Europe' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ', flag: '🇰🇿', region: 'Asia' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', flag: '🇺🇿', region: 'Asia' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', region: 'Asia' },
];

// Legacy compatibility - SUPPORTED_LANGUAGES points to UI languages
export const SUPPORTED_LANGUAGES = UI_LANGUAGES;

// In-memory cache for translations (session-level)
// Reduces database queries for frequently viewed events
const translationCache = new Map<string, EventTranslation>();
const CACHE_KEY_SEPARATOR = '::';

// Generate cache key
const getCacheKey = (eventId: string, languageCode: string): string => {
  return `${eventId}${CACHE_KEY_SEPARATOR}${languageCode}`;
};

/**
 * Check if language is supported for UI
 */
export const isUILanguage = (code: string): boolean => {
  return UI_LANGUAGES.some(lang => lang.code === code);
};

/**
 * Check if language is supported for content translation
 */
export const isContentLanguage = (code: string): boolean => {
  return CONTENT_LANGUAGES.some(lang => lang.code === code);
};

/**
 * Get language option by code (checks both UI and content languages)
 */
export const getLanguageByCode = (code: string): LanguageOption | undefined => {
  return CONTENT_LANGUAGES.find(lang => lang.code === code);
};

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
 * Check if language code is supported (legacy - checks UI languages)
 * For content translation, all CONTENT_LANGUAGES are supported
 */
export const isSupportedLanguage = (code: string): boolean => {
  return CONTENT_LANGUAGES.some(lang => lang.code === code);
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

/**
 * Get cached translation from database
 * Returns null if not found in cache
 */
export const getCachedTranslation = async (
  eventId: string,
  languageCode: string
): Promise<EventTranslation | null> => {
  // Check in-memory cache first (fastest)
  const cacheKey = getCacheKey(eventId, languageCode);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log(`⚡ Translation from memory cache: ${eventId} -> ${languageCode}`);
    return cached;
  }

  // Check database cache
  try {
    const { data, error } = await supabase
      .from('event_translations')
      .select('name, description, about_text')
      .eq('event_id', eventId)
      .eq('language_code', languageCode)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.warn('Error fetching cached translation:', error);
      }
      return null;
    }

    if (data) {
      const translation: EventTranslation = {
        name: data.name,
        description: data.description || '',
        about_text: data.about_text || undefined,
      };
      
      // Store in memory cache for next time
      translationCache.set(cacheKey, translation);
      console.log(`💾 Translation from DB cache: ${eventId} -> ${languageCode}`);
      
      return translation;
    }

    return null;
  } catch (error) {
    console.error('Error fetching cached translation:', error);
    return null;
  }
};

/**
 * Store translation in cache (both memory and database)
 */
export const storeCachedTranslation = async (
  eventId: string,
  languageCode: string,
  translation: EventTranslation
): Promise<void> => {
  // Store in memory cache immediately
  const cacheKey = getCacheKey(eventId, languageCode);
  translationCache.set(cacheKey, translation);

  // Store in database cache asynchronously (don't block)
  try {
    const { error } = await supabase
      .from('event_translations')
      .upsert({
        event_id: eventId,
        language_code: languageCode,
        name: translation.name,
        description: translation.description,
        about_text: translation.about_text || null,
      }, {
        onConflict: 'event_id,language_code',
      });

    if (error) {
      console.warn('Error storing translation in DB cache:', error);
    } else {
      console.log(`✅ Translation cached: ${eventId} -> ${languageCode}`);
    }
  } catch (error) {
    console.error('Error storing translation in DB cache:', error);
  }
};

/**
 * Batch get cached translations for multiple events
 * Optimized for high-traffic scenarios (e.g., home page with 50+ events)
 */
export const batchGetCachedTranslations = async (
  eventIds: string[],
  languageCode: string
): Promise<Map<string, EventTranslation>> => {
  const result = new Map<string, EventTranslation>();
  const uncachedIds: string[] = [];

  // Check memory cache first for all events
  eventIds.forEach(eventId => {
    const cacheKey = getCacheKey(eventId, languageCode);
    const cached = translationCache.get(cacheKey);
    if (cached) {
      result.set(eventId, cached);
    } else {
      uncachedIds.push(eventId);
    }
  });

  if (uncachedIds.length === 0) {
    console.log(`⚡ All ${eventIds.length} translations from memory cache`);
    return result;
  }

  // Fetch uncached translations from database in one query
  try {
    const { data, error } = await supabase
      .from('event_translations')
      .select('event_id, name, description, about_text')
      .in('event_id', uncachedIds)
      .eq('language_code', languageCode);

    if (error) {
      console.warn('Error batch fetching cached translations:', error);
      return result;
    }

    // Store in both result and memory cache
    data?.forEach(item => {
      const translation: EventTranslation = {
        name: item.name,
        description: item.description || '',
        about_text: item.about_text || undefined,
      };
      result.set(item.event_id, translation);
      
      const cacheKey = getCacheKey(item.event_id, languageCode);
      translationCache.set(cacheKey, translation);
    });

    console.log(
      `💾 Batch fetched ${data?.length || 0}/${uncachedIds.length} translations from DB cache (${result.size}/${eventIds.length} total)`
    );
  } catch (error) {
    console.error('Error batch fetching cached translations:', error);
  }

  return result;
};

/**
 * Translate event with intelligent caching
 * 1. Check cache first
 * 2. If not cached, translate using AI
 * 3. Store in cache for future use
 */
export const translateEvent = async (
  event: {
    id: string;
    name: string;
    description: string;
    aboutText?: string;
  },
  targetLanguage: string,
  userId?: string,
  userTier?: string
): Promise<EventTranslation> => {
  // Check cache first
  const cached = await getCachedTranslation(event.id, targetLanguage);
  if (cached) {
    return cached;
  }

  // Not cached - translate using AI
  console.log(`🤖 Translating event ${event.id} to ${targetLanguage}...`);
  
  try {
    const texts: Record<string, string> = {
      name: event.name,
      description: event.description,
    };

    if (event.aboutText) {
      texts.aboutText = event.aboutText;
    }

    // Use batch translation for better efficiency
    const translated = await translateDescriptionBatch(texts, targetLanguage, userId, userTier);

    const translation: EventTranslation = {
      name: translated.name || event.name,
      description: translated.description || event.description,
      about_text: translated.aboutText,
    };

    // Store in cache for next time
    await storeCachedTranslation(event.id, targetLanguage, translation);

    return translation;
  } catch (error) {
    console.error('Error translating event:', error);
    
    // Return original text as fallback
    return {
      name: event.name,
      description: event.description,
      about_text: event.aboutText,
    };
  }
};

/**
 * Batch translate multiple events (optimized for home page)
 * Only translates events that aren't already cached
 */
export const batchTranslateEvents = async (
  events: Array<{
    id: string;
    name: string;
    description: string;
    aboutText?: string;
  }>,
  targetLanguage: string,
  userId?: string,
  userTier?: string
): Promise<Map<string, EventTranslation>> => {
  if (events.length === 0) {
    return new Map();
  }

  // Get all cached translations first
  const eventIds = events.map(e => e.id);
  const cached = await batchGetCachedTranslations(eventIds, targetLanguage);

  // Find events that need translation
  const needsTranslation = events.filter(e => !cached.has(e.id));

  if (needsTranslation.length === 0) {
    console.log(`✅ All ${events.length} events already cached in ${targetLanguage}`);
    return cached;
  }

  console.log(
    `🤖 Translating ${needsTranslation.length}/${events.length} uncached events to ${targetLanguage}...`
  );

  // Translate uncached events in parallel (but limit concurrency to 5)
  const BATCH_SIZE = 5;
  for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
    const batch = needsTranslation.slice(i, i + BATCH_SIZE);
    const promises = batch.map(event => 
      translateEvent(event, targetLanguage, userId, userTier)
        .then(translation => {
          cached.set(event.id, translation);
          return translation;
        })
        .catch(error => {
          console.error(`Failed to translate event ${event.id}:`, error);
          // Use original text as fallback
          const fallback: EventTranslation = {
            name: event.name,
            description: event.description,
            about_text: event.aboutText,
          };
          cached.set(event.id, fallback);
          return fallback;
        })
    );

    await Promise.all(promises);
  }

  console.log(`✅ Batch translation complete: ${cached.size}/${events.length} events`);
  return cached;
};

/**
 * Clear translation cache (useful for testing or memory management)
 */
export const clearTranslationCache = (): void => {
  translationCache.clear();
  console.log('🗑️ Translation cache cleared');
};

/**
 * Detect user language from IP address using ipapi.co
 * Returns language code (e.g., 'et', 'fi', 'en') based on country
 */
export const detectLanguageFromIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      console.warn('Failed to fetch IP geolocation');
      return 'en';
    }
    
    const data = await response.json();
    const countryCode = data.country_code?.toLowerCase();
    
    // Map country codes to language codes
    const countryToLanguage: Record<string, string> = {
      'ee': 'et', // Estonia → Estonian
      'fi': 'fi', // Finland → Finnish
      'se': 'sv', // Sweden → Swedish
      'de': 'de', // Germany → German
      'fr': 'fr', // France → French
      'es': 'es', // Spain → Spanish
      'ru': 'ru', // Russia → Russian
      'pl': 'pl', // Poland → Polish
      'it': 'it', // Italy → Italian
      'nl': 'nl', // Netherlands → Dutch
      'pt': 'pt', // Portugal → Portuguese
      'gr': 'el', // Greece → Greek
      'ua': 'uk', // Ukraine → Ukrainian
      'cz': 'cs', // Czech Republic → Czech
      'ro': 'ro', // Romania → Romanian
      'hu': 'hu', // Hungary → Hungarian
      'no': 'no', // Norway → Norwegian
      'dk': 'dk', // Denmark → Danish
      'bg': 'bg', // Bulgaria → Bulgarian
      'sk': 'sk', // Slovakia → Slovak
      'hr': 'hr', // Croatia → Croatian
      'rs': 'sr', // Serbia → Serbian
      'lt': 'lt', // Lithuania → Lithuanian
      'lv': 'lv', // Latvia → Latvian
      'si': 'sl', // Slovenia → Slovenian
      'is': 'is', // Iceland → Icelandic
    };
    
    const detectedLang = countryToLanguage[countryCode] || 'en';
    console.log(`🌍 Detected language from IP: ${detectedLang} (country: ${countryCode})`);
    return detectedLang;
  } catch (error) {
    console.warn('Error detecting language from IP:', error);
    return 'en';
  }
};

/**
 * Get user's preferred language with fallback chain
 * 1. Registered user: use preferred_language from profile
 * 2. Guest with stored preference: use localStorage
 * 3. Guest without preference: detect from IP
 * 4. Fallback: English
 */
export const getUserLanguagePreference = async (
  user?: { preferred_language?: string } | null
): Promise<string> => {
  // 1. Registered users: use their profile preference
  if (user?.preferred_language) {
    console.log('👤 Using user preference:', user.preferred_language);
    return user.preferred_language;
  }
  
  // 2. Guests: check localStorage first (if they manually changed language)
  try {
    const stored = localStorage.getItem('guest_language');
    if (stored && isUILanguage(stored)) {
      console.log('💾 Using stored guest preference:', stored);
      return stored;
    }
  } catch (e) {
    console.warn('Error accessing localStorage:', e);
  }
  
  // 3. No stored preference: detect from IP
  const ipLang = await detectLanguageFromIP();
  console.log('🌐 Using IP-detected language:', ipLang);
  return ipLang;
};
