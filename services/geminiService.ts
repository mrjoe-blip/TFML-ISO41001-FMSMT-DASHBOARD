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
    
    Diagnostic Scores (0-100 scale):
    - Overall Maturity: ${record.aiMaturityScore} (${record.aiMaturityLevel})
    - Clause 6 (Planning): ${record.clause6Score}
    - Clause 7 (Support): ${record.clause7Score}
    - Clause 8 (Operation): ${record.clause8Score}
    - Clause 9 (Performance): ${record.clause9Score}

    TASK: Provide a comprehensive high-stakes JSON assessment.
    1. executiveSummary: 2-3 sentence strategic executive-level overview.
    2. gapAnalysis: Identify 5 detailed deficiencies citing exact ISO 41001 clauses (e.g. 6.2, 8.1.1). MUST be high quality. Prefix each with "[GAP] ".
    3. recommendations: Identify 5 high-impact strategic actions to close gaps. Prefix each with "[ACTION] ".
    
    Ensure gaps and actions are formatted for a professional report.
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
      executiveSummary: "Strategic auditing analysis is currently unavailable. Numeric diagnostics remain active above.",
      gapAnalysis: "[GAP] System latency preventing real-time gap extraction.\n[GAP] Comprehensive auditor mapping requires stable connection.",
      recommendations: "[ACTION] Refresh the dashboard to retry analysis.\n[ACTION] Contact ISOFM Academy for a formal human-led audit report."
    };
  }
};