import { MaturityRecord } from '../types';

// The URL comes from the environment variable (Vercel)
const GAS_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  // Fallback for development/demo if no API URL is set
  if (!GAS_API_URL || id === 'user_1') {
    if (id === 'user_1') return fetchDemoRecord();
    console.warn("VITE_GOOGLE_SCRIPT_URL not set. Using mock data.");
    return fetchDemoRecord();
  }

  // We do NOT use a try-catch here so that network/server errors propagate to the UI
  // causing the 'System Error' state rather than 'Report Not Found'.
  
  // Append the ID parameter to the Web App URL
  const response = await fetch(`${GAS_API_URL}?id=${id}`);
  
  if (!response.ok) {
    // Check if it's the specific Google Script Deployment error
    if (response.status === 404) {
      const text = await response.text();
      if (text.includes("DEPLOYMENT_NOT_FOUND") || text.includes("Google Drive")) {
         throw new Error("DEPLOYMENT_CONFIG_ERROR: The Google Script Deployment URL is invalid or deleted. Please check VITE_GOOGLE_SCRIPT_URL.");
      }
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    // This handles the case where Google returns an HTML error page (like 404) with a 200 OK status (rare but possible with some redirects)
    // or if the script crashes and returns HTML error info.
    const text = await response.text();
    console.error("Received non-JSON response:", text);
    throw new Error("INVALID_RESPONSE: Received HTML instead of JSON. Check the API URL.");
  }

  const data = await response.json();

  if (data.error) {
    // If the API explicitly returns an error (like "ID not found"), log it
    console.error("API Error:", data.error);
    // Return null to signify "Record not found" logic
    return null;
  }

  return data as MaturityRecord;
};

export const fetchDemoRecord = async (): Promise<MaturityRecord> => {
  // Keep the demo record for the landing page or fallbacks
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id: 'user_1',
    respondentName: 'Demo User',
    respondentEmail: 'demo@example.com',
    organization: 'Demo Organization',
    submissionDate: new Date().toISOString().split('T')[0],
    aiMaturityScore: 72,
    aiMaturityLevel: 'Defined',
    clause6Score: 65,
    clause7Score: 80,
    clause8Score: 75,
    clause9Score: 60
  };
};