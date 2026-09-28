import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'border-slate-200 bg-white text-slate-900',
    primary: 'border-sky-200 bg-sky-50/50 text-slate-900',
    success: 'border-emerald-200 bg-emerald-50/40 text-slate-900',
    warning: 'border-amber-200 bg-amber-50/40 text-slate-900',
    danger: 'border-rose-200 bg-rose-50/40 text-slate-900'
  };

  const iconColors = {
    default: 'text-slate-600 bg-slate-100',
    primary: 'text-sky-600 bg-sky-100',
    success: 'text-emerald-600 bg-emerald-100',
    warning: 'text-amber-600 bg-amber-100',
    danger: 'text-rose-600 bg-rose-100'
  };

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${iconColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
          {trend && (
            <span className={`font-semibold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
