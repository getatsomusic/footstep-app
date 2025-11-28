import { ProjectStats } from "../types";

export const getStrategicInsight = async (stats: ProjectStats, focusArea: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'strategicInsight',
        data: {
          stats,
          focusArea
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const json = await response.json();
    return json.result;

  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "AI-tjänsten är tillfälligt nere.";
  }
};

export const suggestNextSteps = async (projectContext: string, recentMessages: string[]): Promise<string[]> => {
    try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nextSteps',
            data: {
              projectContext,
              recentMessages
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const json = await response.json();
        return json.result;

    } catch (e) {
        console.error("Gemini Service Error:", e);
        return [];
    }
}