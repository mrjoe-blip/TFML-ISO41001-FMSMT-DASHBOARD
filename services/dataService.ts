import { MaturityRecord } from '../types';

// Use process.env for environment variables as configured in vite.config.ts
const GAS_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  // If no URL is configured, or if requesting the specific demo user, return mock data.
  if (!GAS_API_URL || id === 'DEMO') {
    if (id !== 'DEMO' && (!GAS_API_URL || GAS_API_URL.trim() === '')) {
      console.warn("VITE_GOOGLE_SCRIPT_URL not set. Using mock data.");
    }
    return fetchDemoRecord();
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s for GAS latency

    // CRITICAL FIX: 
    // 1. method: 'GET' is required.
    // 2. credentials: 'omit' prevents the browser from sending cookies, which confuses GAS CORS logic.
    // 3. mode: 'cors' ensures we handle the response headers correctly.
    const response = await fetch(`${GAS_API_URL}?id=${id}`, {
      method: 'GET',
      mode: 'cors', 
      credentials: 'omit',
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
      
      // Check for common Google Auth login page response (implies permission error)
      if (text.includes("<!DOCTYPE html>") || text.includes("accounts.google.com")) {
        console.error("Received HTML instead of JSON. This usually means the Google Script permissions are not set to 'Anyone'.");
        throw new Error("PERMISSION_ERROR");
      }
      
      console.error("Received non-JSON response:", text);
      throw new Error("INVALID_RESPONSE");
    }

    const data = await response.json();

    if (data.error) {
      console.error("API returned logic error:", data.error);
      return null;
    }

    return data as MaturityRecord;
  } catch (error: any) {
    console.error("Data Fetch Error Details:", error);

    // If it is a known configuration or permission error, throw it so the UI shows the specific error message
    // instead of silently falling back to demo mode.
    if (
      error.message === "DEPLOYMENT_CONFIG_ERROR" || 
      error.message === "INVALID_RESPONSE" ||
      error.message === "PERMISSION_ERROR"
    ) {
      throw error;
    }

    // For generic network errors (TypeError: Failed to fetch), we still fall back, 
    // but we log a very specific warning for the developer.
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.warn("CORS ERROR DETECTED: Ensure your Google Script is deployed as 'Anyone' and VITE_GOOGLE_SCRIPT_URL is correct.");
    }

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
    id: 'DEMO',
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