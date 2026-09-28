import React from 'react';
import {
  Layers,
  ArrowRight,
  Cpu,
  Database,
  Camera,
  CheckCircle2,
  Sparkles,
  Sliders,
  ShieldCheck,
  Stethoscope,
  Server
} from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-sky-600" />
          Technical & Algorithmic Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          SIH26038: System decoupling between Web App, Node.js Backend, MATLAB AI Pipeline, and SimEvents Simulation
        </p>
      </div>

      {/* Main Architecture Flowchart Representation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900">Clinical Screening & Inference Architecture</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Layer 1: Client & Acquisition */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-bold text-sky-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>1. Acquisition & Frontend</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
              <li>Rural Fundus Camera capture interface</li>
              <li>React 18 + Vite + Tailwind UI</li>
              <li>Multi-layer Pan/Zoom visualizer</li>
              <li>Mobile-first responsive design</li>
            </ul>
          </div>

          {/* Layer 2: Backend API & Persistence */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-bold text-sky-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              <span>2. Backend & Service Layer</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
              <li>Node.js / Express TypeScript</li>
              <li>PostgreSQL relational store</li>
              <li>JWT Authentication & RBAC</li>
              <li>Model-Agnostic REST Contracts</li>
            </ul>
          </div>

          {/* Layer 3: MATLAB AI & SimEvents */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-bold text-sky-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>3. MATLAB AI & SimEvents</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
              <li>Module 1: IQA Quality Filter</li>
              <li>Module 2: CLAHE Enhancement</li>
              <li>Module 3: Retinal Segmentation</li>
              <li>Module 4: Swin V2 Tiny Grading</li>
              <li>Module 5: Grad-CAM Explainability</li>
              <li>Module 6: SimEvents Capacity Sim</li>
            </ul>
          </div>
        </div>

        {/* Simulink Workflow Highlight */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>Simulink / SimEvents Operational Capacity Model</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            The discrete-event simulation models patient queuing behavior in rural PHCs. It accepts arrival distributions, camera acquisition times, IQA rejection loops, and doctor review bottlenecks to compute district-level resource gaps before physical screening camps are deployed.
          </p>
        </div>
      </div>
    </div>
  );
};
