import { MaturityRecord } from '../types';

// Use process.env for environment variables as configured in vite.config.ts
const GAS_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  // If no URL is configured, or if requesting the specific demo user, return mock data.
  if (!GAS_API_URL || id === 'user_1') {
    if (id !== 'user_1' && (!GAS_API_URL || GAS_API_URL.trim() === '')) {
      console.warn("VITE_GOOGLE_SCRIPT_URL not set. Using mock data.");
    }
    return fetchDemoRecord();
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${GAS_API_URL}?id=${id}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("DEPLOYMENT_CONFIG_ERROR");
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
  } catch (error: any) {
    console.error("Data Fetch Error:", error);

    // If it's a configuration error or invalid response, we might want to let the UI handle it strictly.
    // However, for generic network/CORS errors, fallback to demo is better UX than a crash.
    if (error.message === "DEPLOYMENT_CONFIG_ERROR" || error.message === "INVALID_RESPONSE") {
      throw error;
    }

    // For network errors, timeouts, or unknown issues, fallback to demo data to keep app alive.
    console.warn("Connection failed. Falling back to Demo Data.");
    const demoData = await fetchDemoRecord();
    return {
      ...demoData,
      respondentName: "Demo (Offline/Fallback)",
      organization: "Connection Failed - Demo Mode"
    };
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