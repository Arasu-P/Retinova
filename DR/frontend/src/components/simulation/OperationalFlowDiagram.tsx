import React from 'react';
import {
  Users,
  Camera,
  CheckCircle,
  Cpu,
  FileCheck2,
  Stethoscope,
  LogOut,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface OperationalFlowDiagramProps {
  bottleneck?: string;
  cameraUtil?: number;
  aiUtil?: number;
  doctorUtil?: number;
}

export const OperationalFlowDiagram: React.FC<OperationalFlowDiagramProps> = ({
  bottleneck = 'None (Optimal)',
  cameraUtil = 78,
  aiUtil = 34,
  doctorUtil = 90
}) => {
  const stages = [
    {
      id: 'arrival',
      name: 'Patient Arrival',
      icon: Users,
      metric: 'Poisson Arrival',
      isBottleneck: false,
      color: 'border-slate-300 bg-white text-slate-700'
    },
    {
      id: 'camera',
      name: 'Fundus Camera',
      icon: Camera,
      metric: `${cameraUtil}% Utilization`,
      isBottleneck: bottleneck === 'Camera Acquisition',
      color: bottleneck === 'Camera Acquisition' ? 'border-rose-400 bg-rose-50 text-rose-900 shadow-md' : 'border-sky-200 bg-sky-50 text-sky-900'
    },
    {
      id: 'iqa',
      name: 'IQA Validation',
      icon: CheckCircle,
      metric: 'Automated QC',
      isBottleneck: false,
      color: 'border-slate-300 bg-white text-slate-700'
    },
    {
      id: 'ai',
      name: 'MATLAB AI Server',
      icon: Cpu,
      metric: `${aiUtil}% Utilization`,
      isBottleneck: bottleneck === 'AI Inference Server',
      color: bottleneck === 'AI Inference Server' ? 'border-rose-400 bg-rose-50 text-rose-900 shadow-md' : 'border-teal-200 bg-teal-50 text-teal-900'
    },
    {
      id: 'referral',
      name: 'Referral Triage',
      icon: FileCheck2,
      metric: '~35% Referable',
      isBottleneck: false,
      color: 'border-slate-300 bg-white text-slate-700'
    },
    {
      id: 'doctor',
      name: 'Doctor Review',
      icon: Stethoscope,
      metric: `${doctorUtil}% Utilization`,
      isBottleneck: bottleneck === 'Doctor Review',
      color: bottleneck === 'Doctor Review' ? 'border-rose-400 bg-rose-50 text-rose-900 shadow-md' : 'border-amber-200 bg-amber-50 text-amber-900'
    },
    {
      id: 'exit',
      name: 'Patient Exit / Care',
      icon: LogOut,
      metric: 'Completed',
      isBottleneck: false,
      color: 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">District-Level Operational Workflow Pipeline</h3>
          <p className="text-xs text-slate-500">Discrete-event model corresponding to MATLAB Simulink / SimEvents state chart.</p>
        </div>
        {bottleneck && bottleneck !== 'None (Optimal)' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Bottleneck: {bottleneck}</span>
          </div>
        )}
      </div>

      {/* Pipeline Stages Flow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-center">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <React.Fragment key={stage.id}>
              <div
                className={`p-3 rounded-lg border flex flex-col items-center text-center transition-all ${stage.color} relative`}
              >
                {stage.isBottleneck && (
                  <span className="absolute -top-2.5 bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    Bottleneck
                  </span>
                )}
                <div className="p-2 rounded-full bg-white/80 shadow-xs mb-1.5">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight line-clamp-1">{stage.name}</span>
                <span className="text-[11px] opacity-75 mt-0.5 font-medium">{stage.metric}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
