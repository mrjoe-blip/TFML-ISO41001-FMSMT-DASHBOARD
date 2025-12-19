declare var process: any;

import { GoogleGenAI, Type } from "@google/genai";
import { MaturityRecord, AnalysisResult } from "../types";

export const generateAnalysis = async (record: MaturityRecord): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("No API Key found. Returning mock analysis.");
    return {
      executiveSummary: "System is in Demo Mode. Set API_KEY environment variable to enable live AI analysis.",
      gapAnalysis: "• Demo Gap 1: Strategic planning alignment (Cl. 6.1)\n• Demo Gap 2: Operational control documentation (Cl. 8.1)",
      recommendations: "• Demo Recommendation 1: Perform internal audit (Cl. 9.2)"
    };
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    ACT AS A SENIOR ISO 41001 LEAD AUDITOR.
    Analyze the maturity diagnostic for "${record.organization}".
    
    Diagnostic Profile (0-100 scale):
    - Overall Maturity: ${record.aiMaturityScore} (${record.aiMaturityLevel})
    - Clause 6 (Planning): ${record.clause6Score}
    - Clause 7 (Support): ${record.clause7Score}
    - Clause 8 (Operation): ${record.clause8Score}
    - Clause 9 (Performance): ${record.clause9Score}

    Provide a professional Auditor-Grade JSON assessment:
    1. executiveSummary: 2-3 sentence high-level strategic overview of the current status.
    2. gapAnalysis: Top 5 specific ISO 41001 gaps identified based on the scores. Cite exact clauses (e.g. 6.1, 8.1).
    3. recommendations: 5 high-impact, actionable strategic recommendations.
    
    Ensure gaps are formatted with "[GAP]" and recommendations with "[ACTION]".
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
      executiveSummary: "Real-time auditing analysis is temporarily unavailable. Numeric diagnostics are still active above.",
      gapAnalysis: "[GAP] System latency preventing real-time gap extraction.\n[GAP] ISO 41001 clause mapping in progress.",
      recommendations: "[ACTION] Refresh the dashboard in a few moments.\n[ACTION] Contact ISOFM Academy for a manual expert review."
    };
  }
};