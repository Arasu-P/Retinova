import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Eye,
  ChevronRight,
  UserPlus,
  X,
  MapPin,
  Calendar
} from 'lucide-react';
import { Patient, Facility } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';

export const PatientManagementPage: React.FC = () => {
  const { selectedFacility } = useOutletContext<{ selectedFacility: string }>() || {};
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [drStatusFilter, setDrStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  // New Patient Form
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    location: '',
    diabetes_duration_years: '5',
    facility_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadPatients();
    api.getFacilities().then(res => {
      setFacilities(res.facilities);
      if (res.facilities.length > 0 && !formData.facility_id) {
        setFormData(prev => ({ ...prev, facility_id: res.facilities[0].id }));
      }
    }).catch(() => {});
  }, [search, selectedFacility]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await api.getPatients({
        search,
        facilityId: selectedFacility
      });
      setPatients(res.patients);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load patients', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      await api.registerPatient({
        name: formData.name,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        phone: formData.phone,
        location: formData.location,
        diabetes_duration_years: parseInt(formData.diabetes_duration_years, 10),
        facility_id: formData.facility_id || (facilities[0]?.id)
      });
      setShowRegisterModal(false);
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        location: '',
        diabetes_duration_years: '5',
        facility_id: facilities[0]?.id || ''
      });
      loadPatients();
    } catch (err: any) {
      setModalError(err.message || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter patients by DR Status filter if applicable
  const filteredPatients = patients.filter(p => {
    if (drStatusFilter === 'ALL') return true;
    if (drStatusFilter === 'REFER') {
      return (p.latest_dr_grade ?? 0) >= 2;
    }
    if (drStatusFilter === 'SCREEN') {
      return (p.latest_dr_grade ?? 0) < 2;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Patient Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered patients across primary health centres and rural tele-screening camps
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-subtle transition self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient by name or ID (e.g. DR-MH-2026-0006)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none"
            />
          </div>

          <div className="w-48">
            <select
              value={drStatusFilter}
              onChange={(e) => setDrStatusFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Screening Statuses</option>
              <option value="REFER">Referable DR (G2+)</option>
              <option value="SCREEN">Non-Referable Routine</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Total: <strong>{filteredPatients.length}</strong> Patients
        </span>
      </div>

      {/* Patients Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Age / Sex</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Last Screening</th>
                <th className="px-4 py-3">DR Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading registered patient records...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No registered patients match your search.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const lastScreeningDate = p.last_screening_date
                    ? new Date(p.last_screening_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'No screenings yet';

                  const grade = p.latest_dr_grade;
                  const isRefer = grade !== undefined && grade >= 2;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <Link
                          to={`/patients/${p.id}`}
                          className="font-semibold text-slate-900 hover:text-sky-600 block"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[11px] text-slate-400">
                          {p.diabetes_duration_years ? `${p.diabetes_duration_years} yrs Diabetes` : 'No history recorded'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] font-semibold text-slate-600">
                        {p.patient_code}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {p.age} Yrs · {p.gender}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {p.location || 'Rural Centre'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-medium">
                        {lastScreeningDate}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {grade !== undefined ? (
                          isRefer ? (
                            <StatusBadge label={`Referable (G${grade})`} variant="refer" size="sm" />
                          ) : (
                            <StatusBadge label={`Routine (G${grade})`} variant="screen" size="sm" />
                          )
                        ) : (
                          <StatusBadge label="Pending Screen" variant="neutral" size="sm" />
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                        <Link
                          to={`/patients/${p.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800"
                        >
                          <span>Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          to={`/screenings/new?patientId=${p.id}`}
                          className="text-slate-500 hover:text-slate-900 inline-block text-[11px] font-medium border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50"
                        >
                          Screen
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
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

            {modalError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="52"
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
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
                  <label className="block font-medium text-slate-700 mb-1">Phone Contact</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98..."
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location / Village</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Baramati"
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Diabetes Duration (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.diabetes_duration_years}
                  onChange={(e) => setFormData(prev => ({ ...prev, diabetes_duration_years: e.target.value }))}
                  placeholder="Years"
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
                />
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
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-subtle disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
