
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase';
import { deductUserCredits, checkUserCredits } from './dbService';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
 * Generate platform growth campaign
 * ADMIN FEATURE - NO CREDIT COST
 */
export const generatePlatformGrowthCampaign = async (theme: string, target: string) => {
  try {
    const ai = getAI();
    
    const audienceMap: Record<string, { name: string; tone: string; cta: string }> = {
      attendees: { name: 'Event Attendees', tone: 'exciting and fun', cta: 'Discover Events' },
      creators: { name: 'Event Creators & Organizers', tone: 'professional and empowering', cta: 'Start Creating' },
      'platform-growth': { name: 'New Users', tone: 'welcoming and innovative', cta: 'Join EventNexus' },
      'new-features': { name: 'Existing Users', tone: 'exciting and informative', cta: 'Try New Features' },
      community: { name: 'Community Members', tone: 'friendly and engaging', cta: 'Join the Community' },
      seasonal: { name: 'Seasonal Event-Goers', tone: 'festive and energetic', cta: 'Explore Events' },
      retention: { name: 'Returning Users', tone: 'warm and appreciative', cta: 'Welcome Back' },
      referral: { name: 'Active Users', tone: 'rewarding and motivational', cta: 'Invite Friends' }
    };
    
    const audience = audienceMap[target] || audienceMap.attendees;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert growth marketing copywriter and visual designer for EventNexus, a premium map-first event discovery platform.
      
      Campaign Details:
      - Theme: ${theme}
      - Target Audience: ${audience.name}
      - Tone: ${audience.tone}
      - Primary CTA: ${audience.cta}
      
      Generate a high-converting marketing campaign with:
      
      1. TITLE (max 40 chars):
         - Bold, attention-grabbing headline
         - Use power words and emotional triggers
         - Make it memorable and shareable
      
      2. MARKETING COPY (max 120 chars):
         - Lead with benefit, not feature
         - Create FOMO (fear of missing out)
         - NEVER mention specific user numbers or fake statistics (NO "50k users", "10k+ downloads", etc.)
         - Focus on emotions and experiences instead
         - Include aspirational language
         - End with clear value proposition
      
      3. VISUAL PROMPT (detailed DALL-E/Midjourney style):
         - Describe a premium, modern, eye-catching image
         - Specify style: "cinematic photography", "vibrant gradient design", "minimalist tech aesthetic"
         - Include: composition, colors, mood, lighting, key visual elements
         - Match EventNexus brand (modern, bold, community-focused)
         - Avoid text, logos, or specific people faces
         - Example: "Cinematic wide shot of diverse young people celebrating at colorful outdoor festival at sunset, vibrant purple and orange lighting, confetti in air, joyful atmosphere, premium lifestyle photography, shallow depth of field, 8k quality"
      
      4. CALL TO ACTION:
         - Use ${audience.cta} or similar action-oriented phrase
         - Make it urgent and specific
      
      5. INCENTIVE:
         - Suggest relevant reward based on audience
         - Options: credits, discount, exclusive access, referral bonus
      
      Make it conversion-optimized and visually striking!`,
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
            recommendedIncentiveValue: { type: Type.NUMBER }
          },
          required: ["title", "copy", "visualPrompt", "cta", "recommendedIncentiveType", "recommendedIncentiveValue"]
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
  saveToStorage = true, 
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

        // If saveToStorage is true, upload to Supabase and return public URL
        if (saveToStorage) {
          try {
            // Convert base64 to blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            
            // Generate unique filename
            const filename = `ai-generated/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('event-images')
              .upload(filename, blob, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
              });
            
            if (uploadError) {
              console.error('Failed to upload to Supabase Storage:', uploadError);
              return inlineDataUrl;
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('event-images')
              .getPublicUrl(filename);
            
            console.log('AI image uploaded successfully:', publicUrl);
            return publicUrl;
            
          } catch (storageError) {
            console.error('Storage error:', storageError);
            return inlineDataUrl;
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
      contents: `Generate a short, punchy marketing tagline (max 60 chars) for this event: "${name}" in the ${category} category.`
    });

    const result = response.text?.trim() || '';

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
export const generateAdCampaign = async (name: string, description: string, objective: string, userId?: string, userTier?: string) => {
  // Check if user needs to pay with credits (Free tier only)
  if (userId && userTier === 'free') {
    const hasCredits = await checkUserCredits(userId, AI_CREDIT_COSTS.AD_CAMPAIGN);
    if (!hasCredits) {
      throw new Error(`Insufficient credits. Need ${AI_CREDIT_COSTS.AD_CAMPAIGN} credits (${AI_CREDIT_COSTS.AD_CAMPAIGN * 0.5}€ value)`);
    }
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate 3 distinct marketing ads for this event: "${name}". 
      Description: ${description}. 
      Objective: ${objective}.
      For each ad, provide:
      1. Platform (e.g. Instagram Story, LinkedIn Feed)
      2. Headline (Punchy title for the ad)
      3. BodyCopy (The actual promotional text the user will read)
      4. CTA (The button text)
      5. VisualPrompt (Instruction for the AI image generator)`,
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
