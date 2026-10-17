import React from 'react';
import { SequenceNode } from '../types/sequenceGraph';

interface SpaceInfoOverlayProps {
  currentNode: SequenceNode;
  isTransitioning: boolean;
  onOpenBooking: () => void;
  currentIndex?: number;
  totalScenes?: number;
}

export const SpaceInfoOverlay: React.FC<SpaceInfoOverlayProps> = ({
  currentNode,
  isTransitioning,
  currentIndex = 0,
  totalScenes = 5,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-5 sm:p-8 select-none font-['Vazirmatn']">
      {/* نشانگر ظریف و مینیمال نام فضا */}
      <div
        className={`pointer-events-none transition-all duration-400 ease-out max-w-xs ${
          isTransitioning
            ? 'opacity-0 translate-y-2 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="inline-flex items-center gap-2 mb-1 px-2 py-0.5 rounded-full bg-neutral-950/60 backdrop-blur-md border border-white/10 text-[10px] text-amber-300/90 font-mono">
          <span>{String(currentIndex + 1).padStart(2, '0')}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/40">{String(totalScenes).padStart(2, '0')}</span>
          {currentNode.floorLevel && (
            <>
              <span className="w-1 h-1 rounded-full bg-amber-400/50" />
              <span className="text-white/70 font-sans">{currentNode.floorLevel}</span>
            </>
          )}
        </div>

        <h2 className="text-base sm:text-lg font-semibold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-snug">
          {currentNode.persianTitle}
        </h2>
      </div>
    </div>
  );
};
