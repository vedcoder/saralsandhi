'use client';

import { useState, useEffect, useRef } from 'react';
import { Clause, Risk, Language, Translation } from '@/types/contract';
import { LanguageSelector } from './LanguageSelector';
import { RiskAlert } from './RiskAlert';
import { AIChat } from './AIChat';

type Tab = 'simplify' | 'overall' | 'risks' | 'chat';

interface DecoderPanelProps {
  selectedClause: Clause | null;
  simplifiedText: string;
  risks: Risk[];
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  riskSummary: string;
  contractId: string;
  allClauses: Clause[];
  allRisks: Risk[];
  translations: {
    hindi: Translation[];
    bengali: Translation[];
  };
}

export function DecoderPanel({
  selectedClause,
  simplifiedText,
  risks,
  selectedLanguage,
  onLanguageChange,
  riskSummary,
  contractId,
  allClauses,
  allRisks,
  translations,
}: DecoderPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overall');
  const highRisks = risks.filter(r => r.severity === 'high');

  const languageLabel = {
    english: 'English',
    hindi: 'Hindi',
    bengali: 'Bengali'
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overall', label: 'Overall Risk' },
    { id: 'simplify', label: 'Simplify & Translate' },
    { id: 'risks', label: 'Clause Risk' },
    { id: 'chat', label: 'AI Chat' },
  ];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex bg-gray-200 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'simplify' && (
          <SimplifyTab
            selectedClause={selectedClause}
            allClauses={allClauses}
            translations={translations}
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            languageLabel={languageLabel}
          />
        )}

        {activeTab === 'overall' && (
          <OverallRiskTab
            allClauses={allClauses}
            allRisks={allRisks}
            riskSummary={riskSummary}
          />
        )}

        {activeTab === 'risks' && (
          <RisksTab
            selectedClause={selectedClause}
            risks={risks}
            highRisks={highRisks}
          />
        )}

        {activeTab === 'chat' && (
          <AIChat
            contractId={contractId}
            clauses={allClauses}
            risks={allRisks}
          />
        )}
      </div>
    </div>
  );
}

