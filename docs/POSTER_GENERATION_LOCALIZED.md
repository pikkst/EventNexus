# Localized Physical Poster Generation

## Overview
EventNexus automatically generates professional, printable event posters with AI-designed visuals, QR codes, and localized text based on the event's location. These posters are optimized for physical printing and display on walls, community boards, cafes, and public spaces.

## Key Features

### 1. **Automatic Language Detection**
The system detects the event's location (city/country) and automatically generates poster text in the appropriate language:

- 🇪🇪 **Estonian** (Tallinn, Tartu, Pärnu)
- 🇫🇮 **Finnish** (Helsinki, Espoo, Tampere)
- 🇸🇪 **Swedish** (Stockholm, Göteborg, Malmö)
- 🇩🇪 **German** (Berlin, München, Hamburg)
- 🇫🇷 **French** (Paris, Lyon, Marseille)
- 🇪🇸 **Spanish** (Madrid, Barcelona, Valencia)
- 🇷🇺 **Russian** (Moscow, Sankt Petersburg)
- 🇵🇱 **Polish** (Warsaw, Kraków, Wrocław)
- 🇬🇧 **English** (Default/International)

### 2. **Localized Content**
All poster text is automatically translated:
- Event invitation header
- Date & Time label
- Location label
- Price label (including "FREE" for free events)
- Category label
- Call-to-action ("Scan to Book Tickets")
- Footer text

### 3. **Cultural Design Adaptation**
The AI poster designer considers local market preferences:
- **Estonia**: Modern, tech-forward aesthetics
- **Finland**: Clean, minimalist Scandinavian design
- **Sweden**: Elegant simplicity with strong typography
- **Germany**: Professional, structured layouts
- **France**: Artistic, sophisticated color palettes
- **Spain**: Vibrant, energetic designs with warm colors

### 4. **High-Quality Print Specifications**
- **Format**: A3 (297×420mm) for maximum visibility
- **Resolution**: 300 DPI optimized
- **Output**: PDF ready for professional printing
- **QR Code**: High-contrast, large QR code (180×180px) for easy scanning
- **Typography**: Bold, readable from 3-4 meters away

## Technical Implementation

### Service Layer

#### `posterService.ts`
```typescript
// Automatic language detection
const locale = detectLanguageFromLocation(event.location.city, event.location.address);

// Get translations for detected language
const translations = POSTER_TRANSLATIONS[locale];

// Localized date formatting
const localizedDate = getLocalizedDate(event.date, locale);
```

#### `geminiService.ts`
```typescript
// AI generates design considering local market
export const generatePosterDesign = async (
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  campaignTheme: string,
  userId?: string,
  userTier?: string,
  eventLocation?: { city: string; address: string } // For market detection
)
```

### Poster Layout

```
┌───────────────────────────────────────┐
│     [Event Invitation - Localized]    │
├───────────────────────────────────────┤
│                                       │
│  ┌──────────┐  ┌─────────────────┐  │
│  │          │  │   Event Name    │  │
│  │   AI     │  │                 │  │
│  │  Image   │  ├─────────────────┤  │
│  │  (60%)   │  │ 📅 Date & Time  │  │
│  │          │  │ 📍 Location     │  │
│  │          │  │ 🎯 Category     │  │
│  │          │  │ 💰 Price        │  │
│  └──────────┘  ├─────────────────┤  │
│                │   [QR Code]     │  │
│                │ Scan to Book    │  │
│                └─────────────────┘  │
├───────────────────────────────────────┤
│        EventNexus | Footer Text       │
└───────────────────────────────────────┘
```

## Usage

### In Dashboard Component

```typescript
// User clicks "Generate Poster" for an ad campaign
const handleGeneratePoster = async (ad: Ad) => {
  try {
    // AI generates design with location awareness
    const design = await generatePosterDesign(
      selectedEvent.name,
      selectedEvent.description,
      selectedEvent.category,
      campaignTheme,
      user.id,
      user.subscription_tier,
      selectedEvent.location // Pass location for localization
    );

    // Generate poster image
    const posterImageUrl = await generateAdImage(
      design.imageUrl,
      '16:9',
      false,
      user.id,
      user.subscription_tier
    );

    // Create printable PDF with localization
    await generatePrintablePoster(selectedEvent, design, true);
    
    // PDF automatically downloads
    alert('✅ Poster generated and downloaded! Ready to print.');
  } catch (error) {
    console.error('Poster generation error:', error);
  }
};
```

