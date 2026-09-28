import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  UserCheck,
  LogOut,
  ChevronDown,
  Menu,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../services/api';

interface TopbarProps {
  onToggleSidebar?: () => void;
  selectedFacility?: string;
  onFacilityChange?: (facilityId: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleSidebar,
  selectedFacility = '',
  onFacilityChange
}) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    api.getFacilities().then(res => setFacilities(res.facilities)).catch(() => {});
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const clinicalRoles: Array<{ role: UserRole; title: string; desc: string }> = [
    { role: 'healthcare_worker', title: 'Primary Health Screener / ASHA', desc: 'Patient Check-in & Image Ingestion' },
    { role: 'doctor', title: 'District Ophthalmologist', desc: 'Grading Review & Referral Action' },
    { role: 'district_manager', title: 'District Health Officer', desc: 'Analytics & Capacity Planning' },
    { role: 'admin', title: 'Clinical System Administrator', desc: 'Full System & Facility Governance' }
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-10">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Facility selector */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
          <Building2 className="w-4 h-4 text-sky-600" />
          <select
            value={selectedFacility}
            onChange={(e) => onFacilityChange?.(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="">All Primary Health Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium px-2.5 py-1 rounded bg-slate-50 border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayStr}</span>
        </div>

        {/* Active Clinical Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold hover:bg-sky-100 transition shadow-xs"
          >
            <UserCog className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline text-slate-500">Role:</span>
            <span className="capitalize">{user?.role?.replace('_', ' ') || 'Clinician'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-sky-600 ml-0.5" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Active Clinical Role
              </div>
              {clinicalRoles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    switchDemoRole(r.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex flex-col transition ${
                    user?.role === r.role ? 'bg-sky-50 font-semibold text-sky-900' : 'text-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-900">{r.title}</span>
                  <span className="text-[11px] text-slate-400">{r.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
