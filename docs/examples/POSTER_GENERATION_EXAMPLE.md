# Poster Generation Example - Step by Step

## Scenario: Estonian Music Festival

### Event Details
```typescript
const event: EventNexusEvent = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Tallinna Suvefestival 2026",
  category: "Music",
  description: "Suurim muusikafestival Eestis 2026. aastal. Esinevad parimad kohalikud ja rahvusvahelised artistid.",
  date: "2026-07-15",
  time: "18:00",
  location: {
    lat: 59.4370,
    lng: 24.7536,
    address: "Vabaduse väljak 1",
    city: "Tallinn"
  },
  price: 35.00,
  visibility: "public",
  organizerId: "user-123",
  imageUrl: "...",
  attendeesCount: 450,
  maxAttendees: 5000
}
```

## Step 1: User Initiates Poster Generation

User navigates to Dashboard → Ad Campaign → Clicks "Generate Poster"

```typescript
// Dashboard.tsx - handleGeneratePoster
const handleGeneratePoster = async (ad: Ad) => {
  setIsGeneratingPoster(true);
  
  try {
    // Step 2: AI generates design with market awareness
    const design = await generatePosterDesign(
      "Tallinna Suvefestival 2026",
      "Suurim muusikafestival Eestis 2026. aastal...",
      "Music",
      "Summer Festival Energy",
      user.id,
      user.subscription_tier,
      { city: "Tallinn", address: "Vabaduse väljak 1" }
    );
    
    // ... continues to image generation
  } catch (error) {
    console.error('Poster generation error:', error);
  }
};
```

## Step 2: AI Design Generation

### Input to Gemini AI
```
Target Market: Estonian market (Eesti turg) - design should resonate with Estonian culture and aesthetics

EVENT DETAILS:
- Name: "Tallinna Suvefestival 2026"
- Category: Music
- Description: Suurim muusikafestival Eestis 2026. aastal...
- Campaign Focus: Summer Festival Energy
```

### AI Response (JSON)
```json
{
  "title": "Vibrant Summer Music Festival",
  "description": "Bold, energetic poster design featuring a gradient of warm sunset colors (orange to purple) that evoke summer evening vibes. The layout emphasizes the festival name in large, bold typography. Cultural elements include Estonian blue tones in the accent color to resonate with local identity.",
  "imageUrl": "A dynamic concert scene at sunset with a massive crowd of silhouettes raising hands against a vibrant orange-purple sky. Stage lights create dramatic beams. Style: modern, energetic, photography-inspired with festival atmosphere. Suitable for Estonian summer festival culture.",
  "colorScheme": {
    "primary": "#FF6B35",
    "secondary": "#7B2CBF",
    "accent": "#0072CE"
  }
}
```

## Step 3: Language Detection

```typescript
// posterService.ts - detectLanguageFromLocation
const locale = detectLanguageFromLocation("Tallinn", "Vabaduse väljak 1");
// Returns: "et" (Estonian)

const translations = POSTER_TRANSLATIONS["et"];
/*
{
  eventInvitation: "🎉 Ürituse Kutse",
  dateTime: "📅 Kuupäev ja Kellaaeg",
  location: "📍 Asukoht",
  price: "💰 Hind",
  scanToBook: "Skaneeri Piletite Broneerimiseks",
  footer: "Broneeri piletid veebis • Piiratud mahutavus • Ära jää ilma!",
  category: "🎯 Kategooria",
  at: "kell",
  free: "TASUTA"
}
*/
```

## Step 4: Date Localization

```typescript
// posterService.ts - getLocalizedDate
const localizedDate = getLocalizedDate("2026-07-15", "et");
// Returns: "kolmapäev, 15. juuli 2026"
```

## Step 5: QR Code Generation

