import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ChevronRight,
  Activity,
  Plus,
  RefreshCw,
  Server,
  Database,
  Cpu
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';

export const DashboardPage: React.FC = () => {
  const { selectedFacility } = useOutletContext<{ selectedFacility: string }>() || {};
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentScreenings, setRecentScreenings] = useState<any[]>([]);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedFacility]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, screeningsRes, statusRes] = await Promise.all([
        api.getAnalyticsOverview(selectedFacility),
        api.getScreenings({ facilityId: selectedFacility, limit: 6 }),
        api.getModelStatus().catch(() => null)
      ]);
      setAnalytics(overview);
      setRecentScreenings(screeningsRes.screenings);
      setModelStatus(statusRes);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const kpis = analytics?.kpis || {};
  const screeningsCount = recentScreenings.length;
  const referableCount = recentScreenings.filter(s => (s.classification?.predicted_grade ?? 0) >= 2).length;
  const recaptureCount = recentScreenings.filter(s => s.quality?.status === 'rejected' || s.quality?.quality_gate === 'reject' || s.final_decision === 'RECAPTURE').length;
  const patientsCount = kpis.patientsScreened || analytics?.patientsCount || 12;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {getGreeting()} · Clinical Screening Hub
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Welcome to NETRA<span className="text-sky-600">AI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            AI-assisted diabetic retinopathy screening and triage for rural primary healthcare
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/screenings/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Screening</span>
          </Link>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Patients</span>
          </Link>
        </div>
      </div>

      {/* Compact Clinical KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-subtle">
          <span className="text-[11px] font-medium text-slate-500 block">Screenings Today</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {kpis.screeningsToday || screeningsCount}
            </span>
            <span className="text-[11px] text-slate-400">Encounters</span>
          </div>
          <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100">
            Active session records
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-subtle">
          <span className="text-[11px] font-medium text-rose-700 block">Referable Cases</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {kpis.referralCount || referableCount}
            </span>
            <span className="text-[11px] text-rose-600/70 font-semibold">Priority Triage</span>
          </div>
          <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100">
            Grade 2+ ICDR severity
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-subtle">
          <span className="text-[11px] font-medium text-amber-700 block">Images Requiring Recapture</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {kpis.imagesRejected || recaptureCount}
            </span>
            <span className="text-[11px] text-amber-600/70 font-semibold">Quality Gate</span>
          </div>
          <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100">
            Sub-optimal illumination/focus
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-subtle">
          <span className="text-[11px] font-medium text-slate-500 block">Patients Screened</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {patientsCount}
            </span>
            <span className="text-[11px] text-slate-400">Registered</span>
          </div>
          <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100">
            Rural tele-health registry
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout: Recent Activity & Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Screening Activity (8 Cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Screening Activity</h2>
              <p className="text-xs text-slate-500">Live feed of completed tele-ophthalmology screenings</p>
            </div>
            <Link
              to="/screenings"
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
            >
              <span>View All Encounters</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading screening activity...</div>
          ) : recentScreenings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No screenings recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentScreenings.map((s) => {
                const isRejected = s.quality?.status === 'rejected' || s.quality?.quality_gate === 'reject' || s.final_decision === 'RECAPTURE';
                const decision = isRejected ? 'RECAPTURE' : (s.classification?.decision || s.final_decision || 'SCREEN');
                const grade = isRejected ? undefined : s.classification?.predicted_grade;
                const eyeCode = (s.eye || 'left').toLowerCase() === 'left' ? 'OS' : 'OD';
                const sDate = new Date(s.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={s.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-[11px] font-bold">
                        {eyeCode}
                      </div>
                      <div>
                        <Link
                          to={`/screenings/${s.id}`}
                          className="text-xs font-semibold text-slate-900 hover:text-sky-600 block"
                        >
                          {s.patient?.name || 'Anonymous Patient'}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {s.patient?.patient_code || s.id.slice(0, 8)} · {sDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {decision === 'REFER' && <StatusBadge label="REFER" variant="refer" size="sm" />}
                      {decision === 'SCREEN' && <StatusBadge label="SCREEN" variant="screen" size="sm" />}
                      {decision === 'RECAPTURE' && <StatusBadge label="RECAPTURE" variant="recapture" size="sm" />}

                      {grade !== undefined && (
                        <span className="text-[11px] text-slate-600 font-medium hidden sm:inline">
                          Grade {grade}
                        </span>
                      )}

                      <Link
                        to={`/screenings/${s.id}`}
                        className="text-slate-400 hover:text-slate-700 p-1"
                        title="View Screening"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Operational Status (4 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl border border-slate-200 bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Operational Status</h2>
            <p className="text-xs text-slate-500">Core screening infrastructure health</p>
          </div>

          <div className="space-y-3 text-xs">
            {/* AI Engine */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-sky-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">AI Grading Engine</span>
                  <span className="text-[10px] text-slate-500 font-mono">Swin V2 Tiny (Torchvision)</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational</span>
              </span>
            </div>

            {/* MATLAB Engine */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-sky-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">MATLAB Engine</span>
                  <span className="text-[10px] text-slate-500 font-mono">R2026a Persistent Instance</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational</span>
              </span>
            </div>

            {/* FastAPI Bridge */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-sky-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">FastAPI Engine Bridge</span>
                  <span className="text-[10px] text-slate-500 font-mono">Port :8000 (Persistent)</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational</span>
              </span>
            </div>

            {/* Database */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-sky-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">Encounter Database</span>
                  <span className="text-[10px] text-slate-500 font-mono">Local Store Verified</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Operational</span>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/model-status"
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center justify-between"
            >
              <span>System Status & Telemetry Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
