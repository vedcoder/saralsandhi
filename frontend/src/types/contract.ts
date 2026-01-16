export type Language = 'english' | 'hindi' | 'bengali';

export type DetectedLanguage = 'english' | 'hindi' | 'bengali' | 'english_complex';

export type RiskScore = 'high' | 'medium' | 'low' | 'safe';

export type ContractStatus = 'pending_review' | 'reviewed' | 'archived';

export interface Clause {
  clause_id: number;
  original_text: string;
  simplified_text: string;
}

export interface Translation {
  clause_id: number;
  translated_text: string;
}

export interface Risk {
  clause_id: number;
  risk_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface ContractAnalysis {
  success: boolean;
  contract_id: string;
  clauses: Clause[];
  translations: {
    hindi: Translation[];
    bengali: Translation[];
  };
  risks: Risk[];
  risk_summary: string;
  error?: string;
}

export interface ContractListItem {
  id: string;
  filename: string;
  detected_language: DetectedLanguage;
  risk_score: RiskScore;
  status: ContractStatus;
  created_at: string;
}

export interface ContractListResponse {
  contracts: ContractListItem[];
  total: number;
  limit: number;
  offset: number;
}
