import React from 'react';
import { Play, RotateCcw, Sliders, Sparkles } from 'lucide-react';
import { SimulationParameters } from '../../types';

interface SimulationControlPanelProps {
  parameters: SimulationParameters;
  onChange: (params: SimulationParameters) => void;
  onRun: () => void;
  isRunning: boolean;
}

export const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  parameters,
  onChange,
  onRun,
  isRunning
}) => {
  const updateField = (field: keyof SimulationParameters, value: any) => {
    onChange({
      ...parameters,
      [field]: value
    });
  };

  const applyPreset = (preset: 'phc_small' | 'chc_medium' | 'district_large') => {
    if (preset === 'phc_small') {
      onChange({
        ...parameters,
        title: 'Small Rural PHC Setup (1 Camera, 1 Doctor)',
        patientArrivalRate: 60,
        cameras: 1,
        imageAcquisitionTime: 3.0,
        qualityRejectionRate: 0.25,
        aiProcessingTime: 1.2,
        aiResources: 1,
        doctorReviewTime: 5.0,
        doctors: 1,
        workingHours: 7,
        simulationDuration: 30
      });
    } else if (preset === 'chc_medium') {
      onChange({
        ...parameters,
        title: 'Community Health Centre (2 Cameras, 2 Doctors)',
        patientArrivalRate: 140,
        cameras: 2,
        imageAcquisitionTime: 2.5,
        qualityRejectionRate: 0.20,
        aiProcessingTime: 1.0,
        aiResources: 2,
        doctorReviewTime: 4.5,
        doctors: 2,
        workingHours: 8,
        simulationDuration: 30
      });
    } else if (preset === 'district_large') {
      onChange({
        ...parameters,
        title: 'District Eye Hospital Screening Camp (4 Cameras, 4 Doctors)',
        patientArrivalRate: 350,
        cameras: 4,
        imageAcquisitionTime: 2.0,
        qualityRejectionRate: 0.15,
        aiProcessingTime: 0.8,
        aiResources: 4,
        doctorReviewTime: 4.0,
        doctors: 4,
        workingHours: 9,
        simulationDuration: 30
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">Simulink / SimEvents Operational Parameters</h3>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1 hidden sm:inline">Presets:</span>
          <button
            onClick={() => applyPreset('phc_small')}
            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-medium"
          >
            Rural PHC
          </button>
          <button
            onClick={() => applyPreset('chc_medium')}
            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-medium"
          >
            CHC Centre
          </button>
          <button
            onClick={() => applyPreset('district_large')}
            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-medium"
          >
            District Camp
          </button>
        </div>
      </div>

      {/* Grid of Parameter Sliders & Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Patient Arrival Rate */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Patient Arrival Rate</span>
            <span className="text-sky-700 font-bold">{parameters.patientArrivalRate} / day</span>
          </div>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={parameters.patientArrivalRate}
            onChange={(e) => updateField('patientArrivalRate', parseInt(e.target.value, 10))}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 block">Expected footfall per working day</span>
        </div>

        {/* Number of Cameras */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Fundus Cameras</span>
            <span className="text-sky-700 font-bold">{parameters.cameras} Camera(s)</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={parameters.cameras}
            onChange={(e) => updateField('cameras', parseInt(e.target.value, 10))}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 block">Active acquisition hardware stations</span>
        </div>

        {/* Image Acquisition Time */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Image Capture Time</span>
            <span className="text-sky-700 font-bold">{parameters.imageAcquisitionTime} min / patient</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="8.0"
            step="0.5"
            value={parameters.imageAcquisitionTime}
            onChange={(e) => updateField('imageAcquisitionTime', parseFloat(e.target.value))}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 block">Operator time for pupil alignment & capture</span>
        </div>

        {/* Image Quality Rejection Rate */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>IQA Rejection Rate</span>
            <span className="text-amber-700 font-bold">{Math.round(parameters.qualityRejectionRate * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.60"
            step="0.05"
            value={parameters.qualityRejectionRate}
            onChange={(e) => updateField('qualityRejectionRate', parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 block">Blurry / ungradable captures requiring re-scan</span>
        </div>

        {/* AI Server Compute Workers */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>AI Compute Resources</span>
            <span className="text-sky-700 font-bold">{parameters.aiResources} Worker(s)</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={parameters.aiResources}
            onChange={(e) => updateField('aiResources', parseInt(e.target.value, 10))}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 block">Inference concurrency ({parameters.aiProcessingTime}s / scan)</span>
        </div>

        {/* Number of Review Doctors */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between font-semibold text-slate-700">
            <span>Doctors / Ophthalmologists</span>
            <span className="text-sky-700 font-bold">{parameters.doctors} Doctor(s)</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={parameters.doctors}
            onChange={(e) => updateField('doctors', parseInt(e.target.value, 10))}
            className="w-full accent-sky-600 cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 block">{parameters.doctorReviewTime} min review per referable case</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500">
          Duration: <strong>{parameters.simulationDuration} Days</strong> | Work Hours: <strong>{parameters.workingHours}h / day</strong>
        </span>

        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{isRunning ? 'Running SimEvents Engine...' : 'Run Capacity Simulation'}</span>
        </button>
      </div>
    </div>
  );
};
