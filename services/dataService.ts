import { MaturityRecord } from '../types';

// The URL comes from the environment variable (Vercel)
const GAS_API_URL = (import.meta as any).env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  // Fallback for development/demo if no API URL is set
  if (!GAS_API_URL || id === 'user_1') {
    if (id === 'user_1') return fetchDemoRecord();
    console.warn("VITE_GOOGLE_SCRIPT_URL not set. Using mock data.");
    return fetchDemoRecord();
  }

  try {
    // Append the ID parameter to the Web App URL
    const response = await fetch(`${GAS_API_URL}?id=${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error);
      return null;
    }

    return data as MaturityRecord;

  } catch (error) {
    console.error("Failed to fetch record:", error);
    return null;
  }
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