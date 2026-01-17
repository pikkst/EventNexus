import { supabase } from './supabase';
import { deductUserCredits, checkUserCredits } from './dbService';
import { SUPPORTED_LANGUAGES } from './languageService';
import { retryWithBackoff, CircuitBreaker } from './pipelineRetryService';

// Dynamically import Google GenAI to avoid TDZ issues
// This prevents minification bugs where 'Ge' (minified class) is accessed before initialization
let aiInstance: any = null;
let GoogleGenAIModule: any = null;
let TypeEnum: any = null;

const loadGoogleGenAI = async () => {
  if (!GoogleGenAIModule) {
    try {
      const module = await import("@google/genai");
      GoogleGenAIModule = module.GoogleGenAI;
      TypeEnum = module.Type;
    } catch (e: any) {
      console.error('Failed to load @google/genai module:', e?.message || e);
      throw new Error(`Cannot load @google/genai: ${e?.message || String(e)}`);
    }
  }
  return { GoogleGenAI: GoogleGenAIModule, Type: TypeEnum };
};

// Circuit breaker for Gemini API to prevent cascading failures
const geminiCircuitBreaker = new CircuitBreaker(5, 2, 30000);

const getAI = (): any => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      throw new Error('GEMINI_API_KEY is required but not configured');
    }
    
    if (!GoogleGenAIModule) {
      throw new Error('GoogleGenAI module not yet loaded. This should not happen - please call initializeGemini() first');
    }
    
    try {
      aiInstance = new GoogleGenAIModule({ apiKey });
    } catch (e: any) {
      console.error('Failed to instantiate GoogleGenAI:', e?.message || e);
      throw new Error(`GoogleGenAI initialization failed: ${e?.message || String(e)}`);
    }
  }
  return aiInstance;
};

// Get Type enum lazily - NEVER called at module scope
const getType = () => {
  if (!TypeEnum) {
    throw new Error('Type enum not loaded - module not initialized');
  }
  return TypeEnum;
};

// Pre-initialize the module at startup (call this early in App component)
export const initializeGemini = async () => {
  await loadGoogleGenAI();
};

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
      model: 'gemini-2.5-flash-lite',  // Ultra-fast, cost-efficient
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
          type: getType().OBJECT,
          properties: {
            facebook: {
              type: getType().OBJECT,
              properties: {
                content: { type: getType().STRING },
                hashtags: { type: getType().ARRAY, items: { type: getType().STRING } }
              }
            },
            instagram: {
              type: getType().OBJECT,
              properties: {
                caption: { type: getType().STRING },
                hashtags: { type: getType().ARRAY, items: { type: getType().STRING } }
              }
            },
            twitter: {
              type: getType().OBJECT,
              properties: {
                tweet: { type: getType().STRING },
                hashtags: { type: getType().ARRAY, items: { type: getType().STRING } }
              }
            },
            linkedin: {
              type: getType().OBJECT,
              properties: {
                content: { type: getType().STRING }
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
      model: 'gemini-2.5-flash-lite',  // Ultra-fast, cost-efficient
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
          type: getType().OBJECT,
          properties: {
            title: { type: getType().STRING },
            copy: { type: getType().STRING },
            visualPrompt: { type: getType().STRING },
            cta: { type: getType().STRING },
            recommendedIncentiveType: { type: getType().STRING, enum: ["credits", "pro_discount", "none"] },
            recommendedIncentiveValue: { type: getType().NUMBER },
            offerHeadline: { type: getType().STRING },
            offerDetails: { type: getType().STRING }
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

  // Use circuit breaker to prevent cascading failures
  try {
    const result = await geminiCircuitBreaker.execute(async () => {
      // Wrap in retry with exponential backoff
      const retryResult = await retryWithBackoff(
        async () => {
          const ai = getAI();
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ text: `Professional marketing flier for EventNexus with clear promotional text overlay: ${prompt}. Include eye-catching headlines and call-to-action text directly on the image. Premium tech aesthetics, cinematic lighting, ultra-modern UI elements, bold typography, 8k. Aspect ratio: ${aspectRatio}` }]
            }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              return { inlineData: part.inlineData.data };
            }
          }
          throw new Error('No image data in response');
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          timeoutMs: 45000 // Image generation can take 30-45 seconds
        }
      );

      if (!retryResult.success) {
        throw new Error(retryResult.error);
      }

      const base64Data = retryResult.data!.inlineData;
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
    });
    
    return result;
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
    // Normalize target language: accept code (et) or name (Estonian)
    const lower = (targetLanguage || '').toLowerCase();
    const byCode = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === lower);
    const byName = SUPPORTED_LANGUAGES.find(l => l.name.toLowerCase() === lower || l.nativeName.toLowerCase() === lower);
    const targetLabel = (byCode?.name || byName?.name || targetLanguage).trim();

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text to ${targetLabel}. Output only the translated text, with no quotes or extra commentary. Preserve emojis, URLs, and formatting.

