import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Layers,
  Sliders,
  Eye,
  Sparkles
} from 'lucide-react';

export type OverlayMode = 'original' | 'enhanced' | 'vessels' | 'lesions' | 'gradcam' | 'combined';

interface ImageViewerProps {
  originalUrl: string;
  enhancedUrl?: string;
  vesselUrl?: string;
  lesionUrl?: string;
  gradcamUrl?: string;
  defaultOverlay?: OverlayMode;
  eye?: 'left' | 'right';
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalUrl,
  enhancedUrl,
  vesselUrl,
  lesionUrl,
  gradcamUrl,
  defaultOverlay = 'original',
  eye = 'left',
  className = ''
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeOverlay, setActiveOverlay] = useState<OverlayMode>(defaultOverlay);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.75));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Determine active overlay image source
  const getActiveOverlaySrc = () => {
    switch (activeOverlay) {
      case 'enhanced':
        return enhancedUrl || originalUrl;
      case 'vessels':
        return vesselUrl;
      case 'lesions':
        return lesionUrl;
      case 'gradcam':
        return gradcamUrl;
      default:
        return null;
    }
  };

  const overlaySrc = getActiveOverlaySrc();

  return (
    <div className={`flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800 text-slate-100 ${className}`}>
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 gap-2">
        {/* Layer Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveOverlay('original')}
            className={`px-2.5 py-1 rounded transition font-medium ${
              activeOverlay === 'original' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Original
          </button>
          {enhancedUrl && (
            <button
              onClick={() => setActiveOverlay('enhanced')}
              className={`px-2.5 py-1 rounded transition font-medium ${
                activeOverlay === 'enhanced' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enhanced (CLAHE)
            </button>
          )}
          {vesselUrl && (
            <button
              onClick={() => setActiveOverlay('vessels')}
              className={`px-2.5 py-1 rounded transition font-medium ${
                activeOverlay === 'vessels' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vessel Map
            </button>
          )}
          {lesionUrl && (
            <button
              onClick={() => setActiveOverlay('lesions')}
              className={`px-2.5 py-1 rounded transition font-medium ${
                activeOverlay === 'lesions' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lesion Candidates
            </button>
          )}
          {gradcamUrl && (
            <button
              onClick={() => setActiveOverlay('gradcam')}
              className={`px-2.5 py-1 rounded transition font-medium flex items-center gap-1 ${
                activeOverlay === 'gradcam' ? 'bg-sky-600 text-white shadow-sm' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Grad-CAM
            </button>
          )}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 font-mono text-slate-300">{Math.round(scale * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-white transition border-l border-slate-800 ml-1"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 min-h-[360px] max-h-[540px] flex items-center justify-center overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
      >
        <div
          className="relative max-w-full max-h-full transition-transform duration-75 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Base Fundus Image (Original or Enhanced) */}
          <img
            src={activeOverlay === 'enhanced' && enhancedUrl ? enhancedUrl : originalUrl}
            alt="Fundus Retinal Scan"
            className="max-h-[500px] w-auto object-contain rounded-lg shadow-2xl pointer-events-none"
          />

          {/* Secondary Layer Overlay (Vessels, Lesions, or Grad-CAM) */}
          {overlaySrc && activeOverlay !== 'original' && activeOverlay !== 'enhanced' && (
            <img
              src={overlaySrc}
              alt="AI Saliency / Segmentation Overlay"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300"
              style={{ opacity: overlayOpacity }}
            />
          )}
        </div>

        {/* Eye Badge */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700 px-2.5 py-1 rounded text-xs font-semibold text-slate-200 uppercase tracking-wider">
          {eye} Eye (OS/OD)
        </div>

        {/* Active Overlay Indicator */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur border border-slate-700 px-2.5 py-1 rounded text-xs font-medium text-slate-300">
          Layer: <span className="text-sky-400 capitalize font-semibold">{activeOverlay.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Bottom Opacity Slider Bar (shown for overlays) */}
      {activeOverlay !== 'original' && activeOverlay !== 'enhanced' && (
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Layer Blend Opacity:</span>
          </div>
          <div className="flex items-center gap-3 w-48">
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <span className="font-mono text-slate-200">{Math.round(overlayOpacity * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
