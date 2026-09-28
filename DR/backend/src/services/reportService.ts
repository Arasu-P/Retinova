import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DatabaseStore } from '../db/store';
import { Screening } from '../types';

const execFileAsync = promisify(execFile);

function resolveImageSrc(urlOrPath: string | undefined | null): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('data:')) return urlOrPath;

  const filename = path.basename(urlOrPath.replace(/\\/g, '/').split('?')[0]);
  if (!filename) return urlOrPath;

  const repoRoot = path.resolve(__dirname, '../../../../');
  const matlabRoot = path.join(repoRoot, 'DR_Screening_MATLAB');

  const candidateDirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../../uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), '../uploads'),
    path.join(process.cwd(), 'backend/uploads'),
    path.join(matlabRoot, 'data/EyeQ/figure'),
    path.join(matlabRoot, 'data/APTOS/train_images'),
    path.join(matlabRoot, 'data/EyePACS/download/train/extracted/train'),
    path.join(matlabRoot, 'data/EyePACS/train_images'),
    path.join(repoRoot, 'DR_Screening_MATLAB/data/EyeQ/figure'),
    path.join(repoRoot, 'DR_Screening_MATLAB/data/APTOS/train_images'),
    path.join(repoRoot, 'DR_Screening_MATLAB/data/EyePACS/download/train/extracted/train'),
    path.join(process.cwd(), 'dataset'),
    path.join(process.cwd(), '../dataset')
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, filename);
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'png';
        const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
        const b64 = fs.readFileSync(fullPath).toString('base64');
        return `data:${mime};base64,${b64}`;
      }
    } catch {
      // Continue to next candidate
    }
  }

  try {
    if (fs.existsSync(urlOrPath) && fs.statSync(urlOrPath).isFile()) {
      const ext = path.extname(urlOrPath).toLowerCase().replace('.', '') || 'png';
      const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
      const b64 = fs.readFileSync(urlOrPath).toString('base64');
      return `data:${mime};base64,${b64}`;
    }
  } catch {
    // Continue
  }

  if (urlOrPath.startsWith('/uploads/') || urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  return `/uploads/${filename}`;
}

export class ReportService {
  private store: DatabaseStore;

  constructor() {
    this.store = DatabaseStore.getInstance();
  }

  public async generateReportCard(screeningId: string): Promise<Buffer> {
    const pythonExe = 'C:\\Users\\Appasaheb\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
    const scriptPath = path.resolve(__dirname, '../../generate_card.py');
    const outPath = path.resolve(__dirname, `../../uploads/card_${screeningId}.png`);

    try {
      await execFileAsync(pythonExe, [scriptPath, screeningId, outPath], {
        cwd: path.resolve(__dirname, '../../')
      });
      if (fs.existsSync(outPath)) {
        return fs.readFileSync(outPath);
      }
    } catch (err) {
      console.error(`Error generating clinical report card for ${screeningId}:`, err);
    }
    throw new Error(`Failed to generate 1200x750 report card for screening ${screeningId}`);
  }