Text:
${text}`
    });

    let result = response.text?.trim() || text;

    // If no change, try a stricter prompt once using normalized name
    if (result === text && targetLabel && targetLabel.length > 1) {
      const second = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate into ${targetLabel}. Return only the translated text.

${text}`
      });
      const alt = second.text?.trim();
      if (alt && alt.length > 0) {
        result = alt;
      }
    }

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
 * Batch translate multiple texts in a single API call (optimized)
 * Free tier: costs 1 credit per text | Paid tiers: included
 * More efficient than making separate calls - reduces API usage by ~50%
 */
export const translateDescriptionBatch = async (
  texts: Record<string, string>, 
  targetLanguage: string, 
  userId?: string, 
  userTier?: string
): Promise<Record<string, string>> => {
  // Early return if no texts to translate
  if (!texts || Object.keys(texts).length === 0) {
    return texts;
  }

  // Check if user needs to pay with credits (Free tier only)
  // Charge once for the batch operation
  if (userId && userTier === 'free') {
    const creditsNeeded = AI_CREDIT_COSTS.TRANSLATION * Object.keys(texts).length;
    const hasCredits = await checkUserCredits(userId, creditsNeeded);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need ${creditsNeeded} credits (${creditsNeeded * 0.5}€ value)`);
    }
  }

  try {
    // Normalize target language: accept code (et) or name (Estonian)
    const lower = (targetLanguage || '').toLowerCase();
    const byCode = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === lower);
    const byName = SUPPORTED_LANGUAGES.find(l => l.name.toLowerCase() === lower || l.nativeName.toLowerCase() === lower);
    const targetLabel = (byCode?.name || byName?.name || targetLanguage).trim();

    // Build a batch translation request with all texts
    const textEntries = Object.entries(texts);
    const textList = textEntries.map(([key, text], idx) => `${idx + 1}. [${key}] ${text}`).join('\n\n');

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate ALL of the following texts to ${targetLabel}. 
Return ONLY the translations in the exact same format, preserving the [key] labels and numbering.
Output only the translations, no explanations, no additional text.

Texts to translate:
${textList}`
    });

    const result = response.text?.trim() || '';
    const translations: Record<string, string> = {};

    // Parse the response and map back to keys
    textEntries.forEach(([key, originalText]) => {
      // Try to extract the translated text from response
      // Look for pattern: "1. [key] translated text"
      const pattern = new RegExp(`\\d+\\.\\s*\\[${key}\\]\\s*(.+?)(?=\\n\\d+\\.\\s*\\[|$)`, 's');
      const match = result.match(pattern);
      const translated = match ? match[1].trim() : originalText;
      translations[key] = translated || originalText;
    });

    // Deduct credits after successful generation (Free tier only)
    if (userId && userTier === 'free') {
      const creditsNeeded = AI_CREDIT_COSTS.TRANSLATION * Object.keys(texts).length;
      await deductUserCredits(userId, creditsNeeded);
    }

    return translations;
  } catch (error) {
    console.error("Batch translation failed:", error);
    // Return original texts on error
    return texts;
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
          type: getType().ARRAY,
          items: {
            type: getType().OBJECT,
            properties: {
              platform: { type: getType().STRING },
              headline: { type: getType().STRING },
              bodyCopy: { type: getType().STRING },
              cta: { type: getType().STRING },
              visualPrompt: { type: getType().STRING }
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
 * Automatically adapts to local market language based on event location
 * Free tier: costs credits | Paid tiers: included
 */
export const generatePosterDesign = async (
  eventName: string,
  eventDescription: string,
  eventCategory: string,
  campaignTheme: string,
  userId?: string,
  userTier?: string,
  eventLocation?: { city: string; address: string }
) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, 25); // 25 credits for poster design
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need 25 credits for poster design`);
    }
  }

  // Detect target market/language from location
  let marketContext = "international English-speaking audience";
  if (eventLocation) {
    const city = eventLocation.city.toLowerCase();
    const address = eventLocation.address.toLowerCase();
    
    if (city.includes('tallinn') || city.includes('tartu') || address.includes('estonia')) {
      marketContext = "Estonian market (Eesti turg) - design should resonate with Estonian culture and aesthetics";
    } else if (city.includes('helsinki') || city.includes('tampere') || address.includes('finland')) {
      marketContext = "Finnish market (Suomen markkinat) - design should appeal to Finnish sensibilities";
    } else if (city.includes('stockholm') || city.includes('göteborg') || address.includes('sweden')) {
      marketContext = "Swedish market (Svensk marknad) - Scandinavian minimalist aesthetic preferred";
    } else if (city.includes('berlin') || city.includes('münchen') || address.includes('germany')) {
      marketContext = "German market (Deutscher Markt) - clean, professional design with strong typography";
    } else if (city.includes('paris') || city.includes('lyon') || address.includes('france')) {
      marketContext = "French market (Marché français) - elegant, artistic design with sophistication";
    } else if (city.includes('madrid') || city.includes('barcelona') || address.includes('spain')) {
      marketContext = "Spanish market (Mercado español) - vibrant, energetic design with warm colors";
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
- Target Market: ${marketContext}

POSTER DESIGN REQUIREMENTS:
1. Create a visually striking, high-impact design suitable for:
   - Physical printing on A3 paper (297x420mm) for wall mounting
   - High visibility in public spaces (cafes, community boards, venues)
   - Professional presentation that commands attention

2. Design Characteristics:
   - Bold, readable typography (event name must be legible from 3-4 meters away)
   - Strong color contrast for maximum visibility
   - Clear visual hierarchy with event name as primary focus
   - Professional and engaging aesthetic appropriate for ${marketContext}
   - Balanced composition: vivid image on left (60%), event details on right (40%)

3. Visual Elements:
   - Main event imagery: Vivid, category-appropriate, culturally relevant to target market
   - Color scheme: 3 colors that work together AND suit the local market aesthetic
   - Must include space for QR code (bottom right, white background for scanning)
   - All text areas use high-contrast colors for readability
   - Modern, clean design that looks professional when printed

4. Cultural & Market Considerations:
   - Color psychology should match ${marketContext}
   - Visual style should resonate with local target audience
   - Typography and layout should feel native to the market
   - Avoid cultural elements that may not translate well

5. Technical Requirements:
   - Image resolution: High quality (suitable for 300 DPI printing)
   - Text: Sans-serif font, bold and modern
   - Focus on essential information only
   - Design must work both digitally and in physical print

Respond in JSON format with ONLY this structure:
{
  "title": "Poster design headline (in English)",
  "description": "Detailed visual description of the poster layout, color psychology, and design elements optimized for ${marketContext}",
  "imageUrl": "A detailed description for AI image generation: describe the main visual for the left side of the poster, including composition, mood, colors, and cultural relevance to ${marketContext}",
  "colorScheme": {
    "primary": "#HEX_COLOR (dominant background/gradient start - choose colors appropriate for ${marketContext})",
    "secondary": "#HEX_COLOR (gradient end or secondary areas)",
    "accent": "#HEX_COLOR (highlights and call-to-action emphasis)"
  }
}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: getType().OBJECT,
          properties: {
            title: { type: getType().STRING },
            description: { type: getType().STRING },
            imageUrl: { type: getType().STRING },
            colorScheme: {
              type: getType().OBJECT,
              properties: {
                primary: { type: getType().STRING },
                secondary: { type: getType().STRING },
                accent: { type: getType().STRING }
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
 * Generate personalized B2B outreach email using AI
 * @param prospect - Target company information
 * @param template - Base template with variables
 * @param language - Target language (en, et, fi, etc.)
 * @param userId - User ID for credit deduction
 * @returns Personalized email with subject and body
 */
export const generateOutreachEmail = async (
  prospect: {
    id: string;
    name: string;
    email: string;
    category: string;
    description?: string;
    website?: string;
  },
  template: {
    subject_template: string;
    body_template: string;
    ai_prompt?: string;
  },
  language: string = 'en',
  userId?: string,
  sendEmail: boolean = false
): Promise<{ subject: string; body: string; emailSent?: boolean; emailId?: string } | null> => {
  try {
    // Call Edge Function for server-side generation (more reliable + no CORS issues)
    const { data, error } = await supabase.functions.invoke('generate-outreach-email', {
      body: {
        prospect,
        template,
        language,
        sendEmail // Pass through to backend
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      return null;
    }

    if (!data.success) {
      console.error('Generation failed:', data.error);
      return null;
    }

    return {
      subject: data.subject,
      body: data.body,
      emailSent: data.emailSent || false,
      emailId: data.emailId || null
    };
  } catch (error) {
    console.error("Outreach email generation failed:", error);
    return null;
  }
};


