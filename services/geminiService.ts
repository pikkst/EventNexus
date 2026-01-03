
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { supabase } from './supabase';
import { deductUserCredits, checkUserCredits } from './dbService';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Hugging Face Configuration for video generation
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || '';
const HF_VIDEO_MODEL = 'Kevin-thu/StoryMem'; // Text-to-video model

// ADMIN TOOLS - NO CREDIT COST (Platform marketing tools)
// Admin promotion tools are FREE for admins to market the platform

// User AI Features - Credit costs for FREE tier users
// Paid tier users (Pro/Premium/Enterprise) have these features included
export const AI_CREDIT_COSTS = {
  EVENT_AI_IMAGE: 20,          // AI-generated event image (Free tier only)
  EVENT_AI_TAGLINE: 10,        // AI marketing tagline (Free tier only)
  EVENT_AI_DESCRIPTION: 15,    // AI-enhanced description (Free tier only)
  TRANSLATION: 5,              // Per language translation (Free tier only)
  AD_CAMPAIGN: 30              // Multi-platform ad campaign (Free tier only)
};

/**
 * Generate platform-specific social media posts for a campaign
 * ADMIN FEATURE - NO CREDIT COST
 */
export const generateSocialMediaPosts = async (
  campaignTitle: string,
  campaignCopy: string,
  targetAudience: 'creators' | 'attendees'
) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a social media marketing expert for EventNexus.
      Campaign: ${campaignTitle}
      Copy: ${campaignCopy}
      Target: ${targetAudience === 'creators' ? 'Event Organizers and Promoters' : 'Event Attendees'}
      
      Generate optimized posts for each platform:
      1. Facebook - Engaging post with emojis (max 250 chars)
      2. Instagram - Captivating caption with hashtags (max 200 chars)
      3. Twitter/X - Punchy tweet (max 280 chars)
      4. LinkedIn - Professional post (max 300 chars)
      
      Each should be platform-appropriate, include relevant hashtags, and drive action.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            facebook: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            instagram: {
              type: Type.OBJECT,
              properties: {
                caption: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            twitter: {
              type: Type.OBJECT,
              properties: {
                tweet: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            linkedin: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING }
              }
            }
          },
          required: ["facebook", "instagram", "twitter", "linkedin"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Social media post generation failed:", error);
    throw error;
  }
};

/**
 * Generate platform growth campaign with deep platform knowledge
 * ADMIN FEATURE - NO CREDIT COST
 */
