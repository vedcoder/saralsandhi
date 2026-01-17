export type Language = 'english' | 'hindi' | 'bengali';

export type DetectedLanguage = 'english' | 'hindi' | 'bengali' | 'english_complex';

export type RiskScore = 'high' | 'medium' | 'low' | 'safe';

export type ContractStatus = 'pending_review' | 'reviewed' | 'archived' | 'approved' | 'rejected';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PartyRole = 'first_party' | 'second_party';

export type ContractCategory =
  | 'employment'
  | 'rental'
  | 'nda'
  | 'service'
  | 'sales'
  | 'partnership'
  | 'loan'
  | 'insurance'
  | 'other';

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
  category: ContractCategory | null;
  expiry_date: string | null;
  is_owner: boolean;
  my_approval_status: ApprovalStatus | null;
  other_party_approval_status: ApprovalStatus | null;
  has_second_party: boolean;
  blockchain_hash: string | null;
  blockchain_tx_hash: string | null;
  finalized_at: string | null;
}

export interface ContractParty {
  id: string;
  user_id: string;
  role: PartyRole;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  user_name: string | null;
  user_email: string | null;
}

export interface ContractApprovalStatus {
  first_party: ContractParty | null;
  second_party: ContractParty | null;
  overall_status: string;
  is_owner: boolean;
  can_approve: boolean;
}

export interface ContractListResponse {
  contracts: ContractListItem[];
  total: number;
  limit: number;
  offset: number;
}

// Audit Trail types
export type EventType =
  | 'document_uploaded'
  | 'ai_analysis_completed'
  | 'translation_viewed'
  | 'first_party_approved'
  | 'first_party_rejected'
  | 'second_party_added'
  | 'second_party_removed'
  | 'second_party_approved'
  | 'second_party_rejected'
  | 'contract_finalized'
  | 'blockchain_verified';

export interface ContractEvent {
  id: string;
  event_type: EventType;
  description: string;
  event_metadata: string | null;
  user_name: string | null;
  created_at: string;
}

export interface AuditTrailResponse {
  contract_id: string;
  events: ContractEvent[];
  blockchain_hash: string | null;
  blockchain_tx_hash: string | null;
}
