declare var process: any;

import { GoogleGenAI, Type } from "@google/genai";
import { MaturityRecord, AnalysisResult } from "../types";

export const generateAnalysis = async (record: MaturityRecord): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("No API Key found. Returning mock analysis.");
    return {
      executiveSummary: "System is in Demo Mode. Set API_KEY environment variable to enable live AI analysis.",
      gapAnalysis: "• Demo Gap 1: Strategic planning alignment\n• Demo Gap 2: Operational control documentation",
      recommendations: "• Demo Recommendation 1: Perform internal audit"
    };
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    You are a Senior Facility Management Consultant and ISO 41001 Lead Auditor.
    Analyze the maturity diagnostic for "${record.organization}".
    
    Diagnostic Profile (0-100 scale):
    - Overall Maturity: ${record.aiMaturityScore} (${record.aiMaturityLevel})
    - Clause 6 (Planning): ${record.clause6Score}
    - Clause 7 (Support): ${record.clause7Score}
    - Clause 8 (Operation): ${record.clause8Score}
    - Clause 9 (Performance): ${record.clause9Score}

    Provide a professional JSON assessment:
    1. executiveSummary: 2-sentence strategic overview.
    2. gapAnalysis: Top 3 specific ISO 41001 gaps identified.
    3. recommendations: 3 high-impact, short-term strategic actions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    if (!text) throw new Error("Empty AI response");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      executiveSummary: "Real-time analysis is temporarily unavailable. Please refer to the numeric scores above.",
      gapAnalysis: "• Data processing delay\n• Framework alignment pending",
      recommendations: "• Refresh the dashboard in a few minutes\n• Contact ISO FM Academy for manual review"
    };
  }
};