export const generatePlatformGrowthCampaign = async (
  theme: string, 
  target: string,
  platformContext?: {
    totalEvents?: number;
    activeEvents?: number;
    topCategories?: string[];
    topCities?: string[];
    totalUsers?: number;
    keyFeatures?: string[];
  }
) => {
  try {
    const ai = getAI();
    
    const audienceMap: Record<string, { name: string; tone: string; cta: string; painPoints: string[]; desires: string[] }> = {
      attendees: { 
        name: 'Event Attendees', 
        tone: 'exciting and fun', 
        cta: 'Discover Events',
        painPoints: ['Hard to find local events', 'Missing out on happenings', 'Boring weekends'],
        desires: ['Easy discovery', 'Variety of options', 'Social experiences', 'Authentic local culture']
      },
      creators: { 
        name: 'Event Creators & Organizers', 
        tone: 'professional and empowering', 
        cta: 'Start Creating',
        painPoints: ['High platform fees', 'Complex setup', 'Limited reach', 'Slow payouts'],
        desires: ['Easy event creation', 'Direct payments', 'Marketing tools', 'Growing audience']
      },
      'platform-growth': { 
        name: 'New Users', 
        tone: 'welcoming and innovative', 
        cta: 'Join EventNexus',
        painPoints: ['Generic event platforms', 'Poor discovery', 'Complicated booking'],
        desires: ['Simple discovery', 'Local focus', 'Reliable platform', 'Good UX']
      },
      'new-features': { 
        name: 'Existing Users', 
        tone: 'exciting and informative', 
        cta: 'Try New Features',
        painPoints: ['Missing features', 'Want improvements'],
        desires: ['Better experience', 'New capabilities', 'Innovation']
      },
      community: { 
        name: 'Community Members', 
        tone: 'friendly and engaging', 
        cta: 'Join the Community',
        painPoints: ['Isolation', 'Want connections'],
        desires: ['Social connections', 'Shared experiences', 'Belonging']
      },
      seasonal: { 
        name: 'Seasonal Event-Goers', 
        tone: 'festive and energetic', 
        cta: 'Explore Events',
        painPoints: ['Limited time', 'FOMO'],
        desires: ['Seasonal experiences', 'Time-sensitive events', 'Special occasions']
      },
      retention: { 
        name: 'Returning Users', 
        tone: 'warm and appreciative', 
        cta: 'Welcome Back',
        painPoints: ['Lost interest', 'Forgot about platform'],
        desires: ['Familiar comfort', 'New reasons to return', 'Value reminder']
      },
      referral: { 
        name: 'Active Users', 
        tone: 'rewarding and motivational', 
        cta: 'Invite Friends',
        painPoints: ['Want to share', 'Friends missing out'],
        desires: ['Share discovery', 'Rewards', 'Community building']
      }
    };
    
    const audience = audienceMap[target] || audienceMap.attendees;
    
    // Build platform context string
    let contextInfo = '';
    if (platformContext) {
      contextInfo = `
      
      REAL PLATFORM DATA TO USE:
      - Total Events: ${platformContext.totalEvents || 0}
      - Active Events: ${platformContext.activeEvents || 0}
      - Total Users: ${platformContext.totalUsers || 0}
      ${platformContext.topCategories && platformContext.topCategories.length > 0 ? `- Popular Categories: ${platformContext.topCategories.join(', ')}` : ''}
      ${platformContext.topCities && platformContext.topCities.length > 0 ? `- Active Cities: ${platformContext.topCities.join(', ')}` : ''}
      ${platformContext.keyFeatures && platformContext.keyFeatures.length > 0 ? `- Key Features to Highlight: ${platformContext.keyFeatures.join(', ')}` : ''}
      `;
    }
    
    // Real EventNexus features to communicate
    const platformFeatures = {
      for_attendees: [
        'Interactive map showing events by location',
        'Secure Stripe payment processing',
        'Instant QR code tickets on phone',
        'Multi-language event descriptions',
        'Follow favorite organizers',
        'Real-time event updates'
      ],
      for_creators: [
        'Zero upfront listing costs',
        'Direct Stripe Connect payouts',
        'AI-powered marketing content generation',
        'Professional ticketing system with QR codes',
        'Real-time analytics dashboard',
        'Unlimited event image uploads',
        'Built-in social media sharing'
      ],
      unique: [
        'Map-first discovery - find by location',
        'AI tools included (descriptions, images, social posts)',
        'Multi-language support built-in',
        'PostGIS geospatial search',
        'Modern React web platform',
        'GDPR compliant and secure'
      ]
    };
    
    const relevantFeatures = target === 'creators' 
      ? platformFeatures.for_creators 
      : platformFeatures.for_attendees;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert growth marketing strategist for EventNexus, a premium map-first event discovery WEB PLATFORM.
      
      CRITICAL PLATFORM INFO:
      - EventNexus is a WEBSITE at www.eventnexus.eu (NOT a mobile app)
      - It is a WEB-BASED platform accessible through browsers
      - NEVER mention "download app", "app store", "iOS", "Android", or "mobile app"
      - Use: "Visit EventNexus", "Access online", "Discover on the web", "Join at eventnexus.eu"
      ${contextInfo}
      
      REAL PLATFORM FEATURES FOR ${audience.name.toUpperCase()}:
      ${relevantFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}
      
      TARGET AUDIENCE INSIGHTS:
      - Pain Points: ${audience.painPoints.join(', ')}
      - Desires: ${audience.desires.join(', ')}
      - Tone: ${audience.tone}
      
      Campaign Details:
      - Theme: ${theme}
      - Target Audience: ${audience.name}
      - Primary CTA: ${audience.cta}
      - Platform URL: www.eventnexus.eu
      
      Generate a data-driven, feature-focused marketing campaign:
      
      1. TITLE (max 40 chars):
         - Reference REAL platform data if provided (e.g., "${platformContext?.activeEvents} Events Near You")
         - Highlight a specific REAL feature (e.g., "Find Events on Interactive Map")
         - Make it concrete and specific, not generic
      
      2. MARKETING COPY (max 120 chars):
         - Lead with a SPECIFIC feature benefit (e.g., "Interactive map shows 50+ events by location")
         - Include REAL numbers if provided (events, categories, cities)
         - Highlight 1-2 key platform features
         - NEVER mention fake statistics or user counts
         - Focus on concrete value (e.g., "Zero fees", "Instant tickets", "AI tools included")
         - End with clear action
      
      3. VISUAL PROMPT (detailed for web marketing):
         - Professional web platform marketing banner
         - Include specific platform UI elements (map interface, event cards, mobile web view)
         - Show real EventNexus features visually
         - Modern, tech-forward aesthetic
         - Include "www.eventnexus.eu" in design
         - Example: "Professional web marketing banner, MacBook showing EventNexus interface with interactive map displaying colorful event pins, sidebar with event cards showing ${platformContext?.topCategories?.[0] || 'Music'} events, clean modern UI with indigo accents, city skyline in background, text overlay '${theme}' and 'www.eventnexus.eu', premium SaaS aesthetic, 8k quality"
      
      4. CALL TO ACTION:
         - Use ${audience.cta} or feature-specific variant
         - Make it action-oriented (e.g., "See Events on Map", "List Your Event Free", "Book Tickets Now")
         - Include www.eventnexus.eu
      
      5. INCENTIVE:
         - Based on audience and real platform offerings
         - Options: "50 AI credits", "First event free", "Premium trial", or "none"
      
      Make it specific, data-driven, and feature-focused!`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            copy: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            cta: { type: Type.STRING },
            recommendedIncentiveType: { type: Type.STRING, enum: ["credits", "pro_discount", "none"] },
            recommendedIncentiveValue: { type: Type.NUMBER },
            offerHeadline: { type: Type.STRING },
            offerDetails: { type: Type.STRING }
          },
          required: ["title", "copy", "visualPrompt", "cta", "recommendedIncentiveType", "recommendedIncentiveValue", "offerHeadline", "offerDetails"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Platform growth generation failed:", error);
    return null;
  }
};

/**
 * Generate AI image
 * For regular users: costs credits based on tier
 * For admins: FREE (when used in admin tools)
 */
export const generateAdImage = async (
  prompt: string, 
  aspectRatio: "1:1" | "9:16" | "16:9" = "1:1", 
  saveToStorage = false,  // Upload to Storage when true
  userId?: string,
  userTier?: string
) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, AI_CREDIT_COSTS.EVENT_AI_IMAGE);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need ${AI_CREDIT_COSTS.EVENT_AI_IMAGE} credits (${AI_CREDIT_COSTS.EVENT_AI_IMAGE * 0.5}€ value)`);
    }
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional marketing flier for EventNexus with clear promotional text overlay: ${prompt}. Include eye-catching headlines and call-to-action text directly on the image. Premium tech aesthetics, cinematic lighting, ultra-modern UI elements, bold typography, 8k. Aspect ratio: ${aspectRatio}` }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const inlineDataUrl = `data:image/png;base64,${base64Data}`;
        
        // Deduct credits after successful generation (Free tier only)
        if (userId && userTier === 'free') {
          await deductUserCredits(userId, AI_CREDIT_COSTS.EVENT_AI_IMAGE);
        }

        // Upload to Supabase Storage when requested; fallback to base64 if upload fails
        if (saveToStorage) {
          try {
            // Use crypto.randomUUID() for secure random IDs
            const safeUuid = crypto.randomUUID();
            const fileName = `campaign-images/${safeUuid}.png`;
            const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const { error: uploadError } = await supabase.storage
              .from('campaign-images')
              .upload(fileName, binary, {
                contentType: 'image/png',
                cacheControl: '31536000',
                upsert: true
              });

            if (!uploadError) {
              const { data: publicData } = supabase.storage
                .from('campaign-images')
                .getPublicUrl(fileName);
              if (publicData?.publicUrl) return publicData.publicUrl;
            } else {
              console.error('Storage upload failed:', uploadError);
            }
          } catch (storageError) {
            console.error('Storage upload exception:', storageError);
          }
        }

        return inlineDataUrl;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

/**
 * Generate marketing tagline
 * Free tier: costs credits | Paid tiers: included
 */
export const generateMarketingTagline = async (name: string, category: string, userId?: string, userTier?: string) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, AI_CREDIT_COSTS.EVENT_AI_TAGLINE);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need ${AI_CREDIT_COSTS.EVENT_AI_TAGLINE} credits (${AI_CREDIT_COSTS.EVENT_AI_TAGLINE * 0.5}€ value)`);
    }
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create ONE compelling marketing tagline (maximum 60 characters) for an event named "${name}" in the ${category} category. Return ONLY the tagline text, no explanations, no numbering, no quotes, no alternatives.`
    });

    const result = response.text?.trim().replace(/^["']|["']$/g, '') || '';

    // Deduct credits after successful generation (Free tier only)
    if (userId && userTier === 'free' && result) {
      await deductUserCredits(userId, AI_CREDIT_COSTS.EVENT_AI_TAGLINE);
    }

    return result || "Experience the extraordinary.";
  } catch (error) {
    console.error("Tagline generation failed:", error);
    return "Experience the extraordinary.";
  }
};

/**
 * Translate event description
 * Free tier: costs credits | Paid tiers: included
 */
export const translateDescription = async (text: string, targetLanguage: string, userId?: string, userTier?: string) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, AI_CREDIT_COSTS.TRANSLATION);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need ${AI_CREDIT_COSTS.TRANSLATION} credits (${AI_CREDIT_COSTS.TRANSLATION * 0.5}€ value)`);
    }
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text to ${targetLanguage}: "${text}"`
    });

    const result = response.text?.trim() || text;

    // Deduct credits after successful generation (Free tier only)
    if (userId && userTier === 'free' && result !== text) {
      await deductUserCredits(userId, AI_CREDIT_COSTS.TRANSLATION);
    }

    return result;
  } catch (error) {
    console.error("Translation failed:", error);
    return text;
  }
};

/**
 * Generate multi-platform ad campaign
 * Free tier: costs credits | Paid tiers: included
 */
export const generateAdCampaign = async (
  name: string, 
  description: string, 
  campaignTheme: string,
  targetAudience: string = 'general',
  eventUrl?: string,
  userId?: string, 
  userTier?: string
) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, AI_CREDIT_COSTS.AD_CAMPAIGN);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need ${AI_CREDIT_COSTS.AD_CAMPAIGN} credits (${AI_CREDIT_COSTS.AD_CAMPAIGN * 0.5}€ value)`);
    }
  }

  // Map audience types to marketing language
  const audienceMap: Record<string, string> = {
    'general': 'broad audience of event-goers',
    'young-adults': 'young adults aged 18-30 who love social experiences',
    'professionals': 'working professionals aged 30-50 looking for networking and quality events',
    'families': 'families with children looking for safe, fun activities',
    'students': 'university students seeking affordable entertainment',
    'luxury': 'affluent individuals seeking exclusive VIP experiences'
  };

  const audienceDescription = audienceMap[targetAudience] || audienceMap['general'];

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert event marketing strategist creating ad campaigns for EventNexus.

