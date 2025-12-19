declare var process: any;

import { MaturityRecord } from '../types';

const GAS_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  const apiUrl = GAS_API_URL;

  if (!apiUrl || id === 'DEMO') {
    return fetchDemoRecord();
  }

  // Ensure URL is correctly formatted for a Web App
  if (!apiUrl.includes('/exec')) {
    console.error("Configuration Error: Google Script URL must end in '/exec'.");
    throw new Error("DEPLOYMENT_CONFIG_ERROR");
  }

  try {
    const sanitizedId = id.toUpperCase().trim();
    const fetchUrl = `${apiUrl}?id=${sanitizedId}`;
    
    // Using redirect: 'follow' is mandatory for Google Script web apps
    // Also using cache: 'no-store' to ensure we get fresh data
    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    
    // Detect HTML responses which indicate a redirect to a login page (Permission Error)
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('accounts.google.com')) {
      console.error("Permission/Deployment Error: Received HTML instead of JSON. Ensure script is deployed as 'Anyone'.");
      throw new Error("PERMISSION_ERROR");
    }

    try {
      const data = JSON.parse(text);
      if (data.error) {
        if (data.error === "Record not found") return null;
        throw new Error(data.error);
      }
      return data as MaturityRecord;
    } catch (parseErr) {
      console.error("JSON Parse Error:", text);
      throw new Error("Invalid response format from server.");
    }

  } catch (error: any) {
    console.error("Data Fetch Error:", error);
    if (error.message === 'Failed to fetch') {
      throw new Error("NETWORK_ERROR");
    }
    throw error;
  }
};

export const fetchDemoRecord = async (): Promise<MaturityRecord> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    id: 'DEMO',
    respondentName: 'Strategic Manager',
    respondentEmail: 'demo@isofmacademy.ng',
    organization: 'Global FM Solutions Ltd',
    submissionDate: new Date().toLocaleDateString(),
    aiMaturityScore: 78,
    aiMaturityLevel: 'Optimized',
    clause6Score: 82,
    clause7Score: 75,
    clause8Score: 85,
    clause9Score: 70
  };
};