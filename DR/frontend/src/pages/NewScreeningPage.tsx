import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  Search,
  Plus,
  Loader2,
  RefreshCw,
  FileCheck,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles
} from 'lucide-react';
import { Patient, Facility, ImageQualityResult } from '../types';
import { api } from '../services/api';

export const NewScreeningPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Patient Selection State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patientId') || '');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');

  // Register Patient Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerFormData, setRegisterFormData] = useState({
    name: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    location: '',
    diabetes_duration_years: '5'
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Step 2 Ingestion State
  const [eye, setEye] = useState<'left' | 'right'>('left');
  const [deviceId, setDeviceId] = useState('');
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadedStorageUrl, setUploadedStorageUrl] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Step 3 & 4 Analysis State
  const [createdScreeningId, setCreatedScreeningId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>('idle');
  const [error, setError] = useState('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    api.getPatients().then(res => setPatients(res.patients)).catch(() => {});
    api.getFacilities().then(res => {
      setFacilities(res.facilities);
      if (res.facilities.length > 0) setSelectedFacilityId(res.facilities[0].id);
    }).catch(() => {});
  }, []);

  // Filtered patients for searchable selector
  const filteredPatients = patients.filter(p => {
    if (!patientSearch.trim()) return true;
    const term = patientSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.patient_code.toLowerCase().includes(term) || (p.location && p.location.toLowerCase().includes(term));
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    setSelectedFileName(file.name);
    try {
      const res = await api.uploadImage(file);
      setUploadedStorageUrl(res.storageUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err: any) {
      setError(err.message || 'Image upload failed. Please verify image format.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);
    try {
      const res = await api.registerPatient({
        name: registerFormData.name,
        age: parseInt(registerFormData.age, 10),
        gender: registerFormData.gender,
        phone: registerFormData.phone,
        location: registerFormData.location,
        diabetes_duration_years: parseInt(registerFormData.diabetes_duration_years, 10),
        facility_id: selectedFacilityId || facilities[0]?.id
      });
      // Add new patient and select
      setPatients(prev => [res.patient, ...prev]);
      setSelectedPatientId(res.patient.id);
      setShowRegisterModal(false);
      setRegisterFormData({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        location: '',
        diabetes_duration_years: '5'
      });
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to register patient');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedPatientId) {
      setError('Please select a patient to proceed');
      return;
    }
    if (!uploadedStorageUrl) {
      setError('Please upload a fundus photograph before initiating AI screening');
      return;
    }

    setCurrentStep(4);
    setIsAnalyzing(true);
    setError('');

    try {
      setAnalysisStage('Creating screening encounter...');
      const screeningRes = await api.createScreening({
        patientId: selectedPatientId,
        facilityId: selectedFacilityId || facilities[0]?.id,
        eye: eye,
        notes: notes || 'Clinical retinal tele-screening encounter',
        imageStorageUrl: uploadedStorageUrl,
        originalFilename: selectedFileName || `fundus_${eye}.jpg`,
        deviceId: deviceId
      });

      const screeningId = screeningRes.screening.id;
      setCreatedScreeningId(screeningId);

      setAnalysisStage('Executing EyeQ quality gate & Swin V2 Tiny grading...');
      await api.runAnalysis(screeningId);
      setAnalysisStage('Analysis complete. Loading clinical result...');

      navigate(`/screenings/${screeningId}`);
    } catch (err: any) {
      setError(err.message || 'AI analysis execution encountered a service error');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Workflow Header */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Retinal Screening Encounter</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard 4-step clinical protocol: Patient Selection → Image Ingestion → Quality Gate → AI Screening Result
            </p>
          </div>
          <Link
            to="/screenings"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg self-start sm:self-auto transition"
          >
            Screening History
          </Link>
        </div>

        {/* 4-Step Clinical Workflow Indicator */}
        <div className="grid grid-cols-4 gap-2 pt-4 mt-2 border-t border-slate-100 text-xs font-medium">
          <div className={`p-2 rounded-lg border flex items-center gap-2 transition ${
            currentStep === 1
              ? 'bg-sky-50 border-sky-400 text-sky-950 font-semibold'
              : (currentStep > 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400')
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 1 ? 'bg-sky-600 text-white' : (currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600')
            }`}>1</span>
            <span className="truncate">Patient</span>
          </div>

          <div className={`p-2 rounded-lg border flex items-center gap-2 transition ${
            currentStep === 2
              ? 'bg-sky-50 border-sky-400 text-sky-950 font-semibold'
              : (currentStep > 2 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400')
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 2 ? 'bg-sky-600 text-white' : (currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600')
            }`}>2</span>
            <span className="truncate">Capture</span>
          </div>

          <div className={`p-2 rounded-lg border flex items-center gap-2 transition ${
            currentStep === 3
              ? 'bg-sky-50 border-sky-400 text-sky-950 font-semibold'
              : (currentStep > 3 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400')
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 3 ? 'bg-sky-600 text-white' : (currentStep > 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600')
            }`}>3</span>
            <span className="truncate">Quality</span>
          </div>

          <div className={`p-2 rounded-lg border flex items-center gap-2 transition ${
            currentStep === 4
              ? 'bg-sky-50 border-sky-400 text-sky-950 font-semibold'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 4 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>4</span>
            <span className="truncate">AI Result</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 1: PATIENT SELECTION                                     */}
      {/* ============================================================= */}
      {currentStep === 1 && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Step 1: Patient Selection</h2>
              <p className="text-xs text-slate-500">Search and select patient record or register a new patient</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Patient</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient by name, ID (e.g. DR-MH-2026-0006), or village..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none"
            />
          </div>

          {/* Search Results Dropdown/List */}
          <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredPatients.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching patients found. Click "+ Register New Patient" to add.
              </div>
            ) : (
              filteredPatients.slice(0, 8).map((p) => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setError('');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                      isSelected ? 'bg-sky-50/80 font-semibold text-sky-950' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block">{p.name}</span>
                      <span className="text-[11px] text-slate-500 block">
                        {p.age} Yrs · {p.gender} · {p.location || 'Rural Centre'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[11px] font-semibold text-slate-600 block">
                        {p.patient_code}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-sky-700 font-bold uppercase">Selected</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Patient Compact Summary */}
          {selectedPatient && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Selected Patient
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{selectedPatient.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                      {selectedPatient.patient_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedPatient.age} years · {selectedPatient.gender} · {selectedPatient.location || 'Rural Centre'}
                  </p>
                </div>
                <div className="text-xs text-slate-500 sm:text-right">
                  <span>Diabetes History: <strong>{selectedPatient.diabetes_duration_years || 0} years</strong></span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={!selectedPatientId}
              onClick={() => {
                if (!selectedPatientId) {
                  setError('Please select a patient before continuing');
                  return;
                }
                setCurrentStep(2);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition disabled:opacity-50"
            >
              <span>Continue to Image Capture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 2: FUNDUS CAPTURE & INGESTION                            */}
      {/* ============================================================= */}
      {currentStep === 2 && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Step 2: Fundus Photograph Ingestion</h2>
              <p className="text-xs text-slate-500">
                Patient: <strong>{selectedPatient?.name}</strong> ({selectedPatient?.patient_code})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Change Patient
            </button>
          </div>

          {/* Eye Examined Selector (Strict OS / OD Labeling) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Examined Eye *
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setEye('left')}
                className={`p-3 rounded-lg border text-xs font-medium text-center transition flex items-center justify-center gap-2 ${
                  eye === 'left'
                    ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold ring-1 ring-sky-600'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-600" />
                <span>Left Eye (OS - Oculus Sinister)</span>
              </button>
              <button
                type="button"
                onClick={() => setEye('right')}
                className={`p-3 rounded-lg border text-xs font-medium text-center transition flex items-center justify-center gap-2 ${
                  eye === 'right'
                    ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold ring-1 ring-sky-600'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-600" />
                <span>Right Eye (OD - Oculus Dexter)</span>
              </button>
            </div>
          </div>

          {/* 1-Click Approved Demo Cases (Real Production Pipeline on Approved Regression Cases) */}
          <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>1-Click Approved Demo Cases (Real Pipeline Execution)</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold uppercase">
                Demo Data
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Select an official locked regression case to execute the real Swin V2 Tiny / MATLAB screening pipeline:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUploadedStorageUrl('/uploads/002c21358ce6.png');
                  setPreviewUrl('/uploads/002c21358ce6.png');
                  setSelectedFileName('002c21358ce6.png');
                  setEye('left');
                  if (!selectedPatientId && patients.length > 0) setSelectedPatientId(patients[0].id);
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition ${
                  selectedFileName === '002c21358ce6.png'
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 font-semibold'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">Case 1: Normal</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">SCREEN (G0)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 block truncate mt-0.5">002c21358ce6.png</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadedStorageUrl('/uploads/001639a390f0.png');
                  setPreviewUrl('/uploads/001639a390f0.png');
                  setSelectedFileName('001639a390f0.png');
                  setEye('left');
                  if (!selectedPatientId && patients.length > 0) setSelectedPatientId(patients[0].id);
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition ${
                  selectedFileName === '001639a390f0.png'
                    ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500 font-semibold'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">Case 2: Proliferative</span>
                  <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-1 py-0.2 rounded">REFER (G4)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 block truncate mt-0.5">001639a390f0.png</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadedStorageUrl('/uploads/10_left.jpeg');
                  setPreviewUrl('/uploads/10_left.jpeg');
                  setSelectedFileName('10_left.jpeg');
                  setEye('left');
                  if (!selectedPatientId && patients.length > 0) setSelectedPatientId(patients[0].id);
                }}
                className={`p-2.5 rounded-lg border text-left text-xs transition ${
                  selectedFileName === '10_left.jpeg'
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500 font-semibold'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">Case 3: Quality Defect</span>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">RECAPTURE</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 block truncate mt-0.5">10_left.jpeg</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Fundus Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Digital Fundus Photograph *
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-6 text-center transition bg-slate-50/50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileUpload}
                className="hidden"
                id="fundus-file-input"
              />
              <label htmlFor="fundus-file-input" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-sky-700 hover:underline">Select Retinal Fundus Scan</span>
                  <span className="text-slate-500"> or drag and drop image file</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Supports standardized fundus formats (PNG, JPEG, TIFF) • Resolution: 512×512 or higher
                </p>
              </label>
            </div>
          </div>

          {/* Uploaded Thumbnail Preview */}
          {previewUrl && (
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-black border border-slate-200 flex-shrink-0">
                  <img src={previewUrl} alt="Fundus Preview" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-900 block truncate max-w-xs">
                    {selectedFileName || `fundus_${eye}.jpg`}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Image ingested successfully for {eye === 'left' ? 'Left Eye (OS)' : 'Right Eye (OD)'}</span>
                  </span>
                </div>
              </div>
              <label
                htmlFor="fundus-file-input"
                className="text-xs font-semibold text-sky-600 hover:text-sky-800 cursor-pointer underline"
              >
                Change Image
              </label>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!uploadedStorageUrl || isUploading}
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition disabled:opacity-50"
            >
              <span>Verify Quality Gate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 3: QUALITY CHECK GATE                                    */}
      {/* ============================================================= */}
      {currentStep === 3 && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Step 3: Quality Check Verification</h2>
            <p className="text-xs text-slate-500">
              Verifying optical criteria (illumination, focus sharpness, FOV boundary) before multi-stage AI grading
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-32 h-32 rounded-lg overflow-hidden bg-black border border-slate-300 flex-shrink-0">
              <img src={previewUrl} alt="Retinal Ingestion" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Optical Pre-Check: Ready for Quality Gate
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The automated EyeQ quality model will evaluate sharpness, illumination balance, and retinal field-of-view coverage.
                If accepted, frozen Swin V2 Tiny grading and Grad-CAM will execute immediately.
              </p>

              {/* Technical Details Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <span>Technical Quality Thresholds</span>
                  {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showTechnicalDetails && (
                  <div className="mt-2 p-2.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-600 space-y-1">
                    <div>Sharpness Threshold: &gt; 0.00005 (Modified Laplacian)</div>
                    <div>Illumination Range: 0.20 – 0.95 (Green Channel Luminance)</div>
                    <div>FOV Coverage Requirement: &gt; 65.0% (Binary Retinal Disc)</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Ingestion</span>
            </button>
            <button
              type="button"
              onClick={handleStartAnalysis}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Execute AI Screening Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 4: AI RESULT EXECUTION (Dominant Status)                 */}
      {/* ============================================================= */}
      {currentStep === 4 && (
        <div className="p-8 rounded-xl border border-slate-200 bg-white text-center space-y-5">
          <div className="w-12 h-12 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Running AI Screening Analysis...
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {analysisStage}
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-lg bg-slate-50 border border-slate-200 text-left font-mono text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Eye Examined:</span>
              <span className="font-bold text-slate-800">{eye === 'left' ? 'Left Eye (OS)' : 'Right Eye (OD)'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Patient Code:</span>
              <span className="font-bold text-slate-800">{selectedPatient?.patient_code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Backbone:</span>
              <span className="font-bold text-sky-700">Torchvision Swin V2 Tiny</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Calibration:</span>
              <span className="font-bold text-slate-800">Temperature Scaling (T = 1.4555)</span>
            </div>
          </div>
        </div>
      )}

      {/* Register Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevated max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Register New Patient</h3>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {registerError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={registerFormData.name}
                  onChange={(e) => setRegisterFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={registerFormData.age}
                    onChange={(e) => setRegisterFormData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="e.g. 52"
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gender *</label>
                  <select
                    value={registerFormData.gender}
                    onChange={(e) => setRegisterFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location / Village</label>
                  <input
                    type="text"
                    value={registerFormData.location}
                    onChange={(e) => setRegisterFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Baramati"
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Diabetes Duration</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={registerFormData.diabetes_duration_years}
                    onChange={(e) => setRegisterFormData(prev => ({ ...prev, diabetes_duration_years: e.target.value }))}
                    placeholder="Years"
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-subtle disabled:opacity-50"
                >
                  {registerLoading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