// Simplify & Translate Tab
function SimplifyTab({
  selectedClause,
  allClauses,
  translations,
  selectedLanguage,
  onLanguageChange,
  languageLabel,
}: {
  selectedClause: Clause | null;
  allClauses: Clause[];
  translations: {
    hindi: Translation[];
    bengali: Translation[];
  };
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  languageLabel: Record<Language, string>;
}) {
  const clauseRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Scroll to selected clause when it changes
  useEffect(() => {
    if (selectedClause && clauseRefs.current[selectedClause.clause_id]) {
      clauseRefs.current[selectedClause.clause_id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedClause]);

  // Get translation for a specific clause
  const getTranslation = (clauseId: number): string => {
    if (selectedLanguage === 'english') {
      const clause = allClauses.find(c => c.clause_id === clauseId);
      return clause?.simplified_text || '';
    }
    const langTranslations = translations[selectedLanguage as 'hindi' | 'bengali'];
    const translation = langTranslations?.find(t => t.clause_id === clauseId);
    return translation?.translated_text || '';
  };

  return (
    <div>
      {/* Language Selector Header */}
      <div className="flex items-center justify-between mb-4 sticky -top-6 bg-gray-50 py-2 -mx-6 px-6 z-10">
        <h3 className="text-sm font-medium text-gray-700">
          Simplified Contract ({languageLabel[selectedLanguage]})
        </h3>
        <LanguageSelector
          value={selectedLanguage}
          onChange={onLanguageChange}
        />
      </div>

      {/* All Clauses */}
      <div className="space-y-3">
        {allClauses.map((clause) => {
          const isSelected = selectedClause?.clause_id === clause.clause_id;
          const translatedText = getTranslation(clause.clause_id);

          return (
            <div
              key={clause.clause_id}
              ref={(el) => { clauseRefs.current[clause.clause_id] = el; }}
              className={`rounded-lg border p-4 transition-all duration-300 ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Clause {clause.clause_id}
                </span>
                {isSelected && (
                  <span className="text-xs text-indigo-600 font-medium">
                    Currently Selected
                  </span>
                )}
              </div>
              <p className={`leading-relaxed ${
                isSelected ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {translatedText || 'Translation not available'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Overall Risk Tab - Shows all risky clauses with highlighted text
function OverallRiskTab({
  allClauses,
  allRisks,
  riskSummary,
}: {
  allClauses: Clause[];
  allRisks: Risk[];
  riskSummary: string;
}) {
  const highRisks = allRisks.filter(r => r.severity === 'high');
  const mediumRisks = allRisks.filter(r => r.severity === 'medium');
  const lowRisks = allRisks.filter(r => r.severity === 'low');

  // Get clauses that have risks, sorted by severity
  const clausesWithRisks = allClauses
    .map(clause => ({
      clause,
      risks: allRisks.filter(r => r.clause_id === clause.clause_id),
    }))
    .filter(item => item.risks.length > 0)
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const aMaxSeverity = Math.min(...a.risks.map(r => severityOrder[r.severity as keyof typeof severityOrder]));
      const bMaxSeverity = Math.min(...b.risks.map(r => severityOrder[r.severity as keyof typeof severityOrder]));
      return aMaxSeverity - bMaxSeverity;
    });

  // Match backend risk calculation logic for consistency
  const getOverallRiskLevel = () => {
    if (highRisks.length >= 1) return { level: 'High', color: 'bg-red-500', textColor: 'text-red-500' };
    if (mediumRisks.length >= 1) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (lowRisks.length >= 1) return { level: 'Low', color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { level: 'Safe', color: 'bg-green-500', textColor: 'text-green-600' };
  };

  const overallRisk = getOverallRiskLevel();

  return (
    <div>
      {/* Risk Overview Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contract Risk Assessment</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${overallRisk.color}`}>
            {overallRisk.level} Risk
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">{riskSummary || 'No risk summary available'}</p>

        {/* Risk Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
            <div className="text-2xl font-bold text-red-600">{highRisks.length}</div>
            <div className="text-xs text-red-700">High Risk</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-100">
            <div className="text-2xl font-bold text-yellow-600">{mediumRisks.length}</div>
            <div className="text-xs text-yellow-700">Medium Risk</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{lowRisks.length}</div>
            <div className="text-xs text-blue-700">Low Risk</div>
          </div>
        </div>

        {/* Risk Summary Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          {highRisks.length > 0 && (
            <div
              className="bg-red-500 h-full"
              style={{ width: `${(highRisks.length / allRisks.length) * 100}%` }}
            />
          )}
          {mediumRisks.length > 0 && (
            <div
              className="bg-yellow-500 h-full"
              style={{ width: `${(mediumRisks.length / allRisks.length) * 100}%` }}
            />
          )}
          {lowRisks.length > 0 && (
            <div
              className="bg-blue-500 h-full"
              style={{ width: `${(lowRisks.length / allRisks.length) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Risky Clauses */}
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Clauses with Identified Risks ({clausesWithRisks.length})
      </h3>

      {clausesWithRisks.length > 0 ? (
        <div className="space-y-4">
          {clausesWithRisks.map(({ clause, risks }) => {
            const maxSeverity = risks.some(r => r.severity === 'high')
              ? 'high'
              : risks.some(r => r.severity === 'medium')
                ? 'medium'
                : 'low';

            const borderColor = maxSeverity === 'high'
              ? 'border-l-red-500'
              : maxSeverity === 'medium'
                ? 'border-l-yellow-500'
                : 'border-l-blue-500';

            const bgColor = maxSeverity === 'high'
              ? 'bg-red-50/50'
              : maxSeverity === 'medium'
                ? 'bg-yellow-50/50'
                : 'bg-blue-50/50';

            return (
              <div
                key={clause.clause_id}
                className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor} overflow-hidden`}
              >
                {/* Clause Header */}
                <div className={`px-4 py-3 ${bgColor} border-b border-gray-100`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      Clause {clause.clause_id}
                    </span>
                    <div className="flex gap-1">
                      {risks.map((risk, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            risk.severity === 'high'
                              ? 'bg-red-100 text-red-700'
                              : risk.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {risk.risk_type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Highlighted Original Text */}
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-700 leading-relaxed mb-3 italic">
                    "{clause.original_text.length > 200
                      ? clause.original_text.substring(0, 200) + '...'
                      : clause.original_text}"
                  </p>

                  {/* Risk Details */}
                  <div className="space-y-2">
                    {risks.map((risk, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm ${
                          risk.severity === 'high'
                            ? 'bg-red-50 border border-red-100'
                            : risk.severity === 'medium'
                            ? 'bg-yellow-50 border border-yellow-100'
                            : 'bg-blue-50 border border-blue-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 ${
                            risk.severity === 'high'
                              ? 'text-red-500'
                              : risk.severity === 'medium'
                              ? 'text-yellow-500'
                              : 'text-blue-500'
                          }`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              risk.severity === 'high'
                                ? 'text-red-800'
                                : risk.severity === 'medium'
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                            }`}>
                              {risk.description}
                            </p>
                            {risk.recommendation && (
                              <p className={`mt-1 text-xs ${
                                risk.severity === 'high'
                                  ? 'text-red-600'
                                  : risk.severity === 'medium'
                                  ? 'text-yellow-600'
                                  : 'text-blue-600'
                              }`}>
                                <span className="font-semibold">Recommendation:</span> {risk.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
          <div className="text-green-500 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-green-800 mb-1">No Risks Identified</h4>
          <p className="text-sm text-green-600">This contract appears to be safe with no concerning clauses.</p>
        </div>
      )}
    </div>
  );
}

// Clause Risk Tab - Shows detailed risks for the selected clause
function RisksTab({
  selectedClause,
  risks,
  highRisks,
}: {
  selectedClause: Clause | null;
  risks: Risk[];
  highRisks: Risk[];
}) {
  const mediumRisks = risks.filter(r => r.severity === 'medium');
  const lowRisks = risks.filter(r => r.severity === 'low');

  // Determine clause risk level
  const getClauseRiskLevel = () => {
    if (highRisks.length >= 1) return { level: 'High Risk', color: 'bg-red-500', borderColor: 'border-red-500' };
    if (mediumRisks.length >= 1) return { level: 'Medium Risk', color: 'bg-yellow-500', borderColor: 'border-yellow-500' };
    if (lowRisks.length >= 1) return { level: 'Low Risk', color: 'bg-blue-500', borderColor: 'border-blue-500' };
    return { level: 'Safe', color: 'bg-green-500', borderColor: 'border-green-500' };
  };

  const clauseRisk = selectedClause ? getClauseRiskLevel() : null;

  return (
    <div>
      {selectedClause ? (
        <>
          {/* Clause Info Card */}
          <div className={`bg-white rounded-lg border-l-4 ${clauseRisk?.borderColor} border border-gray-200 p-4 mb-4`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Clause {selectedClause.clause_id}
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${clauseRisk?.color}`}>
                {clauseRisk?.level}
              </span>
            </div>

            {/* Original Clause Text */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1 font-medium">Original Text</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{selectedClause.original_text.length > 300
                  ? selectedClause.original_text.substring(0, 300) + '...'
                  : selectedClause.original_text}"
              </p>
            </div>

            {/* Risk Statistics for this Clause */}
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-md">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-xs text-red-700 font-medium">{highRisks.length} High</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-md">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="text-xs text-yellow-700 font-medium">{mediumRisks.length} Medium</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-xs text-blue-700 font-medium">{lowRisks.length} Low</span>
              </div>
            </div>
          </div>

          {/* Detailed Risks */}
          {risks.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                Identified Risks ({risks.length})
              </h4>

              {risks.map((risk, index) => (
                <div
                  key={index}
                  className={`rounded-lg border overflow-hidden ${
                    risk.severity === 'high'
                      ? 'border-red-200'
                      : risk.severity === 'medium'
                      ? 'border-yellow-200'
                      : 'border-blue-200'
                  }`}
                >
                  {/* Risk Header */}
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    risk.severity === 'high'
                      ? 'bg-red-50'
                      : risk.severity === 'medium'
                      ? 'bg-yellow-50'
                      : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`${
                        risk.severity === 'high'
                          ? 'text-red-500'
                          : risk.severity === 'medium'
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                      }`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className={`font-semibold text-sm capitalize ${
                        risk.severity === 'high'
                          ? 'text-red-800'
                          : risk.severity === 'medium'
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}>
                        {risk.risk_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                      risk.severity === 'high'
                        ? 'bg-red-100 text-red-700'
                        : risk.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {risk.severity}
                    </span>
                  </div>

                  {/* Risk Body */}
                  <div className="px-4 py-3 bg-white">
                    {/* Description */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1 font-medium">What's the issue?</p>
                      <p className={`text-sm leading-relaxed ${
                        risk.severity === 'high'
                          ? 'text-red-800'
                          : risk.severity === 'medium'
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}>
                        {risk.description}
                      </p>
                    </div>

                    {/* Recommendation */}
                    {risk.recommendation && (
                      <div className={`p-3 rounded-lg ${
                        risk.severity === 'high'
                          ? 'bg-red-50/50'
                          : risk.severity === 'medium'
                          ? 'bg-yellow-50/50'
                          : 'bg-blue-50/50'
                      }`}>
                        <p className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Recommendation
                        </p>
                        <p className={`text-sm ${
                          risk.severity === 'high'
                            ? 'text-red-700'
                            : risk.severity === 'medium'
                            ? 'text-yellow-700'
                            : 'text-blue-700'
                        }`}>
                          {risk.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
              <div className="text-green-500 mb-2">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-base font-medium text-green-800 mb-1">No Risks Found</h4>
              <p className="text-sm text-green-600">This clause appears to be safe</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-300 mb-3">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-base font-medium text-gray-700 mb-1">No Clause Selected</h4>
          <p className="text-sm text-gray-500">Click on a clause from the left panel to view its detailed risk analysis</p>
        </div>
      )}
    </div>
  );
}
