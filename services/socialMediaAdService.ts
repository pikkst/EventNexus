/**
 * AI-Powered Social Media Ad Generator for EventNexus
 * 
 * Combines Gemini AI + Pexels videos to create platform-optimized
 * social media advertisements for events.
 * 
 * Supports: Facebook, Instagram, TikTok, Twitter/X, YouTube
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  searchSocialMediaVideos, 
  getMultiPlatformVideos, 
  PLATFORM_SPECS,
  type PexelsVideo,
  type PexelsVideoFile 
} from './pexelsService';

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'youtube';
export type AdObjective = 'awareness' | 'engagement' | 'conversions' | 'traffic';
export type AdTone = 'exciting' | 'professional' | 'casual' | 'urgent' | 'playful';

export interface SocialMediaAd {
  platform: SocialPlatform;
  placement: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  hashtags: string[];
  video?: {
    url: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
  };
  image?: {
    url: string;
    width: number;
    height: number;
  };
  metadata: {
    characterCount: number;
    estimatedReach: string;
    bestPostTime: string;
  };
}

export interface AdCampaignRequest {
  eventName: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  targetAudience: string;
  budget?: number;
  objective: AdObjective;
  tone: AdTone;
  platforms: Array<{
    platform: SocialPlatform;
    placements: string[];
  }>;
  brandColor?: string;
  includeVideo?: boolean;
}

export interface AdCampaign {
  campaignId: string;
  eventName: string;
  objective: AdObjective;
  platforms: SocialPlatform[];
  ads: SocialMediaAd[];
  totalAds: number;
  estimatedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  recommendations: string[];
  createdAt: string;
}

// ============================================================================
// AI PROMPT ENGINEERING
// ============================================================================

function buildAdGenerationPrompt(request: AdCampaignRequest): string {
  return `You are an expert social media advertising strategist specializing in event promotion.

EVENT DETAILS:
- Name: ${request.eventName}
- Type: ${request.eventType}
- Date: ${request.eventDate}
- Location: ${request.eventLocation}
- Target Audience: ${request.targetAudience}

CAMPAIGN OBJECTIVES:
- Objective: ${request.objective}
- Tone: ${request.tone}
- Platforms: ${request.platforms.map(p => p.platform).join(', ')}

TASK:
Generate compelling social media ad copy for each platform with the following requirements:

1. **Platform-Specific Optimization:**
   - Facebook: Engaging, community-focused, max 125 characters for primary text
   - Instagram: Visual storytelling, emoji-friendly, max 2200 characters
   - TikTok: Trend-aware, Gen-Z language, max 2200 characters, casual tone
   - Twitter/X: Concise, witty, max 280 characters, thread-friendly
   - YouTube: Longer format, storytelling, max 5000 characters

2. **Copy Elements:**
   - Headline: Attention-grabbing, benefit-driven (max 40 characters)
   - Primary Text: Detailed event description with key benefits
   - Call-to-Action: Clear, action-oriented (e.g., "Get Tickets", "Reserve Spot", "Learn More")
   - Hashtags: 3-5 relevant, trending hashtags (mix of branded and popular)

3. **Tone Guidelines:**
   - Exciting: High energy, exclamation marks, FOMO-inducing
   - Professional: Polished, credible, data-driven
   - Casual: Friendly, conversational, relatable
   - Urgent: Limited availability, time-sensitive, scarcity
   - Playful: Fun, witty, emoji-rich, entertaining

4. **Best Practices:**
   - Front-load key information (first 3 words are critical)
   - Include clear value propositions
   - Create FOMO (fear of missing out)
   - Use power words: exclusive, limited, free, now, today
   - Mobile-first optimization (short paragraphs)
   - Include social proof when relevant

OUTPUT FORMAT (JSON):
Return an array of ad variations with this structure:
{
  "platform": "facebook|instagram|tiktok|twitter|youtube",
  "placement": "feed|story|reel|video|short",
  "headline": "Catchy headline here",
  "primaryText": "Full ad copy here",
  "callToAction": "Get Tickets|Learn More|Register Now",
  "hashtags": ["#EventName", "#EventType", "#Location"],
  "estimatedReach": "1K-5K|5K-10K|10K-50K|50K-100K",
  "bestPostTime": "Morning (8-10 AM)|Afternoon (12-2 PM)|Evening (5-8 PM)|Night (8-11 PM)"
}

Generate 2-3 variations per platform/placement combination for A/B testing.
Make each variation unique with different hooks, angles, or benefits highlighted.`;
}

// ============================================================================
// AD GENERATION
// ============================================================================

/**
 * Generate AI-powered social media ads for an event
 */
