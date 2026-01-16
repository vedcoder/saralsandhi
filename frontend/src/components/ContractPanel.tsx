'use client';

import { Clause, Risk } from '@/types/contract';
import { ClauseItem } from './ClauseItem';

interface ContractPanelProps {
  clauses: Clause[];
  selectedClauseId: number | null;
  onClauseSelect: (id: number) => void;
  risks: Risk[];
}

export function ContractPanel({
  clauses,
  selectedClauseId,
  onClauseSelect,
  risks
}: ContractPanelProps) {
  const getClauseRiskLevel = (clauseId: number): 'high' | 'medium' | 'low' | null => {
    const clauseRisks = risks.filter(r => r.clause_id === clauseId);
    if (clauseRisks.some(r => r.severity === 'high')) return 'high';
    if (clauseRisks.some(r => r.severity === 'medium')) return 'medium';
    if (clauseRisks.some(r => r.severity === 'low')) return 'low';
    return null;
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Contract Document
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Click on a clause to see its simplified explanation and risk analysis
      </p>
      <div className="space-y-3">
        {clauses.map((clause, index) => (
          <ClauseItem
            key={clause.clause_id}
            clause={clause}
            number={index + 1}
            isSelected={clause.clause_id === selectedClauseId}
            riskLevel={getClauseRiskLevel(clause.clause_id)}
            onClick={() => onClauseSelect(clause.clause_id)}
          />
        ))}
      </div>
    </div>
  );
}
