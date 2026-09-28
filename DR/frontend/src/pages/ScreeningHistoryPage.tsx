import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Eye,
  Calendar,
  ChevronRight,
  Printer,
  Download,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Screening } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';

export const ScreeningHistoryPage: React.FC = () => {
  const { selectedFacility } = useOutletContext<{ selectedFacility: string }>() || {};
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'REFER' | 'SCREEN' | 'RECAPTURE'>('ALL');
  const [eyeFilter, setEyeFilter] = useState<'ALL' | 'left' | 'right'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'today' | '7days' | '30days'>('ALL');

  useEffect(() => {
    loadScreenings();
  }, [selectedFacility]);

  const loadScreenings = async () => {
    setLoading(true);
    try {
      const res = await api.getScreenings({
        facilityId: selectedFacility,
        limit: 100
      });
      setScreenings(res.screenings);
    } catch (err) {
      console.error('Failed to load screening history', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered screenings
  const filteredScreenings = screenings.filter((s) => {
    // Search match
    if (search.trim()) {
      const term = search.toLowerCase();
      const patientName = s.patient?.name?.toLowerCase() || '';
      const patientCode = s.patient?.patient_code?.toLowerCase() || '';
      if (!patientName.includes(term) && !patientCode.includes(term)) {
        return false;
      }
    }

    // Result match
    const isRejected = s.quality?.status === 'rejected' || s.quality?.quality_gate === 'reject' || s.final_decision === 'RECAPTURE';
    const decision = isRejected ? 'RECAPTURE' : (s.classification?.decision || s.final_decision || 'SCREEN');
    if (resultFilter !== 'ALL' && decision !== resultFilter) {
      return false;
    }

    // Eye match
    if (eyeFilter !== 'ALL') {
      const eyeVal = (s.eye || 'left').toLowerCase();
      if (eyeVal !== eyeFilter) return false;
    }

    // Date filter match
    if (dateFilter !== 'ALL') {
      const sDate = new Date(s.created_at).getTime();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (dateFilter === 'today' && now - sDate > oneDay) return false;
      if (dateFilter === '7days' && now - sDate > 7 * oneDay) return false;
      if (dateFilter === '30days' && now - sDate > 30 * oneDay) return false;
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" />
            <span>Screening Encounters & History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete clinical audit log of all tele-retinal screenings and triage decisions
          </p>
        </div>

        <Link
          to="/screenings/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition self-start sm:self-auto"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>New Screening</span>
        </Link>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient name or ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none"
            />
          </div>

          {/* Result Filter */}
          <div>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as any)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Screening Results</option>
              <option value="REFER">REFER (Referable DR Detected)</option>
              <option value="SCREEN">SCREEN (No Referable DR)</option>
              <option value="RECAPTURE">RECAPTURE (Quality Rejected)</option>
            </select>
          </div>

          {/* Eye Examined Filter */}
          <div>
            <select
              value={eyeFilter}
              onChange={(e) => setEyeFilter(e.target.value as any)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Eyes (OS & OD)</option>
              <option value="left">Left Eye (OS)</option>
              <option value="right">Right Eye (OD)</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing <strong>{filteredScreenings.length}</strong> of {screenings.length} total encounters</span>
          {(search || resultFilter !== 'ALL' || eyeFilter !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setResultFilter('ALL');
                setEyeFilter('ALL');
                setDateFilter('ALL');
              }}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Encounters Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Eye</th>
                <th className="px-4 py-3">Clinical Result</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Referral Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading screening encounters...
                  </td>
                </tr>
              ) : filteredScreenings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No screening encounters match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredScreenings.map((s) => {
                  const isRejected = s.quality?.status === 'rejected' || s.quality?.quality_gate === 'reject' || s.final_decision === 'RECAPTURE';
                  const decision = isRejected ? 'RECAPTURE' : (s.classification?.decision || s.final_decision || 'SCREEN');
                  const grade = isRejected ? undefined : s.classification?.predicted_grade;
                  const eyeCode = (s.eye || 'left').toLowerCase() === 'left' ? 'OS' : 'OD';
                  const eyeLabel = (s.eye || 'left').toLowerCase() === 'left' ? 'Left Eye (OS)' : 'Right Eye (OD)';
                  const pCalibrated = isRejected ? undefined : s.classification?.g2plus_probability_calibrated;

                  const dateStr = new Date(s.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          to={`/screenings/${s.id}`}
                          className="font-semibold text-slate-900 hover:text-sky-600 block"
                        >
                          {s.patient?.name || 'Anonymous Patient'}
                        </Link>
                        <span className="font-mono text-[11px] text-slate-400">
                          {s.patient?.patient_code || s.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] font-semibold text-slate-700">
                        {eyeCode}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {decision === 'REFER' && (
                          <StatusBadge label="REFER" variant="refer" size="sm" />
                        )}
                        {decision === 'SCREEN' && (
                          <StatusBadge label="SCREEN" variant="screen" size="sm" />
                        )}
                        {decision === 'RECAPTURE' && (
                          <StatusBadge label="RECAPTURE" variant="recapture" size="sm" />
                        )}
                        {pCalibrated !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            P(G2+): {(pCalibrated * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        {grade !== undefined ? (
                          <span>Grade {grade}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-[11px]">
                        {isRejected ? (
                          <span className="text-amber-800 font-medium">Recapture Advised</span>
                        ) : (
                          <span>{s.referral?.status || (decision === 'REFER' ? 'Priority Referral' : 'Routine Complete')}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                        <Link
                          to={`/screenings/${s.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <a
                          href={`/api/reports/${s.id}/html`}
                          target="_blank"
                          rel="noreferrer"
                          title="Print Clinical Report"
                          className="text-slate-400 hover:text-slate-700 inline-block p-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
