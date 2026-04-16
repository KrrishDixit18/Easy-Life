import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TaskSuggestion {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
}

export const geminiService = {
  async processVoiceTranscript(transcript: string): Promise<Partial<TaskSuggestion>> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract task details from this transcript: "${transcript}". 
      Return a JSON object with title, description, priority (low, medium, high), and estimatedMinutes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            estimatedMinutes: { type: Type.NUMBER }
          },
          required: ["title"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async getTaskSuggestions(context: string): Promise<TaskSuggestion[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this context: "${context}", suggest 3 productive tasks. 
      Return a JSON array of objects with title, description, priority, and estimatedMinutes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
              estimatedMinutes: { type: Type.NUMBER }
            },
            required: ["title", "priority", "estimatedMinutes"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  },

  async detectPriority(description: string): Promise<'low' | 'medium' | 'high'> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Detect priority for this task: "${description}". Return only 'low', 'medium', or 'high'.`,
    });
    const text = response.text?.toLowerCase().trim();
    if (text?.includes('high')) return 'high';
    if (text?.includes('medium')) return 'medium';
    return 'low';
  },

  async summarizeTask(longInput: string): Promise<{ title: string; description: string }> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize this long input into a short task title and description: "${longInput}". 
      Return JSON with title and description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async generateDailyPlan(tasks: any[]): Promise<any[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Organize these tasks into a logical daily schedule: ${JSON.stringify(tasks)}. 
      Return a JSON array of task IDs in the recommended order of execution.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  },

  async generateDailyFeedback(tasks: any[], success: boolean): Promise<string> {
    const taskList = tasks.map(t => `- ${t.title} (${t.completed ? 'Completed' : 'Failed'})`).join('\n');
    const prompt = success 
      ? `The user completed all their tasks today:
${taskList}
Give them a short, genuinely nice, and encouraging comment (max 2 sentences).`
      : `The user failed to complete some of their tasks today:
${taskList}
Roast them brutally but humorously for their lack of productivity (max 2 sentences). Be creative and witty.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || (success ? "Great job today!" : "You can do better tomorrow.");
  }
};