EVENT DETAILS:
- Name: "${name}"
- Description: ${description}
- Event Page: ${eventUrl || 'www.eventnexus.eu'}

CAMPAIGN REQUIREMENTS:
- Theme/Focus: ${campaignTheme}
- Target Audience: ${audienceDescription}
- Goal: Drive ticket sales by bringing users to the event page

Generate 3 platform-specific marketing ads. Each ad should:
1. Be tailored to the platform's format and audience behavior
2. Highlight the campaign theme (${campaignTheme})
3. Speak directly to ${audienceDescription}
4. Include specific event details from the description
5. Create urgency or exclusivity where appropriate
6. Use the event name prominently

For each ad provide:
1. Platform (Instagram Story, Facebook Feed, LinkedIn Post, or Twitter/X)
2. Headline (Attention-grabbing, max 60 chars)
3. BodyCopy (Compelling description that matches the campaign theme, 150-200 chars)
4. CTA (Action button text like "Get Tickets", "Reserve Spot", "Learn More")
5. VisualPrompt (Detailed description for AI image generation based on event and theme)

Make each ad unique and platform-appropriate. Focus on ${campaignTheme}.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING },
              headline: { type: Type.STRING },
              bodyCopy: { type: Type.STRING },
              cta: { type: Type.STRING },
              visualPrompt: { type: Type.STRING }
            },
            required: ['platform', 'headline', 'bodyCopy', 'cta', 'visualPrompt']
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');

    // Deduct credits after successful generation (Free tier only)
    if (userId && userTier === 'free' && result.length > 0) {
      await deductUserCredits(userId, AI_CREDIT_COSTS.AD_CAMPAIGN);
    }

    return result;
  } catch (error) {
    console.error("Ad campaign generation failed:", error);
    return [];
  }
};

