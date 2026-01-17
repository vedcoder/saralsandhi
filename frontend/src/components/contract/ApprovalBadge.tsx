'use client';

import { ApprovalStatus } from '@/types/contract';

interface ApprovalBadgeProps {
  status: ApprovalStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ApprovalStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
  },
};

export function ApprovalBadge({ status, size = 'sm' }: ApprovalBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
}
