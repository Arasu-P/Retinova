import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Calendar,
  MapPin,
  Phone,
  Eye,
  FileText,
  Clock,
  ArrowLeft,
  Printer,
  ChevronRight,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Patient, Screening } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const res = await api.getPatientById(id!);
      setPatient(res.patient);
    } catch (err) {
      console.error('Failed to load patient profile', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading patient longitudinal profile...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <p className="text-sm text-rose-600 font-semibold">Patient record not found.</p>
        <Link
          to="/patients"
          className="inline-block px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Return to Patient Registry
        </Link>
      </div>
    );
  }

  const latestScreening = patient.screenings && patient.screenings.length > 0
    ? patient.screenings[0]
    : null;

  const latestGrade = latestScreening?.classification?.predicted_grade;
  const isRefer = latestGrade !== undefined && latestGrade >= 2;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-3 py-1.5 rounded-lg transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Patient Registry</span>
        </Link>

        <Link
          to={`/screenings/new?patientId=${patient.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Screening Encounter</span>
        </Link>
      </div>

      {/* Patient Profile Header Card */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{patient.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-bold border border-sky-100">
                {patient.patient_code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{patient.location || 'Rural Screening Centre'}</span>
              <span>•</span>
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{patient.phone || 'Phone not recorded'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {latestGrade !== undefined ? (
              isRefer ? (
                <StatusBadge label={`Referable DR (Grade ${latestGrade})`} variant="refer" size="md" />
              ) : (
                <StatusBadge label={`Routine Screen (Grade ${latestGrade})`} variant="screen" size="md" />
              )
            ) : (
              <StatusBadge label="No Screenings Yet" variant="neutral" size="md" />
            )}
          </div>
        </div>

        {/* Demographics & History Metric Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-400 block">Age & Gender</span>
            <span className="font-semibold text-slate-800">{patient.age} Yrs · {patient.gender}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-400 block">Diabetes Duration</span>
            <span className="font-semibold text-slate-800">{patient.diabetes_duration_years || 0} Years</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-400 block">Registration Date</span>
            <span className="font-semibold text-slate-800">{new Date(patient.created_at).toLocaleDateString()}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-400 block">Total Screenings</span>
            <span className="font-semibold text-slate-800">{patient.screenings?.length || 0} Encounters</span>
          </div>
        </div>
      </div>

      {/* Longitudinal Screening History Timeline */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Longitudinal Screening History & Triage Decisions
          </h2>
          <p className="text-xs text-slate-500">
            Chronological audit of tele-retinal examinations and ICDR classification outcomes
          </p>
        </div>

        {(!patient.screenings || patient.screenings.length === 0) ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 space-y-2">
            <p>No screening encounters recorded for this patient.</p>
            <Link
              to={`/screenings/new?patientId=${patient.id}`}
              className="inline-block px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100 transition"
            >
              Start First Screening
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {patient.screenings.map((s) => {
              const isRejected = s.quality?.status === 'rejected' || s.quality?.quality_gate === 'reject' || s.final_decision === 'RECAPTURE';
              const decision = isRejected ? 'RECAPTURE' : (s.classification?.decision || s.final_decision || 'SCREEN');
              const grade = isRejected ? undefined : s.classification?.predicted_grade;
              const eyeCode = (s.eye || 'left').toLowerCase() === 'left' ? 'Left Eye (OS)' : 'Right Eye (OD)';
              const sDate = new Date(s.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{sDate}</span>
                      <span className="font-mono text-[11px] text-slate-500">• {eyeCode}</span>
                      {decision === 'REFER' && <StatusBadge label="REFER" variant="refer" size="sm" />}
                      {decision === 'SCREEN' && <StatusBadge label="SCREEN" variant="screen" size="sm" />}
                      {decision === 'RECAPTURE' && <StatusBadge label="RECAPTURE" variant="recapture" size="sm" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {grade !== undefined ? `ICDR Grade ${grade}` : 'Image Quality Rejected'} • {s.referral?.status || 'Routine Protocol'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Link
                      to={`/screenings/${s.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition"
                    >
                      <span>View Results</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <a
                      href={`/api/reports/${s.id}/html`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                      title="Print Clinical Report"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
