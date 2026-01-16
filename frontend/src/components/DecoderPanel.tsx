'use client';

import { Clause, Risk, Language } from '@/types/contract';
import { LanguageSelector } from './LanguageSelector';
import { RiskAlert } from './RiskAlert';

interface DecoderPanelProps {
  selectedClause: Clause | null;
  simplifiedText: string;
  risks: Risk[];
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  riskSummary: string;
}

export function DecoderPanel({
  selectedClause,
  simplifiedText,
  risks,
  selectedLanguage,
  onLanguageChange,
  riskSummary,
}: DecoderPanelProps) {
  const highRisks = risks.filter(r => r.severity === 'high');

  if (!selectedClause) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-500">Select a clause to view its analysis</p>
      </div>
    );
  }

  const languageLabel = {
    english: 'English',
    hindi: 'Hindi',
    bengali: 'Bengali'
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Decoder & Simplifier
        </h2>
      </div>

      {/* Simplified Explanation Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Simplified Explanation ({languageLabel[selectedLanguage]})
          </h3>
          <LanguageSelector
            value={selectedLanguage}
            onChange={onLanguageChange}
          />
        </div>
        <p className="text-gray-800 leading-relaxed">
          {simplifiedText || 'Translation not available'}
        </p>
      </div>

      {/* High Risk Alerts */}
      {highRisks.length > 0 && (
        <div className="space-y-4 mb-6">
          {highRisks.map((risk, index) => (
            <RiskAlert key={index} risk={risk} />
          ))}
        </div>
      )}

      {/* All Risks for this clause */}
      {risks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            All Risks ({risks.length})
          </h3>
          <div className="space-y-2">
            {risks.map((risk, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  risk.severity === 'high'
                    ? 'bg-red-50 text-red-800'
                    : risk.severity === 'medium'
                    ? 'bg-yellow-50 text-yellow-800'
                    : 'bg-blue-50 text-blue-800'
                }`}
              >
                <span className="font-medium capitalize">{risk.risk_type.replace('_', ' ')}</span>
                : {risk.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Summary */}
      {riskSummary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Overall Risk Summary
          </h3>
          <p className="text-sm text-gray-600">{riskSummary}</p>
        </div>
      )}
    </div>
  );
}