```typescript
// posterService.ts - QRCode.toDataURL
const eventUrl = "https://www.eventnexus.eu/event/550e8400-e29b-41d4-a716-446655440000";
const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
  errorCorrectionLevel: 'H',
  width: 500,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' }
});
// Returns: "data:image/png;base64,iVBORw0KGgoAAAANSUh..."
```

## Step 6: HTML Poster Layout Generation

```html
<div style="
  width: 1400px;
  height: 1980px;
  background: linear-gradient(135deg, #FF6B35 0%, #7B2CBF 100%);
  padding: 40px;
">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="font-size: 16px; letter-spacing: 4px; color: rgba(255,255,255,0.9);">
      🎉 ÜRITUSE KUTSE
    </div>
  </div>

  <!-- Main Content -->
  <div style="display: flex; gap: 30px;">
    <!-- Left: AI-Generated Festival Image (60%) -->
    <div style="flex: 0 0 60%; border-radius: 24px;">
      <img src="[AI-generated concert image]" style="width: 100%; height: 100%;" />
    </div>

    <!-- Right: Event Details (40%) -->
    <div style="flex: 0 0 40%; color: white;">
      <!-- Event Name -->
      <h1 style="font-size: 32px; font-weight: 900;">
        Tallinna Suvefestival 2026
      </h1>

      <!-- Event Info Box -->
      <div style="background: rgba(0,0,0,0.2); padding: 24px; border-radius: 16px;">
        <!-- Date & Time -->
        <div style="font-size: 14px; margin-bottom: 14px;">
          <strong>📅 Kuupäev ja Kellaaeg</strong><br/>
          kolmapäev, 15. juuli 2026 kell 18:00
        </div>

        <!-- Location -->
        <div style="font-size: 14px; margin-bottom: 14px;">
          <strong>📍 Asukoht</strong><br/>
          Vabaduse väljak 1<br/>
          Tallinn
        </div>

        <!-- Category -->
        <div style="font-size: 14px; margin-bottom: 14px;">
          <strong>🎯 Kategooria</strong><br/>
          Music
        </div>

        <!-- Price -->
        <div style="font-size: 16px; color: #0072CE; font-weight: 700;">
          <strong>💰 Hind</strong><br/>
          €35.00
        </div>
      </div>

      <!-- QR Code -->
      <div style="text-align: center; margin-top: 20px;">
        <img src="[QR Code Data URL]" 
             style="width: 180px; height: 180px; background: white; padding: 12px; border-radius: 16px;" />
        <div style="font-size: 12px; font-weight: 700; margin-top: 14px;">
          SKANEERI PILETITE BRONEERIMISEKS
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding-top: 24px; border-top: 2px solid rgba(255,255,255,0.25);">
    <strong style="font-size: 15px;">EventNexus</strong> | 
    Broneeri piletid veebis • Piiratud mahutavus • Ära jää ilma!
  </div>
</div>
```

## Step 7: Canvas Rendering & PDF Export

```typescript
// posterService.ts - html2canvas
const canvas = await html2canvas(container, {
  scale: 2.5,        // High resolution
  dpi: 300,          // Print quality
  useCORS: true,
  windowHeight: 1980,
  windowWidth: 1400
});

// Create A3 PDF
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a3',      // 297x420mm
  compress: true
});

const imgData = canvas.toDataURL('image/png');
pdf.addImage(imgData, 'PNG', 5, 5, 287, 410); // 5mm margins

// Download
const pdfBlob = pdf.output('blob');
const url = URL.createObjectURL(pdfBlob);
const link = document.createElement('a');
link.href = url;
link.download = 'Tallinna_Suvefestival_2026_poster.pdf';
link.click();
```

## Final Output: Estonian Poster

