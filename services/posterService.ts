import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { EventNexusEvent } from '../types';

export interface PosterDesign {
  title: string;
  description: string;
  imageUrl: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Localization mappings for poster text
const POSTER_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    eventInvitation: '🎉 Event Invitation',
    dateTime: '📅 Date & Time',
    location: '📍 Location',
    price: '💰 Price',
    scanToBook: 'Scan to Book Tickets',
    footer: 'Book your tickets online • Limited capacity • Do not miss out!',
    category: '🎯 Category',
    at: 'at',
    free: 'FREE',
  },
  et: {
    eventInvitation: '🎉 Ürituse Kutse',
    dateTime: '📅 Kuupäev ja Kellaaeg',
    location: '📍 Asukoht',
    price: '💰 Hind',
    scanToBook: 'Skaneeri Piletite Broneerimiseks',
    footer: 'Broneeri piletid veebis • Piiratud mahutavus • Ära jää ilma!',
    category: '🎯 Kategooria',
    at: 'kell',
    free: 'TASUTA',
  },
  fi: {
    eventInvitation: '🎉 Tapahtumakutsu',
    dateTime: '📅 Päivämäärä ja Aika',
    location: '📍 Sijainti',
    price: '💰 Hinta',
    scanToBook: 'Skannaa Varataksesi Liput',
    footer: 'Varaa lippusi verkossa • Rajoitettu kapasiteetti • Älä missaa!',
    category: '🎯 Kategoria',
    at: 'klo',
    free: 'ILMAINEN',
  },
  sv: {
    eventInvitation: '🎉 Evenemanginbjudan',
    dateTime: '📅 Datum och Tid',
    location: '📍 Plats',
    price: '💰 Pris',
    scanToBook: 'Skanna för att Boka Biljetter',
    footer: 'Boka dina biljetter online • Begränsad kapacitet • Missa inte!',
    category: '🎯 Kategori',
    at: 'kl',
    free: 'GRATIS',
  },
  de: {
    eventInvitation: '🎉 Veranstaltungseinladung',
    dateTime: '📅 Datum und Uhrzeit',
    location: '📍 Ort',
    price: '💰 Preis',
    scanToBook: 'Scannen zum Buchen',
    footer: 'Buchen Sie Ihre Tickets online • Begrenzte Kapazität • Nicht verpassen!',
    category: '🎯 Kategorie',
    at: 'um',
    free: 'KOSTENLOS',
  },
  fr: {
    eventInvitation: '🎉 Invitation à l\'Événement',
    dateTime: '📅 Date et Heure',
    location: '📍 Lieu',
    price: '💰 Prix',
    scanToBook: 'Scanner pour Réserver',
    footer: 'Réservez vos billets en ligne • Capacité limitée • Ne manquez pas!',
    category: '🎯 Catégorie',
    at: 'à',
    free: 'GRATUIT',
  },
  es: {
    eventInvitation: '🎉 Invitación al Evento',
    dateTime: '📅 Fecha y Hora',
    location: '📍 Ubicación',
    price: '💰 Precio',
    scanToBook: 'Escanea para Reservar',
    footer: '¡Reserva tus entradas online • Capacidad limitada • No te lo pierdas!',
    category: '🎯 Categoría',
    at: 'a las',
    free: 'GRATIS',
  },
  ru: {
    eventInvitation: '🎉 Приглашение на Мероприятие',
    dateTime: '📅 Дата и Время',
    location: '📍 Место',
    price: '💰 Цена',
    scanToBook: 'Сканируйте для Бронирования',
    footer: 'Бронируйте билеты онлайн • Ограниченная вместимость • Не пропустите!',
    category: '🎯 Категория',
    at: 'в',
    free: 'БЕСПЛАТНО',
  },
  pl: {
    eventInvitation: '🎉 Zaproszenie na Wydarzenie',
    dateTime: '📅 Data i Godzina',
    location: '📍 Lokalizacja',
    price: '💰 Cena',
    scanToBook: 'Skanuj aby Zarezerwować',
    footer: 'Zarezerwuj bilety online • Ograniczona pojemność • Nie przegap!',
    category: '🎯 Kategoria',
    at: 'o',
    free: 'DARMOWE',
  },
};

/**
 * Detect language from country code or city name
 */
