
export enum Severity {
  CRITICAL = 'CRITICAL',
  RISK = 'RISK',
  SAFE = 'SAFE'
}

export enum RiskCategory {
  FINANCIAL = 'FINANCIAL',    // Penalități, Prețuri
  TERMINATION = 'TERMINATION', // Reziliere, Preaviz
  LIABILITY = 'LIABILITY',    // Răspundere, Garanții
  GDPR = 'GDPR',              // Date personale
  OTHER = 'OTHER'             // Altele
}

export interface Finding {
  text: string;
  issue: string;
  explanation: string;
  recommendation: string; // New field for actionable advice
  severity: Severity;
  category?: RiskCategory; // Optional to support legacy history items
  lawReference?: string;
}

export interface WebSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  contractHighlights: string[]; // List of factual key points extracted from the contract
  findings: Finding[];
  sources?: WebSource[]; // List of official sources verified during analysis
}

export interface AnalysisState {
  isLoading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  dateLabel: string;
  result: AnalysisResult;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
