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
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (approved: boolean) => {
    setError(null);
    setIsApproving(true);
    try {
      const newStatus = await approveContract(contractId, approved);
      onStatusChange(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit approval');
    } finally {
      setIsApproving(false);
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
