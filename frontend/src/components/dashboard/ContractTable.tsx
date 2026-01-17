'use client';

import { ContractListItem } from '@/types/contract';
import ContractRow from './ContractRow';

interface ContractTableProps {
  contracts: ContractListItem[];
  isLoading: boolean;
  onDelete?: (contractId: string) => Promise<boolean>;
}

export default function ContractTable({ contracts, isLoading, onDelete }: ContractTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-sm text-gray-500">Loading contracts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No contracts found</h3>
            <p className="text-sm text-gray-500">Upload a contract to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="w-10 flex-shrink-0 mr-4"></div>
        <div className="flex-1 mr-4">Contract Name</div>
        <div className="w-36 flex-shrink-0 mr-4">Detected Language</div>
        <div className="w-24 flex-shrink-0 mr-4">Risk Score</div>
        <div className="w-52 flex-shrink-0 mr-4">Status</div>
        <div className="w-28 flex-shrink-0">Verification</div>
        <div className="w-20 flex-shrink-0 ml-4">Actions</div>
      </div>

      <div className="divide-y divide-gray-100">
        {contracts.map((contract) => (
          <ContractRow key={contract.id} contract={contract} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