  public generateReportHtml(screening: Screening): string {
    const isRejected = (
      screening.status === 'rejected' ||
      screening.quality?.quality_gate === 'reject' ||
      screening.quality?.status === 'rejected' ||
      screening.quality?.qualityClass === 'Reject' ||
      screening.final_decision === 'RECAPTURE'
    );

    const gradeLabels: { [key: number]: string } = {
      0: 'Grade 0 — No DR',
      1: 'Grade 1 — Mild NPDR',
      2: 'Grade 2 — Moderate NPDR',
      3: 'Grade 3 — Severe NPDR',
      4: 'Grade 4 — Proliferative DR'
    };

    const fullGradeLabels: { [key: number]: string } = {
      0: 'No Diabetic Retinopathy',
      1: 'Mild Non-Proliferative DR',
      2: 'Moderate Non-Proliferative DR',
      3: 'Severe Non-Proliferative DR',
      4: 'Proliferative Diabetic Retinopathy'
    };

    const grade = !isRejected ? (screening.classification?.predicted_grade ?? null) : null;
    const clf: any = screening.classification || {};
    const pCalibrated = clf.g2plus_probability_calibrated;
    const thresholdVal = clf.threshold ?? 0.2993;

    // Final Decision: REFER, SCREEN, or RECAPTURE
    let decision: 'REFER' | 'SCREEN' | 'RECAPTURE' = 'SCREEN';
    if (isRejected) {
      decision = 'RECAPTURE';
    } else if (clf.decision === 'REFER' || screening.final_decision === 'REFER' || (typeof pCalibrated === 'number' && pCalibrated >= thresholdVal)) {
      decision = 'REFER';
    } else {
      decision = 'SCREEN';
    }

    // Dynamic Clinical Explanation
    let dynamicExplanation = '';
    if (decision === 'REFER') {
      const pPct = typeof pCalibrated === 'number' ? (pCalibrated * 100).toFixed(1) + '%' : 'high';
      const thPct = `${(thresholdVal * 100).toFixed(1)}%`;
      dynamicExplanation = `NetraAI classified this screening as REFERABLE because the calibrated probability of Grade 2+ diabetic retinopathy (${pPct}) exceeded the frozen screening threshold (${thPct}). The highlighted retinal regions indicate the areas that contributed most strongly to the model's prediction.`;
    } else if (decision === 'SCREEN') {
      const pPct = typeof pCalibrated === 'number' ? (pCalibrated * 100).toFixed(1) + '%' : 'low';
      const thPct = `${(thresholdVal * 100).toFixed(1)}%`;
      dynamicExplanation = `NetraAI classified this screening as NON-REFERABLE because the calibrated probability of Grade 2+ diabetic retinopathy (${pPct}) remained below the frozen screening threshold (${thPct}). The highlighted regions show where the model's prediction was concentrated.`;
    } else {
      dynamicExplanation = 'The image did not meet the screening image-quality requirements. No downstream DR classification was performed. A new retinal image should be captured.';
    }

    // Clinical Action
    let clinicalAction = '';
    if (decision === 'REFER') {
      clinicalAction = 'Referral recommended for ophthalmic evaluation.';
    } else if (decision === 'SCREEN') {
      clinicalAction = 'Continue routine diabetic-retinopathy screening according to local clinical protocol.';
    } else {
      clinicalAction = 'Recapture the affected eye before screening.';
    }

    // Patient Demographics (strictly real values; "Not provided" if absent; never fake names)
    const patient = screening.patient;
    const patientCode = patient?.patient_code || 'Not provided';
    const patientName = patient?.name || 'Not provided';
    const patientAge = (patient?.age !== undefined && patient.age !== null) ? `${patient.age} Yrs` : 'Not provided';
    const patientSex = patient?.gender || 'Not provided';
    const screeningCentre = screening.facility?.name || 'Not provided';
    const cameraDevice = screening.image?.device_id || 'Not provided';
    const technician = (screening as any).technician_name || (screening as any).technician || (screening as any).operator || 'Not provided';
    const encounterNotes = screening.notes || 'Not provided';

    const screeningDate = new Date(screening.created_at || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const screeningIdDisplay = screening.id ? screening.id.slice(0, 8).toUpperCase() : 'UNASSIGNED';

    // Eye Resolution (Never infer side)
    const eyeRaw = (screening.eye || '').trim().toLowerCase();
    let eyeImagedLabel = 'Not provided';
    let isLeft = false;
    let isRight = false;
    if (eyeRaw === 'left') {
      eyeImagedLabel = 'Left Eye (OS)';
      isLeft = true;
    } else if (eyeRaw === 'right') {
      eyeImagedLabel = 'Right Eye (OD)';
      isRight = true;
    } else if (eyeRaw) {
      eyeImagedLabel = eyeRaw.toUpperCase();
    }

    // Source image artifact
    const originalUrl = screening.image?.storage_url || (screening as any).imagePath || (screening as any).imageUrl || screening.image?.original_filename || '';
    const originalSrc = resolveImageSrc(originalUrl);
    const gradcamUrl = screening.explainability?.gradcam_url || (screening as any).gradcamUrl || '';
    const gradcamSrc = resolveImageSrc(gradcamUrl);

    // Module 3 Retinal Evidence (Only if genuinely produced)
    const vesselUrl = screening.segmentation?.vessel_mask_url || '';
    const vesselSrc = resolveImageSrc(vesselUrl);
    const hasVesselEvidence = Boolean(screening.segmentation && (screening.segmentation.vessel_coverage !== undefined || vesselSrc));
    const vesselCoverage = typeof screening.segmentation?.vessel_coverage === 'number'
      ? `${screening.segmentation.vessel_coverage.toFixed(2)}%`
      : 'Unavailable';

    const lesionUrl = screening.segmentation?.lesion_mask_url || '';
    const lesionSrc = resolveImageSrc(lesionUrl);
    const hasLesionEvidence = Boolean(screening.segmentation && (screening.segmentation.candidate_count !== undefined || lesionSrc));
    const candidateCoverage = typeof screening.segmentation?.lesion_coverage === 'number'
      ? `${screening.segmentation.lesion_coverage.toFixed(2)}%`
      : 'Unavailable';
    const candidateCount = screening.segmentation?.candidate_count !== undefined
      ? `${screening.segmentation.candidate_count}`
      : 'Unavailable';
    const brightCount = (screening.segmentation as any)?.bright_lesion_count;
    const darkCount = (screening.segmentation as any)?.dark_lesion_count;

    // Severity grade probabilities (Secondary)
    let rawProbabilities: number[] = [];
    if (Array.isArray(clf.classProbabilities) && clf.classProbabilities.length > 0) {
      rawProbabilities = Array.isArray(clf.classProbabilities[0]) ? clf.classProbabilities[0] : clf.classProbabilities;
    } else if (Array.isArray(clf.grade_probabilities) && clf.grade_probabilities.length > 0) {
      rawProbabilities = Array.isArray(clf.grade_probabilities[0]) ? clf.grade_probabilities[0] : clf.grade_probabilities;
    }

    const pCalibratedDisplay = typeof pCalibrated === 'number'
      ? `${(pCalibrated * 100).toFixed(1)}%`
      : 'Unavailable';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetraAI Clinical Screening Report — REP-${screeningIdDisplay}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13.5px;
    }
    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .top-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #0284c7; color: #ffffff; }
    .btn-primary:hover { background: #0369a1; }
    .btn-secondary { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; }

    /* Top Brand Header */
    .brand-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-title span { color: #0284c7; }
    .brand-sub {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }
    .report-meta-box {
      text-align: right;
    }
    .report-id {
      font-size: 14px;
      font-weight: 700;
      color: #0284c7;
    }
    .report-date {
      font-size: 12px;
      color: #64748b;
      margin-top: 3px;
    }

    /* 1. VISUALLY DOMINANT CLINICAL RESULT CARD */
    .clinical-result-card {
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 28px;
      border-width: 2px;
      border-style: solid;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .card-refer {
      background: #fef2f2;
      border-color: #f87171;
    }
    .card-screen {
      background: #ecfdf5;
      border-color: #6ee7b7;
    }
    .card-recapture {
      background: #fff7ed;
      border-color: #fdba74;
    }
    .badge-dominant {
      display: inline-block;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 1px;
      text-align: center;
      color: #ffffff;
      min-width: 200px;
    }
    .badge-refer { background: #dc2626; }
    .badge-screen { background: #059669; }
    .badge-recapture { background: #d97706; }

    .result-primary-title {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.2;
    }
    .title-refer { color: #b91c1c; }
    .title-screen { color: #047857; }
    .title-recapture { color: #b45309; }

    .result-primary-sub {
      font-size: 15px;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
    }
    .result-details {
      margin-top: 12px;
      font-size: 14px;
      line-height: 1.6;
    }
    .result-details strong { color: #0f172a; }

    /* Section Cards */
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #475569;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 14px;
      background: #0284c7;
      border-radius: 2px;
    }
    .content-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 24px;
    }

    /* Metadata Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px 20px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.3px;
    }
    .meta-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Eye Section */
    .eye-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .eye-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #f8fafc;
      text-align: center;
    }
    .eye-header {
      padding: 10px 14px;
      font-weight: 700;
      font-size: 13px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .eye-img-container {
      background: #0f172a;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240px;
    }
    .fundus-img {
      max-width: 100%;
      max-height: 250px;
      height: auto;
      object-fit: contain;
      border-radius: 4px;
    }
    .eye-not-captured {
      color: #94a3b8;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 240px;
      background: #f8fafc;
    }

    /* Explainability Card */
    .expl-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .expl-img-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #0f172a;
      text-align: center;
      padding: 12px;
    }
    .expl-caption {
      margin-top: 12px;
      font-size: 12.5px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      line-height: 1.5;
    }

    /* Retinal Evidence */
    .evidence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .evidence-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #f8fafc;
    }
    .evidence-body {
      background: #0f172a;
      padding: 12px;
      text-align: center;
    }
    .evidence-footer {
      padding: 10px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #475569;
    }

    /* Dynamic Why Result Card */
    .why-result-card {
      background: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
      font-size: 13.5px;
      color: #1e293b;
      line-height: 1.6;
    }

    /* Clinical Action Card */
    .action-card {
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .action-refer {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }
    .action-screen {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }
    .action-recapture {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #9a3412;
    }

    /* Five Grade Severity Table */
    .severity-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin-top: 8px;
    }
    .severity-table th, .severity-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .severity-table th {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
    }
    .severity-active-row {
      background: #eff6ff;
      font-weight: 700;
      color: #1d4ed8;
    }
    .prob-bar-container {
      background: #e2e8f0;
      border-radius: 999px;
      height: 8px;
      width: 120px;
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
    }
    .prob-bar {
      height: 100%;
      background: #0284c7;
      border-radius: 999px;
    }

    /* Technical Footer */
    .technical-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 11.5px;
      color: #64748b;
    }
    .disclaimer {
      margin-top: 16px;
      padding: 12px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 6px;
      font-size: 11px;
      color: #92400e;
      line-height: 1.4;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .sig-line {
      width: 200px;
      border-top: 1px solid #64748b;
      margin-top: 36px;
      text-align: center;
      font-size: 11.5px;
      color: #64748b;
    }

    /* Print / PDF Styles */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-container {
        max-width: 100%;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .page-break-before {
        page-break-before: always;
        break-before: page;
      }
      .avoid-break {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
    }
  </style>
</head>
<body>

<div class="report-container">
  <!-- Top Action Bar (hidden on print) -->
  <div class="top-actions no-print">
    <button onclick="window.print()" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print / Save PDF
    </button>
    <a href="/api/reports/${screening.id}/card" target="_blank" class="btn btn-secondary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Clinical Card (PNG)
    </a>
  </div>

  <!-- Brand Header -->
  <div class="brand-header">
    <div>
      <div class="brand-title">NETRA<span>AI</span></div>
      <div class="brand-sub">AI-Assisted Diabetic Retinopathy Screening</div>
    </div>
    <div class="report-meta-box">
      <div class="report-id">Report ID: REP-${screeningIdDisplay}</div>
      <div class="report-date">Screening Date: ${screeningDate}</div>
    </div>
  </div>

  <!-- PAGE 1: PRIMARY CLINICAL RESULT CARD (VISUALLY DOMINANT) -->
  <div class="clinical-result-card ${decision === 'REFER' ? 'card-refer' : (decision === 'RECAPTURE' ? 'card-recapture' : 'card-screen')} avoid-break">
    <div>
      <div class="result-primary-title ${decision === 'REFER' ? 'title-refer' : (decision === 'RECAPTURE' ? 'title-recapture' : 'title-screen')}">
        ${decision === 'REFER' ? 'DIABETIC RETINOPATHY: DETECTED' : (decision === 'RECAPTURE' ? 'IMAGE QUALITY INSUFFICIENT' : 'NO REFERABLE DR DETECTED')}
      </div>
      <div class="result-primary-sub">
        ${decision === 'REFER' ? 'REFERABLE DR (G2+)' : (decision === 'RECAPTURE' ? 'RECAPTURE REQUIRED' : 'NON-REFERABLE')}
      </div>
      <div class="result-details">
        ${!isRejected && typeof pCalibrated === 'number' ? `
          Calibrated G2+ Probability: <strong>${pCalibratedDisplay}</strong> (Operating Threshold: ${(thresholdVal * 100).toFixed(1)}%)<br/>
          Predicted Severity: <strong>${grade !== null && gradeLabels[grade] ? gradeLabels[grade] : (clf.grade_label || 'Not graded')}</strong>
        ` : `
          Optical quality criteria not met. Downstream AI grading halted.<br/>
          Recapture the affected eye before screening.
        `}
      </div>
    </div>
    <div>
      <div class="badge-dominant ${decision === 'REFER' ? 'badge-refer' : (decision === 'RECAPTURE' ? 'badge-recapture' : 'badge-screen')}">
        ${decision}
      </div>
    </div>
  </div>

  <!-- CLINICAL ACTION CALLOUT -->
  <div class="action-card ${decision === 'REFER' ? 'action-refer' : (decision === 'RECAPTURE' ? 'action-recapture' : 'action-screen')} avoid-break">
    <div style="font-size: 20px;">
      ${decision === 'REFER' ? '⚠️' : (decision === 'RECAPTURE' ? '🔄' : '✅')}
    </div>
    <div>
      <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Recommended Clinical Action</div>
      <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">
        ${clinicalAction}
      </div>
    </div>
  </div>

  <!-- PATIENT / TECHNICIAN INFORMATION -->
  <div class="content-box avoid-break">
    <div class="section-title">Patient & Encounter Information</div>
    <div class="grid-meta">
      <div class="meta-item">
        <span class="meta-label">Patient ID</span>
        <span class="meta-value">${patientCode}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Patient Name</span>
        <span class="meta-value">${patientName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Age</span>
        <span class="meta-value">${patientAge}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Sex</span>
        <span class="meta-value">${patientSex}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Eye Imaged</span>
        <span class="meta-value">${eyeImagedLabel}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Technician</span>
        <span class="meta-value">${technician}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Screening Centre</span>
        <span class="meta-value">${screeningCentre}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Camera / Device</span>
        <span class="meta-value">${cameraDevice}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Screening Date</span>
        <span class="meta-value">${screeningDate}</span>
      </div>
      <div class="meta-item" style="grid-column: 1 / -1;">
        <span class="meta-label">Notes</span>
        <span class="meta-value">${encounterNotes}</span>
      </div>
    </div>
  </div>

  <!-- EYE IMAGE SECTION (LEFT EYE / RIGHT EYE) -->
  <div class="content-box avoid-break">
    <div class="section-title">Eye Image Section</div>
    <div class="eye-grid">
      <!-- LEFT EYE -->
      <div class="eye-card">
        <div class="eye-header">
          <span>LEFT EYE (OS)</span>
          <span style="font-size: 11px; font-weight: 600; color: ${isLeft ? '#0284c7' : '#94a3b8'};">
            ${isLeft ? 'Captured Scan' : 'Not captured'}
          </span>
        </div>
        <div class="eye-img-container">
          ${isLeft && originalSrc ? `
            <img src="${originalSrc}" alt="Left Eye Fundus" class="fundus-img" />
          ` : `
            <div class="eye-not-captured">
              <span style="font-size: 24px; margin-bottom: 6px;">👁️</span>
              <span>Not captured</span>
            </div>
          `}
        </div>
      </div>

      <!-- RIGHT EYE -->
      <div class="eye-card">
        <div class="eye-header">
          <span>RIGHT EYE (OD)</span>
          <span style="font-size: 11px; font-weight: 600; color: ${isRight ? '#0284c7' : '#94a3b8'};">
            ${isRight ? 'Captured Scan' : 'Not captured'}
          </span>
        </div>
        <div class="eye-img-container">
          ${isRight && originalSrc ? `
            <img src="${originalSrc}" alt="Right Eye Fundus" class="fundus-img" />
          ` : `
            <div class="eye-not-captured">
              <span style="font-size: 24px; margin-bottom: 6px;">👁️</span>
              <span>Not captured</span>
            </div>
          `}
        </div>
      </div>
    </div>
  </div>

  <!-- WHY DID NETRAAI GIVE THIS RESULT? -->
  <div class="why-result-card avoid-break">
    <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">
      Why Did NetraAI Give This Result?
    </div>
    <div>${dynamicExplanation}</div>
  </div>

  <!-- WHY THIS RESULT? — MAIN EXPLAINABILITY SECTION (ORIGINAL FUNDUS + GRAD-CAM OVERLAY) -->
  <div class="content-box avoid-break">
    <div class="section-title">Why This Result? — Explainable AI (Grad-CAM Attribution)</div>
    <div class="expl-grid">
      <div class="expl-img-box">
        <div style="color: #94a3b8; font-size: 12px; font-weight: 600; margin-bottom: 8px;">ORIGINAL FUNDUS (${eyeImagedLabel})</div>
        ${originalSrc ? `<img src="${originalSrc}" alt="Original Fundus" class="fundus-img" />` : '<div style="color:#64748b; padding: 60px 0;">Image Unavailable</div>'}
      </div>
      <div class="expl-img-box">
        <div style="color: #94a3b8; font-size: 12px; font-weight: 600; margin-bottom: 8px;">GRAD-CAM / MODEL ATTRIBUTION OVERLAY</div>
        ${!isRejected && gradcamSrc ? `
          <img src="${gradcamSrc}" alt="Grad-CAM Overlay" class="fundus-img" />
        ` : (isRejected ? `
          <div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">
            <div style="font-size: 24px; margin-bottom: 6px;">⏸️</div>
            Halted at Quality Gate
          </div>
        ` : '<div style="color:#64748b; padding: 60px 0;">Grad-CAM Overlay Unavailable</div>')}
      </div>
    </div>
    <div class="expl-caption">
      <strong>Explanation:</strong> Highlighted retinal regions indicate areas that contributed most strongly to the model's screening prediction.<br/>
      <span style="font-size: 11px; color: #64748b;">* Attribution is model evidence, not a diagnostic ground-truth mask.</span>
    </div>
  </div>

  <!-- KEY RETINAL EVIDENCE (MODULE 3 GENUINE EVIDENCE ONLY) -->
  <div class="content-box avoid-break">
    <div class="section-title">Key Retinal Evidence</div>
    ${(!isRejected && (hasVesselEvidence || hasLesionEvidence)) ? `
      <div class="evidence-grid">
        ${hasVesselEvidence ? `
          <div class="evidence-card">
            <div class="eye-header">
              <span>Vessel Evidence</span>
              <span style="font-size: 11px; color: #0284c7; font-weight: 600;">Coverage: ${vesselCoverage}</span>
            </div>
            <div class="evidence-body">
              ${vesselSrc ? `<img src="${vesselSrc}" alt="Vessel Evidence" class="fundus-img" />` : '<div style="color:#64748b; padding: 40px 0;">Vessel Map Unavailable</div>'}
            </div>
            <div class="evidence-footer">
              Vessel density: <strong>${vesselCoverage}</strong> | Extracted retinal vasculature structure.
            </div>
          </div>
        ` : ''}

        ${hasLesionEvidence ? `
          <div class="evidence-card">
            <div class="eye-header">
              <span>Candidate Lesion Evidence</span>
              <span style="font-size: 11px; color: #d97706; font-weight: 600;">${candidateCount} Candidates</span>
            </div>
            <div class="evidence-body">
              ${lesionSrc ? `<img src="${lesionSrc}" alt="Lesion Evidence" class="fundus-img" />` : '<div style="color:#64748b; padding: 40px 0;">Lesion Map Unavailable</div>'}
            </div>
            <div class="evidence-footer">
              Candidate Coverage: <strong>${candidateCoverage}</strong> | Candidates: <strong>${candidateCount}</strong>
              ${brightCount !== undefined || darkCount !== undefined ? `<br/>Bright lesions: <strong>${brightCount ?? 0}</strong> | Dark lesions: <strong>${darkCount ?? 0}</strong>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-top: 10px;">
        * Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinical review and do not constitute independent diagnostic proof.
      </div>
    ` : `
      <div style="color: #64748b; font-size: 13px; padding: 8px 0;">
        ${isRejected ? 'Retinal segmentation was halted at the Image Quality Gate. No lesion or vessel evidence extracted.' : 'No additional Module 3 retinal evidence generated for this screening.'}
      </div>
    `}
  </div>

  <!-- FIVE-GRADE SEVERITY (SECONDARY TO REFER/SCREEN DECISION) -->
  <div class="content-box avoid-break">
    <div class="section-title">Predicted Severity (Secondary Classification)</div>
    ${!isRejected && rawProbabilities.length >= 5 ? `
      <table class="severity-table">
        <thead>
          <tr>
            <th>Severity Grade</th>
            <th>Clinical Description</th>
            <th style="text-align: right;">Model Probability</th>
            <th style="width: 140px;">Distribution</th>
          </tr>
        </thead>
        <tbody>
          ${[0, 1, 2, 3, 4].map(g => {
            const prob = rawProbabilities[g] ?? 0;
            const pct = (prob * 100).toFixed(1);
            const isPredicted = (grade === g);
            return `
              <tr class="${isPredicted ? 'severity-active-row' : ''}">
                <td><strong>Grade ${g}</strong> ${isPredicted ? '◀ (Predicted)' : ''}</td>
                <td>${fullGradeLabels[g]}</td>
                <td style="text-align: right; font-weight: 600;">${pct}%</td>
                <td>
                  <div class="prob-bar-container">
                    <div class="prob-bar" style="width: ${Math.min(100, Math.max(2, parseFloat(pct)))}%; background: ${isPredicted ? '#0284c7' : '#94a3b8'};"></div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
        * The 5-grade severity classification is secondary to the primary frozen G2+ referral decision (Operating threshold: τ* = ${(thresholdVal * 100).toFixed(1)}%).
      </div>
    ` : `
      <div style="color: #64748b; font-size: 13px;">
        ${isRejected ? 'Downstream 5-grade severity grading was halted due to image quality requirements.' : (grade !== null && gradeLabels[grade] ? `Predicted Severity: <strong>${gradeLabels[grade]}</strong>` : 'Five-grade probability distribution unavailable.')}
      </div>
    `}
  </div>

  <!-- MODEL INFORMATION FOOTER (COMPACT) -->
  <div class="technical-footer avoid-break">
    <div><strong>Model:</strong> Swin V2 Tiny</div>
    <div><strong>Input:</strong> 512 × 512</div>
    <div><strong>Model Version:</strong> v1.0-frozen</div>
    <div><strong>Calibration:</strong> Temperature Scaling (T = 1.4555)</div>
    <div><strong>Decision Threshold:</strong> τ* = ${(thresholdVal * 100).toFixed(1)}%</div>
  </div>

  <!-- CLINICAL DISCLAIMER -->
  <div class="disclaimer avoid-break">
    <strong>CLINICAL DISCLAIMER:</strong> This screening report is generated by an AI-assisted computer vision system for diabetic retinopathy screening in rural tele-ophthalmology workflows (SIH26038 | Team: Career Crafters). This screening output does not constitute an independent clinical diagnosis and must not replace examination by a qualified eye-care professional.
  </div>

  <!-- SIGNATURES -->
  <div class="signatures avoid-break">
    <div>
      <div>Screening Operator / Technician:</div>
      <div class="sig-line">${technician !== 'Not provided' ? technician : 'Field Health Worker / ASHA'}</div>
    </div>
    <div>
      <div>Reviewing Clinician / Ophthalmologist:</div>
      <div class="sig-line">Medical Officer / Ophthalmologist</div>
    </div>
  </div>
</div>

</body>
</html>`;
  }
}
