/**
 * UI Language Selector Component
 * Allows users to change the platform interface language
 * This is separate from content translation language
 */

import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { UI_LANGUAGES } from '../services/languageService';
import { setUILanguage, getCurrentUILanguage } from '../i18n/useTranslation';

interface UILanguageSelectorProps {
  onLanguageChange?: (languageCode: string) => void;
  theme?: 'light' | 'dark';
  compact?: boolean; // For navbar/header display
}

export const UILanguageSelector: React.FC<UILanguageSelectorProps> = ({
  onLanguageChange,
  theme = 'dark',
  compact = false,
}) => {
  const [currentLang, setCurrentLang] = useState(getCurrentUILanguage());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for language changes from other components
    const handleLanguageChange = (e: CustomEvent) => {
      setCurrentLang(e.detail.language);
    };

    window.addEventListener('ui-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('ui-language-changed', handleLanguageChange as EventListener);
    };
  }, []);

  const handleLanguageSelect = (languageCode: string) => {
    setUILanguage(languageCode);
    setCurrentLang(languageCode);
    setIsOpen(false);

    // Notify parent component
    if (onLanguageChange) {
      onLanguageChange(languageCode);
    }

    // Reload page to apply new translations
    window.location.reload();
  };

  const currentLangOption = UI_LANGUAGES.find(l => l.code === currentLang);

  if (compact) {
    // Compact version for navbar
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            theme === 'light'
              ? 'hover:bg-slate-100 text-slate-700'
              : 'hover:bg-slate-800 text-white'
          }`}
          aria-label="Change language"
        >
          <span className="text-xl">{currentLangOption?.flag || '🇬🇧'}</span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={`absolute top-full right-0 mt-2 w-64 rounded-xl shadow-xl border overflow-hidden z-50 ${
                theme === 'light'
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              <div className="p-3 border-b border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4" />
                  <span className="font-bold text-sm">Interface Language</span>
                </div>
                <p className="text-xs opacity-70">Change platform language</p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {UI_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                      lang.code === currentLang
                        ? theme === 'light'
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'bg-indigo-900/50 text-indigo-100'
                        : theme === 'light'
                        ? 'hover:bg-slate-100 text-slate-900'
                        : 'hover:bg-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      <div className="text-left">
                        <div className="font-medium text-sm">{lang.nativeName}</div>
                        <div className="text-xs opacity-70">{lang.name}</div>
                      </div>
                    </div>
                    {lang.code === currentLang && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full version for settings page
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium opacity-90">
        Interface Language
      </label>
      <p className="text-sm opacity-70 mb-3">
        Choose the language for menus, buttons, and interface elements. This is separate from event content translation.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {UI_LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              lang.code === currentLang
                ? 'border-indigo-500 bg-indigo-900/20 ring-2 ring-indigo-500/50'
                : theme === 'light'
                ? 'border-slate-300 hover:border-slate-400 bg-white'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <span className="text-3xl">{lang.flag}</span>
            <div className="flex-1 text-left">
              <div className="font-semibold">{lang.nativeName}</div>
              <div className="text-sm opacity-70">{lang.name}</div>
            </div>
            {lang.code === currentLang && (
              <Check className="w-5 h-5 text-green-500" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-400 mb-1">
              Need more languages?
            </p>
            <p className="text-sm opacity-70">
              Platform interface is available in 9 major languages. Event content can be translated to 100+ languages using AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
