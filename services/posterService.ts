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

/**
 * Generate a professional printable poster with QR code
 * The poster includes event details, AI-designed visual, and QR code for ticket scanning
 * Optimized for A3/A4 printing (297x420mm or 210x297mm)
 */
export const generatePrintablePoster = async (
  event: EventNexusEvent,
  posterDesign: PosterDesign,
  downloadImmediately: boolean = true
): Promise<Blob | null> => {
  try {
    // Create QR code pointing to event ticket page
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create a hidden container to render poster
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '1024px'; // A4 width at 300dpi (8.27 inches * 120dpi)
    container.style.height = '1200px'; // A4 height (11.7 inches * 120dpi)
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
            font-size: 14px;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.8);
            letter-spacing: 4px;
            margin-bottom: 10px;
            text-transform: uppercase;
          ">
            🎉 Event Invitation
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
              padding: 20px;
              border-radius: 16px;
              margin: 20px 0;
              backdrop-filter: blur(10px);
            ">
              <div style="
                font-size: 13px;
                margin-bottom: 12px;
                color: rgba(255, 255, 255, 0.9);
              ">
                <strong style="display: block; margin-bottom: 4px;">📅 Date & Time</strong>
                ${escapeHtml(new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }))} at ${escapeHtml(event.time)}
              </div>

              <div style="
                font-size: 13px;
                margin-bottom: 12px;
                color: rgba(255, 255, 255, 0.9);
              ">
                <strong style="display: block; margin-bottom: 4px;">📍 Location</strong>
                ${escapeHtml(event.location.address)}<br/>
                ${escapeHtml(event.location.city)}
              </div>

              <div style="
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
              ">
                <strong style="display: block; margin-bottom: 4px;">💰 Price</strong>
                €${escapeHtml(event.price.toFixed(2))}
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
                  width: 160px;
                  height: 160px;
                  border-radius: 12px;
                  background: white;
                  padding: 8px;
                  box-sizing: border-box;
                  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                  margin-bottom: 12px;
                "
                alt="Event QR Code"
              />
              <div style="
                font-size: 11px;
                color: rgba(255, 255, 255, 0.8);
                font-weight: 600;
                letter-spacing: 1px;
                text-transform: uppercase;
              ">
                Scan to Book Tickets
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid rgba(255, 255, 255, 0.2);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          flex-shrink: 0;
        ">
          <strong>EventNexus</strong> | Book your tickets online • Limited capacity • Don't miss out!
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Convert to canvas
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      dpi: 300,
      windowHeight: 1200,
      windowWidth: 1024,
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF (A4 size: 210x297mm = 595x842 points)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
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
