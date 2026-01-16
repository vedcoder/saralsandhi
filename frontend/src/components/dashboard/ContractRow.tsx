'use client';

import Link from 'next/link';
import { ContractListItem } from '@/types/contract';
import Badge from '@/components/ui/Badge';

interface ContractRowProps {
  contract: ContractListItem;
}

function PDFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 3v5a1 1 0 001 1h5" />
      <text x="7" y="17" fontSize="5" fontWeight="bold" fill="currentColor" stroke="none">PDF</text>
    </svg>
  );
}

export default function ContractRow({ contract }: ContractRowProps) {
  return (
    <Link
      href={`/contracts/${contract.id}`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="flex-shrink-0">
        <PDFIcon className="w-10 h-10 text-red-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {contract.filename}
        </p>
      </div>

      <div className="flex-shrink-0 w-32">
        <Badge variant="language" value={contract.detected_language} />
      </div>

      <div className="flex-shrink-0 w-28">
        <Badge variant="risk" value={contract.risk_score} />
      </div>

      <div className="flex-shrink-0 w-32">
        <Badge variant="status" value={contract.status} />
      </div>
    </Link>
  );
}
