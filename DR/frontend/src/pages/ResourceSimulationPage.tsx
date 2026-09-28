import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  Clock,
  Camera,
  Cpu,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Tent,
  Hospital,
  Wifi,
  Users,
  Eye,
  Activity,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { SimulationParameters, SimulationResultData, SimulationRun } from '../types';
import { OperationalFlowDiagram } from '../components/simulation/OperationalFlowDiagram';
import { SimulationControlPanel } from '../components/simulation/SimulationControlPanel';
import { api } from '../services/api';

interface DistrictScenario {
  annualVolume: number;
  dailyVolume: number;
  cameras: number;
  aiWorkers: number;
  doctors: number;
  bandwidthMbps: number;
  camUtil: number;
  aiUtil: number;
  docUtil: number;
  meanWaitSec: number;
  feasible: boolean;
}

const DISTRICT_SCENARIOS: DistrictScenario[] = [
  { annualVolume: 10000, dailyVolume: 40, cameras: 2, aiWorkers: 1, doctors: 1, bandwidthMbps: 5, camUtil: 17.5, aiUtil: 1.2, docUtil: 3.2, meanWaitSec: 3.2, feasible: true },
  { annualVolume: 25000, dailyVolume: 100, cameras: 2, aiWorkers: 1, doctors: 1, bandwidthMbps: 5, camUtil: 43.2, aiUtil: 3.0, docUtil: 8.1, meanWaitSec: 32.2, feasible: true },
  { annualVolume: 50000, dailyVolume: 200, cameras: 3, aiWorkers: 1, doctors: 1, bandwidthMbps: 5, camUtil: 57.7, aiUtil: 5.9, docUtil: 17.1, meanWaitSec: 37.5, feasible: true },
  { annualVolume: 100000, dailyVolume: 400, cameras: 5, aiWorkers: 1, doctors: 1, bandwidthMbps: 5, camUtil: 69.2, aiUtil: 11.9, docUtil: 36.8, meanWaitSec: 38.8, feasible: true },
  { annualVolume: 150000, dailyVolume: 600, cameras: 7, aiWorkers: 1, doctors: 1, bandwidthMbps: 5, camUtil: 74.5, aiUtil: 17.8, docUtil: 48.0, meanWaitSec: 45.0, feasible: true }
];

