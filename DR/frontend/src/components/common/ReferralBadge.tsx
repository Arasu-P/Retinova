import React from 'react';
import { ReferralStatus, ReferralPriority } from '../../types';

interface ReferralBadgeProps {
  status?: ReferralStatus | string;
  priority?: ReferralPriority;
  size?: 'sm' | 'md' | 'lg';
}

export const ReferralBadge: React.FC<ReferralBadgeProps> = ({
  status = 'No Referral',
  priority,
  size = 'md'
}) => {
  const configs: Record<string, { bg: string; dot: string }> = {
    'No Referral': { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    'Routine Referral': { bg: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
    'Priority Referral': { bg: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
    'Urgent Referral': { bg: 'bg-rose-50 text-rose-900 border-rose-200', dot: 'bg-rose-500' }
  };

  const config = configs[status] || configs['Routine Referral'];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${config.bg} ${sizeClasses[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{status}</span>
    </span>
  );
};
