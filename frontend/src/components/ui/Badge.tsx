'use client';

import { DetectedLanguage, RiskScore, ContractStatus } from '@/types/contract';

interface BadgeProps {
  variant: 'language' | 'risk' | 'status';
  value: DetectedLanguage | RiskScore | ContractStatus;
}

const languageLabels: Record<DetectedLanguage, string> = {
  english: 'English',
  hindi: 'Hindi',
  bengali: 'Bengali',
  english_complex: 'English (Complex)',
};

const riskLabels: Record<RiskScore, string> = {
  high: 'High Risk',
  medium: 'Medium Risk',
  low: 'Low Risk',
  safe: 'Safe',
};

const statusLabels: Record<ContractStatus, string> = {
  pending_review: 'Pending Review',
  reviewed: 'Reviewed',
  archived: 'Archived',
  approved: 'Approved',
  rejected: 'Rejected',
};

const languageColors: Record<DetectedLanguage, string> = {
  english: 'bg-blue-100 text-blue-800',
  hindi: 'bg-purple-100 text-purple-800',
  bengali: 'bg-teal-100 text-teal-800',
  english_complex: 'bg-indigo-100 text-indigo-800',
};

const riskColors: Record<RiskScore, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
  safe: 'bg-green-100 text-green-800',
};

const statusColors: Record<ContractStatus, string> = {
  pending_review: 'bg-gray-100 text-gray-800',
  reviewed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function Badge({ variant, value }: BadgeProps) {
  let label: string;
  let colorClass: string;

  switch (variant) {
    case 'language':
      label = languageLabels[value as DetectedLanguage];
      colorClass = languageColors[value as DetectedLanguage];
      break;
    case 'risk':
      label = riskLabels[value as RiskScore];
      colorClass = riskColors[value as RiskScore];
      break;
    case 'status':
      label = statusLabels[value as ContractStatus];
      colorClass = statusColors[value as ContractStatus];
      break;
    default:
      label = String(value);
      colorClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
