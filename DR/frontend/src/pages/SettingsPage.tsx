import React, { useState } from 'react';
import { Settings, User, Building2, Bell, Shield, Sliders, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-600" />
          System & Facility Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage screening parameters, tele-ophthalmology triage rules, and user preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
        {/* Profile Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" />
            User Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={user?.full_name || 'Dr. Rajesh Patil'}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                defaultValue={user?.email || 'admin@netra-ai.org'}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* AI Inference Thresholds */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-600" />
            Clinical Thresholds & Calibration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">IQA Minimum Quality Cutoff</label>
              <input
                type="number"
                defaultValue={75}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Calibrated Confidence Threshold</label>
              <input
                type="number"
                step="0.05"
                defaultValue={0.70}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {saved && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md transition"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
