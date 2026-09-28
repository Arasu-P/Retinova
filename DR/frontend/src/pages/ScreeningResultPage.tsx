import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Eye,
  FileText,
  Printer,
  Download,
  Calendar,
  User,
  MapPin,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { Screening } from '../types';
import { ClinicalDecisionBanner } from '../components/common/ClinicalDecisionBanner';
import { ProbabilityGauge } from '../components/common/ProbabilityGauge';
import { SeverityScale } from '../components/common/SeverityScale';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';

export const ScreeningResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [screening, setScreening] = useState<Screening | null>(null);
  const [patientScreenings, setPatientScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Referral Action State
  const [actionTaken, setActionTaken] = useState<'referral_pending' | 'referral_completed' | 'patient_advised' | 'followup_scheduled'>('referral_pending');
  const [actionNotes, setActionNotes] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Technical Model Details Collapse State
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Eye Image Segmented View Tab
  const [activeImageTab, setActiveImageTab] = useState<'side_by_side' | 'attribution' | 'original'>('side_by_side');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (id) loadScreening();
  }, [id]);

  const loadScreening = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getScreeningById(id!);
      setScreening(res.screening);
      if (res.screening.referral) {
        setActionTaken(res.screening.referral.action_taken || 'referral_pending');
        setActionNotes(res.screening.referral.action_notes || '');
      }
      if (res.screening.patient_id) {
        try {
          const sList = await api.getScreenings({ patientId: res.screening.patient_id });
          if (sList?.screenings) {
            setPatientScreenings(sList.screenings);
          }
        } catch {
          // Non-critical companion eye fetch
        }
      }
    } catch (err: any) {
      setError(err.message || 'Screening service error: Failed to retrieve screening record');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingAction(true);
    try {
      await api.updateReferralAction(id, {
        action_taken: actionTaken,
        action_notes: actionNotes
      });
      setActionSuccess(true);
      setTimeout(() => setActionSuccess(false), 3000);
      loadScreening();
    } catch (err) {
      console.error('Failed to update referral action', err);
    } finally {
      setSavingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Retrieving screening record & AI attribution...</p>
      </div>
    );
  }

  // Rule 7: Failure state - show explicit screening-service error rather than a clinical prediction
  if (error || !screening) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-rose-900">Screening Service Error</h2>
          <p className="text-xs text-rose-800 leading-relaxed">
            {error || 'Unable to retrieve screening result. The screening server or database could not be reached.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={loadScreening}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
            >
              Retry Connection
            </button>
            <Link
              to="/screenings"
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Return to History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Clinical data extraction strictly from backend (Rule 5 & 8)
  const patient = screening.patient;
  const isRejected = (
    screening.quality?.status === 'rejected' ||
    screening.quality?.quality_gate === 'reject' ||
    screening.status === 'rejected' ||
    screening.final_decision === 'RECAPTURE'
  );

  const rawDecision = screening.classification?.decision || screening.final_decision || (isRejected ? 'RECAPTURE' : 'SCREEN');
  const clinicalDecision: 'REFER' | 'SCREEN' | 'RECAPTURE' = isRejected ? 'RECAPTURE' : (rawDecision === 'REFER' ? 'REFER' : 'SCREEN');

  const pG2Calibrated = isRejected ? undefined : screening.classification?.g2plus_probability_calibrated;
  const thresholdVal = screening.classification?.threshold ?? 0.2993;
  const predictedGrade = isRejected ? undefined : screening.classification?.predicted_grade;
  const confidenceVal = screening.classification?.calibrated_confidence ? screening.classification.calibrated_confidence / 100 : undefined;
  const gradeProbabilities = screening.classification?.grade_probabilities || screening.classification?.classProbabilities;

  // Eye labeling strictness (Rule 9): LEFT = Left Eye (OS), RIGHT = Right Eye (OD)
  const eyeRaw = (screening.eye || 'left').toLowerCase();
  const isLeftEye = eyeRaw === 'left';
  const eyeLabelFull = isLeftEye ? 'Left Eye (OS)' : 'Right Eye (OD)';
  const eyeCode = isLeftEye ? 'OS' : 'OD';

  // Image assets
  const originalUrl = screening.image?.storage_url || '';
  const gradcamUrl = screening.explainability?.gradcam_url || '';
  const vesselUrl = screening.segmentation?.vessel_mask_url || '';
  const lesionUrl = screening.segmentation?.lesion_mask_url || '';

  // Metadata verification (Rule 8): real values or "Not provided"
  const patientName = patient?.name || 'Not provided';
  const patientCode = patient?.patient_code || 'Not provided';
  const patientAge = patient?.age ? `${patient.age} Yrs` : 'Not provided';
  const patientGender = patient?.gender || 'Not provided';
  const patientLocation = patient?.location || 'Not provided';
  const facilityName = screening.facility?.name || 'Primary Health Centre';
  const technicianName = (screening as any).technician_name || 'Not provided';
  const deviceName = (screening.image as any)?.device_model || (screening as any).device_id || 'Not provided';
  const screeningDate = new Date(screening.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Bilateral Encounter Logic (Rule: LEFT REFER OR RIGHT REFER = overall patient REFER)
  const leftScreening = isLeftEye ? screening : patientScreenings.find(s => s.eye?.toLowerCase() === 'left');
  const rightScreening = !isLeftEye ? screening : patientScreenings.find(s => s.eye?.toLowerCase() === 'right');

  const getEyeDecision = (s: Screening | null | undefined): 'REFER' | 'SCREEN' | 'RECAPTURE' | 'NOT_CAPTURED' => {
    if (!s) return 'NOT_CAPTURED';
    const isRej = s.quality?.status === 'rejected' || s.quality?.quality_gate === 'reject' || s.status === 'rejected' || s.final_decision === 'RECAPTURE';
    if (isRej) return 'RECAPTURE';
    const dec = s.classification?.decision || s.final_decision;
    return dec === 'REFER' ? 'REFER' : 'SCREEN';
  };

  const leftDecision = getEyeDecision(leftScreening);
  const rightDecision = getEyeDecision(rightScreening);

  let overallDecision: 'REFER' | 'SCREEN' | 'RECAPTURE' | 'ACTION_NEEDED' = 'SCREEN';
  if (leftDecision === 'REFER' || rightDecision === 'REFER') {
    overallDecision = 'REFER';
  } else if (leftDecision === 'RECAPTURE' || rightDecision === 'RECAPTURE') {
    overallDecision = 'RECAPTURE';
  } else if (leftDecision === 'SCREEN' && rightDecision === 'SCREEN') {
    overallDecision = 'SCREEN';
  } else if (leftDecision === 'NOT_CAPTURED' || rightDecision === 'NOT_CAPTURED') {
    overallDecision = clinicalDecision === 'REFER' ? 'REFER' : (clinicalDecision === 'RECAPTURE' ? 'RECAPTURE' : 'ACTION_NEEDED');
  }

  // Demo data badge detection
  const isDemoRecord = patientCode.startsWith('PAT-') || patientCode.startsWith('REG-');

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Link
            to="/screenings"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Back to Screening History"
            aria-label="Back to Screening History"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-semibold text-slate-600">Screening Encounter</span>
          <span className="text-xs text-slate-400">/</span>
          <span className="font-mono text-xs text-slate-800 font-bold">{patientCode}</span>
          {isDemoRecord && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-semibold uppercase">
              Demo Data
            </span>
          )}
        </div>

        {/* Report Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/${screening.id}/html`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </a>
          <a
            href={`/api/reports/${screening.id}/card`}
            target="_blank"
            rel="noreferrer"
            download={`Clinical_Card_${patientCode.replace(/\s+/g, '_')}.png`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Clinical Card (PNG)</span>
          </a>
          <a
            href={`/api/reports/${screening.id}/html`}
            download={`DR_Screening_Report_${patientCode.replace(/\s+/g, '_')}.html`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </a>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. PATIENT / ENCOUNTER HEADER                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{patientName}</h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                {patientCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patientAge} · {patientGender} {patientLocation !== 'Not provided' ? `· ${patientLocation}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div>
              <span className="text-[11px] text-slate-400 block">Examined Eye</span>
              <span className="font-semibold text-slate-800">{eyeLabelFull}</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[11px] text-slate-400 block">Screening Date</span>
              <span className="font-medium text-slate-800">{screeningDate}</span>
            </div>
            <div className="border-l border-slate-200 pl-4 hidden md:block">
              <span className="text-[11px] text-slate-400 block">Facility</span>
              <span className="font-medium text-slate-800 truncate max-w-[140px]">{facilityName}</span>
            </div>
          </div>
        </div>

        {/* Bilateral Eye Workflow (Phase 6 Requirement) */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg border bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isLeftEye ? 'bg-sky-600 ring-2 ring-sky-300' : 'bg-slate-400'}`} />
              <span>Left Eye (OS):</span>
            </span>
            <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
              leftDecision === 'REFER' ? 'bg-rose-100 text-rose-800' :
              leftDecision === 'RECAPTURE' ? 'bg-amber-100 text-amber-800' :
              leftDecision === 'SCREEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {leftDecision === 'NOT_CAPTURED' ? 'Pending Capture' : leftDecision}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${!isLeftEye ? 'bg-sky-600 ring-2 ring-sky-300' : 'bg-slate-400'}`} />
              <span>Right Eye (OD):</span>
            </span>
            <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
              rightDecision === 'REFER' ? 'bg-rose-100 text-rose-800' :
              rightDecision === 'RECAPTURE' ? 'bg-amber-100 text-amber-800' :
              rightDecision === 'SCREEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {rightDecision === 'NOT_CAPTURED' ? 'Pending Capture' : rightDecision}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border flex items-center justify-between font-semibold ${
            overallDecision === 'REFER' ? 'bg-rose-50 border-rose-300 text-rose-950' :
            overallDecision === 'RECAPTURE' ? 'bg-amber-50 border-amber-300 text-amber-950' :
            overallDecision === 'SCREEN' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
            'bg-sky-50 border-sky-300 text-sky-950'
          }`}>
            <span className="text-[11px] uppercase tracking-wide">Overall Patient:</span>
            <span className="font-mono text-xs font-black uppercase">
              {overallDecision === 'ACTION_NEEDED' ? 'ACTION NEEDED' : overallDecision}
            </span>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Device: {deviceName} • Operator: {technicianName}</span>
          <span className="font-mono">SIH26038 Bilateral Rule: LEFT REFER OR RIGHT REFER = Overall REFER</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PRIMARY CLINICAL RESULT (Dominant, Rule 4)                 */}
      {/* ------------------------------------------------------------- */}
      <ClinicalDecisionBanner
        decision={clinicalDecision}
        calibratedPG2={pG2Calibrated}
        threshold={thresholdVal}
        grade={predictedGrade}
        qualityGate={screening.quality?.quality_gate || screening.quality?.status}
        rejectionReason={screening.quality?.rejection_reason}
      />

      {/* ------------------------------------------------------------- */}
      {/* 3. PROBABILITY DISPLAY & 4. SEVERITY DISPLAY                  */}
      {/* ------------------------------------------------------------- */}
      {!isRejected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Probability Gauge (Horizontal Meter) */}
          <div className="lg:col-span-6">
            <ProbabilityGauge
              probability={pG2Calibrated ?? 0}
              threshold={thresholdVal}
              isReferable={clinicalDecision === 'REFER'}
            />
          </div>

          {/* ICDR Severity Scale */}
          <div className="lg:col-span-6">
            <SeverityScale
              predictedGrade={predictedGrade}
              confidence={confidenceVal}
              gradeProbabilities={gradeProbabilities}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. EYE IMAGE EXPERIENCE (Segmented Tabs, Rule 10)             */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-600" />
              Retinal Fundus Scan & Spatial Analysis ({eyeLabelFull})
            </h2>
            <p className="text-xs text-slate-500">
              Interactive high-resolution image inspection with smooth attribution overlay
            </p>
          </div>

          {/* Segmented View Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveImageTab('side_by_side')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                activeImageTab === 'side_by_side' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setActiveImageTab('attribution')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                activeImageTab === 'attribution' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Model Attribution
            </button>
            <button
              onClick={() => setActiveImageTab('original')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                activeImageTab === 'original' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Original Fundus
            </button>
          </div>
        </div>

        {/* Display Container */}
        <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[380px] flex items-center justify-center p-3">
          {/* Zoom Controls Overlay */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur p-1 rounded-lg border border-slate-700 text-white">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
              className="p-1.5 hover:bg-slate-800 rounded transition"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
              className="p-1.5 hover:bg-slate-800 rounded transition"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-800 rounded transition"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Side-by-Side Mode */}
          {activeImageTab === 'side_by_side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Original Fundus ({eyeCode})
                </span>
                <div className="w-full max-w-[360px] aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                  {originalUrl ? (
                    <img
                      src={originalUrl}
                      alt={`Original Fundus ${eyeLabelFull}`}
                      className="w-full h-full object-contain transition-transform duration-200"
                      style={{ transform: `scale(${zoomLevel})` }}
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Fundus image unavailable</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Grad-CAM — Swin V2 Tiny ({eyeCode})
                </span>
                <div className="w-full max-w-[360px] aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                  {!isRejected && gradcamUrl ? (
                    <img
                      src={gradcamUrl}
                      alt={`Grad-CAM Attribution Overlay ${eyeLabelFull}`}
                      className="w-full h-full object-contain transition-transform duration-200"
                      style={{ transform: `scale(${zoomLevel})` }}
                    />
                  ) : (
                    <span className="text-xs text-slate-400 p-6 text-center">
                      {isRejected ? 'Attribution halted at quality gate' : 'Attribution map unavailable'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Single Attribution Mode */}
          {activeImageTab === 'attribution' && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Grad-CAM — Swin V2 Tiny Overlay ({eyeLabelFull})
              </span>
              <div className="max-w-[480px] aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                {!isRejected && gradcamUrl ? (
                  <img
                    src={gradcamUrl}
                    alt={`Grad-CAM Overlay ${eyeLabelFull}`}
                    className="w-full h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                ) : (
                  <span className="text-xs text-slate-400">Attribution unavailable</span>
                )}
              </div>
            </div>
          )}

          {/* Single Original Mode */}
          {activeImageTab === 'original' && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Original High-Resolution Retinal Scan ({eyeLabelFull})
              </span>
              <div className="max-w-[480px] aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                <img
                  src={originalUrl}
                  alt={`Original Fundus ${eyeLabelFull}`}
                  className="w-full h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 6. EXPLAINABILITY NOTICE & CAPTION (Rule 10)                 */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <p className="font-medium text-slate-800">
            <strong>Model Attribution:</strong> Highlighted regions indicate image areas contributing most to the Swin V2 Tiny model prediction.
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            * Attribution is model evidence, not a diagnostic ground-truth mask. It visualizes spatial attention over retinal structures.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. RETINAL EVIDENCE SUMMARY (Module 3 Genuine Evidence)       */}
      {/* ------------------------------------------------------------- */}
      {!isRejected && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Retinal Evidence Summary (Module 3 Post-Hoc Analysis)
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Post-hoc clinical evidence only</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Vessel Evidence</span>
                <span className="text-[11px] font-mono text-sky-700 font-bold">
                  {screening.segmentation?.vessel_coverage !== undefined
                    ? `${(screening.segmentation.vessel_coverage <= 1 ? screening.segmentation.vessel_coverage * 100 : screening.segmentation.vessel_coverage).toFixed(1)}%`
                    : 'Extracted'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Heuristic vessel extraction — not clinically validated
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Candidate Lesion Evidence</span>
                <span className="text-[11px] font-mono text-amber-700 font-bold">
                  {screening.segmentation?.candidate_count !== undefined
                    ? `${screening.segmentation.candidate_count} candidates`
                    : 'Candidate clusters'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Candidate lesions — evidence only
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Swin Attribution</span>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">
                  Multi-Scale CAM
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Stage 3 + Stage 4 spatial fusion
              </span>
              <button
                type="button"
                onClick={() => setActiveImageTab('attribution')}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 mt-2 block"
              >
                View attribution overlay →
              </button>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            * Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinical review and do not constitute independent diagnostic proof. Candidate lesions — evidence only. Heuristic vessel extraction — not clinically validated.
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. CLINICAL RECOMMENDATION & REFERRAL ACTION FORM             */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Clinical Recommendation & Referral Management
          </h2>
          <p className="text-xs text-slate-500">
            Record clinical action, appointment scheduling, and telemedicine follow-up
          </p>
        </div>

        <div className={`p-3.5 rounded-lg border text-xs ${
          isRejected
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : (clinicalDecision === 'REFER'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900')
        }`}>
          <span className="font-bold block mb-0.5">Protocol Recommendation:</span>
          {isRejected && 'Recapture the affected eye before screening. Retinal illumination or sharpness was inadequate.'}
          {!isRejected && clinicalDecision === 'REFER' && 'Referral recommended for comprehensive ophthalmic evaluation by a district eye specialist.'}
          {!isRejected && clinicalDecision === 'SCREEN' && 'Continue routine diabetic-retinopathy screening according to local clinical protocol (annual re-screen).'}
        </div>

        {/* Action update form */}
        <form onSubmit={handleUpdateReferral} className="space-y-3 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Referral / Disposition Status
              </label>
              <select
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none"
              >
                <option value="referral_pending">Referral Pending Review</option>
                <option value="referred_to_chc">Referred to CHC Ophthalmologist</option>
                <option value="teleophthalmology_scheduled">Teleophthalmology Scheduled</option>
                <option value="routine_screening_scheduled">Routine Screening Scheduled</option>
                <option value="recapture_requested">Recapture Requested</option>
                <option value="patient_refused">Patient Advised / Refused</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Clinical Encounter Notes
              </label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Optional notes or hospital referral slip number..."
                className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {actionSuccess ? (
              <span className="text-emerald-700 font-medium">✓ Referral status updated successfully.</span>
            ) : <div />}
            <button
              type="submit"
              disabled={savingAction}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {savingAction ? 'Saving...' : 'Update Encounter Status'}
            </button>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 9. TECHNICAL MODEL DETAILS (Expandable, Rule 8 & 11)          */}
      {/* ------------------------------------------------------------- */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full px-5 py-3 flex items-center justify-between text-left font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Technical Model & Pipeline Specifications</span>
          </span>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="px-5 pb-4 pt-1 border-t border-slate-100 space-y-3 font-mono text-[11px] text-slate-600 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <div>
                <span className="text-slate-400 block">Model Architecture</span>
                <span className="font-semibold text-slate-800">Torchvision Swin V2 Tiny (`swin_v2_t`)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Input Resolution</span>
                <span className="font-semibold text-slate-800">512 × 512 × 3</span>
              </div>
              <div>
                <span className="text-slate-400 block">Model Version</span>
                <span className="font-semibold text-slate-800">v1.0-frozen</span>
              </div>
              <div>
                <span className="text-slate-400 block">Calibration Method</span>
                <span className="font-semibold text-slate-800">Temperature Scaling (T = 1.4555)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Operating Threshold (τ*)</span>
                <span className="font-semibold text-slate-800">0.2993 (29.93%)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Processing Latency</span>
                <span className="font-semibold text-slate-800">
                  {screening.processing_time_ms ? `${(screening.processing_time_ms / 1000).toFixed(2)} sec` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Explainability Method</span>
                <span className="font-semibold text-slate-800">Multi-Scale Spatial Grad-CAM</span>
              </div>
              <div>
                <span className="text-slate-400 block">Target Feature Layers</span>
                <span className="font-semibold text-slate-800">features[5] (32×32) + features[7] (16×16)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Screening Encounter ID</span>
                <span className="font-semibold text-slate-800">{screening.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
