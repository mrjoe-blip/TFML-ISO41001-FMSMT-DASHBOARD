declare var process: any; // Fix for TS build error: "Cannot find name 'process'"

import { GoogleGenAI, Type } from "@google/genai";
import { MaturityRecord, AnalysisResult } from "../types";

export const generateAnalysis = async (record: MaturityRecord): Promise<AnalysisResult> => {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY
  // Note: We use process.env here because it is polyfilled by vite.config.ts define: { 'process.env': process.env }
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("No API Key found. Returning mock analysis.");
    return {
      executiveSummary: "System is in Demo Mode. Set API_KEY environment variable to enable live AI analysis.",
      gapAnalysis: "• Demo Gap 1\n• Demo Gap 2",
      recommendations: "• Demo Recommendation 1"
    };
  }

  // Use the local apiKey variable which TS knows is now a string
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    You are a Senior Facility Management Consultant specializing in ISO 41001.
    Analyze the following diagnostic results for "${record.organization}".
    
    Scores (0-100):
    - Overall: ${record.aiMaturityScore} (${record.aiMaturityLevel})
    - Planning (Cl. 6): ${record.clause6Score}
    - Support (Cl. 7): ${record.clause7Score}
    - Operation (Cl. 8): ${record.clause8Score}
    - Performance (Cl. 9): ${record.clause9Score}

    Provide a JSON response with concise, punchy content:
    1. executiveSummary: A 2-sentence holistic summary.
    2. gapAnalysis: A concise list of the top 3 specific gaps/weaknesses found in the clauses.
    3. recommendations: 3 specific, actionable, short strategic steps. Do not write long paragraphs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            gapAnalysis: { type: Type.STRING },
            recommendations: { type: Type.STRING }
          },
          required: ["executiveSummary", "gapAnalysis", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      executiveSummary: "Unable to generate real-time analysis at this moment.",
      gapAnalysis: "• Review Planning phase\n• Check Support documentation",
      recommendations: "• Contact support for manual review"
    };
  }
};