import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

interface Stage {
  key: string;
  name: string;
  module: string;
}

interface PipelineProgressProps {
  currentStage: string;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed?: boolean;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStage,
  isProcessing,
  isCompleted,
  isFailed = false
}) => {
  const stages: Stage[] = [
    { key: 'upload', name: 'Digital Fundus Image Ingestion', module: 'Ingestion Bridge' },
    { key: 'quality', name: 'Image Quality Assessment (EyeQ Quality Gate)', module: 'EyeQ MobileNetV2' },
    { key: 'enhancement', name: 'Illumination Equalization & Controlled CLAHE', module: 'MATLAB Module 2' },
    { key: 'segmentation', name: 'Retinal Vessel & Lesion Evidence Extraction', module: 'MATLAB Module 3' },
    { key: 'classification', name: 'DR Severity Grading & Temperature Scaling', module: 'Swin V2 Tiny' },
    { key: 'explainability', name: 'Grad-CAM Saliency Heatmap & Evidence Attribution', module: 'Grad-CAM Engine' },
    { key: 'referral', name: 'Referral Triage & Clinical Report Generation', module: 'Clinical Rule Engine' }
  ];

  const getCurrentIndex = () => {
    if (isCompleted) return stages.length;
    const idx = stages.findIndex(s => s.key === currentStage);
    return idx === -1 ? 0 : idx;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900">Multi-Stage MATLAB AI Screening Pipeline</h3>
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Executing Algorithmic Pipeline...</span>
          </div>
        )}
        {isCompleted && (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Pipeline Completed
          </span>
        )}
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const isDone = isCompleted || idx < currentIndex;
          const isCurrent = !isCompleted && idx === currentIndex && isProcessing;

          return (
            <div
              key={stage.key}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                  : isCurrent
                  ? 'bg-sky-50 border-sky-300 text-sky-950 font-semibold shadow-sm'
                  : 'bg-slate-50/50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
                <div>
                  <span className={isDone ? 'font-medium text-slate-900' : isCurrent ? 'text-sky-900 font-bold' : 'text-slate-500'}>
                    {stage.name}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{stage.module}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
