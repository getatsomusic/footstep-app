import { GoogleGenAI } from "@google/genai";
import { ProjectStats } from "../types";

// Helper to handle Vercel Request/Response types implicitly or strictly if desired.
// Using standard async handler pattern for Vercel Node.js runtime.

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing GEMINI_API_KEY' });
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-2.5-flash';

  try {
    const { type, data } = req.body;

    // 1. Handle Strategic Insight
    if (type === 'strategicInsight') {
        const { stats, focusArea } = data as { stats: ProjectStats, focusArea: string };

        // Logic moved from client service to server
        const followersCount = stats.followers ? stats.followers.reduce((acc, curr) => acc + curr.count, 0) : 0;
    
        let trend = 'Neutral';
        if (stats.revenue && Array.isArray(stats.revenue) && stats.revenue.length >= 2) {
            const current = stats.revenue[stats.revenue.length - 1]?.value || 0;
            const previous = stats.revenue[stats.revenue.length - 2]?.value || 0;
            trend = current > previous ? 'Uppåtgående' : 'Nedåtgående';
        } else if (stats.revenue && stats.revenue.length === 1) {
            trend = 'Ingen historik';
        }

        const prompt = `
          Du är en senior manager i musikbranschen (FOOTSTEP Management).
          Analysera följande data för artisten "${stats.projectName}" och ge ett kort, koncist, lean-startup-inspirerat råd fokuserat på "${focusArea}".
          
          Data:
          - Media-omnämnanden denna månad: ${stats.mentions ? stats.mentions.length : 0}
          - Totala följare (Instagram/TikTok/Spotify): ${followersCount}
          - Senaste intäkter trend: ${trend}
          
          Håll svaret under 50 ord. Var direkt och handlingskraftig. Svenska.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return res.status(200).json({ result: response.text || "Kunde inte generera insikt just nu." });
    }

    // 2. Handle Next Steps Suggestion
    if (type === 'nextSteps') {
        const { projectContext, recentMessages } = data;

        const prompt = `
            Baserat på följande konversation i artist-management-chatten, föreslå 3 konkreta "Action Points" (To-Do's).
            Projekt: ${projectContext}
            Konversation:
            ${recentMessages.join('\n')}

            Svara ENDAST med en JSON-lista av strängar. Exempel: ["Boka studio", "Skicka faktura"].
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        const result = text ? JSON.parse(text) : [];
        return res.status(200).json({ result });
    }

    return res.status(400).json({ error: 'Invalid request type' });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) });
  }
}