export const createNexusChat = () => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: 'You are NexusAI, a world-class event concierge and organizer assistant for EventNexus. You help attendees find the best vibes and help organizers create high-impact experiences.'
    }
  });
};

/**
 * Generate comprehensive brand protection report with legal analysis
 * ADMIN FEATURE - NO CREDIT COST
 * Analyzes alerts and provides legal recommendations based on LEGAL_PROTECTION.md
 */
export const generateBrandProtectionReport = async (
  alerts: any[],
  stats: any
) => {
  try {
    const ai = getAI();
    
    // Legal context from LEGAL_PROTECTION.md
    const legalContext = `
EventNexus Legal Protection Framework:
- Full copyright protection under Berne Convention & WIPO
- Trade Secret Protection: EU Trade Secrets Directive 2016/943
- Trademark Protection: "EventNexus" brand name and logo
- Domain Protection: eventnexus.eu under ICANN UDRP & EURid
- Prohibited: Code copying, derivative works, domain typosquatting, platform cloning
- Enforcement: Civil damages up to €500,000 per violation, criminal penalties available
- Domain Typosquatting: Actionable under ICANN UDRP and Anti-Cybersquatting laws
`;

    // Group alerts by type and severity
    const alertsByType = {
      code: alerts.filter(a => a.type === 'code'),
      domain: alerts.filter(a => a.type === 'domain'),
      brand: alerts.filter(a => a.type === 'brand'),
      search: alerts.filter(a => a.type === 'search'),
      social: alerts.filter(a => a.type === 'social'),
      competitor: alerts.filter(a => a.type === 'competitor')
    };

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    const prompt = `You are a legal and cybersecurity analyst for EventNexus platform.

IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Use this date in your report.

LEGAL FRAMEWORK:
${legalContext}

MONITORING STATISTICS:
- Total Alerts: ${alerts.length}
- Critical: ${criticalAlerts.length}
- Warnings: ${warningAlerts.length}
- Code Mentions: ${alertsByType.code.length}
- Domain Issues: ${alertsByType.domain.length}
- Brand Mentions: ${alertsByType.brand.length}

CRITICAL ALERTS:
${criticalAlerts.map(a => `- ${a.title}: ${a.description} (URL: ${a.url})`).join('\n') || 'None'}

HIGH-PRIORITY WARNING ALERTS:
${warningAlerts.slice(0, 15).map(a => `- ${a.title}: ${a.description} (URL: ${a.url})`).join('\n') || 'None'}

FILTERING INSTRUCTIONS:
- Ignore "mantidproject" and "LoadEventNexus" (scientific software, not our platform)
- Ignore "expired-domain-names" lists (passive data, not infringement)
- Focus on active repositories using "EventNexus" in project names or as main component
- Prioritize: domain typosquatting, trademark usage in live projects, code similarity

Generate a comprehensive executive report with:

1. EXECUTIVE SUMMARY (2-3 sentences, mention actual threats vs false positives)
2. THREAT ASSESSMENT (Low/Medium/High/Critical - be realistic about false positives)
3. KEY FINDINGS (3-5 bullet points, distinguish real threats from noise)
4. LEGAL ANALYSIS (which protections apply, cite specific URLs where applicable)
5. RECOMMENDED ACTIONS (prioritized with SPECIFIC URLs and repos to investigate)
6. MONITORING RECOMMENDATIONS (practical steps to reduce false positives)

Use professional but clear language. Be specific about URLs and repositories. Acknowledge false positives where relevant. Prioritize actions by urgency with concrete next steps.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const reportText = response.text || 'Report generation failed';
    
    return {
      success: true,
      report: reportText,
      timestamp: new Date().toISOString(),
      alertsAnalyzed: alerts.length,
      criticalCount: criticalAlerts.length,
      warningCount: warningAlerts.length
    };
  } catch (error) {
    console.error("Brand protection report generation failed:", error);
    return {
      success: false,
      report: 'Failed to generate report. Please try again.',
      error: error.message
    };
  }
};

/**
 * Generate printable poster design with AI
 * Includes poster layout description, image prompt, and color scheme
 * Free tier: costs credits | Paid tiers: included
 */
export const generatePosterDesign = async (
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  campaignTheme: string,
  userId?: string,
  userTier?: string
) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, 25); // 25 credits for poster design
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need 25 credits for poster design`);
    }
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert poster designer creating a professional, eye-catching event poster for printing.

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
}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            colorScheme: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
                accent: { type: Type.STRING }
              },
              required: ['primary', 'secondary', 'accent']
            }
          },
          required: ['title', 'description', 'imageUrl', 'colorScheme']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    // Deduct credits after successful generation (Free tier only)
    if (userId && userTier === 'free' && result.title) {
      await deductUserCredits(userId, 25);
    }

    return result;
  } catch (error) {
    console.error("Poster design generation failed:", error);
    throw error;
  }
};

