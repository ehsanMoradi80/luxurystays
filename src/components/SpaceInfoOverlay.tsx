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
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-6 sm:p-10 select-none font-['Vazirmatn']">
      {/* Discreet, ultra-refined title tag - minimal and non-intrusive */}
      <div
        className={`pointer-events-none transition-all duration-500 ease-out max-w-sm ${
          isTransitioning
            ? 'opacity-0 translate-y-3 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="inline-flex items-center gap-2 mb-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900/60 backdrop-blur-md border border-white/10 text-[11px] text-amber-300 font-mono tracking-wider">
          <span>{String(currentIndex + 1).padStart(2, '0')}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/40">{String(totalScenes).padStart(2, '0')}</span>
          {currentNode.floorLevel && (
            <>
              <span className="w-1 h-1 rounded-full bg-amber-400/60" />
              <span className="text-white/70 font-sans font-light">{currentNode.floorLevel}</span>
            </>
          )}
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] leading-tight">
          {currentNode.persianTitle}
        </h2>

        {currentNode.subtitle && (
          <p className="text-xs text-neutral-300/80 font-light drop-shadow mt-0.5 leading-relaxed">
            {currentNode.subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