const detectLanguageFromLocation = (city: string, address: string): string => {
  const text = `${city} ${address}`.toLowerCase();
  
  // Estonian cities
  if (text.includes('tallinn') || text.includes('tartu') || text.includes('pärnu') || 
      text.includes('estonia') || text.includes('eesti')) {
    return 'et';
  }
  // Finnish cities
  if (text.includes('helsinki') || text.includes('espoo') || text.includes('tampere') || 
      text.includes('finland') || text.includes('suomi')) {
    return 'fi';
  }
  // Swedish cities
  if (text.includes('stockholm') || text.includes('göteborg') || text.includes('malmö') || 
      text.includes('sweden') || text.includes('sverige')) {
    return 'sv';
  }
  // German cities
  if (text.includes('berlin') || text.includes('münchen') || text.includes('hamburg') || 
      text.includes('germany') || text.includes('deutschland')) {
    return 'de';
  }
  // French cities
  if (text.includes('paris') || text.includes('lyon') || text.includes('marseille') || 
      text.includes('france')) {
    return 'fr';
  }
  // Spanish cities
  if (text.includes('madrid') || text.includes('barcelona') || text.includes('valencia') || 
      text.includes('spain') || text.includes('españa')) {
    return 'es';
  }
  // Russian cities
  if (text.includes('moscow') || text.includes('sankt') || text.includes('petersburg') || 
      text.includes('russia')) {
    return 'ru';
  }
  // Polish cities
  if (text.includes('warsaw') || text.includes('kraków') || text.includes('wrocław') || 
      text.includes('poland') || text.includes('polska')) {
    return 'pl';
  }
  
  return 'en'; // Default to English
};

/**
 * Get localized date format
 */
const getLocalizedDate = (date: string, locale: string): string => {
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
  
  return new Date(date).toLocaleDateString(localeMap[locale] || 'en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/**
 * Generate a professional printable poster with QR code and localization
 * The poster includes event details, AI-designed visual, and QR code for ticket scanning
 * Optimized for A3 printing (297x420mm) at 300 DPI
 * Automatically detects language based on event location
 */
export const generatePrintablePoster = async (
  event: EventNexusEvent,
  posterDesign: PosterDesign,
  downloadImmediately: boolean = true
): Promise<Blob | null> => {
  try {
    // Detect language from event location
    const locale = detectLanguageFromLocation(event.location.city, event.location.address);
    const translations = POSTER_TRANSLATIONS[locale] || POSTER_TRANSLATIONS.en;
    
    // Create QR code pointing to event ticket page
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 500,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create a hidden container to render poster (A3 size for better quality)
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '1400px'; // A3 width at higher resolution
    container.style.height = '1980px'; // A3 height (297x420mm ratio)
    container.style.backgroundColor = posterDesign.colorScheme.primary;
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.overflow = 'hidden';

    // Escape HTML to prevent XSS
    const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m));

    // Poster HTML structure
    container.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        padding: 40px;
        box-sizing: border-box;
        background: linear-gradient(135deg, ${posterDesign.colorScheme.primary} 0%, ${posterDesign.colorScheme.secondary} 100%);
      ">
        <!-- Header -->
        <div style="
          text-align: center;
          margin-bottom: 30px;
          flex-shrink: 0;
        ">
          <div style="
            font-size: 16px;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.9);
            letter-spacing: 4px;
            margin-bottom: 10px;
            text-transform: uppercase;
          ">
            ${escapeHtml(translations.eventInvitation)}
          </div>
        </div>

        <!-- Main Content Row -->
        <div style="
          display: flex;
          gap: 30px;
          flex: 1;
          min-height: 0;
          margin-bottom: 30px;
        ">
          <!-- Left: Event Image (60%) -->
          <div style="
            flex: 0 0 60%;
            overflow: hidden;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            background: #000;
          ">
            <img 
              src="${posterDesign.imageUrl}" 
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
              "
              alt="Event poster"
            />
          </div>

          <!-- Right: Event Details & QR (40%) -->
          <div style="
            flex: 0 0 40%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            color: white;
          ">
            <!-- Event Title -->
            <div>
              <h1 style="
                font-size: 32px;
                font-weight: 900;
                margin: 0;
                line-height: 1.2;
                text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                color: white;
              ">
                ${escapeHtml(event.name)}
              </h1>
            </div>

            <!-- Event Info -->
            <div style="
              background: rgba(0, 0, 0, 0.2);
              padding: 24px;
              border-radius: 16px;
              margin: 20px 0;
              backdrop-filter: blur(10px);
            ">
              <div style="
                font-size: 14px;
                margin-bottom: 14px;
                color: rgba(255, 255, 255, 0.95);
                line-height: 1.5;
              ">
                <strong style="display: block; margin-bottom: 6px;">${escapeHtml(translations.dateTime)}</strong>
                ${escapeHtml(getLocalizedDate(event.date, locale))} ${escapeHtml(translations.at)} ${escapeHtml(event.time)}
              </div>

              <div style="
                font-size: 14px;
                margin-bottom: 14px;
                color: rgba(255, 255, 255, 0.95);
                line-height: 1.5;
              ">
                <strong style="display: block; margin-bottom: 6px;">${escapeHtml(translations.location)}</strong>
                ${escapeHtml(event.location.address)}<br/>
                ${escapeHtml(event.location.city)}
              </div>

              <div style="
                font-size: 14px;
                margin-bottom: 14px;
                color: rgba(255, 255, 255, 0.95);
                line-height: 1.5;
              ">
                <strong style="display: block; margin-bottom: 6px;">${escapeHtml(translations.category)}</strong>
                ${escapeHtml(event.category)}
              </div>

              <div style="
                font-size: 16px;
                color: ${posterDesign.colorScheme.accent};
                font-weight: 700;
              ">
                <strong style="display: block; margin-bottom: 6px;">${escapeHtml(translations.price)}</strong>
                ${event.price === 0 ? escapeHtml(translations.free) : `€${escapeHtml(event.price.toFixed(2))}`}
              </div>
            </div>

            <!-- QR Code -->
            <div style="
              text-align: center;
              flex-shrink: 0;
            ">
              <img 
                src="${qrCodeDataUrl}"
                style="
                  width: 180px;
                  height: 180px;
                  border-radius: 16px;
                  background: white;
                  padding: 12px;
                  box-sizing: border-box;
                  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
                  margin-bottom: 14px;
                "
                alt="Event QR Code"
              />
              <div style="
                font-size: 12px;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                line-height: 1.4;
              ">
                ${escapeHtml(translations.scanToBook)}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          text-align: center;
          padding-top: 24px;
          border-top: 2px solid rgba(255, 255, 255, 0.25);
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          flex-shrink: 0;
        ">
          <strong style="font-size: 15px;">EventNexus</strong> | ${escapeHtml(translations.footer)}
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Convert to canvas with high quality settings
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2.5, // Higher scale for better print quality
      useCORS: true,
      logging: false,
      allowTaint: true,
      dpi: 300,
      windowHeight: 1980,
      windowWidth: 1400,
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF (A3 size: 297x420mm for larger physical posters)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a3',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Scale image to fit PDF with margins
    const margin = 5; // 5mm margin
    const imgWidth = pdfWidth - (2 * margin);
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');

    // Get PDF as blob
    const pdfBlob = pdf.output('blob');

    // Download if requested
    if (downloadImmediately) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.name.replace(/\s+/g, '_')}_poster.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return pdfBlob;
  } catch (error) {
    console.error('Failed to generate poster:', error);
    return null;
  }
};