## Supported Languages & Translations

### Example: Estonian Event in Tallinn

```
🎉 Ürituse Kutse

Event Name Here

📅 Kuupäev ja Kellaaeg
Reede, 15. Märts 2026 kell 19:00

📍 Asukoht
Tallinna Kultuurikeskus
Tallinn, Estonia

🎯 Kategooria
Muusika

💰 Hind
€25.00

[QR CODE]
Skaneeri Piletite Broneerimiseks

EventNexus | Broneeri piletid veebis • Piiratud mahutavus • Ära jää ilma!
```

### Example: Free Event in Helsinki

```
🎉 Tapahtumakutsu

Kesäfestivaali 2026

📅 Päivämäärä ja Aika
Lauantai, 10. Kesäkuuta 2026 klo 14:00

📍 Sijainti
Kauppatori
Helsinki, Finland

🎯 Kategoria
Festivaalit

💰 Hinta
ILMAINEN

[QR CODE]
Skannaa Varataksesi Liput

EventNexus | Varaa lippusi verkossa • Rajoitettu kapasiteetti • Älä missaa!
```

## Credit Cost

| Tier | Cost |
|------|------|
| **Free** | 25 credits per poster |
| **Pro/Premium/Enterprise** | Included (no cost) |

Combined with ad image generation, total credits:
- Poster design: 25 credits
- Ad image generation: 20 credits
- **Total**: 45 credits (€22.50 value for free tier)

## Best Practices

### For Event Organizers

1. **Create event with accurate location** - City and country fields ensure correct language
2. **Use descriptive event names** - AI designs better posters with clear event titles
3. **Provide detailed descriptions** - Better descriptions = more relevant AI-generated visuals
4. **Choose appropriate categories** - Helps AI select culturally relevant imagery

### For Printing

1. **Use A3 paper** (297×420mm) for maximum visibility
2. **Print at 300 DPI or higher** for professional quality
3. **Use high-quality paper** (200-300 GSM coated or matte)
4. **Test QR code** with phone before mass printing
5. **Laminate posters** for outdoor/long-term display

### QR Code Placement

- **Indoor locations**: Eye-level placement (140-160cm)
- **Community boards**: Center or lower-right
- **Cafe/restaurant**: Near entrance or counter
- **Public transport**: At waiting areas

## Future Enhancements

- [ ] Multi-language posters (show multiple languages on one poster)
- [ ] Custom poster templates by market
- [ ] Venue-specific designs (cafe vs concert hall vs outdoor)
- [ ] Social media QR codes alongside event QR code
- [ ] Accessibility features (high-contrast mode, larger text options)
- [ ] Poster A/B testing with analytics

## Technical Notes

### Language Detection Logic
```typescript
const detectLanguageFromLocation = (city: string, address: string): string => {
  const text = `${city} ${address}`.toLowerCase();
  
  // Check for Estonian cities/keywords
  if (text.includes('tallinn') || text.includes('estonia')) return 'et';
  
  // Check for Finnish cities/keywords
  if (text.includes('helsinki') || text.includes('finland')) return 'fi';
  
  // ... more checks
  
  return 'en'; // Default to English
};
```

### Date Localization
```typescript
const getLocalizedDate = (date: string, locale: string): string => {
  const localeMap = {
    en: 'en-US', et: 'et-EE', fi: 'fi-FI', sv: 'sv-SE',
    de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ru: 'ru-RU', pl: 'pl-PL'
  };
  
  return new Date(date).toLocaleDateString(localeMap[locale], { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
};
```

## Related Documentation

- [AI Promotion Tools Implementation](./AI_PROMOTION_TOOLS_IMPLEMENTATION.md)
- [Professional Ad Integration](../PROFESSIONAL_AD_INTEGRATION_ET.md)
- [Gemini Service Guide](./GEMINI_SERVICE.md)

---

**Last Updated**: January 8, 2026  
**Status**: ✅ Fully Implemented
