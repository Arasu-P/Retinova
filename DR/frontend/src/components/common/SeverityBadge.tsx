import React from 'react';

interface SeverityBadgeProps {
  grade?: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  grade,
  showDetails = true,
  size = 'md'
}) => {
  if (grade === undefined || grade === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Not Graded
      </span>
    );
  }

  const gradeConfigs = [
    {
      label: 'No DR',
      fullLabel: 'Grade 0 — No Diabetic Retinopathy',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
      description: 'Normal retina'
    },
    {
      label: 'Mild NPDR',
      fullLabel: 'Grade 1 — Mild Non-Proliferative DR',
      bg: 'bg-sky-50 text-sky-800 border-sky-200',
      dot: 'bg-sky-500',
      description: 'Microaneurysms only'
    },
    {
      label: 'Moderate NPDR',
      fullLabel: 'Grade 2 — Moderate Non-Proliferative DR',
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      dot: 'bg-amber-500',
      description: 'Exudates / Blot hemorrhages'
    },
    {
      label: 'Severe NPDR',
      fullLabel: 'Grade 3 — Severe Non-Proliferative DR',
      bg: 'bg-orange-50 text-orange-900 border-orange-200',
      dot: 'bg-orange-500',
      description: 'Multiple hemorrhages / Cotton-wool'
    },
    {
      label: 'Proliferative DR',
      fullLabel: 'Grade 4 — Proliferative Diabetic Retinopathy',
      bg: 'bg-rose-50 text-rose-900 border-rose-200',
      dot: 'bg-rose-500',
      description: 'Neovascularization / High risk'
    }
  ];

  const config = gradeConfigs[grade] || gradeConfigs[0];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${config.bg} ${sizeClasses[size]}`}
      title={config.fullLabel}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className="font-semibold">Grade {grade}</span>
      {showDetails && <span className="opacity-90">— {config.label}</span>}
    </span>
  );
};
