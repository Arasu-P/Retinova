import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Eye,
  History,
  FileText,
  Sliders,
  Activity,
  Layers,
  Settings,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/screenings/new', label: 'New Screening', icon: Eye },
    { to: '/screenings', label: 'Screening History', icon: History },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/analytics', label: 'Reports & Analytics', icon: FileText },
    { to: '/simulation', label: 'Resource Planning', icon: Sliders },
    { to: '/model-status', label: 'System Status', icon: Activity },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-200 flex flex-col transition-all duration-200 border-r border-slate-800 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 gap-3 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
          <Eye className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-sm tracking-wider text-white">
              NETRA<span className="text-sky-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 truncate tracking-tight">
              Clinical Retinal Screening
            </p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <span className="truncate flex-1">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Subtle Operational Status Indicator in Footer */}
      {!collapsed && (
        <div className="p-3 mx-2.5 mb-3 rounded-lg bg-slate-850 border border-slate-800 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-300">AI & MATLAB Engine</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Swin V2 Tiny • Temperature Calibrated
          </span>
        </div>
      )}
    </aside>
  );
};
