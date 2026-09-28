export type UserRole = 'admin' | 'healthcare_worker' | 'doctor' | 'district_manager';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  facility_id?: string;
  facility?: Facility;
}

export interface Facility {
  id: string;
  name: string;
  district: string;
  state: string;
  type: string;
  latitude?: number;
  longitude?: number;
  active_cameras: number;
  contact_phone?: string;
}

export interface Patient {
  id: string;
  patient_code: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone?: string;
  location: string;
  diabetes_duration_years: number;
  facility_id: string;
  created_at: string;
  updated_at: string;
  last_screening_date?: string;
  latest_dr_grade?: number;
  latest_referral_status?: string;
  screenings?: Screening[];
}

export type ScreeningStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
export type QualityGateStatus = 'good' | 'usable' | 'reject';

export interface ImageQualityResult {
  id: string;
  image_id: string;
  quality_score: number;
  sharpness: number;
  illumination: number;
  fov_coverage: number;
  artifact_area: number;
  status: 'accepted' | 'rejected';
  quality_gate: QualityGateStatus;
  quality_flags: string[];
  rejection_reason?: string;
  created_at: string;
}

export interface EnhancementResult {
  id: string;
  image_id: string;
  enhanced_image_url: string;
  method: string;
  processing_time_ms: number;
  created_at: string;
}

export interface SegmentationResult {
  id: string;
  image_id: string;
  vessel_coverage: number;
  lesion_coverage: number;
  candidate_count: number;
  vessel_mask_url: string;
  lesion_mask_url: string;
  processing_time_ms: number;
  created_at: string;
}

export interface ClassificationResult {
  id: string;
  screening_id: string;
  predicted_grade: 0 | 1 | 2 | 3 | 4;
  grade_label: string;
  raw_probability: number;
  calibrated_confidence: number;
  confidence_method: string;
  confidence_threshold: number;
  model_name: string;
  model_version: string;
  dataset_benchmark: string;
  processing_time_ms: number;
  created_at: string;
  g2plus_probability_raw?: number;
  g2plus_probability_calibrated?: number;
  temperature?: number;
  threshold?: number;
  referable?: boolean;
  decision?: 'REFER' | 'SCREEN';
  grade_probabilities?: number[];
  classProbabilities?: number[];
}

export interface EvidenceRegion {
  x: number;
  y: number;
  radius: number;
  importance: 'low' | 'medium' | 'high';
  feature_type: 'lesion_candidate' | 'vessel_tortuosity' | 'exudate_cluster' | 'hemorrhage_pattern';
  description: string;
}

export interface ExplainabilityResult {
  id: string;
  screening_id: string;
  gradcam_url: string;
  evidence_summary: string;
  evidence_regions: EvidenceRegion[];
  attention_focus: string;
  created_at: string;
}

export type ReferralStatus = 'No Referral' | 'Routine Referral' | 'Priority Referral' | 'Urgent Referral' | 'Recapture Recommended' | 'Screen (With Quality Flag)' | 'Routine Screening Complete' | 'Referral Recommended';
export type ReferralPriority = 'none' | 'routine' | 'priority' | 'urgent';

export interface ReferralResult {
  id: string;
  screening_id: string;
  status: ReferralStatus;
  priority: ReferralPriority;
  reason: string;
  action_taken: 'referral_pending' | 'referral_completed' | 'patient_advised' | 'followup_scheduled';
  action_notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface ScreeningEvent {
  id: string;
  screening_id: string;
  event_type: string;
  status: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ImageRecord {
  id: string;
  screening_id: string;
  storage_url: string;
  original_filename: string;
  eye: 'left' | 'right';
  device_id: string;
  captured_at: string;
  width: number;
  height: number;
  format: string;
}

export interface Screening {
  id: string;
  patient_id: string;
  facility_id: string;
  status: ScreeningStatus;
  final_decision?: string;
  eye: 'left' | 'right';
  notes?: string;
  created_at: string;
  completed_at?: string;
  processing_time_ms: number;
  timings?: any;
  patient?: Patient;
  facility?: Facility;
  image?: ImageRecord;
  quality?: ImageQualityResult;
  enhancement?: EnhancementResult;
  segmentation?: SegmentationResult;
  classification?: ClassificationResult;
  explainability?: ExplainabilityResult;
  referral?: ReferralResult;
  timeline?: ScreeningEvent[];
}

export interface SimulationParameters {
  title?: string;
  facilityId?: string;
  patientArrivalRate: number;
  cameras: number;
  imageAcquisitionTime: number;
  qualityRejectionRate: number;
  aiProcessingTime: number;
  aiResources: number;
  doctorReviewTime: number;
  doctors: number;
  workingHours: number;
  simulationDuration: number;
  connectivityBandwidthMbps?: number;
}

export interface SimulationResultData {
  id: string;
  simulationRunId: string;
  totalPatients: number;
  patientsProcessed: number;
  patientsWaiting: number;
  throughput: number;
  averageWaitingTime: number;
  maxWaitingTime: number;
  cameraUtilization: number;
  aiUtilization: number;
  doctorUtilization: number;
  rejectedImages: number;
  referralLoad: number;
  bottleneck: 'Camera Acquisition' | 'AI Inference Server' | 'Doctor Review' | 'Network Bandwidth' | 'None (Optimal)';
  additionalResources: {
    recommendedCameras: number;
    recommendedAiWorkers: number;
    recommendedDoctors: number;
    bandwidthSuggestionMbps: number;
    notes: string;
  };
  dailyThroughputSeries: Array<{
    day: number;
    arrived: number;
    screened: number;
    referred: number;
    avgWaitMin: number;
  }>;
  queueDepthSeries: Array<{
    timeHour: number;
    cameraQueue: number;
    aiQueue: number;
    doctorQueue: number;
  }>;
}

export interface SimulationRun {
  id: string;
  facility_id?: string;
  title: string;
  parameters: SimulationParameters;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  result?: SimulationResultData;
}

export interface ModuleStatus {
  name: string;
  code: string;
  category: 'ai' | 'simulation' | 'storage' | 'database';
  status: 'connected' | 'mock' | 'not_connected' | 'error';
  version: string;
  latencyMs: number;
  lastChecked: string;
  description: string;
  modelArchitecture?: string;
  benchmarkAccuracy?: string;
  endpoints: string[];
}
