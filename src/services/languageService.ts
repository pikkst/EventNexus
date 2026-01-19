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
}

export interface EventTranslation {
  name: string;
  description: string;
  about_text?: string;
}

// In-memory cache for translations (session-level)
// Reduces database queries for frequently viewed events
const translationCache = new Map<string, EventTranslation>();
const CACHE_KEY_SEPARATOR = '::';

// Generate cache key
const getCacheKey = (eventId: string, languageCode: string): string => {
  return `${eventId}${CACHE_KEY_SEPARATOR}${languageCode}`;
};

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