export async function generateEventAdCampaign(
  request: AdCampaignRequest
): Promise<AdCampaign | null> {
  try {
    console.log('🎯 Starting ad campaign generation...');

    // Step 1: Generate ad copy with Gemini AI
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.9, // Higher creativity for marketing copy
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    const prompt = buildAdGenerationPrompt(request);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('✅ AI copy generated');

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Failed to parse AI response');
      return null;
    }

    const adCopyVariations = JSON.parse(jsonMatch[0]);

    // Step 2: Fetch relevant videos from Pexels (if requested)
    let videoMatches: Map<string, { video: PexelsVideo; file: PexelsVideoFile }> | null = null;
    
    if (request.includeVideo !== false) {
      console.log('🎬 Fetching videos from Pexels...');

      const platformPlacements = request.platforms.flatMap(p => 
        p.placements.map(placement => ({ platform: p.platform, placement }))
      );

      videoMatches = await getMultiPlatformVideos(
        `${request.eventType} event ${request.tone}`,
        platformPlacements as any
      );

      console.log(`✅ Found ${videoMatches.size} video matches`);
    }

    // Step 3: Combine copy + videos into final ads
    const ads: SocialMediaAd[] = adCopyVariations.map((adCopy: any) => {
      const ad: SocialMediaAd = {
        platform: adCopy.platform,
        placement: adCopy.placement,
        headline: adCopy.headline,
        primaryText: adCopy.primaryText,
        callToAction: adCopy.callToAction,
        hashtags: adCopy.hashtags || [],
        metadata: {
          characterCount: adCopy.primaryText.length,
          estimatedReach: adCopy.estimatedReach || '5K-10K',
          bestPostTime: adCopy.bestPostTime || 'Evening (5-8 PM)',
        },
      };

      // Attach video if available
      const videoKey = `${adCopy.platform}_${adCopy.placement}`;
      const videoMatch = videoMatches?.get(videoKey);

      if (videoMatch) {
        const spec = PLATFORM_SPECS[adCopy.platform as SocialPlatform]?.[adCopy.placement];
        ad.video = {
          url: videoMatch.file.link,
          thumbnailUrl: videoMatch.video.image,
          duration: videoMatch.video.duration,
          width: videoMatch.file.width,
          height: videoMatch.file.height,
          aspectRatio: spec?.aspectRatio || 'auto',
        };
      }

      return ad;
    });

    // Step 4: Calculate budget estimates
    const avgCostPerPlatform = {
      facebook: 0.50, // CPM (cost per 1000 impressions)
      instagram: 0.70,
      tiktok: 1.00,
      twitter: 0.60,
      youtube: 2.00,
    };

    const estimatedImpressions = ads.length * 5000; // 5K per ad
    const avgCost = ads.reduce((sum, ad) => {
      return sum + (avgCostPerPlatform[ad.platform] || 0.75);
    }, 0) / ads.length;

    const estimatedBudget = {
      min: Math.round((estimatedImpressions / 1000) * avgCost * 0.8),
      max: Math.round((estimatedImpressions / 1000) * avgCost * 1.5),
      currency: 'USD',
    };

    // Step 5: Generate recommendations
    const recommendations = generateRecommendations(request, ads);

    const campaign: AdCampaign = {
      campaignId: `campaign_${Date.now()}`,
      eventName: request.eventName,
      objective: request.objective,
      platforms: [...new Set(ads.map(ad => ad.platform))],
      ads,
      totalAds: ads.length,
      estimatedBudget,
      recommendations,
      createdAt: new Date().toISOString(),
    };

    console.log('✅ Campaign generated successfully');
    return campaign;

  } catch (error) {
    console.error('❌ Error generating ad campaign:', error);
    return null;
  }
}

/**
 * Generate strategic recommendations for the campaign
 */
function generateRecommendations(
  request: AdCampaignRequest,
  ads: SocialMediaAd[]
): string[] {
  const recommendations: string[] = [];

  // Platform mix recommendations
  const platforms = new Set(ads.map(ad => ad.platform));
  if (platforms.size < 3) {
    recommendations.push('Consider expanding to more platforms for broader reach');
  }

  // Video recommendations
  const videoAds = ads.filter(ad => ad.video);
  const videoPercentage = (videoAds.length / ads.length) * 100;
  if (videoPercentage < 50) {
    recommendations.push('Video ads typically perform 3x better - consider adding more video content');
  }

  // A/B testing
  const variationsPerPlatform = new Map<string, number>();
  ads.forEach(ad => {
    const key = `${ad.platform}_${ad.placement}`;
    variationsPerPlatform.set(key, (variationsPerPlatform.get(key) || 0) + 1);
  });
  
  if ([...variationsPerPlatform.values()].some(count => count < 2)) {
    recommendations.push('Create at least 2 variations per placement for effective A/B testing');
  }

  // Objective-specific recommendations
  if (request.objective === 'conversions') {
    recommendations.push('Use retargeting pixels to track conversions and optimize campaign');
    recommendations.push('Create urgency with limited-time offers or early bird pricing');
  }

  // Budget recommendations
  if (request.budget && request.budget < 100) {
    recommendations.push('Consider increasing budget to $100+ for better reach and optimization');
  }

  // Timing recommendations
  const eventDate = new Date(request.eventDate);
  const daysUntilEvent = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilEvent < 7) {
    recommendations.push('Launch urgent "Last Chance" campaigns with strong CTAs');
  } else if (daysUntilEvent > 60) {
    recommendations.push('Run awareness campaigns now, conversion campaigns closer to event date');
  }

  return recommendations;
}

/**
 * Generate single ad for specific platform
 */
export async function generateSingleAd(
  eventName: string,
  platform: SocialPlatform,
  placement: string,
  options: {
    tone?: AdTone;
    objective?: AdObjective;
    includeVideo?: boolean;
  } = {}
): Promise<SocialMediaAd | null> {
  const request: AdCampaignRequest = {
    eventName,
    eventType: 'event',
    eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    eventLocation: 'Online',
    targetAudience: 'General',
    objective: options.objective || 'awareness',
    tone: options.tone || 'exciting',
    platforms: [{ platform, placements: [placement] }],
    includeVideo: options.includeVideo,
  };

  const campaign = await generateEventAdCampaign(request);
  return campaign?.ads[0] || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateEventAdCampaign,
  generateSingleAd,
};
