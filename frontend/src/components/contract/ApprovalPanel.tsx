'use client';

import { useState } from 'react';
import { ContractApprovalStatus, ContractParty } from '@/types/contract';
import { approveContract, removeSecondParty } from '@/lib/api';
import { ApprovalBadge } from './ApprovalBadge';
import { AddSecondPartyModal } from './AddSecondPartyModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ApprovalPanelProps {
  contractId: string;
  approvalStatus: ContractApprovalStatus;
  onStatusChange: (status: ContractApprovalStatus) => void;
}

// Blockchain verification loading modal
function BlockchainVerificationModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Blockchain animation */}
        <div className="mb-6">
          <div className="relative w-24 h-24 mx-auto">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-spin" style={{ borderTopColor: '#4f46e5' }} />
            {/* Inner blockchain icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text content */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Storing on Blockchain
        </h3>
        <p className="text-gray-600 mb-4">
          Your contract is being verified and stored on the Ethereum Sepolia blockchain for immutable proof.
        </p>

        {/* Progress steps */}
        <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Both parties approved</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Generating document hash</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span className="text-sm text-gray-700 font-medium">Submitting to blockchain...</span>
          </div>
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-500">Waiting for confirmation</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This may take up to a minute. Please don't close this page.
        </p>
      </div>
    </div>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}

export function ApprovalPanel({ contractId, approvalStatus, onStatusChange }: ApprovalPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBlockchainVerifying, setIsBlockchainVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this approval will trigger blockchain verification
  // This happens when: approving (not rejecting), there's a second party,
  // and the other party has already approved
  const willTriggerBlockchain = (approved: boolean) => {
    if (!approved) return false;
    if (!approvalStatus.second_party) return false;

    const isFirstParty = approvalStatus.first_party?.user_id !== approvalStatus.second_party?.user_id;
    const otherPartyStatus = isFirstParty
      ? approvalStatus.second_party?.approval_status
      : approvalStatus.first_party?.approval_status;

    return otherPartyStatus === 'approved';
  };

  const handleApprove = async (approved: boolean) => {
    setError(null);
    setIsApproving(true);

    // Show blockchain modal if this will finalize the contract
    const showBlockchainModal = willTriggerBlockchain(approved);
    if (showBlockchainModal) {
      setIsBlockchainVerifying(true);
    }

    try {
      const newStatus = await approveContract(contractId, approved);
      onStatusChange(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    } finally {
      setIsApproving(false);
      setIsBlockchainVerifying(false);
    }
  };

  const handleRemoveSecondParty = async () => {
    setError(null);
    setIsRemoving(true);
    try {
      await removeSecondParty(contractId);
      onStatusChange({
        ...approvalStatus,
        second_party: null,
        overall_status: 'awaiting_second_party',
        can_approve: true,
      });
      setIsRemoveModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove second party');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSecondPartyAdded = (party: ContractParty) => {
    onStatusChange({
      ...approvalStatus,
      second_party: party,
      overall_status: 'pending',
    });
  };

  // Helper to get display name (first name only for compactness)
  const getDisplayName = (party: ContractParty | null | undefined) => {
    if (!party) return 'Unknown';
    if (party.user_name) {
      return party.user_name.split(' ')[0]; // First name only
    }
    return party.user_email?.split('@')[0] || 'Unknown';
  };

  // If second party exists, show their name with greyed out button style
  if (approvalStatus.second_party) {
    const secondPartyName = approvalStatus.second_party.user_name || approvalStatus.second_party.user_email;
    const firstPartyDisplayName = getDisplayName(approvalStatus.first_party);
    const secondPartyDisplayName = getDisplayName(approvalStatus.second_party);

    return (
      <>
      <BlockchainVerificationModal isOpen={isBlockchainVerifying} />
      <div className="flex items-center gap-3">
        {/* Second Party indicator - greyed out button style */}
        <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-lg cursor-default">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{secondPartyName}</span>
          {approvalStatus.is_owner && (
            <button
              onClick={() => setIsRemoveModalOpen(true)}
              className="ml-1 p-0.5 text-gray-400 hover:text-red-600 transition-colors"
              title="Remove second party"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status indicator with names */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          {/* First Party (Owner) */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <CrownIcon className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs text-gray-600 font-medium">{firstPartyDisplayName}:</span>
            </div>
            <ApprovalBadge
              status={approvalStatus.first_party?.approval_status || 'pending'}
              size="sm"
            />
          </div>
          <div className="w-px h-4 bg-gray-300" />
          {/* Second Party */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600 font-medium">{secondPartyDisplayName}:</span>
            <ApprovalBadge
              status={approvalStatus.second_party.approval_status}
              size="sm"
            />
          </div>
        </div>

        {/* Action buttons */}
        {approvalStatus.can_approve && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApprove(true)}
              disabled={isApproving}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isApproving ? '...' : 'Approve'}
            </button>
            <button
              onClick={() => handleApprove(false)}
              disabled={isApproving}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isApproving ? '...' : 'Reject'}
            </button>
          </div>
        )}

        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}

        {/* Remove Confirmation Modal */}
        <ConfirmModal
          isOpen={isRemoveModalOpen}
          onClose={() => setIsRemoveModalOpen(false)}
          onConfirm={handleRemoveSecondParty}
          title="Remove Second Party"
          message={`Are you sure you want to remove ${secondPartyName} from this contract? They will no longer have access to view or approve it.`}
          confirmText="Remove"
          variant="danger"
          isLoading={isRemoving}
        />
      </div>
      </>
    );
  }

  // If no second party yet and user is owner, show "Add Second Party" button
  if (approvalStatus.is_owner) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Second Party
        </button>
        <AddSecondPartyModal
          contractId={contractId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSecondPartyAdded}
        />
      </>
    );
  }

  // Second party viewing (not owner, no second party - shouldn't happen normally)
  return null;
}
