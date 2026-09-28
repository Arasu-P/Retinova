import React from 'react';

interface ProbabilityGaugeProps {
  probability: number; // e.g. 0.015015 or 1.5
  threshold?: number;  // e.g. 0.2993 or 29.9
  isReferable?: boolean;
  className?: string;
}

export const ProbabilityGauge: React.FC<ProbabilityGaugeProps> = ({
  probability,
  threshold = 0.2993,
  isReferable,
  className = ''
}) => {
  // Normalize values to 0..100%
  const probVal = probability <= 1.0 ? probability * 100 : probability;
  const threshVal = threshold <= 1.0 ? threshold * 100 : threshold;
  const clampedProb = Math.min(Math.max(probVal, 0), 100);
  const clampedThresh = Math.min(Math.max(threshVal, 0), 100);

  const isExceeded = isReferable ?? (probVal >= threshVal);

  return (
    <div className={`p-4 rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">
            Referable DR Risk Probability (G2+)
          </span>
          <span className="text-[11px] text-slate-500">
            Calibrated screening risk vs operating decision threshold
          </span>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold font-mono ${isExceeded ? 'text-rose-600' : 'text-emerald-700'}`}>
            {probVal.toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-400 block">
            Threshold: {threshVal.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Horizontal Meter Track */}
      <div className="relative pt-3 pb-6">
        {/* Background bar */}
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          {/* Safe zone (up to threshold) */}
          <div
            style={{ width: `${clampedThresh}%` }}
            className="h-full bg-emerald-100 border-r border-emerald-300"
          />
          {/* Referable zone (threshold to 100) */}
          <div
            style={{ width: `${100 - clampedThresh}%` }}
            className="h-full bg-rose-100"
          />
        </div>

        {/* Threshold indicator line */}
        <div
          style={{ left: `${clampedThresh}%` }}
          className="absolute top-1 bottom-4 -ml-px w-0.5 bg-slate-400 z-10"
        >
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-slate-500 rounded-full" />
          <span className="absolute top-5 -left-8 text-[10px] font-mono font-medium text-slate-500 whitespace-nowrap">
            Threshold {threshVal.toFixed(1)}%
          </span>
        </div>

        {/* Current Probability Marker */}
        <div
          style={{ left: `${clampedProb}%` }}
          className="absolute top-0 bottom-4 -ml-2 w-4 flex flex-col items-center z-20 transition-all duration-300"
        >
          <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
            isExceeded ? 'bg-rose-600' : 'bg-emerald-600'
          }`}>
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <span className={`text-[11px] font-bold font-mono mt-1 ${
            isExceeded ? 'text-rose-700' : 'text-emerald-800'
          }`}>
            {probVal.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
        <span>0% (Lowest Risk)</span>
        <span>Non-Referable Routine</span>
        <span>Referable (Priority Referral)</span>
        <span>100% (Highest Risk)</span>
      </div>
    </div>
  );
};
