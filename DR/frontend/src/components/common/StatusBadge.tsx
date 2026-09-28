import React from 'react';

export type StatusVariant = 'refer' | 'screen' | 'recapture' | 'neutral' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const getColors = () => {
    switch (variant) {
      case 'refer':
      case 'danger':
        return {
          dot: 'bg-rose-500',
          text: 'text-rose-800',
          bg: 'bg-rose-50 border-rose-200'
        };
      case 'screen':
      case 'success':
        return {
          dot: 'bg-emerald-500',
          text: 'text-emerald-800',
          bg: 'bg-emerald-50 border-emerald-200'
        };
      case 'recapture':
      case 'warning':
        return {
          dot: 'bg-amber-500',
          text: 'text-amber-800',
          bg: 'bg-amber-50 border-amber-200'
        };
      case 'neutral':
      default:
        return {
          dot: 'bg-slate-400',
          text: 'text-slate-700',
          bg: 'bg-slate-50 border-slate-200'
        };
    }
  };

  const colors = getColors();
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px]'
    : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium font-sans ${sizeClasses} ${colors.bg} ${colors.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
