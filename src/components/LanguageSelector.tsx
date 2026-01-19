/**
 * Language Selector Component for User Profile
 * Allows authenticated users to select ANY language from 100+ supported languages
 * Guest users see limited selection of 9 UI languages
 */

import React, { useState, useMemo } from 'react';
import { CONTENT_LANGUAGES, UI_LANGUAGES, LanguageOption } from '../services/languageService';
import { updateUserPreferredLanguage } from '../services/dbService';
import { Globe, Check, Search } from 'lucide-react';

interface LanguageSelectorProps {
  userId?: string; // If provided, user is authenticated
  currentLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  theme?: 'light' | 'dark';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  userId,
  currentLanguage,
  onLanguageChange,
  theme = 'dark',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Authenticated users see ALL languages, guests see only UI languages
  const availableLanguages = userId ? CONTENT_LANGUAGES : UI_LANGUAGES;

  // Group languages by region for easier navigation
  const languagesByRegion = useMemo(() => {
    const grouped: Record<string, LanguageOption[]> = {};
    availableLanguages.forEach(lang => {
      const region = lang.region || 'Other';
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(lang);
    });
    return grouped;
  }, [availableLanguages]);

  // Filter languages by search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery) return languagesByRegion;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, LanguageOption[]> = {};

    Object.entries(languagesByRegion).forEach(([region, langs]) => {
      const matchingLangs = langs.filter(
        lang =>
          lang.name.toLowerCase().includes(query) ||
          lang.nativeName.toLowerCase().includes(query) ||
          lang.code.toLowerCase().includes(query)
      );
      if (matchingLangs.length > 0) {
        filtered[region] = matchingLangs;
      }
    });

    return filtered;
  }, [languagesByRegion, searchQuery]);

  const handleLanguageSelect = async (languageCode: string) => {
    setIsSaving(true);

    try {
      // If authenticated, save to database
      if (userId) {
        const success = await updateUserPreferredLanguage(userId, languageCode);
        if (!success) {
          throw new Error('Failed to update language preference');
        }
      } else {
        // Guest: save to localStorage
        localStorage.setItem('guest_language', languageCode);
      }

      // Notify parent component
      onLanguageChange(languageCode);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error updating language:', error);
      alert('Failed to update language preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentLangOption = availableLanguages.find(l => l.code === currentLanguage);

  return (
    <div className="relative">
      {/* Current Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-900'
            : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-white'
        }`}
        disabled={isSaving}
      >
        <Globe className="w-5 h-5" />
        <span className="font-medium">
          {currentLangOption?.flag} {currentLangOption?.nativeName || 'English'}
        </span>
        <span className="text-xs opacity-70">
          {userId ? `${availableLanguages.length}+ languages` : `${UI_LANGUAGES.length} languages`}
        </span>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 right-0 w-96 max-h-[500px] overflow-hidden rounded-xl shadow-2xl border z-50 ${
            theme === 'light'
              ? 'bg-white border-slate-200'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          {/* Header with Search */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5" />
              <h3 className="font-bold">
                {userId ? 'Select Your Language' : 'Select Language (Limited)'}
              </h3>
            </div>
            {userId && (
              <p className="text-xs opacity-70 mb-3">
                ✨ As a registered user, you can choose from 100+ languages!
              </p>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          {/* Language List by Region */}
          <div className="overflow-y-auto max-h-[400px]">
            {Object.entries(filteredLanguages).map(([region, langs]) => (
              <div key={region} className="p-2">
                <div className="px-2 py-1 text-xs font-bold opacity-50 uppercase">
                  {region}
                </div>
                {langs.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    disabled={isSaving}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      lang.code === currentLanguage
                        ? theme === 'light'
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'bg-indigo-900/50 text-indigo-100'
                        : theme === 'light'
                        ? 'hover:bg-slate-100 text-slate-900'
                        : 'hover:bg-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <div className="font-medium">{lang.nativeName}</div>
                        <div className="text-xs opacity-70">{lang.name}</div>
                      </div>
                    </div>
                    {lang.code === currentLanguage && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            ))}

            {Object.keys(filteredLanguages).length === 0 && (
              <div className="p-8 text-center opacity-50">
                <Globe className="w-12 h-12 mx-auto mb-2" />
                <p>No languages found</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          {!userId && (
            <div
              className={`p-3 border-t text-xs text-center ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              💡 <strong>Register</strong> to unlock 100+ languages including Hindi, Chinese,
              Hungarian, and more!
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Usage example in UserProfile component:
/*
import { LanguageSelector } from './LanguageSelector';

const UserProfile = ({ user }) => {
  const [userLanguage, setUserLanguage] = useState(user?.preferred_language || 'en');

  const handleLanguageChange = (newLang: string) => {
    setUserLanguage(newLang);
    // Optionally reload events with new language
    window.location.reload();
  };

  return (
    <div>
      <h2>Profile Settings</h2>
      <LanguageSelector
        userId={user?.id}
        currentLanguage={userLanguage}
        onLanguageChange={handleLanguageChange}
        theme="dark"
      />
    </div>
  );
};
*/
