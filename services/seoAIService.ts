/**
 * AI-powered SEO Optimization Service
 * Uses Google Gemini to provide intelligent SEO recommendations
 */

import { GoogleGenAI } from "@google/genai";

interface SEOMetric {
  keyword: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  url: string;
}

interface SEORecommendation {
  type: "keyword" | "content" | "meta" | "technical" | "strategy";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  impact: string;
}

interface SEOOptimizationSuggestion {
  keyword: string;
  currentPosition: number;
  opportunity: "quick_win" | "medium_effort" | "long_term";
  suggestion: string;
  expectedImprovement: string;
  action: string;
}

interface MetaTagSuggestion {
  page: string;
  currentTitle?: string;
  suggestedTitle: string;
  currentMetaDescription?: string;
  suggestedMetaDescription: string;
  keywords: string[];
  reasoning: string;
}

interface CompetitorInsight {
  metric: string;
  yourPosition: number;
  targetPosition: number;
  action: string;
  expectedTimeframe: string;
}

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generate AI-powered SEO recommendations based on current metrics
 */
export async function generateSEORecommendations(
  seoMetrics: SEOMetric[]
): Promise<SEORecommendation[]> {
  try {
    const ai = genAI;
    
    // Analyze current metrics
    const avgPosition = seoMetrics.reduce((sum, m) => sum + m.position, 0) / seoMetrics.length;
    const avgCTR = seoMetrics.reduce((sum, m) => sum + m.ctr, 0) / seoMetrics.length;
    const totalImpressions = seoMetrics.reduce((sum, m) => sum + m.impressions, 0);

    const metricsAnalysis = `
Current SEO Metrics:
- Average Ranking Position: ${avgPosition.toFixed(1)} (target: 3)
- Average CTR: ${avgCTR.toFixed(2)}% (target: 5-10%)
- Total Monthly Impressions: ${totalImpressions}
- Keywords Tracked: ${seoMetrics.length}

Top Keywords:
${seoMetrics.slice(0, 5).map(m => `- "${m.keyword}": Pos ${m.position}, ${m.impressions} impressions, ${m.ctr.toFixed(2)}% CTR`).join('\n')}

Problem Areas (outside top 10):
${seoMetrics.filter(m => m.position > 10).slice(0, 5).map(m => `- "${m.keyword}": Pos ${m.position} (${m.impressions} impressions)`).join('\n')}
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert SEO strategist for EventNexus, an AI-powered event management platform.

${metricsAnalysis}

Analyze these metrics and provide 5-7 specific, actionable SEO recommendations to improve our Google search visibility and rankings.

For each recommendation, provide in JSON format:
- type: "keyword", "content", "meta", "technical", or "strategy"
- priority: "high", "medium", or "low"
- title: concise recommendation title
- description: detailed explanation
- action: specific steps to implement
- impact: expected impact on rankings and traffic

Return as a valid JSON array.`
    });

    const responseText = response.text();
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from Gemini response");
      return [];
    }

    const recommendations = JSON.parse(jsonMatch[0]) as SEORecommendation[];
    return recommendations.slice(0, 7); // Limit to 7 recommendations
  } catch (error) {
    console.error("Error generating SEO recommendations:", error);
    return [];
  }
}

/**
 * Generate optimization suggestions for specific keywords
 */
