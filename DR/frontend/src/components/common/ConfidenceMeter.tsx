import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';

interface ConfidenceMeterProps {
  calibratedConfidence?: number;
  rawProbability?: number;
  method?: string;
  threshold?: number;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  calibratedConfidence,
  rawProbability,
  method = 'Swin V2 Tiny (Torchvision swin_v2_t)',
  threshold = 75
}) => {
  if (calibratedConfidence === undefined || calibratedConfidence === null) {
    return (
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>DR Classification Confidence</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Unavailable
          </span>
        </div>
      </div>
    );
  }

  // Normalize confidence to 0-100%
  let confVal = calibratedConfidence;
  if (confVal <= 1.0) {
    confVal = confVal * 100;
  }
  const percent = Math.min(100, Math.max(0, Math.round(confVal * 10) / 10));

  let rawVal = rawProbability;
  if (rawVal !== undefined && rawVal <= 1.0) {
    rawVal = rawVal * 100;
  }
  const rawPercent = rawVal !== undefined ? Math.min(100, Math.max(0, Math.round(rawVal * 10) / 10)) : undefined;

  let threshVal = threshold !== undefined ? threshold : 75;
  if (threshVal <= 1.0) {
    threshVal = threshVal * 100;
  }
  const isHigh = percent >= threshVal;

  return (
    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>DR Classification Confidence</span>
        </div>
        <span className={`text-base font-bold ${isHigh ? 'text-sky-700' : 'text-amber-600'}`}>
          {percent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            percent >= 85 ? 'bg-sky-600' : percent >= 70 ? 'bg-teal-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percent}%` }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-700 opacity-60"
          style={{ left: `${threshVal}%` }}
          title={`Clinical Threshold: ${threshVal}%`}
        />
      </div>

      <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
        <span>Model: {method.split('(')[0]}</span>
        {rawPercent !== undefined && (
          <span title="Raw softmax probability">
            Raw: {rawPercent}%
          </span>
        )}
      </div>
    </div>
  );
};
