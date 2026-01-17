'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContractListItem } from '@/types/contract';
import Badge from '@/components/ui/Badge';
import { ApprovalBadge } from '@/components/contract/ApprovalBadge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ContractDetailsModal } from '@/components/contract/ContractDetailsModal';

interface ContractRowProps {
  contract: ContractListItem;
  onDelete?: (contractId: string) => Promise<boolean>;
  onUpdate?: (updatedContract: ContractListItem) => void;
}

function PDFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 3v5a1 1 0 001 1h5" />
      <text x="7" y="17" fontSize="5" fontWeight="bold" fill="currentColor" stroke="none">PDF</text>
    </svg>
  );
}

export default function ContractRow({ contract, onDelete, onUpdate }: ContractRowProps) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [localContract, setLocalContract] = useState(contract);

  const handleRowClick = () => {
    router.push(`/contracts/${localContract.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDetailsModalOpen(true);
  };

  const handleContractUpdate = (updatedContract: ContractListItem) => {
    setLocalContract(updatedContract);
    onUpdate?.(updatedContract);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    const success = await onDelete(contract.id);
    setIsDeleting(false);
    if (success) {
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <div
        onClick={handleRowClick}
        className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 group cursor-pointer"
      >
        <div className="w-10 flex-shrink-0 mr-4">
          <PDFIcon className="w-10 h-10 text-red-500" />
        </div>

        <div className="flex-1 min-w-0 mr-4">
          <p className="text-sm font-medium text-gray-900 truncate">
            {localContract.filename}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {!localContract.is_owner && (
              <span className="text-xs text-indigo-600">Shared with you</span>
            )}
            {localContract.category && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded capitalize">
                {localContract.category.replace('_', ' ')}
              </span>
            )}
            {localContract.expiry_date && (
              <span className={`text-xs ${
                new Date(localContract.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ? 'text-red-600 font-medium'
                  : 'text-gray-500'
              }`}>
                Expires: {new Date(localContract.expiry_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="w-36 flex-shrink-0 mr-4">
          <Badge variant="language" value={localContract.detected_language} />
        </div>

        <div className="w-24 flex-shrink-0 mr-4">
          <Badge variant="risk" value={localContract.risk_score} />
        </div>

        <div className="w-52 flex-shrink-0 mr-4">
          {localContract.has_second_party ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">You:</span>
                <ApprovalBadge status={localContract.my_approval_status || 'pending'} size="sm" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Other:</span>
                <ApprovalBadge status={localContract.other_party_approval_status || 'pending'} size="sm" />
              </div>
            </div>
          ) : localContract.is_owner ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Add second party</span>
            </div>
          ) : (
            <Badge variant="status" value={localContract.status} />
          )}
        </div>

        {/* Blockchain Verified Badge */}
        <div className="w-28 flex-shrink-0">
          {localContract.blockchain_tx_hash ? (
            <a
              href={`https://sepolia.etherscan.io/tx/${localContract.blockchain_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>On-Chain</span>
            </a>
          ) : localContract.blockchain_hash ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Hash Only</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Not finalized</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-20 flex-shrink-0 ml-4 flex items-center gap-1">
          {localContract.is_owner && (
            <>
              <button
                onClick={handleEditClick}
                className="p-2 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-indigo-50"
                title="Edit details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                  title="Delete contract"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Contract"
        message={`Are you sure you want to delete "${localContract.filename}"? This action cannot be undone and will remove all associated data including any party approvals.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Contract Details Modal */}
      <ContractDetailsModal
        contract={localContract}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onUpdate={handleContractUpdate}
      />
    </>
  );
}