export async function generateKeywordOptimization(
  seoMetrics: SEOMetric[]
): Promise<SEOOptimizationSuggestion[]> {
  try {
    const ai = genAI;

    // Identify keywords that could move from position 4-10 to 1-3
    const opportunityKeywords = seoMetrics.filter(m => m.position > 3 && m.position <= 10);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an SEO optimization expert. Analyze these keywords that are close to page 1 (positions 4-10) and suggest how to move them to the top 3 positions.

Keywords:
${opportunityKeywords.slice(0, 5).map(m => `- "${m.keyword}": Currently at position ${m.position}, ${m.impressions} impressions/month`).join('\n')}

For each keyword, provide in JSON format:
- keyword: the keyword
- currentPosition: current Google ranking position
- opportunity: "quick_win" (1-2 tweaks), "medium_effort" (content update), "long_term" (link building)
- suggestion: specific optimization strategy
- expectedImprovement: expected position improvement
- action: concrete action steps

Return as a valid JSON array.`
    });

    const responseText = response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]) as SEOOptimizationSuggestion[];
    return suggestions;
  } catch (error) {
    console.error("Error generating keyword optimization:", error);
    return [];
  }
}

/**
 * Generate meta tag suggestions for specific pages
 */
export async function generateMetaTagSuggestions(
  seoMetrics: SEOMetric[],
  pageTitles?: Record<string, string>
): Promise<MetaTagSuggestion[]> {
  try {
    const ai = genAI;

    // Group keywords by URL
    const pageKeywords: Record<string, SEOMetric[]> = {};
    seoMetrics.forEach(metric => {
      if (!pageKeywords[metric.url]) {
        pageKeywords[metric.url] = [];
      }
      pageKeywords[metric.url].push(metric);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert SEO copywriter. For each of these website pages, suggest optimized meta title and meta description tags that:
1. Include the primary keyword naturally
2. Match search intent
3. Encourage clicks (CTR improvement)
4. Stay within character limits (Title: 60, Description: 160)

Pages and their keywords:
${Object.entries(pageKeywords)
  .slice(0, 5)
  .map(
    ([url, keywords]) =>
      `URL: ${url}\nKeywords: ${keywords.map(k => `"${k.keyword}" (pos ${k.position})`).join(", ")}`
  )
  .join("\n\n")}

For each page, provide JSON with:
- page: URL
- suggestedTitle: SEO-optimized meta title (60 chars max)
- suggestedMetaDescription: SEO-optimized meta description (160 chars max)
- keywords: list of primary keywords to target
- reasoning: why these tags are better

Return as valid JSON array.`
    });

    const responseText = response.text();

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]) as MetaTagSuggestion[];
    return suggestions;
  } catch (error) {
    console.error("Error generating meta tag suggestions:", error);
    return [];
  }
}

/**
 * Analyze content optimization opportunities
 */
export async function analyzeContentOptimization(
  keyword: string,
  currentPosition: number,
  seoMetrics: SEOMetric[]
): Promise<{
  contentStrategy: string;
  headingStructure: string[];
  wordCount: string;
  internalLinking: string;
  semanticRelated: string[];
}> {
  try {
    const ai = genAI;

    // Find related keywords for semantic SEO
    const relatedKeywords = seoMetrics
      .filter(
        m =>
          m.keyword.toLowerCase().includes(keyword.toLowerCase().split(" ")[0]) ||
          keyword.toLowerCase().includes(m.keyword.toLowerCase().split(" ")[0])
      )
      .map(m => m.keyword)
      .slice(0, 5);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert content strategist. Provide detailed content optimization guidance for the keyword "${keyword}" which is currently ranking at position ${currentPosition}.

Strategy to move to top 3:
- Content Strategy: Overall approach to content
- Heading Structure: H1, H2, H3 suggestions
- Word Count: Recommended article length
- Internal Linking: How to structure internal links
- Semantic Keywords: Related terms to include naturally

Return as valid JSON.`
    });

    const responseText = response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from content optimization response");
      return null;
    }

    const optimization = JSON.parse(jsonMatch[0]);
    return optimization;
  } catch (error) {
    console.error("Error analyzing content optimization:", error);
    return null;
  }
}

/**
 * Generate SEO strategy for next 90 days
 */
export async function generateSEOStrategy(
  seoMetrics: SEOMetric[],
  currentDomain: string = "eventnexus.eu"
): Promise<{
  phase1: string;
  phase2: string;
  phase3: string;
  quickWins: string[];
  monthlyGoals: string[];
} | null> {
  try {
    const ai = genAI;

    const avgPosition = seoMetrics.reduce((sum, m) => sum + m.position, 0) / seoMetrics.length;
    const topKeywords = seoMetrics.slice(0, 5).map(m => m.keyword);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a 90-day SEO strategy for ${currentDomain}, an event management platform.

Current State:
- Average ranking position: ${avgPosition.toFixed(1)}
- Top keywords: ${topKeywords.join(", ")}
- Primary goal: Improve visibility and organic traffic by 40%

Provide a detailed 3-phase strategy:
1. Phase 1 (Days 1-30): Quick wins and immediate improvements
2. Phase 2 (Days 31-60): Content expansion and authority building
3. Phase 3 (Days 61-90): Advanced optimization and link building

Include:
- Quick Wins: 3-5 fast-to-implement strategies
- Monthly Goals: Measurable KPIs for each month

Return as valid JSON with phase1, phase2, phase3, quickWins, monthlyGoals fields.`
    });

    const responseText = response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from strategy response");
      return null;
    }

    const strategy = JSON.parse(jsonMatch[0]);
    return strategy;
  } catch (error) {
    console.error("Error generating SEO strategy:", error);
    return null;
  }
}