/**
 * Generate AI-optimized poster design description
 * This prompt guides Gemini to create a design suitable for physical printing
 */
export const generatePosterDesignPrompt = (
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  campaignTheme: string
): string => {
  return `You are an expert poster designer creating a professional, eye-catching event poster for printing.

EVENT DETAILS:
- Name: "${eventName}"
- Category: ${eventCategory}
- Description: ${eventDescription}
- Campaign Focus: ${campaignTheme}

POSTER DESIGN REQUIREMENTS:
1. Create a visually striking, high-impact design suitable for:
   - Physical printing on A4/A3 paper
   - Digital display on screens
   - Wall mounting in public spaces

2. Design Characteristics:
   - Bold, readable typography (event name must be prominent from 2-3 meters away)
   - Strong color contrast for visibility
   - Clear visual hierarchy
   - Professional and engaging aesthetic
   - Balanced composition with event image on left, details+QR code on right

3. Visual Elements:
   - Main event imagery: Vivid, relevant to category and theme
   - Color scheme: 3 colors (primary, secondary, accent) that work well together
   - Must include space for QR code (bottom right corner, white background)
   - Date, time, location clearly visible
   - Call-to-action: "Scan QR Code to Book Tickets"

4. Technical Requirements:
   - Image resolution: High quality (300 DPI ready)
   - Text: Sans-serif font, clean and modern
   - Avoid excessive text - focus on event name and key details
   - Include event price prominently

Respond in JSON format with ONLY this structure:
{
  "title": "Poster design headline",
  "description": "Detailed visual description of the poster layout and design elements",
  "imageUrl": "A detailed description for AI image generation covering the main visual (left side)",
  "colorScheme": {
    "primary": "#HEX_COLOR (dominant background/gradient start)",
    "secondary": "#HEX_COLOR (gradient end or secondary areas)",
    "accent": "#HEX_COLOR (highlights and text emphasis)"
  }
}`;
};
