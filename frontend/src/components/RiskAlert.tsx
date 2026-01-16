'use client';

import { Risk } from '@/types/contract';

interface RiskAlertProps {
  risk: Risk;
}

export function RiskAlert({ risk }: RiskAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800">
            High Risk Detected
          </h4>
          <p className="mt-1 text-sm text-red-700">
            {risk.description}
          </p>
          <div className="mt-3 p-2 bg-white rounded border border-red-200">
            <p className="text-xs text-gray-600 font-medium">Recommendation:</p>
            <p className="text-sm text-gray-800">{risk.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
