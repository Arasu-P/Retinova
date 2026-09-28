import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { SimulationResultData } from '../../types';

interface SimulationChartProps {
  result: SimulationResultData;
}

export const SimulationChart: React.FC<SimulationChartProps> = ({ result }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Daily Throughput & Arrived vs Screened */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Daily Patient Flow (30-Day Simulated Run)</h4>
          <p className="text-xs text-slate-500">Arrived Patients vs Screened & Referred Cases</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.dailyThroughputSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => `D${d}`} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="arrived" name="Patients Arrived" stroke="#94a3b8" fill="#e2e8f0" fillOpacity={0.5} />
              <Area type="monotone" dataKey="screened" name="Screened" stroke="#0284c7" fill="#38bdf8" fillOpacity={0.6} />
              <Area type="monotone" dataKey="referred" name="Referred" stroke="#f59e0b" fill="#fde68a" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Hourly Queue Depth Across 8-Hour Shift */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Simulated Hourly Queue Depth</h4>
          <p className="text-xs text-slate-500">Waiting backlog at Camera, AI, and Doctor stations</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.queueDepthSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="timeHour" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(h) => `${h}:00`} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="cameraQueue" name="Camera Queue" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="aiQueue" name="AI Inference Queue" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="doctorQueue" name="Doctor Review Queue" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