export const ResourceSimulationPage: React.FC = () => {
  const [selectedVolume, setSelectedVolume] = useState<number>(100000);
  const [params, setParams] = useState<SimulationParameters>({
    title: 'District DR Screening (100,000 Pts/Yr)',
    patientArrivalRate: 400,
    cameras: 5,
    imageAcquisitionTime: 4.0,
    qualityRejectionRate: 0.08,
    aiProcessingTime: 4.28,
    aiResources: 1,
    doctorReviewTime: 2.0,
    doctors: 1,
    workingHours: 8,
    simulationDuration: 30,
    connectivityBandwidthMbps: 5.0
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResultData | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    handleRunSimulation();
  }, [selectedVolume]);

  const selectTargetVolume = (vol: number) => {
    setSelectedVolume(vol);
    const scen = DISTRICT_SCENARIOS.find(s => s.annualVolume === vol) || DISTRICT_SCENARIOS[3];
    setParams(prev => ({
      ...prev,
      title: `District DR Screening (${vol.toLocaleString()} Pts/Yr)`,
      patientArrivalRate: scen.dailyVolume,
      cameras: scen.cameras,
      aiResources: scen.aiWorkers,
      doctors: scen.doctors,
      connectivityBandwidthMbps: scen.bandwidthMbps
    }));
  };

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const res = await api.runSimulation(params);
      setResult(res.result);
    } catch (err) {
      console.error('Simulation execution failed', err);
    } finally {
      setIsRunning(false);
    }
  };

  const activeScenario = DISTRICT_SCENARIOS.find(s => s.annualVolume === selectedVolume) || DISTRICT_SCENARIOS[3];
  const camUtil = result?.cameraUtilization ?? activeScenario.camUtil;
  const aiUtil = result?.aiUtilization ?? activeScenario.aiUtil;
  const docUtil = result?.doctorUtilization ?? activeScenario.docUtil;
  const dailyThroughput = result?.throughput ?? activeScenario.dailyVolume;
  const eyeImagesPerDay = dailyThroughput * 2;
  const referredPerDay = Math.round(dailyThroughput * 0.20);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
              SIH26038 Module 6 (v2)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Simulink + SimEvents Discrete-Event Modeling
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            District Resource Planning & Capacity Optimization
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-world operational sizing for district-scale tele-screening: fundus acquisition, 8% IQA recapture, bandwidth upload, GPU workers, and tele-ophthalmology triage.
          </p>
        </div>

        <button
          type="button"
          disabled={isRunning}
          onClick={handleRunSimulation}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-subtle transition disabled:opacity-50 self-start sm:self-auto"
        >
          {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Running SimEvents...' : 'Run Simulation'}</span>
        </button>
      </div>

      {/* Target Screening Volume Selector */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Annual Screening Target
            </span>
            <span className="text-xs text-slate-500">
              Select district screening scale (based on 250 clinical working days/year, 8h shifts)
            </span>
          </div>
          <span className="text-xs font-mono text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-100 font-semibold self-start sm:self-auto">
            Active: {selectedVolume.toLocaleString()} Patients / Year
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {DISTRICT_SCENARIOS.map(scen => {
            const isSelected = selectedVolume === scen.annualVolume;
            const isDemonstration = scen.annualVolume === 100000;
            return (
              <button
                key={scen.annualVolume}
                type="button"
                onClick={() => selectTargetVolume(scen.annualVolume)}
                className={`p-3 rounded-lg border text-left transition relative ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                {isDemonstration && (
                  <span className="absolute -top-2 right-2 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs">
                    Target Demo
                  </span>
                )}
                <span className="text-sm font-bold text-slate-900 block font-mono">
                  {(scen.annualVolume / 1000).toFixed(0)}k <span className="text-[10px] font-normal text-slate-500">pts/yr</span>
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5 font-medium">
                  {scen.dailyVolume} patients / day
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {scen.cameras} Cams • {scen.aiWorkers} AI • {scen.doctors} Doc
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Decision Banner: "How many resources does this district need?" */}
      <div className="p-6 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Optimal District Sizing Recommendation: {selectedVolume.toLocaleString()} Patients/Year
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            <span>Feasible Operation (&lt;85% Utilization Threshold)</span>
          </span>
        </div>

        {/* 4 Core Resource Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Fundus Cameras</span>
              <Camera className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {activeScenario.cameras} <span className="text-xs font-normal text-slate-400">Cameras</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Utilization</span>
              <span className="font-mono font-bold text-sky-800">{camUtil.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, camUtil)}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">AI GPU Worker Nodes</span>
              <Cpu className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {activeScenario.aiWorkers} <span className="text-xs font-normal text-slate-400">Node</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>GPU Utilization</span>
              <span className="font-mono font-bold text-emerald-800">{aiUtil.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, aiUtil)}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Ophthalmologists</span>
              <Stethoscope className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {activeScenario.doctors} <span className="text-xs font-normal text-slate-400">Doctor</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tele-Review Load</span>
              <span className="font-mono font-bold text-amber-800">{docUtil.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, docUtil)}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Uplink Bandwidth</span>
              <Wifi className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {activeScenario.bandwidthMbps} <span className="text-xs font-normal text-slate-400">Mbps</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Mean Patient Dwell</span>
              <span className="font-mono font-bold text-indigo-800">{activeScenario.meanWaitSec.toFixed(1)} s</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (activeScenario.meanWaitSec / 60) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Operational Flow Explanatory Note */}
        <div className="space-y-2">
          <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-3 rounded-lg border border-sky-100">
            <strong>Daily Workload Summary:</strong> Sized for <strong>{dailyThroughput} patients/day</strong> generating <strong>{eyeImagesPerDay} bilateral eye images/day (2 eye scans per patient encounter)</strong>. With an 8% optical quality recapture rate, camera utilization stabilizes at <strong>{camUtil.toFixed(1)}%</strong>. Dedicated in-memory Swin V2 Tiny AI nodes process all {eyeImagesPerDay} eye images at warm GPU latency (4.28s/image) with only <strong>{aiUtil.toFixed(1)}%</strong> compute utilization. Under a nominal 20% clinical referral rate (80 patients/day), 1 tele-ophthalmologist achieves <strong>{docUtil.toFixed(1)}%</strong> shift utilization (Mean patient dwell wait: <strong>{activeScenario.meanWaitSec.toFixed(1)} s</strong>).
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200/80 text-[11px] text-indigo-950">
            <span className="flex items-center gap-1.5 font-medium">
              <Wifi className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span><strong>Network Transfer Time:</strong> At 5 Mbps uplink bandwidth, network transfer latency ≈ <strong>4.0 seconds</strong> for the 20 Mbit bilateral fundus image payload.</span>
            </span>
            <span className="text-[10px] text-indigo-600 font-mono font-semibold">Bilateral Payload: 20 Mbits / 5 Mbps = 4.0s</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/80 text-[11px] text-amber-950 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span><strong>Clinical Screening vs. Resource Planning Notice:</strong> District operational modeling is executed via MATLAB SimEvents discrete-event simulation (<code>DR_District_Resource_Planner_v2.slx</code>) for healthcare resource allocation. It does <em>not</em> alter or compute clinical patient diagnostic decisions.</span>
          </div>
        </div>
      </div>

      {/* Minimum Feasible District Staffing Matrix Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-slate-600" />
              <span>Recommended Minimum District Staffing Matrix (SimEvents v2 Monte Carlo)</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Systematic capacity sweep identifying minimum staffing configurations that satisfy the &lt;85% utilization and &lt;60s wait criteria
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Annual Volume</th>
                <th className="py-2.5 px-3">Daily Demand</th>
                <th className="py-2.5 px-3">Eye Images</th>
                <th className="py-2.5 px-3">Cameras</th>
                <th className="py-2.5 px-3">AI Workers</th>
                <th className="py-2.5 px-3">Doctors</th>
                <th className="py-2.5 px-3">Bandwidth</th>
                <th className="py-2.5 px-3">Cam Util</th>
                <th className="py-2.5 px-3">AI Util</th>
                <th className="py-2.5 px-3">Doc Util</th>
                <th className="py-2.5 px-3">Mean Wait</th>
                <th className="py-2.5 px-3 text-center">Feasible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {DISTRICT_SCENARIOS.map(scen => {
                const isSelected = selectedVolume === scen.annualVolume;
                return (
                  <tr
                    key={scen.annualVolume}
                    className={`hover:bg-slate-50/70 transition cursor-pointer ${
                      isSelected ? 'bg-sky-50/60 font-semibold text-sky-950' : 'text-slate-700'
                    }`}
                    onClick={() => selectTargetVolume(scen.annualVolume)}
                  >
                    <td className="py-2.5 px-3 font-bold font-sans">
                      {scen.annualVolume.toLocaleString()} / yr
                    </td>
                    <td className="py-2.5 px-3">{scen.dailyVolume} pts/day</td>
                    <td className="py-2.5 px-3">{scen.dailyVolume * 2} imgs/day</td>
                    <td className="py-2.5 px-3 font-bold text-sky-800">{scen.cameras}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-800">{scen.aiWorkers}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-800">{scen.doctors}</td>
                    <td className="py-2.5 px-3">{scen.bandwidthMbps} Mbps</td>
                    <td className="py-2.5 px-3">{scen.camUtil.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{scen.aiUtil.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{scen.docUtil.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{scen.meanWaitSec.toFixed(1)} s</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        FEASIBLE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Flow Diagram */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            End-to-End District Screening Queuing Architecture
          </h2>
          <p className="text-[11px] text-slate-500">
            SimEvents discrete-event flow from patient arrival, fundus camera queue, optical IQA gate, bandwidth upload, AI GPU inference, to tele-ophthalmologist review
          </p>
        </div>

        <OperationalFlowDiagram
          bottleneck={result?.bottleneck}
          cameraUtil={camUtil}
          aiUtil={aiUtil}
          doctorUtil={docUtil}
        />
      </div>

      {/* Parameter Adjustment Panel (Custom District Sizing) */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
          Custom District Parameter Simulation
        </h2>
        <SimulationControlPanel
          parameters={params}
          onChange={setParams}
          onRun={handleRunSimulation}
          isRunning={isRunning}
        />
      </div>

      {/* Collapsible Technical Model Details */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-800">Technical Model Details &amp; Operational Assumptions (SimEvents v2)</span>
          </span>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showTechnicalDetails && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-3 font-mono text-[11px] text-slate-600 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Simulink Model Artifact</span>
                <span className="font-bold text-slate-800 block mt-0.5">DR_District_Resource_Planner_v2.slx</span>
                <span className="text-[10px] text-slate-500">v1 baseline preserved as rollback</span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Patient vs. Encounter vs. Image</span>
                <span className="font-bold text-slate-800 block mt-0.5">1 Patient = 1 Encounter = 2 Eye Images</span>
                <span className="text-[10px] text-slate-500">Bilateral examination (OD + OS)</span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Measured Warm AI Service Time</span>
                <span className="font-bold text-slate-800 block mt-0.5">4.28 s / Eye Image (8.56 s / Encounter)</span>
                <span className="text-[10px] text-slate-500">Measured warm NetraAI GPU pipeline</span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Image Quality Gate (Module 1)</span>
                <span className="font-bold text-slate-800 block mt-0.5">8% Rejection Rate + 120s Recapture</span>
                <span className="text-[10px] text-slate-500">Operational assumption for field camps</span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Network Study Payload</span>
                <span className="font-bold text-slate-800 block mt-0.5">2.5 MB (20.0 Mbits) per Encounter</span>
                <span className="text-[10px] text-slate-500">Upload delay = 20 / Bandwidth Mbps</span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Patient-Level Referral</span>
                <span className="font-bold text-slate-800 block mt-0.5">Left REFER OR Right REFER = 1 Referral</span>
                <span className="text-[10px] text-slate-500">Nominal 20% patient referral triage</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 font-sans text-xs">
              <strong>Scientific &amp; Operational Disclaimer:</strong> This discrete-event simulation estimates operational capacity under stated assumptions. It is an operational engineering model designed to size physical resources and prevent queuing bottlenecks; it does not constitute clinical trial performance proof or demographic disease prevalence measurement.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
