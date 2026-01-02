
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AdCampaign } from "../types";

export class GeminiService {
  private static getAiClient() {
    // Guidelines: Create fresh instance to use latest API key from state
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async analyzeWebsite(url: string, platform: string): Promise<AdCampaign['analysis'] & { sources: {uri: string, title: string}[] }> {
    const ai = this.getAiClient();
    const prompt = `
      Perform an elite "Brand DNA & 60s Narrative Architecture" analysis for the website: ${url}.
      Target Platform: ${platform}.
      
      STRICT REQUIREMENTS:
      1. LANGUAGE: English only.
      2. DURATION: 60-second epic story arc.
      3. VISUAL ANCHORING: Define a consistent "Visual Signature" (e.g., "Minimalist white studio with floating glass UI", "Neon-lit cyber industrial with orange accents"). 
      4. STORY COHERENCE: The video must not be "confusing". Every scene must lead logically to the next.
      
      Output Schema:
      - VisualSignature: A detailed description of the lighting, colors, and textures to be used in ALL video frames.
      - CoreEssence: The deepest value prop.
      - 5-Scene Storyboard (Total 60s):
        - Scene 1 (Hook): Cinematic metaphor of the core benefit.
        - Scene 2 (Contrast): The world without this solution (moody but consistent style).
        - Scene 3 (Transition): The moment of discovery/interface interaction.
        - Scene 4 (Impact): Dynamic, high-energy demonstration.
        - Scene 5 (Legacy): Clean, premium brand reveal with CTA.
      
      Respond strictly in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandName: { type: Type.STRING },
            coreEssence: { type: Type.STRING },
            visualSignature: { type: Type.STRING, description: "Detailed visual style guide for AI image/video consistency" },
            painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            script: { type: Type.STRING },
            scenes: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                conflict: { type: Type.STRING },
                resolution: { type: Type.STRING },
                power: { type: Type.STRING },
                closing: { type: Type.STRING }
              },
              required: ["hook", "conflict", "resolution", "power", "closing"]
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
          required: ["brandName", "coreEssence", "visualSignature", "painPoints", "script", "scenes", "socialCopy"]
        }
      }
    });

    const analysis = JSON.parse(response.text || '{}');
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Market Insight"
      }))
      .filter((s: any) => s.uri) || [];

    return { ...analysis, sources };
  }

  static async generateVoiceover(text: string): Promise<string> {
    const ai = this.getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Professional, authoritative, high-end commercial narrator: ${text}` }] }],
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
  }

  static async generateMasterAd(
    analysis: any,
    aspectRatio: '16:9' | '9:16',
    onStep: (step: number) => void
  ): Promise<string> {
    const { visualSignature, scenes } = analysis;
    const globalContext = `Visual Style: ${visualSignature}. Movie-grade quality, strict continuity, anamorphic lens flares, high-end commercial lighting. Always keep the subjects and environment consistent with previous frames.`;
    
    // Scene 1: Hook (10-12s)
    onStep(1);
    let ai = this.getAiClient();
    let op1 = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `${scenes.hook}. ${globalContext}`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
    while (!op1.done) { 
      await new Promise(r => setTimeout(r, 10000)); 
      op1 = await ai.operations.getVideosOperation({ operation: op1 }); 
    }
    const v1 = op1.response?.generatedVideos?.[0]?.video;
    if (!v1) throw new Error("Scene 1 failed.");

    // Scene 2: Transition (Extension to ~24s)
    onStep(2);
    ai = this.getAiClient();
    let op2 = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `Continuity: ${scenes.conflict}. Use same lighting and objects from Scene 1. Narrative progression. ${globalContext}`,
      video: v1,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
    while (!op2.done) { 
      await new Promise(r => setTimeout(r, 10000)); 
      op2 = await ai.operations.getVideosOperation({ operation: op2 }); 
    }
    const v2 = op2.response?.generatedVideos?.[0]?.video;

    // Scene 3: Revelation (Extension to ~36s)
    onStep(3);
    ai = this.getAiClient();
    let op3 = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `Discovery: ${scenes.resolution}. Brighten lighting while maintaining style. Reveal the solution. ${globalContext}`,
      video: v2,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
    while (!op3.done) { 
      await new Promise(r => setTimeout(r, 10000)); 
      op3 = await ai.operations.getVideosOperation({ operation: op3 }); 
    }
    const v3 = op3.response?.generatedVideos?.[0]?.video;

    // Scene 4: Energy (Extension to ~48s)
    onStep(4);
    ai = this.getAiClient();
    let op4 = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `Power shot: ${scenes.power}. High energy movement, consistent materials. Show the core benefit in action. ${globalContext}`,
      video: v3,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
    while (!op4.done) { 
      await new Promise(r => setTimeout(r, 10000)); 
      op4 = await ai.operations.getVideosOperation({ operation: op4 }); 
    }
    const v4 = op4.response?.generatedVideos?.[0]?.video;

    // Scene 5: Closing (Extension to 60s)
    onStep(5);
    ai = this.getAiClient();
    let op5 = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `Finale: ${scenes.closing}. Fade to brand colors, cinematic logo environment. Stable and premium. ${globalContext}`,
      video: v4,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
    while (!op5.done) { 
      await new Promise(r => setTimeout(r, 10000)); 
      op5 = await ai.operations.getVideosOperation({ operation: op5 }); 
    }
    
    const finalUri = op5.response?.generatedVideos?.[0]?.video?.uri;
    const finalRes = await fetch(`${finalUri}&key=${process.env.API_KEY}`);
    const blob = await finalRes.blob();
    return URL.createObjectURL(blob);
  }
}
