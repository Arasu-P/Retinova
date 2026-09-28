import React from 'react';
import { Sparkles, HelpCircle, Eye, AlertTriangle } from 'lucide-react';
import { ExplainabilityResult, EvidenceRegion } from '../../types';

interface GradCAMViewerProps {
  originalUrl: string;
  gradcamUrl: string;
  explainability: ExplainabilityResult;
  predictedGrade: number;
}

export const GradCAMViewer: React.FC<GradCAMViewerProps> = ({
  originalUrl,
  gradcamUrl,
  explainability,
  predictedGrade
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5">
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Explainable AI — Why did the model make this prediction?
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gradient-weighted Class Activation Mapping (Grad-CAM) visualizes retinal regions driving AI grading.
          </p>
        </div>
      </div>

      {/* Saliency Map Viewer & Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Grad-CAM Side-by-Side or Combined */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2 shadow-inner">
            <img
              src={originalUrl}
              alt="Base Fundus"
              className="max-h-80 w-auto object-contain rounded"
            />
            {gradcamUrl && (
              <img
                src={gradcamUrl}
                alt="Grad-CAM Heatmap"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
              />
            )}
          </div>

          {/* Attention Intensity Legend */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700 mb-1.5">
              <span>Attention Intensity Colormap:</span>
              <span className="text-[11px] text-slate-500">Grad-CAM Saliency Weight</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-rose-500 shadow-sm" />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
              <span>Low Attention (Background)</span>
              <span>Medium (Vascular)</span>
              <span className="text-rose-600 font-semibold">High Attention (Lesion Trigger)</span>
            </div>
          </div>
        </div>

        {/* Right: Detected Evidence Summary & Regions */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-sky-50/70 border border-sky-200">
              <span className="text-xs font-bold text-sky-900 uppercase tracking-wide block mb-1">
                Primary Model Evidence
              </span>
              <p className="text-xs text-sky-950 leading-relaxed">
                {explainability.evidence_summary}
              </p>
            </div>

            {/* Evidence regions detected */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Region Attention Attribution:
              </span>
              <div className="space-y-2">
                {explainability.evidence_regions && explainability.evidence_regions.length > 0 ? (
                  explainability.evidence_regions.map((reg, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                        reg.importance === 'high' ? 'bg-rose-500' : (reg.importance === 'medium' ? 'bg-amber-500' : 'bg-blue-500')
                      }`} />
                      <div>
                        <span className="font-semibold text-slate-800 capitalize">
                          {reg.feature_type.replace('_', ' ')}:
                        </span>
                        <span className="text-slate-600 ml-1">{reg.description}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 p-2">
                    Uniform retinal gradient distribution. No focal hyper-attention detected.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Guardrail:</strong> Saliency regions indicate algorithmic feature attribution and are intended solely for transparency. Clinical verification by an eye-care professional is mandatory.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
