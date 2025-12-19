declare var process: any;

import { MaturityRecord } from '../types';

/**
 * CLEAN_URL: Attempts to fix common mistakes like missing /exec or trailing slashes.
 */
const cleanGasUrl = (url: string | undefined): string => {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
  if (!cleaned.endsWith('/exec')) cleaned += '/exec';
  return cleaned;
};

const RAW_API_URL = process.env.VITE_GOOGLE_SCRIPT_URL;
const GAS_API_URL = cleanGasUrl(RAW_API_URL);

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  if (id === 'DEMO') return fetchDemoRecord();

  if (!GAS_API_URL || GAS_API_URL === '/exec') {
    console.error("Configuration Error: VITE_GOOGLE_SCRIPT_URL is missing.");
    throw new Error("DEPLOYMENT_CONFIG_ERROR");
  }

  try {
    const sanitizedId = id.toUpperCase().trim();
    const fetchUrl = `${GAS_API_URL}?id=${sanitizedId}`;
    
    console.log(`[DEBUG] Attempting fetch from: ${fetchUrl}`);

    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('accounts.google.com')) {
      console.error(`[DEBUG] Permission Error. Fetch URL was: ${fetchUrl}`);
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
      console.error("[DEBUG] JSON Parse Error. Raw text start:", text.substring(0, 100));
      throw new Error("Invalid response format from server.");
    }

  } catch (error: any) {
    console.error("Data Fetch Error:", error);
    if (error.message === 'Failed to fetch') {
      // Return more context about the current URL to the UI error handler
      throw new Error(`NETWORK_ERROR|URL:${GAS_API_URL}`);
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