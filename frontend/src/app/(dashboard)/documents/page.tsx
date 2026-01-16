'use client';

import { useContracts } from '@/hooks/useContracts';
import SearchBar from '@/components/dashboard/SearchBar';
import ContractTable from '@/components/dashboard/ContractTable';
import UploadButton from '@/components/dashboard/UploadButton';

export default function DocumentsPage() {
  const { contracts, isLoading, searchContracts, refresh } = useContracts();

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="max-w-xl mb-6">
          <SearchBar onSearch={searchContracts} />
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
          <p className="text-gray-600 mt-1">View and manage all your uploaded contracts</p>
        </div>
        <UploadButton onUploadComplete={refresh} />
      </div>

      <ContractTable contracts={contracts} isLoading={isLoading} />
    </div>
  );
}
