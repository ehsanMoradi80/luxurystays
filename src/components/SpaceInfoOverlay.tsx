import React from 'react';
import { Calendar } from 'lucide-react';
import { SequenceNode } from '../types/sequenceGraph';

interface SpaceInfoOverlayProps {
  currentNode: SequenceNode;
  isTransitioning: boolean;
  onOpenBooking: () => void;
  currentIndex?: number;
  totalScenes?: number;
  onSelectScene?: (nodeId: string) => void;
  onNextScene?: () => void;
  onPrevScene?: () => void;
}

export const SpaceInfoOverlay: React.FC<SpaceInfoOverlayProps> = ({
  currentNode,
  isTransitioning,
  onOpenBooking,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-6 sm:p-12 md:p-16 select-none font-['Vazirmatn']">
      {/* Bottom Main Content - Ultra-Minimal & Cinematic */}
      <div
        className={`max-w-xl pointer-events-auto transition-all duration-700 ease-out ${
          isTransitioning
            ? 'opacity-0 blur-xs translate-y-4 pointer-events-none'
            : 'opacity-100 blur-none translate-y-0'
        }`}
      >
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] mb-2 leading-tight">
          {currentNode.persianTitle}
        </h1>

        {currentNode.subtitle && (
          <p className="text-xs sm:text-sm text-amber-200/90 font-light mb-5 drop-shadow-md">
            {currentNode.subtitle}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenBooking}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-950" />
            <span>رزرو این فضا</span>
          </button>
        </div>
      </div>
    </div>
  );
};
