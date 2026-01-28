/**
 * UI Translation Hook
 * React hook for accessing UI translations based on user's selected language
 */

import { useMemo, useState, useEffect } from 'react';
import { translations, UITranslations } from './translations';

export const useTranslation = (userLanguage?: string): UITranslations => {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleLanguageChange = () => forceUpdate(prev => prev + 1);
    window.addEventListener('ui-language-changed', handleLanguageChange);
    return () => window.removeEventListener('ui-language-changed', handleLanguageChange);
  }, []);
  
  return useMemo(() => {
    // Get language from parameter, localStorage, or default to English
    const lang = userLanguage || 
                 localStorage.getItem('ui_language') || 
                 localStorage.getItem('guest_language') || 
                 'en';
    
    // Return translations for selected language, fallback to English
    return translations[lang] || translations.en;
  }, [userLanguage, forceUpdate]);
};

/**
 * Get translation function - can be used outside React components
 */
export const getTranslation = (languageCode?: string): UITranslations => {
  const lang = languageCode || 
               localStorage.getItem('ui_language') || 
               localStorage.getItem('guest_language') || 
               'en';
  
  return translations[lang] || translations.en;
};

/**
 * Set UI language preference
 */
export const setUILanguage = (languageCode: string) => {
  localStorage.setItem('ui_language', languageCode);
  // Trigger a custom event to notify components of language change
  window.dispatchEvent(new CustomEvent('ui-language-changed', { detail: { language: languageCode } }));
};

/**
 * Get current UI language
 */
export const getCurrentUILanguage = (): string => {
  return localStorage.getItem('ui_language') || 
         localStorage.getItem('guest_language') || 
         'en';
};
