'use client';

import { useState, useCallback, useEffect } from 'react';
import { ContractAnalysis, Language, Clause, Risk } from '@/types/contract';
import { analyzeContract, getContract } from '@/lib/api';

export function useContract(contractId?: string) {
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contract by ID if provided
  useEffect(() => {
    if (contractId) {
      loadContract(contractId);
    }
  }, [contractId]);

  const loadContract = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getContract(id);
      setAnalysis(result);
      if (result.clauses.length > 0) {
        setSelectedClauseId(result.clauses[0].clause_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contract');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAndAnalyze = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeContract(file);
      setAnalysis(result);
      if (result.clauses.length > 0) {
        setSelectedClauseId(result.clauses[0].clause_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSelectedClause = useCallback((): Clause | null => {
    if (!analysis || selectedClauseId === null) return null;
    return analysis.clauses.find(c => c.clause_id === selectedClauseId) || null;
  }, [analysis, selectedClauseId]);

  const getTranslationForClause = useCallback((clauseId: number): string => {
    if (!analysis) return '';

    if (selectedLanguage === 'english') {
      const clause = analysis.clauses.find(c => c.clause_id === clauseId);
      return clause?.simplified_text || '';
    }

    const translations = analysis.translations[selectedLanguage as 'hindi' | 'bengali'];
    const translation = translations?.find(t => t.clause_id === clauseId);
    return translation?.translated_text || '';
  }, [analysis, selectedLanguage]);

  const getRisksForClause = useCallback((clauseId: number): Risk[] => {
    if (!analysis) return [];
    return analysis.risks.filter(r => r.clause_id === clauseId);
  }, [analysis]);

  const getHighRisks = useCallback((): Risk[] => {
    if (!analysis) return [];
    return analysis.risks.filter(r => r.severity === 'high');
  }, [analysis]);

  return {
    analysis,
    selectedClauseId,
    selectedLanguage,
    isLoading,
    error,
    setSelectedClauseId,
    setSelectedLanguage,
    uploadAndAnalyze,
    getSelectedClause,
    getTranslationForClause,
    getRisksForClause,
    getHighRisks,
  };
}
