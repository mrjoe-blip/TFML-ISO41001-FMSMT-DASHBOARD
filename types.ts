export interface MaturityRecord {
  id: string;
  respondentName: string;
  respondentEmail: string;
  organization: string;
  submissionDate: string;
  
  // Numeric Columns (CJ - CO)
  aiMaturityScore: number; // CJ
  aiMaturityLevel: string; // CK
  clause6Score: number;    // CL - Planning
  clause7Score: number;    // CM - Support
  clause8Score: number;    // CN - Operation
  clause9Score: number;    // CO - Performance
}

export interface AnalysisResult {
  executiveSummary: string;
  gapAnalysis: string;
  recommendations: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  NOT_FOUND = 'NOT_FOUND'
}