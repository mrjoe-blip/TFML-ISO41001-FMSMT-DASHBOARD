declare var process: any;

import { MaturityRecord } from '../types';

const GAS_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  const apiUrl = GAS_API_URL;

  if (!apiUrl || id === 'DEMO') {
    return fetchDemoRecord();
  }

  if (!apiUrl.includes('/exec')) {
    console.error("Configuration Error: Google Script URL must end in '/exec'.");
    throw new Error("DEPLOYMENT_CONFIG_ERROR");
  }

  try {
    const sanitizedId = id.toUpperCase().trim();
    const fetchUrl = `${apiUrl}?id=${sanitizedId}`;
    
    // Using redirect: 'follow' is mandatory for Google Script web apps
    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow'
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const text = await response.text();
    
    // Detect HTML responses which indicate a redirect to a login page (Permission Error)
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('accounts.google.com')) {
      throw new Error("PERMISSION_ERROR");
    }

    const data = JSON.parse(text);

    if (data.error) {
      if (data.error === "Record not found") return null;
      throw new Error(data.error);
    }

    return data as MaturityRecord;

  } catch (error: any) {
    console.error("Data Fetch Error:", error);
    throw error;
  }
};

export const fetchDemoRecord = async (): Promise<MaturityRecord> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    id: 'DEMO',
    respondentName: 'Sample Leader',
    respondentEmail: 'demo@isofmacademy.ng',
    organization: 'Example Facilities Group',
    submissionDate: new Date().toLocaleDateString(),
    aiMaturityScore: 78,
    aiMaturityLevel: 'Optimized',
    clause6Score: 82,
    clause7Score: 75,
    clause8Score: 85,
    clause9Score: 70
  };
};