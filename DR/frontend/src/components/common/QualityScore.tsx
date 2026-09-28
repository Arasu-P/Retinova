import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert, Flag } from 'lucide-react';
import { ImageQualityResult } from '../../types';

interface QualityScoreProps {
  quality?: ImageQualityResult;
  showBreakdown?: boolean;
}

export const QualityScore: React.FC<QualityScoreProps> = ({ quality, showBreakdown = true }) => {
  if (!quality) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <AlertCircle className="w-4 h-4 text-slate-400" />
        <span>Unavailable</span>
      </div>
    );
  }

  const isAccepted = quality.status === 'accepted';
  const gate = quality.quality_gate || (quality.quality_score >= 85 ? 'good' : (isAccepted ? 'usable' : 'reject'));
  const score = quality.quality_score;

  const gateBadges = {
    good: {
      label: 'QUALITY GATE: GOOD (OPTIMAL)',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: CheckCircle2
    },
    usable: {
      label: 'QUALITY GATE: USABLE (SCREENING ACCEPTED)',
      bg: 'bg-teal-50 text-teal-800 border-teal-300',
      icon: CheckCircle2
    },
    reject: {
      label: 'QUALITY GATE: REJECT (RECAPTURE RECOMMENDED)',
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: XCircle
    }
  };

  const gateConfig = gateBadges[gate];
  const GateIcon = gateConfig.icon;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${gateConfig.bg}`}>
          <GateIcon className="w-4 h-4" />
          <span>{gateConfig.label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900">{score}% Quality Index</span>
      </div>

      {quality.quality_flags && quality.quality_flags.length > 0 && (
        <div className="space-y-1 pt-1">
          {quality.quality_flags.map((flag, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <Flag className="w-3 h-3 text-sky-600 flex-shrink-0" />
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {!isAccepted && quality.rejection_reason && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Quality Threshold Not Met</span>
          </div>
          <p className="text-[11px]">
            <strong>Reason:</strong> {quality.rejection_reason}. Recapture recommended before classification.
          </p>
        </div>
      )}

      {showBreakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Sharpness</span>
            <span className="font-semibold text-slate-800">{quality.sharpness}%</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Illumination</span>
            <span className="font-semibold text-slate-800">{quality.illumination}%</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">FOV Coverage</span>
            <span className="font-semibold text-slate-800">{quality.fov_coverage}%</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Artifacts</span>
            <span className="font-semibold text-slate-800">{quality.artifact_area}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
