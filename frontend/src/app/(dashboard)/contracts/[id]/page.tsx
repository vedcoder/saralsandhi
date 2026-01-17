'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useContract } from '@/hooks/useContract';
import { ContractPanel } from '@/components/ContractPanel';
import { DecoderPanel } from '@/components/DecoderPanel';
import { ApprovalPanel } from '@/components/contract/ApprovalPanel';
import { AuditTrailModal } from '@/components/contract/AuditTrailModal';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  const contract = useContract(contractId);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);

  if (contract.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (contract.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Error loading contract</h2>
          <p className="text-gray-500 mb-4">{contract.error}</p>
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!contract.analysis) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 flex-shrink-0 h-[73px]">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                The Decoder Workbench
              </h1>
              <p className="text-sm text-gray-500">SaralSandhi - Contract Analysis Made Simple</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content - Split Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Original Contract */}
        <div className="w-[55%] border-r border-gray-200 flex flex-col bg-white">
          {/* Contract Actions Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Approval Panel */}
              {contract.approvalStatus && (
                <ApprovalPanel
                  contractId={contractId}
                  approvalStatus={contract.approvalStatus}
                  onStatusChange={contract.setApprovalStatus}
                />
              )}
            </div>
            {/* Audit Trail Button */}
            <button
              onClick={() => setIsAuditTrailOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Audit Trail
            </button>
          </div>
          {/* Contract Content */}
          <div className="flex-1 overflow-y-auto">
            <ContractPanel
              clauses={contract.analysis.clauses}
              selectedClauseId={contract.selectedClauseId}
              onClauseSelect={contract.setSelectedClauseId}
              risks={contract.analysis.risks}
            />
          </div>
        </div>

        {/* Right Panel - AI Decoder */}
        <div className="w-[45%] overflow-hidden bg-gray-50">
          <DecoderPanel
            selectedClause={contract.getSelectedClause()}
            simplifiedText={contract.selectedClauseId
              ? contract.getTranslationForClause(contract.selectedClauseId)
              : ''}
            risks={contract.selectedClauseId
              ? contract.getRisksForClause(contract.selectedClauseId)
              : []}
            selectedLanguage={contract.selectedLanguage}
            onLanguageChange={contract.setSelectedLanguage}
            riskSummary={contract.analysis.risk_summary}
            contractId={contractId}
            allClauses={contract.analysis.clauses}
            allRisks={contract.analysis.risks}
            translations={contract.analysis.translations}
          />
        </div>
      </div>

      {/* Audit Trail Modal */}
      <AuditTrailModal
        contractId={contractId}
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
      />
    </div>
  );
}
