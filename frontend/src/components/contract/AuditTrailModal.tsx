'use client';

import { useEffect, useState } from 'react';
import { AuditTrailResponse, ContractEvent, EventType } from '@/types/contract';
import { getAuditTrail } from '@/lib/api';

interface AuditTrailModalProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Icon components for different event types
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ViewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RejectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserAddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function UserRemoveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function getEventIcon(eventType: EventType) {
  switch (eventType) {
    case 'document_uploaded':
      return UploadIcon;
    case 'ai_analysis_completed':
      return AIIcon;
    case 'translation_viewed':
      return ViewIcon;
    case 'first_party_approved':
    case 'second_party_approved':
    case 'contract_finalized':
      return CheckIcon;
    case 'first_party_rejected':
    case 'second_party_rejected':
      return RejectIcon;
    case 'second_party_added':
      return UserAddIcon;
    case 'second_party_removed':
      return UserRemoveIcon;
    case 'blockchain_verified':
      return ShieldCheckIcon;
    default:
      return CheckIcon;
  }
}

function getEventColor(eventType: EventType): string {
  switch (eventType) {
    case 'first_party_rejected':
    case 'second_party_rejected':
      return 'text-red-500 bg-red-50 border-red-200';
    case 'contract_finalized':
    case 'blockchain_verified':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'first_party_approved':
    case 'second_party_approved':
      return 'text-green-500 bg-green-50 border-green-200';
    default:
      return 'text-green-500 bg-green-50 border-green-200';
  }
}

function formatEventTitle(event: ContractEvent): string {
  switch (event.event_type) {
    case 'document_uploaded':
      return 'Document Uploaded';
    case 'ai_analysis_completed':
      return 'AI Simplification & Risk Scan';
    case 'translation_viewed':
      return event.description;
    case 'first_party_approved':
      return `First Party Approved${event.user_name ? ` (${event.user_name})` : ''}`;
    case 'first_party_rejected':
      return `First Party Rejected${event.user_name ? ` (${event.user_name})` : ''}`;
    case 'second_party_added':
      return 'Second Party Added';
    case 'second_party_removed':
      return 'Second Party Removed';
    case 'second_party_approved':
      return `Second Party Approved${event.user_name ? ` (${event.user_name})` : ''}`;
    case 'second_party_rejected':
      return `Second Party Rejected${event.user_name ? ` (${event.user_name})` : ''}`;
    case 'contract_finalized':
      return 'Contract Finalized';
    case 'blockchain_verified':
      return 'Blockchain Verified';
    default:
      return event.description;
  }
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function AuditTrailModal({ contractId, isOpen, onClose }: AuditTrailModalProps) {
  const [auditData, setAuditData] = useState<AuditTrailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAuditTrail();
    }
  }, [isOpen, contractId]);

  async function fetchAuditTrail() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAuditTrail(contractId);
      setAuditData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Audit Trail
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchAuditTrail}
                  className="mt-4 text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : !auditData || auditData.events.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500">No events recorded yet.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

                {/* Events */}
                <div className="space-y-5">
                  {auditData.events
                    .filter(e => e.event_type !== 'blockchain_verified')
                    .map((event) => {
                      const Icon = getEventIcon(event.event_type);
                      const colorClass = getEventColor(event.event_type);

                      return (
                        <div key={event.id} className="relative flex items-start gap-4">
                          {/* Icon */}
                          <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 pt-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {formatEventTitle(event)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(event.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Blockchain Verified Section */}
                {auditData.blockchain_hash && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center flex-shrink-0">
                        <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-green-800">
                          {auditData.blockchain_tx_hash ? 'On-Chain Verified' : 'Hash Generated'}
                        </p>
                        <div className="mt-2 space-y-1.5">
                          <div>
                            <p className="text-xs text-green-700 font-medium">Document Hash</p>
                            <p className="text-xs text-green-600 font-mono break-all">
                              {auditData.blockchain_hash}
                            </p>
                          </div>
                          {auditData.blockchain_tx_hash && (
                            <div>
                              <p className="text-xs text-green-700 font-medium">Transaction Hash</p>
                              <p className="text-xs text-green-600 font-mono break-all">
                                {auditData.blockchain_tx_hash}
                              </p>
                            </div>
                          )}
                        </div>
                        {auditData.blockchain_tx_hash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${auditData.blockchain_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View on Etherscan
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