/**
 * Generate Professional 60s Video Ad Campaign
 * Creates cinematic multi-scene video ads with voiceover
 * Available to Pro+ tier users or admins
 */
export const generateProfessionalAdCampaign = async (
  url: string,
  platform: string,
  aspectRatio: '16:9' | '9:16',
  eventName?: string,
  eventDescription?: string,
  onStepUpdate?: (step: number) => void
) => {
  try {
    const ai = getAI();
    
    // Step 1: Analyze website/event and create narrative
    onStepUpdate?.(1); // ANALYZING
    
    const analysisPrompt = eventName 
      ? `You are an award-winning creative director at a top-tier advertising agency. Create a professional 45-second video ad campaign for:
      
      EVENT: "${eventName}"
      DESCRIPTION: ${eventDescription}
      PLATFORM: ${platform}
      URL: ${url}
      
      CRITICAL REQUIREMENTS (2-3 second video segments):
      1. LANGUAGE: English only - all text and descriptions
      2. VIDEO TECHNICAL: Each scene = 2-3 seconds (Wan-AI/Wan2.2-TI2V-5B model)
      3. VISUAL CONSISTENCY: Define ONE unified "Visual DNA" that applies to EVERY frame
         - Exact lighting setup (e.g., "golden hour warmth, soft shadows")
         - Color palette (specific hex codes or detailed descriptions)
         - Camera style (handheld/steady, wide/close, film grain/clean)
         - Environment consistency (same location theme throughout)
      4. PROFESSIONAL AGENCY STANDARD: This must look like a $50k commercial
         - Smooth narrative flow, not random clips
         - Each 2-3s segment advances the story meaningfully
         - No jarring style changes between segments
         - Matches the event's actual atmosphere and target audience
      
      5. EVENT-SPECIFIC STORYTELLING:
         - Use actual event details (name, description, vibe)
         - Show what attendees will experience
         - Build excitement and FOMO
         - Make viewers feel "I need to be there"
      
      STRUCTURE (15 segments × 3s = 45s total):
      You must create 15 ultra-short (2-3s) scene descriptions that form ONE cohesive story:
      
      HOOK (Segments 1-3, 0-9s): Grab attention with event's most exciting moment
      CONTEXT (Segments 4-6, 9-18s): Show the atmosphere and experience
      DESIRE (Segments 7-9, 18-27s): Build emotional connection and anticipation  
      CLIMAX (Segments 10-12, 27-36s): Peak energy and excitement
      CALL-TO-ACTION (Segments 13-15, 36-45s): Event name reveal + clear CTA
      
      Each segment description must:
      - Be 1-2 sentences max (fits 2-3s video)
      - Include the Visual DNA (lighting, color, camera)
      - Logically flow from previous segment
      - Use specific event details
      - Maintain professional commercial aesthetic
      
      Respond in strict JSON format.`
      : `You are an award-winning creative director at a top-tier advertising agency. Create a professional 45-second video ad campaign for the platform:
      
      PLATFORM: ${url}
      TARGET: ${platform}
      MISSION: Connect people through unforgettable events (EventNexus)
      
      CRITICAL REQUIREMENTS (2-3 second video segments):
      1. LANGUAGE: English only - all text and descriptions
      2. VIDEO TECHNICAL: Each scene = 2-3 seconds (Wan-AI/Wan2.2-TI2V-5B model)
      3. VISUAL CONSISTENCY: Define ONE unified "Visual DNA" that applies to EVERY frame
         - Exact lighting setup (e.g., "neon glow with deep shadows")
         - Color palette (EventNexus brand colors: purple, blue gradients)
         - Camera style (smooth cinematic, modern tech aesthetic)
         - Environment consistency (same design language throughout)
      4. PROFESSIONAL AGENCY STANDARD: This must look like a premium SaaS commercial
         - Smooth narrative flow showing platform value
         - Each 2-3s segment advances the story
         - No style inconsistencies
         - Shows real platform benefits
      
      5. PLATFORM-SPECIFIC STORYTELLING:
         - Highlight EventNexus unique features (AI-powered discovery, seamless ticketing)
         - Show how it connects organizers and attendees
         - Build trust and credibility
         - Professional, modern, innovative vibe
      
      STRUCTURE (15 segments × 3s = 45s total):
      Create 15 ultra-short (2-3s) scene descriptions forming ONE cohesive brand story:
      
      HOOK (Segments 1-3, 0-9s): Show platform's unique value instantly
      PROBLEM (Segments 4-6, 9-18s): Current event discovery pain points
      SOLUTION (Segments 7-9, 18-27s): How EventNexus solves it elegantly
      IMPACT (Segments 10-12, 27-36s): Real-world success and community
      CALL-TO-ACTION (Segments 13-15, 36-45s): Brand reveal + strong CTA
      
      Each segment description must:
      - Be 1-2 sentences max (fits 2-3s video)
      - Include the Visual DNA
      - Flow naturally from previous segment
      - Show actual platform features
      - Maintain premium tech commercial aesthetic
      
      Respond in strict JSON format.`;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandName: { type: Type.STRING, description: "Event name or EventNexus platform name" },
            coreEssence: { type: Type.STRING, description: "Core value proposition in one sentence" },
            visualDNA: { 
              type: Type.STRING, 
              description: "CRITICAL: Exact visual style used in EVERY single 2-3s segment. Include: lighting (e.g. 'golden hour warmth'), colors (e.g. 'deep purple #6B46C1 and electric blue #3B82F6'), camera style (e.g. 'smooth handheld, shallow depth of field'), environment (e.g. 'modern event venue with LED walls'). This MUST be consistent across all 15 segments." 
            },
            targetAudience: { type: Type.STRING, description: "Who this ad is for" },
            emotionalDriver: { type: Type.STRING, description: "Primary emotion to evoke" },
            keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 key selling points" },
            script: { type: Type.STRING, description: "45-second voiceover script matching the visual narrative" },
            segments: {
              type: Type.ARRAY,
              description: "EXACTLY 15 segments, each 2-3 seconds. CRITICAL: Each segment MUST include the visualDNA and flow logically from the previous one.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER, description: "Segment number 1-15" },
                  duration: { type: Type.STRING, description: "e.g. '0-3s', '3-6s'" },
                  phase: { type: Type.STRING, description: "HOOK/CONTEXT/DESIRE/CLIMAX/CTA" },
                  visualPrompt: { 
                    type: Type.STRING, 
                    description: "CRITICAL: 1-2 sentence scene description. MUST start with the visualDNA, then describe specific action/subject for this 2-3s clip. Example: 'Golden hour warmth, deep purple tones. Wide shot of excited crowd entering modern venue with LED walls.' NO generic descriptions." 
                  },
                  storyContext: { type: Type.STRING, description: "Why this segment matters in the story" }
                },
                required: ["id", "duration", "phase", "visualPrompt", "storyContext"]
              },
              minItems: 15,
              maxItems: 15
            },
            socialCopy: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                body: { type: Type.STRING },
                cta: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["headline", "body", "cta", "hashtags"]
            }
          },
          required: ["brandName", "coreEssence", "visualDNA", "targetAudience", "emotionalDriver", "keyFeatures", "script", "segments", "socialCopy"]
        }
      }
    });

    const analysis = JSON.parse(analysisResponse.text || '{}');
    const sources = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Market Insight"
      }))
      .filter((s: any) => s.uri) || [];

    // Validate we have 15 segments
    if (!analysis.segments || analysis.segments.length !== 15) {
      throw new Error(`Expected 15 segments, got ${analysis.segments?.length || 0}`);
    }

    // Step 2-8: Generate 15 video segments (each 2-3 seconds)
    const videoBlobs: Blob[] = [];
    const { visualDNA, segments } = analysis;
    
    console.log(`Starting video generation with Visual DNA: ${visualDNA}`);
    console.log(`Generating ${segments.length} segments...`);

    // Generate each 2-3s segment with the exact prompt from Gemini
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      onStepUpdate?.(2 + Math.floor(i / 2)); // Update progress every 2 segments
      
      try {
        console.log(`Segment ${i + 1}/${segments.length} (${segment.phase}): ${segment.visualPrompt.substring(0, 80)}...`);
        
        // Use the exact visualPrompt from Gemini (already includes visualDNA)
        const videoBlob = await generateVideoWithHuggingFace(segment.visualPrompt, i);
        videoBlobs.push(videoBlob);
        
        // Small delay to avoid overwhelming the service
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`Segment ${i + 1} generation failed:`, error);
        // Continue with other segments even if one fails
      }
    }

    if (videoBlobs.length === 0) {
      throw new Error("All video generation attempts failed");
    }
    
    console.log(`Successfully generated ${videoBlobs.length}/15 video segments`);
    onStepUpdate?.(6); // GENERATING_AUDIO
    
    // Generate voiceover
    const audioBase64 = await generateAdVoiceover(analysis.script);

    // Concatenate videos
    const videoUrl = await concatenateVideos(videoBlobs);
    
    return {
      analysis: {
        ...analysis,
        visualSignature: analysis.visualDNA, // Keep backward compatibility
        painPoints: [], // Not needed in new structure
        scenes: {
          hook: segments.slice(0, 3).map(s => s.visualPrompt).join(' '),
          conflict: segments.slice(3, 6).map(s => s.visualPrompt).join(' '),
          resolution: segments.slice(6, 9).map(s => s.visualPrompt).join(' '),
          power: segments.slice(9, 12).map(s => s.visualPrompt).join(' '),
          closing: segments.slice(12, 15).map(s => s.visualPrompt).join(' ')
        }
      },
      videoUrl,
      audioBase64,
      sources,
      metadata: {
        totalSegments: segments.length,
        successfulSegments: videoBlobs.length,
        estimatedDuration: `${segments.length * 3}s`,
        visualDNA: visualDNA
      }
    };
  } catch (error) {
    console.error("Professional ad campaign generation failed:", error);
    throw error;
  }
};

