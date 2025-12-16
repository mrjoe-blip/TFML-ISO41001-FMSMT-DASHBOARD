/// <reference types="vite/client" />
import { MaturityRecord } from '../types';

// Use import.meta.env for Vite-native environment variables
const GAS_API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  // If no URL is configured, or if requesting the specific demo user, return mock data.
  if (!GAS_API_URL || id === 'user_1') {
    if (id !== 'user_1') {
      console.warn("VITE_GOOGLE_SCRIPT_URL not set. Using mock data.");
    }
    return fetchDemoRecord();
  }

  try {
    const response = await fetch(`${GAS_API_URL}?id=${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        const text = await response.text();
        if (text.includes("DEPLOYMENT_NOT_FOUND") || text.includes("Google Drive")) {
           throw new Error("DEPLOYMENT_CONFIG_ERROR");
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Received non-JSON response:", text);
      throw new Error("INVALID_RESPONSE");
    }

    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error);
      return null;
    }

    return data as MaturityRecord;
  } catch (error) {
    console.error("Data Fetch Error:", error);
    // If the fetch fails (e.g., network error, CORS, bad URL), 
    // propagate it so the UI can show the System Error state.
    throw error;
  }
};

export const fetchDemoRecord = async (): Promise<MaturityRecord> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
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