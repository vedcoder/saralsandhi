'use client';

import { Language } from '@/types/contract';

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm text-gray-600 whitespace-nowrap">
        Language:
      </label>
      <select
        id="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md
                   bg-white text-gray-900 cursor-pointer
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   min-w-[130px]"
      >
        <option value="english">English</option>
        <option value="hindi">हिंदी (Hindi)</option>
        <option value="bengali">বাংলা (Bengali)</option>
      </select>
    </div>
  );
}
