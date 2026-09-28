import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ClinicalDecisionBannerProps {
  decision: 'REFER' | 'SCREEN' | 'RECAPTURE' | string;
  calibratedPG2?: number; // e.g. 0.015015 or 1.5
  threshold?: number; // default 0.2993
  grade?: number;
  qualityGate?: string;
  rejectionReason?: string;
  className?: string;
}

export const ClinicalDecisionBanner: React.FC<ClinicalDecisionBannerProps> = ({
  decision,
  calibratedPG2,
  threshold = 0.2993,
  grade,
  qualityGate,
  rejectionReason,
  className = ''
}) => {
  const isRecapture = decision === 'RECAPTURE' || qualityGate === 'reject' || qualityGate === 'REJECT';
  const isRefer = !isRecapture && decision === 'REFER';
  const isScreen = !isRecapture && !isRefer;

  // Format calibrated probability
  let probPct: string = 'N/A';
  if (calibratedPG2 !== undefined && !isRecapture) {
    const val = calibratedPG2 <= 1.0 ? calibratedPG2 * 100 : calibratedPG2;
    probPct = `${val.toFixed(1)}%`;
  }
  const thresholdPct = `${(threshold <= 1.0 ? threshold * 100 : threshold).toFixed(1)}%`;

  if (isRecapture) {
    return (
      <section
        aria-label="Clinical Decision: Recapture Required"
        className={`p-5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 shadow-subtle ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Image Quality Insufficient
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 font-bold">
                  RECAPTURE REQUIRED
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-amber-950 mt-0.5 tracking-tight">
                RECAPTURE
              </h2>
              <p className="text-xs text-amber-900 mt-1 max-w-2xl leading-relaxed">
                {rejectionReason || 'Optical quality criteria (sharpness, illumination, or FOV coverage) were not satisfied. AI grading halted to protect diagnostic safety.'}
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-amber-200 sm:pl-5 flex-shrink-0">
            <span className="text-[11px] font-medium text-amber-800 block">Immediate Action</span>
            <span className="text-xs font-bold text-amber-950 block mt-0.5">
              Recapture Retinal Scan
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (isRefer) {
    return (
      <section
        aria-label="Clinical Decision: Referable Diabetic Retinopathy Detected"
        className={`p-5 rounded-xl border border-rose-300 bg-rose-50 text-rose-950 shadow-subtle ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Diabetic Retinopathy: Detected
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-200/80 text-rose-900 font-bold">
                  REFERABLE DR (G2+)
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-rose-950 mt-0.5 tracking-tight">
                REFER
              </h2>
              <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                Referral recommended for comprehensive ophthalmic evaluation at the district center.
              </p>
            </div>
          </div>

          <div className="sm:border-l sm:border-rose-200 sm:pl-5 flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-medium text-rose-800 block">G2+ Referable Risk</span>
              <span className="text-xl font-bold font-mono text-rose-950 block">
                {probPct}
              </span>
            </div>
            <span className="text-[11px] text-rose-700 font-mono">
              Threshold: {thresholdPct}
            </span>
          </div>
        </div>
      </section>
    );
  }

  // SCREEN (Routine Non-Referable)
  return (
    <section
      aria-label="Clinical Decision: No Referable DR Detected"
      className={`p-5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 shadow-subtle ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                No Referable DR Detected
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold">
                NON-REFERABLE
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-0.5 tracking-tight">
              SCREEN
            </h2>
            <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
              Continue routine annual diabetic retinopathy screening according to local clinical protocol.
            </p>
          </div>
        </div>

        <div className="sm:border-l sm:border-emerald-200 sm:pl-5 flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-medium text-emerald-800 block">G2+ Referable Risk</span>
            <span className="text-xl font-bold font-mono text-emerald-950 block">
              {probPct}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono">
            Threshold: {thresholdPct}
          </span>
        </div>
      </div>
    </section>
  );
};
