import React from 'react';

interface SeverityScaleProps {
  predictedGrade?: number; // 0, 1, 2, 3, 4
  confidence?: number;
  gradeProbabilities?: any;
  className?: string;
}

export const SeverityScale: React.FC<SeverityScaleProps> = ({
  predictedGrade,
  confidence,
  gradeProbabilities,
  className = ''
}) => {
  const grades = [
    { grade: 0, code: 'G0', title: 'No DR', desc: 'Normal retinal scan' },
    { grade: 1, code: 'G1', title: 'Mild NPDR', desc: 'Microaneurysms only' },
    { grade: 2, code: 'G2', title: 'Moderate', desc: 'More than microaneurysms' },
    { grade: 3, code: 'G3', title: 'Severe NPDR', desc: '4-2-1 clinical rule' },
    { grade: 4, code: 'G4', title: 'Proliferative', desc: 'Neovascularization / PDR' },
  ];

  // Robustly extract 1D numeric probabilities from various backend formats (e.g. MATLAB 2D [[...]])
  const flatProbs = React.useMemo(() => {
    if (!gradeProbabilities) return null;
    let list: any[] | null = null;
    if (Array.isArray(gradeProbabilities)) {
      if (gradeProbabilities.length > 0 && Array.isArray(gradeProbabilities[0])) {
        list = gradeProbabilities[0];
      } else {
        list = gradeProbabilities;
      }
    } else if (typeof gradeProbabilities === 'object') {
      list = [0, 1, 2, 3, 4].map(idx =>
        gradeProbabilities[idx] ??
        gradeProbabilities[`Grade ${idx}`] ??
        gradeProbabilities[String(idx)]
      );
    }
    if (!list) return null;
    return list.map(item => {
      const n = typeof item === 'number' ? item : parseFloat(item);
      return isNaN(n) ? null : n;
    });
  }, [gradeProbabilities]);

  const confNum = typeof confidence === 'number' && !isNaN(confidence) ? confidence : null;

  return (
    <div className={`p-4 rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">
            ICDR Retinopathy Severity Classification
          </span>
          <span className="text-[11px] text-slate-500">
            5-Grade International Clinical Diabetic Retinopathy Disease Scale
          </span>
        </div>
        {predictedGrade !== undefined && (
          <div className="text-right">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono">
              Predicted: Grade {predictedGrade}
            </span>
            {confNum !== null && (
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Confidence: {(confNum <= 1.0 ? confNum * 100 : confNum).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 5-Step Severity Bar */}
      <div className="grid grid-cols-5 gap-2">
        {grades.map((g) => {
          const isSelected = predictedGrade === g.grade;
          const rawProb = flatProbs && flatProbs[g.grade] !== undefined ? flatProbs[g.grade] : null;
          const prob = rawProb !== null
            ? (rawProb <= 1.0 ? rawProb * 100 : rawProb)
            : null;

          return (
            <div
              key={g.grade}
              className={`p-2.5 rounded-lg border transition-all text-center ${
                isSelected
                  ? 'border-sky-600 bg-sky-50 shadow-sm ring-1 ring-sky-600'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className={`text-xs font-extrabold font-mono ${isSelected ? 'text-sky-800' : 'text-slate-700'}`}>
                  {g.code}
                </span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                )}
              </div>
              <span className={`text-[11px] font-semibold block mt-0.5 truncate ${isSelected ? 'text-sky-950 font-bold' : 'text-slate-600'}`}>
                {g.title}
              </span>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                {g.desc}
              </span>
              {prob !== null && typeof prob === 'number' && !isNaN(prob) && (
                <span className={`text-[10px] font-mono block mt-1 pt-1 border-t ${
                  isSelected ? 'text-sky-700 font-bold border-sky-200' : 'text-slate-400 border-slate-100'
                }`}>
                  {prob.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