/**
 * Generate voiceover for ad campaign
 * Uses Gemini TTS for professional narration
 */
export const generateAdVoiceover = async (script: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `Professional, authoritative, high-end commercial narrator: ${script}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");
    return base64Audio;
  } catch (error) {
    console.error("Voiceover generation failed:", error);
    throw error;
  }
};

/**
 * Generate video using Hugging Face via Supabase Edge Function
 * Server-side generation with secure token management
 */
const generateVideoWithHuggingFace = async (
  prompt: string,
  sceneIndex: number
): Promise<Blob> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-video-hf', {
      body: { prompt, sceneIndex }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Video generation failed');

    // Convert base64 back to blob
    const binaryString = atob(data.video);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: data.mimeType || 'video/mp4' });
  } catch (error) {
    console.error("Hugging Face video generation failed:", error);
    throw error;
  }
};

/**
 * Concatenate multiple video blobs into single video
 */
const concatenateVideos = async (videoBlobs: Blob[]): Promise<string> => {
  try {
    // Create a new video using MediaRecorder or similar
    // For now, return the last video as URL
    // In production, use FFmpeg.js or server-side concatenation
    const finalBlob = new Blob(videoBlobs, { type: 'video/mp4' });
    return URL.createObjectURL(finalBlob);
  } catch (error) {
    console.error("Video concatenation failed:", error);
    throw error;
  }
};

/**
 * Generate professional ad campaign with Hugging Face fallback
 * Uses Veo first, falls back to Hugging Face if quota exceeded
 */
export const generateProfessionalAdCampaignWithFallback = async (
  url: string,
  platform: string,
  aspectRatio: '16:9' | '9:16',
  eventName?: string,
  eventDescription?: string,
  onStepUpdate?: (step: number) => void
) => {
  try {
    // Try Veo first
    return await generateProfessionalAdCampaign(
      url, 
      platform, 
      aspectRatio, 
      eventName, 
      eventDescription, 
      onStepUpdate
    );
  } catch (veoError: any) {
    console.warn('Veo generation failed, falling back to Hugging Face:', veoError.message);
    
    // Fallback to Hugging Face
    const ai = getAI();
    
    // Step 1: Analyze website/event (same as before)
    onStepUpdate?.(1);
    
    const analysisPrompt = eventName 
      ? `Analyze this event for a 60-second video ad:
      Event: ${eventName}
      Description: ${eventDescription}
      URL: ${url}
      Platform: ${platform}
      
      Create a compelling narrative with visual descriptions for video generation.`
      : `Analyze ${url} for a 60-second video ad on ${platform}. Create compelling narrative with visual descriptions.`;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: analysisPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandName: { type: Type.STRING },
            coreEssence: { type: Type.STRING },
            visualSignature: { type: Type.STRING },
            script: { type: Type.STRING },
            scenes: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                conflict: { type: Type.STRING },
                resolution: { type: Type.STRING },
                power: { type: Type.STRING },
                closing: { type: Type.STRING }
              }
            },
            socialCopy: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                body: { type: Type.STRING },
                cta: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    });

    const analysis = JSON.parse(analysisResponse.text || '{}');
    const sources = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Market Insight"
      }))
      .filter((s: any) => s.uri) || [];

    // Generate video segments with Hugging Face
    const videoBlobs: Blob[] = [];
    const { visualSignature, scenes } = analysis;
    const globalContext = `${visualSignature}. High-quality cinematic commercial.`;

    // Generate 8 segments (each ~4 seconds = ~32 seconds total)
    // Note: HF models generate shorter clips, so we create multiple
    const scenePrompts = [
      `${scenes.hook}. ${globalContext}`,
      `${scenes.conflict}. ${globalContext}`,
      `${scenes.resolution}. ${globalContext}`,
      `${scenes.power}. ${globalContext}`,
      `Continue showing impact. ${globalContext}`,
      `Build to climax. ${globalContext}`,
      `${scenes.closing} transition. ${globalContext}`,
      `${scenes.closing} brand reveal. ${globalContext}`
    ];

    for (let i = 0; i < scenePrompts.length; i++) {
      onStepUpdate?.(i + 2);
      const videoBlob = await generateVideoWithHuggingFace(scenePrompts[i]);
      videoBlobs.push(videoBlob);
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }

    // Concatenate all videos
    onStepUpdate?.(6); // GENERATING_AUDIO
    const audioBase64 = await generateAdVoiceover(analysis.script);
    const videoUrl = await concatenateVideos(videoBlobs);

    return {
      analysis: {
        ...analysis,
        emotionalDriver: analysis.coreEssence,
        keyFeatures: []
      },
      videoUrl,
      audioBase64,
      sources
    };
  }
};
