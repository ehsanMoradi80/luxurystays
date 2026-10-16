import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Layers, Sparkles, Navigation } from 'lucide-react';
import { SequenceNode } from '../types/sequenceGraph';

interface SpaceInfoOverlayProps {
  currentNode: SequenceNode;
  isTransitioning: boolean;
  onOpenBooking: () => void;
  currentIndex: number;
  totalScenes: number;
  onSelectScene: (nodeId: string) => void;
  onNextScene?: () => void;
  onPrevScene?: () => void;
}

export const SpaceInfoOverlay: React.FC<SpaceInfoOverlayProps> = ({
  currentNode,
  isTransitioning,
  onOpenBooking,
  currentIndex,
  totalScenes,
  onNextScene,
  onPrevScene,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top spacer */}
      <div className="h-16" />

      {/* Bottom Main Content & Navigation HUD */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-6 pointer-events-auto">
        {/* Left / Info Panel (RTL: Right side) */}
        <div className={`max-w-xl transition-all duration-700 ${isTransitioning ? 'opacity-30 blur-xs translate-y-3' : 'opacity-100 blur-none translate-y-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-3 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentNode.floorLevel || 'قصر لورا'}</span>
            <span className="text-amber-400/40">•</span>
            <span>بخش {currentNode.category}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2">
            {currentNode.persianTitle}
          </h1>

          <p className="text-sm sm:text-base text-amber-200/90 font-medium mb-2 font-serif italic">
            {currentNode.subtitle}
          </p>

          <p className="text-xs sm:text-sm text-neutral-300/80 leading-relaxed max-w-lg mb-5 font-light">
            {currentNode.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenBooking}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/25 transition-all cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4 text-neutral-950" />
              <span>رزرو اختصاصی این فضا</span>
            </button>
          </div>
        </div>

        {/* Right / Sequence Stepper Controls */}
        <div className="flex items-center gap-3 bg-neutral-950/80 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xl shadow-2xl">
          <button
            onClick={onPrevScene}
            disabled={currentIndex <= 0}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentIndex > 0
                ? 'bg-neutral-800 text-neutral-200 hover:bg-amber-400 hover:text-neutral-950 cursor-pointer active:scale-95'
                : 'bg-neutral-900 text-neutral-600 cursor-not-allowed opacity-50'
            }`}
            title="سکانس قبلی (کلید جهت‌نما راست یا بالا)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="text-center px-3 min-w-[70px]">
            <div className="flex items-center justify-center gap-1 text-sm font-bold text-amber-300">
              <span>{currentIndex + 1}</span>
              <span className="text-neutral-500 font-normal">/</span>
              <span className="text-neutral-400">{totalScenes}</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-light flex items-center justify-center gap-1">
              <Layers className="w-3 h-3 text-amber-400/60" />
              <span>فضای هتل</span>
            </div>
          </div>

          <button
            onClick={onNextScene}
            disabled={currentIndex >= totalScenes - 1}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentIndex < totalScenes - 1
                ? 'bg-neutral-800 text-neutral-200 hover:bg-amber-400 hover:text-neutral-950 cursor-pointer active:scale-95'
                : 'bg-neutral-900 text-neutral-600 cursor-not-allowed opacity-50'
            }`}
            title="سکانس بعدی (کلید جهت‌نما چپ یا پایین)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
