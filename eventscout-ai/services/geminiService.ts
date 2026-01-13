
import { GoogleGenAI, Type } from "@google/genai";
import { City, FreeEvent } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Geolocates a city and returns detailed information.
 * Uses Gemini 3 Pro with Thinking Mode for high reasoning accuracy.
 */
export const geolocateCity = async (cityName: string): Promise<City> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Find precise geolocation and information for the city: "${cityName}". 
    Include the official 3-letter ISO country code. Return all data in English.`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          country: { type: Type.STRING },
          countryCode: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          timezone: { type: Type.STRING },
        },
        required: ["name", "country", "countryCode", "lat", "lng", "timezone"],
      },
    },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    id: crypto.randomUUID(),
  };
};

/**
 * Searches for real free events and structures them with detailed metadata.
 */
export const findFreeEvents = async (city: City): Promise<FreeEvent[]> => {
  const ai = getAI();
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  const dateStr = today.toISOString().split('T')[0];
  const endStr = thirtyDaysLater.toISOString().split('T')[0];

  // Step 1: Broad search for real events using Flash + Grounding
  const searchPrompt = `Search for REAL upcoming FREE events in ${city.name}, ${city.country} between ${dateStr} and ${endStr}. 
  Find actual events with verified details. For each event, I need the name, full description, exact start/end times, exact address, and a link to the source.`;

  const searchResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawText = searchResponse.text;

  // Step 2: Use Pro + Thinking to extract coordinates and format ISO dates precisely
  const structureResponse = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Transform this event list into a structured JSON array. 
    Use the raw search data below to extract:
    - name
    - description
    - start_time (ISO 8601 string, e.g., "2026-01-18T17:00:00+01:00")
    - end_time (ISO 8601 string)
    - location_address
    - location_lat (estimate based on address if not explicitly found)
    - location_lng (estimate based on address if not explicitly found)
    - category (e.g., Music, Art, Workshop)
    - is_free (must be true)
    - price (must be 0)
    - sourceUrl
    
    Data:
    ${rawText}`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            start_time: { type: Type.STRING },
            end_time: { type: Type.STRING },
            location_address: { type: Type.STRING },
            location_lat: { type: Type.NUMBER },
            location_lng: { type: Type.NUMBER },
            category: { type: Type.STRING },
            is_free: { type: Type.BOOLEAN },
            price: { type: Type.NUMBER },
            sourceUrl: { type: Type.STRING },
          },
          required: [
            "name", "description", "start_time", "end_time", 
            "location_address", "location_lat", "location_lng", 
            "category", "is_free", "price", "sourceUrl"
          ],
        },
      },
    },
  });

  return JSON.parse(structureResponse.text || "[]");
};
