declare var process: any; // Fix for TS build error: "Cannot find name 'process'"

import { MaturityRecord } from '../types';

// Use process.env for environment variables as configured in vite.config.ts
const GAS_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  // Local variable to satisfy TypeScript strict null checks
  const apiUrl = GAS_API_URL;

  // If no URL is configured, or if requesting the specific demo user, return mock data.
  if (!apiUrl || id === 'DEMO') {
    if (id !== 'DEMO' && (!apiUrl || apiUrl.trim() === '')) {
      console.warn("VITE_GOOGLE_SCRIPT_URL not set. Using mock data.");
    }
    return fetchDemoRecord();
  }

  // VALIDATION: Check if URL ends in /exec
  if (!apiUrl.includes('/exec')) {
    console.error("Configuration Error: Google Script URL must end in '/exec'. Current URL:", apiUrl);
    throw new Error("DEPLOYMENT_CONFIG_ERROR");
  }

  try {
    const controller = new AbortController();
    // Cast to any to prevent TS error: Type 'Timeout' is not assignable to type 'number'
    const timeoutId: any = setTimeout(() => controller.abort(), 15000); // 15s timeout

    // Request Setup
    // Ensure the ID is uppercase to match the backend logic
    const sanitizedId = id.toUpperCase().trim();
    
    // Add timestamp to prevent caching (Cache Buster)
    const timestamp = new Date().getTime();
    const fetchUrl = `${apiUrl}?id=${sanitizedId}&t=${timestamp}`;
    
    const response = await fetch(fetchUrl, {
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
      // Detect Google Auth HTML response (Permission Error)
      if (text.includes("<!DOCTYPE html>") || text.includes("accounts.google.com") || text.includes("Google Drive")) {
        console.error("Received Google Login HTML instead of JSON. Permissions Error.");
        throw new Error("PERMISSION_ERROR");
      }
      throw new Error("INVALID_RESPONSE");
    }

    const data = await response.json();

    if (data.error) {
      console.error("API returned logic error:", data.error);
      if (data.error === "Record not found") {
        return null; // Triggers "Not Found" UI
      }
      return null;
    }

    return data as MaturityRecord;

  } catch (error: any) {
    console.error("Data Fetch Error Details:", error);

    if (error.message === "DEPLOYMENT_CONFIG_ERROR" || 
        error.message === "INVALID_RESPONSE" ||
        error.message === "PERMISSION_ERROR") {
      throw error;
    }

    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error("CORS Error detected. The script is likely set to 'Only Me' or the URL is wrong.");
      throw new Error("PERMISSION_ERROR");
    }

    if (error.name === 'AbortError') {
       throw new Error("TIMEOUT_ERROR");
    }

    throw error;
  }
};

export const fetchDemoRecord = async (): Promise<MaturityRecord> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  return {
    id: 'DEMO',
    respondentName: 'Demo User',
    respondentEmail: 'demo@example.com',
    organization: 'Demo Organization',
    submissionDate: new Date().toISOString().split('T')[0],
    aiMaturityScore: 72,
    aiMaturityLevel: 'Optimized',
    clause6Score: 65,
    clause7Score: 80,
    clause8Score: 75,
    clause9Score: 60
  };
};