declare var process: any;

import { MaturityRecord } from '../types';

const cleanGasUrl = (url: string | undefined): string => {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
  if (!cleaned.endsWith('/exec')) cleaned += '/exec';
  return cleaned;
};

const GAS_API_URL = cleanGasUrl(process.env.VITE_GOOGLE_SCRIPT_URL);

export const fetchRecordById = async (id: string): Promise<MaturityRecord | null> => {
  if (id === 'DEMO') return fetchDemoRecord();

  if (!GAS_API_URL || GAS_API_URL === '/exec') {
    throw new Error("ENDPOINT_NOT_CONFIGURED|The dashboard connection URL is missing in the system environment.");
  }

  try {
    const fetchUrl = `${GAS_API_URL}?id=${id.toUpperCase().trim()}`;
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`SERVER_RESPONSE_FAILURE|Database returned code ${response.status}.`);
    }

    const text = await response.text();
    
    // DETECT GOOGLE AUTH REDIRECT (Returns HTML instead of JSON)
    if (text.includes('<!DOCTYPE html>') || text.includes('google-signin') || text.includes('ServiceLogin')) {
      throw new Error("AUTHENTICATION_REQUIRED|The Google Script is restricted. It MUST be deployed with access: 'Anyone'.");
    }

    try {
      const data = JSON.parse(text);
      if (data.error) {
        if (data.error === "NOT_FOUND") return null;
        throw new Error(`SCRIPT_EXECUTION_ERROR|${data.error}`);
      }
      return data as MaturityRecord;
    } catch (parseErr) {
      console.error("[RAW RESPONSE]", text.substring(0, 100));
      throw new Error("DATA_FORMAT_ERROR|Received an invalid response format from the diagnostic engine.");
    }

  } catch (error: any) {
    if (error.message.includes('|')) throw error;
    if (error.message === 'Failed to fetch') {
      throw new Error(`CONNECTION_BLOCKED|The request was blocked. Ensure the Web App URL is correct and includes /exec.`);
    }
    throw new Error(`INTERNAL_ERROR|${error.message}`);
  }
};

export const fetchDemoRecord = async (): Promise<MaturityRecord> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    id: 'DEMO',
    respondentName: 'Global Manager',
    respondentEmail: 'demo@isofmacademy.ng',
    organization: 'International FM Solutions',
    submissionDate: new Date().toLocaleDateString(),
    aiMaturityScore: 72,
    aiMaturityLevel: 'Intermediate',
    clause6Score: 65,
    clause7Score: 78,
    clause8Score: 82,
    clause9Score: 60
  };
};