### Visual Preview (Text-based representation)

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                    🎉 ÜRITUSE KUTSE                           ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ┌─────────────────────┐  ┌──────────────────────────────┐   ║
║  │                     │  │                              │   ║
║  │   [AI-Generated]    │  │  Tallinna Suvefestival 2026  │   ║
║  │   Concert Scene     │  │                              │   ║
║  │   Sunset + Crowd    │  ├──────────────────────────────┤   ║
║  │   Festival Vibes    │  │                              │   ║
║  │                     │  │ 📅 Kuupäev ja Kellaaeg       │   ║
║  │   Orange-Purple     │  │ kolmapäev, 15. juuli 2026    │   ║
║  │   Gradient Sky      │  │ kell 18:00                   │   ║
║  │                     │  │                              │   ║
║  │   Stage Lights      │  │ 📍 Asukoht                   │   ║
║  │   Silhouettes       │  │ Vabaduse väljak 1           │   ║
║  │                     │  │ Tallinn                      │   ║
║  │                     │  │                              │   ║
║  └─────────────────────┘  │ 🎯 Kategooria                │   ║
║                           │ Music                        │   ║
║                           │                              │   ║
║                           │ 💰 Hind                      │   ║
║                           │ €35.00                       │   ║
║                           │                              │   ║
║                           ├──────────────────────────────┤   ║
║                           │      ┌──────────────┐        │   ║
║                           │      │  [QR CODE]   │        │   ║
║                           │      │   180x180    │        │   ║
║                           │      └──────────────┘        │   ║
║                           │                              │   ║
║                           │ SKANEERI PILETITE           │   ║
║                           │ BRONEERIMISEKS              │   ║
║                           └──────────────────────────────┘   ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║         EventNexus | Broneeri piletid veebis •               ║
║         Piiratud mahutavus • Ära jää ilma!                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### PDF Specifications
- **Format**: A3 (297×420mm)
- **Resolution**: 300 DPI
- **File Size**: ~2-3 MB (compressed)
- **Color Space**: RGB
- **Filename**: `Tallinna_Suvefestival_2026_poster.pdf`

### QR Code Target
```
URL: https://www.eventnexus.eu/event/550e8400-e29b-41d4-a716-446655440000
Error Correction: High (30%)
Size: 180×180px
Margin: 2 modules
```

## Comparison with Other Languages

### Same Event in Different Cities

#### Helsinki, Finland 🇫🇮
```
🎉 TAPAHTUMAKUTSU

Helsingin Kesäfestivaali 2026

📅 Päivämäärä ja Aika
keskiviikko, 15. heinäkuuta 2026 klo 18:00

💰 Hinta: €35.00

SKANNAA VARATAKSESI LIPUT
```

#### Stockholm, Sweden 🇸🇪
```
🎉 EVENEMANGINBJUDAN

Stockholms Sommarfestival 2026

📅 Datum och Tid
onsdag 15 juli 2026 kl 18:00

💰 Pris: €35.00

SKANNA FÖR ATT BOKA BILJETTER
```

#### Berlin, Germany 🇩🇪
```
🎉 VERANSTALTUNGSEINLADUNG

Berliner Sommerfestival 2026

📅 Datum und Uhrzeit
Mittwoch, 15. Juli 2026 um 18:00

💰 Preis: €35,00

SCANNEN ZUM BUCHEN
```

## Success Metrics

After poster generation:
- ✅ **Download**: PDF saved to user's device
- ✅ **Language**: Correct Estonian translation
- ✅ **QR Code**: Functional and scannable
- ✅ **Print Ready**: 300 DPI, A3 format
- ✅ **Credits**: 25 credits deducted (Free tier only)

## User Workflow Summary

1. User creates event → Sets location to Tallinn
2. User generates ad campaign in Dashboard
3. User clicks "Generate Poster" button
4. AI detects Estonian market → generates culturally relevant design
5. System translates all UI text to Estonian
6. QR code created pointing to event page
7. PDF downloads automatically
8. User prints at local print shop
9. User posts on community boards, cafes, venues
10. Attendees scan QR code → book tickets online

---

**Total Time**: ~15-20 seconds  
**User Effort**: 2 clicks  
**Result**: Professional, localized, print-ready poster
