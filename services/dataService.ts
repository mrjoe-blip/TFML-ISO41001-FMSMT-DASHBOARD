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
    throw new Error("CONFIG_MISSING|The Google Script URL is not set in environment variables.");
  }

  try {
    const sanitizedId = id.toUpperCase().trim();
    const fetchUrl = `${GAS_API_URL}?id=${sanitizedId}`;
    
    console.log(`[DEBUG] Fetching: ${fetchUrl}`);

    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP_STATUS_${response.status}|Server returned a ${response.status} status.`);
    }

    const text = await response.text();
    
    // DETECT GOOGLE PERMISSION/LOGIN PAGE (Returns HTML instead of JSON)
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('google-signin') || text.includes('accounts.google.com')) {
      throw new Error("PERMISSION_DENIED|The Google Script is set to 'Only Me' or 'Anyone with Google Account'. It must be 'Anyone'.");
    }

    try {
      const data = JSON.parse(text);
      if (data.error) {
        if (data.error === "RECORD_NOT_FOUND") return null;
        throw new Error(`SCRIPT_ERROR|${data.error}`);
      }
      return data as MaturityRecord;
    } catch (parseErr) {
      // If parsing fails, the script might have crashed and returned a raw error string
      console.error("[DEBUG] Raw response:", text);
      throw new Error("INVALID_JSON|The script returned text that isn't JSON. Check script logs.");
    }

  } catch (error: any) {
    console.error("Fetch Logic Error:", error);
    if (error.message.includes('|')) throw error; // Already formatted
    if (error.message === 'Failed to fetch') {
      throw new Error(`NETWORK_BLOCKED|Check if URL is correct and script is deployed as a Web App: ${GAS_API_URL}`);
    }
    throw new Error(`UNKNOWN_ERROR|${error.message}`);
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