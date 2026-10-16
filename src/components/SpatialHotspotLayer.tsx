import React from 'react';
import { SpatialHotspot } from '../types/sequenceGraph';
import { Sparkles, Utensils, Waves, Bed, Compass } from 'lucide-react';

interface SpatialHotspotLayerProps {
  hotspots?: SpatialHotspot[];
  onSelectHotspot: (hotspot: SpatialHotspot) => void;
  isTransitioning?: boolean;
}

export const SpatialHotspotLayer: React.FC<SpatialHotspotLayerProps> = ({
  hotspots = [],
  onSelectHotspot,
  isTransitioning = false,
}) => {
  if (!hotspots || hotspots.length === 0) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DINING':
        return <Utensils className="w-3.5 h-3.5 text-amber-300" />;
      case 'SPA':
        return <Waves className="w-3.5 h-3.5 text-cyan-300" />;
      case 'ROOM':
        return <Bed className="w-3.5 h-3.5 text-amber-200" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-20 transition-opacity duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {hotspots.map((hs) => (
        <div
          key={hs.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer"
          style={{ left: `${hs.position.x}%`, top: `${hs.position.y}%` }}
          onClick={() => onSelectHotspot(hs)}
        >
          {/* Pulsing Aura */}
          <div className="absolute inset-0 -m-3 rounded-full bg-amber-400/20 animate-ping pointer-events-none" />
          <div className="absolute inset-0 -m-1.5 rounded-full bg-amber-400/30 group-hover:scale-125 transition-transform duration-300" />

          {/* Central Trigger Button */}
          <button
            className="relative w-8 h-8 rounded-full bg-neutral-950/90 border border-amber-400/80 shadow-xl shadow-amber-400/30 flex items-center justify-center text-amber-300 group-hover:bg-amber-400 group-hover:text-neutral-950 group-hover:scale-110 transition-all duration-300 cursor-pointer"
            aria-label={hs.title}
          >
            {getCategoryIcon(hs.category)}
          </button>

          {/* Hover Tooltip / Floating Card */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-xl bg-neutral-950/90 border border-amber-400/40 text-neutral-100 backdrop-blur-xl shadow-2xl opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <div className="text-right">
              <div className="text-xs font-bold text-white font-sans">{hs.title}</div>
              <div className="text-[10px] text-amber-300/80 font-serif">مشاهده جزئیات اختصاصی</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
