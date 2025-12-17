
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePlatformGrowthCampaign = async (theme: string, target: 'creators' | 'attendees') => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a growth marketing expert for EventNexus, a map-first event platform.
      Task: Generate a high-impact acquisition campaign.
      Theme: ${theme}
      Target Audience: ${target === 'creators' ? 'Event Organizers and Promoters' : 'General Attendees'}
      
      Requirements:
      1. Bold, high-conversion Title (max 40 chars).
      2. Emotional, benefit-driven Marketing Copy (max 120 chars).
      3. A visual prompt for an image generator (DALL-E style) that feels like premium lifestyle/tech.
      4. A Call to Action (CTA) like "Start Exploring" or "Launch Your Brand".
      5. Recommended 'Incentive' (e.g., credits for attendees, discount for creators).`,
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

export const generateAdImage = async (prompt: string, aspectRatio: "1:1" | "9:16" | "16:9" = "1:1") => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional marketing flier for EventNexus: ${prompt}. Premium tech aesthetics, cinematic lighting, ultra-modern UI elements integrated, 8k.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

export const generateMarketingTagline = async (name: string, category: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a single short, punchy, high-impact marketing tagline for an event named "${name}" in the category "${category}". Return only the tagline text.`,
    });
    return response.text?.trim() || '';
  } catch (error) {
    return "Experience the extraordinary.";
  }
};

export const translateDescription = async (text: string, targetLanguage: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following event description into ${targetLanguage}. Keep the tone professional yet inviting. Return only the translated text.\n\nText: ${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};

export const generateAdCampaign = async (name: string, description: string, objective: string) => {
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
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
};

export const createNexusChat = () => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: 'You are NexusAI, a world-class event concierge and organizer assistant for EventNexus. You help attendees find the best vibes and help organizers create high-impact experiences.',
    },
  });
};
