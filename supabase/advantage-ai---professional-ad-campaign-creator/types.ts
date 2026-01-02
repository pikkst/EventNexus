
export interface AdCampaign {
  websiteUrl: string;
  targetPlatform: string;
  aspectRatio: '16:9' | '9:16';
  analysis: {
    brandName: string;
    coreEssence: string;
    painPoints: string[];
    emotionalDriver: string;
    keyFeatures: string[];
    script: string;
    scenes: {
      hook: string;
      conflict: string;
      resolution: string;
      closing: string;
    };
    socialCopy: {
      headline: string;
      body: string;
      cta: string;
      hashtags: string[];
    };
  };
  videoUrl?: string;
  audioBase64?: string;
  sources?: { uri: string; title: string }[];
}

export enum Step {
  INPUT,
  ANALYZING,
  GENERATING_SCENE_1,
  EXTENDING_SCENE_2,
  EXTENDING_SCENE_3,
  EXTENDING_SCENE_4,
  GENERATING_AUDIO,
  COMPLETED,
  ERROR
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  var aistudio: AIStudio;
}
