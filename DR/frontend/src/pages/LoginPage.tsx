import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ShieldCheck, ArrowRight, Lock, Mail, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@netra-ai.org');
  const [password, setPassword] = useState('demo1234');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role: UserRole) => {
    setLoading(true);
    setError('');
    try {
      await switchDemoRole(role);
      navigate('/');
    } catch (err: any) {
      setError('Failed to initialize session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-xl shadow-sky-900/40 mb-4 border border-sky-400/30">
          <Eye className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          NetraAI Platform
        </h2>
        <p className="mt-1 text-sm text-sky-400 font-semibold uppercase tracking-wider">
          Explainable AI for Diabetic Retinopathy Screening in Rural India
        </p>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          SIH26038 | Team: Career Crafters
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-850 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Clinical Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="doctor@netra-ai.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500 mr-2"
                />
                Remember login session
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-md shadow-sky-900/30 transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Clinical Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Clinical Profiles */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Select Active Clinical Role (Quick Access)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSelectRole('healthcare_worker')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-left transition"
              >
                <div className="font-semibold text-white">ASHA / Screener</div>
                <div className="text-[10px] text-slate-400">Patient Intake & Ingestion</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('doctor')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-left transition"
              >
                <div className="font-semibold text-white">Ophthalmologist</div>
                <div className="text-[10px] text-slate-400">Grad-CAM & Referral</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('district_manager')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-left transition"
              >
                <div className="font-semibold text-white">District Officer</div>
                <div className="text-[10px] text-slate-400">Capacity & Analytics</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-left transition"
              >
                <div className="font-semibold text-white">System Admin</div>
                <div className="text-[10px] text-slate-400">Governance & Settings</div>
              </button>
            </div>
          </div>
        </div>

        {/* Ethical Statement */}
        <p className="mt-4 text-center text-xs text-slate-400">
          AI decision-support system. Designed to triage and assist qualified eye-care professionals.
        </p>
      </div>
    </div>
  );
};
