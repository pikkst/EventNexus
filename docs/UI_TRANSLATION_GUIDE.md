# UI Translation System Implementation Guide

## Overview
EventNexus now has a complete UI translation system that separates platform interface translations from event content translations.

## File Structure
```
src/
├── i18n/
│   ├── translations.ts     # All UI translations (5 languages)
│   └── useTranslation.ts   # React hook for accessing translations
└── components/
    └── UILanguageSelector.tsx  # Language selector component
```

## Supported UI Languages
1. 🇬🇧 English (en)
2. 🇪🇪 Estonian (et)
3. 🇷🇺 Russian (ru)
4. 🇫🇮 Finnish (fi)
5. 🇩🇪 German (de)

## How to Use

### 1. In React Components

```tsx
import { useTranslation } from '../i18n/useTranslation';

const MyComponent = () => {
  const t = useTranslation();
  
  return (
    <div>
      <h1>{t.nav.home}</h1>
      <button>{t.common.save}</button>
      <p>{t.landing.hero.title}</p>
    </div>
  );
};
```

### 2. Outside React Components

```typescript
import { getTranslation } from '../i18n/useTranslation';

const t = getTranslation('et'); // Force specific language
console.log(t.common.loading); // "Laadimine..."
```

### 3. Change Language

```typescript
import { setUILanguage } from '../i18n/useTranslation';

// Change UI language
setUILanguage('et'); // Estonian
window.location.reload(); // Reload to apply
```

### 4. Add Language Selector to Component

```tsx
import { UILanguageSelector } from './UILanguageSelector';

// Compact version (for navbar)
<UILanguageSelector 
  compact={true}
  theme="dark"
  onLanguageChange={(lang) => console.log('Language changed to:', lang)}
/>

// Full version (for settings page)
<UILanguageSelector 
  compact={false}
  theme="dark"
/>
```

## Example: Update Landing Page

### Before:
```tsx
<h1>Discover Your Next Experience</h1>
<button>Get Started Free</button>
<p>Find amazing events near you</p>
```

### After:
```tsx
import { useTranslation } from '../i18n/useTranslation';

const LandingPage = () => {
  const t = useTranslation();
  
  return (
    <>
      <h1>{t.landing.hero.title}</h1>
      <button>{t.landing.hero.ctaPrimary}</button>
      <p>{t.landing.hero.subtitle}</p>
    </>
  );
};
```

## Translation Keys Structure

```typescript
t.nav.home                    // "Home" / "Avaleht" / "Главная"
t.nav.signIn                  // "Sign In" / "Logi sisse" / "Войти"
t.landing.hero.title          // Landing page hero title
t.landing.features.title      // Features section title
t.common.save                 // "Save" button
t.common.cancel               // "Cancel" button
t.events.createNew            // "Create New Event"
t.profile.settings            // "Settings"
t.auth.email                  // "Email" form label
t.forms.required              // "Required" field indicator
t.dashboard.totalEvents       // "Total Events"
```

## Adding New Translations

### 1. Add to Interface (translations.ts)
```typescript
export interface UITranslations {
  // ... existing ...
  newSection: {
    title: string;
    description: string;
  };
}
```

### 2. Add Translations for All Languages
```typescript
export const translations = {
  en: {
    // ... existing ...
    newSection: {
      title: 'New Section',
      description: 'Description text'
    }
  },
  et: {
    // ... existing ...
    newSection: {
      title: 'Uus sektsioon',
      description: 'Kirjelduse tekst'
    }
  },
  // ... repeat for all languages
};
```

## Priority Components to Update

### High Priority (User-facing):
1. ✅ **translations.ts** - Core translation file (DONE)
2. ✅ **useTranslation.ts** - Hook implementation (DONE)
3. ✅ **UILanguageSelector.tsx** - Language selector (DONE)
4. ⏳ **LandingPage.tsx** - Hero, features, CTAs
5. ⏳ **AuthModal.tsx** - Sign in/up forms
6. ⏳ **App.tsx** - Navigation, sidebar

### Medium Priority:
7. ⏳ **Dashboard.tsx** - Statistics, labels
8. ⏳ **EventCreationFlow.tsx** - Form labels
9. ⏳ **UserProfile.tsx** - Settings, preferences
10. ⏳ **Footer.tsx** - Links, copyright

### Low Priority (Less visible):
11. ⏳ **AdminCommandCenter.tsx** - Admin interface
12. ⏳ **TicketScanner.tsx** - Scanner UI
13. ⏳ **PricingPage.tsx** - Pricing tiers

## Implementation Steps

### Step 1: Add Language Selector to Navbar
```tsx
// In App.tsx or Navbar component
import { UILanguageSelector } from './components/UILanguageSelector';

<nav>
  {/* ... existing nav items ... */}
  <UILanguageSelector compact={true} theme="dark" />
</nav>
```

### Step 2: Update Component to Use Translations
```tsx
// Example: AuthModal.tsx
import { useTranslation } from '../i18n/useTranslation';

const AuthModal = () => {
  const t = useTranslation();
  
  return (
    <form>
      <label>{t.auth.email}</label>
      <input type="email" placeholder={t.auth.email} />
      
      <label>{t.auth.password}</label>
      <input type="password" placeholder={t.auth.password} />
      
      <button>{t.auth.signIn}</button>
      <button>{t.auth.signUp}</button>
    </form>
  );
};
```

### Step 3: Test Language Switching
1. Add UILanguageSelector to your page
2. Click on language selector
3. Select different language
4. Page reloads with new language

## Best Practices

### DO:
- ✅ Use `useTranslation()` hook in components
- ✅ Use `getTranslation()` outside React
- ✅ Add translations for ALL 5 languages when adding new keys
- ✅ Use semantic keys: `t.section.element` not `t.text1`
- ✅ Test all languages before committing

### DON'T:
- ❌ Hardcode English text (use translation keys)
- ❌ Mix UI translations with content translations
- ❌ Forget to reload page after language change
- ❌ Add incomplete translations (all or nothing)

## Testing

### Manual Testing:
1. Open app in browser
2. Add `<UILanguageSelector />` to any page
3. Switch between languages
4. Verify all text changes correctly
5. Check for missing translations (falls back to English)

### Automated Testing:
```typescript
import { getTranslation } from '../i18n/useTranslation';

test('translations exist for all languages', () => {
  const languages = ['en', 'et', 'ru', 'fi', 'de'];
  
  languages.forEach(lang => {
    const t = getTranslation(lang);
    expect(t.nav.home).toBeDefined();
    expect(t.common.save).toBeDefined();
  });
});
```

## Next Steps

1. **Immediate:** Add UILanguageSelector to App.tsx navbar
2. **Week 1:** Update LandingPage, AuthModal, Navigation
3. **Week 2:** Update Dashboard, EventCreationFlow
4. **Week 3:** Update remaining components
5. **Week 4:** Add Spanish, French, Swedish support

## Support

Questions? Check:
- `src/i18n/translations.ts` - All translation keys
- `src/i18n/useTranslation.ts` - Hook documentation
- `src/components/UILanguageSelector.tsx` - Component usage

---

**Status:** ✅ Translation system fully implemented and ready to use!
**Languages:** 🇬🇧 EN | 🇪🇪 ET | 🇷🇺 RU | 🇫🇮 FI | 🇩🇪 DE
**Coverage:** ~200 UI strings across navigation, forms, common elements
