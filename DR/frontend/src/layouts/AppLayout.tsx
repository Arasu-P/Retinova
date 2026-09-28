import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Topbar } from '../components/common/Topbar';
import { AlertCircle } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState('');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          selectedFacility={selectedFacility}
          onFacilityChange={setSelectedFacility}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Outlet context={{ selectedFacility }} />

          {/* Clinical Non-Diagnostic Disclaimer Footer */}
          <footer className="pt-6 pb-2 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <AlertCircle className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <span>
                <strong>Clinical AI Notice:</strong> AI-assisted screening decision-support tool for rural tele-ophthalmology triage. Attribution and grading constitute model evidence, not autonomous diagnosis.
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              NetraAI v1.0-frozen • Swin V2 Tiny
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
