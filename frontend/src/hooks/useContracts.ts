'use client';

import { useState, useCallback, useEffect } from 'react';
import { ContractListItem } from '@/types/contract';
import { getContracts, deleteContract as apiDeleteContract } from '@/lib/api';

export function useContracts() {
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContracts = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getContracts(search);
      setContracts(response.contracts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchContracts = useCallback((query: string) => {
    setSearchQuery(query);
    fetchContracts(query || undefined);
  }, [fetchContracts]);

  const deleteContract = useCallback(async (contractId: string) => {
    try {
      await apiDeleteContract(contractId);
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract');
      return false;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchContracts(searchQuery || undefined);
  }, [fetchContracts, searchQuery]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return {
    contracts,
    isLoading,
    error,
    searchContracts,
    deleteContract,
    refresh,
  };
}
