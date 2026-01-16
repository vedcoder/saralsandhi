'use client';

import { Clause } from '@/types/contract';

interface ClauseItemProps {
  clause: Clause;
  number: number;
  isSelected: boolean;
  riskLevel: 'high' | 'medium' | 'low' | null;
  onClick: () => void;
}

export function ClauseItem({
  clause,
  number,
  isSelected,
  riskLevel,
  onClick
}: ClauseItemProps) {
  const riskColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-blue-500 bg-blue-50',
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border-l-4 cursor-pointer transition-all
        ${isSelected
          ? 'border-l-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
          : riskLevel
            ? riskColors[riskLevel]
            : 'border-l-gray-200 bg-white hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200
                        flex items-center justify-center text-sm font-medium text-gray-700">
          {number}
        </span>
        <div className="flex-1">
          <p className="text-sm text-gray-700 line-clamp-3">
            {clause.original_text}
          </p>
          {riskLevel === 'high' && (
            <span className="inline-flex items-center mt-2 px-2 py-1
                           rounded text-xs font-medium bg-red-100 text-red-700">
              High Risk
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
