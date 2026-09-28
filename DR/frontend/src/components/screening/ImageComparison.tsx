import React, { useState } from 'react';
import { Columns, SplitSquareVertical, Info } from 'lucide-react';

interface ImageComparisonProps {
  originalUrl: string;
  enhancedUrl: string;
  method?: string;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  originalUrl,
  enhancedUrl,
  method = 'Illumination Correction & Controlled CLAHE (MATLAB Pipeline)'
}) => {
  const [viewMode, setViewMode] = useState<'sideBySide' | 'split'>('sideBySide');
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">Retinal Image Enhancement</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">
            Pre-Processing
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode('sideBySide')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition font-medium ${
              viewMode === 'sideBySide' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition font-medium ${
              viewMode === 'split' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Interactive Split
          </button>
        </div>
      </div>

      {/* Main Comparison Area */}
      <div className="p-4 bg-slate-900">
        {viewMode === 'sideBySide' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Original Raw Fundus</span>
                <span className="text-slate-400">Unprocessed</span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                <img src={originalUrl} alt="Original Fundus" className="max-h-72 w-auto object-contain rounded" />
              </div>
            </div>

            {/* Enhanced */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
                <span>Enhanced Fundus</span>
                <span className="text-sky-300">CLAHE Processed</span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-sky-900/50 bg-slate-950 flex items-center justify-center p-2">
                <img src={enhancedUrl} alt="Enhanced Fundus" className="max-h-72 w-auto object-contain rounded" />
              </div>
            </div>
          </div>
        ) : (
          /* Interactive Split Slider */
          <div className="relative h-80 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center select-none">
            {/* Original Image (Full Background) */}
            <img
              src={originalUrl}
              alt="Original Fundus"
              className="absolute max-h-full max-w-full object-contain pointer-events-none"
            />

            {/* Enhanced Image (Clipped by slider position) */}
            <div
              className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
              style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
            >
              <img
                src={enhancedUrl}
                alt="Enhanced Fundus"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Split Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] z-10 pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold shadow-lg">
                ⇄
              </div>
            </div>

            {/* Hidden Input Slider for Dragging */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />

            {/* Labels */}
            <div className="absolute bottom-3 left-3 bg-slate-900/80 px-2 py-1 rounded text-[11px] font-semibold text-slate-200">
              Original (Left)
            </div>
            <div className="absolute bottom-3 right-3 bg-sky-900/80 px-2 py-1 rounded text-[11px] font-semibold text-sky-200">
              Enhanced CLAHE (Right)
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600">
        <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
        <span>
          <strong>Enhancement Protocol:</strong> {method}. Corrects uneven illumination and sharpens microvascular contours without creating artificial lesion artifacts.
        </span>
      </div>
    </div>
  );
};
