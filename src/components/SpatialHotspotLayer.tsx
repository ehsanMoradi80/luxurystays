/**
 * SpatialHotspotLayer.tsx
 * 
 * لایه Z-Index 20: نقاط تعاملی سه‌بعدی روی صحنه به زبان فارسی
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hotspot } from '../types/cms';
import { 
  Sparkles, 
  Car, 
  Droplets, 
  Moon, 
  Sun, 
  Compass, 
  Wine, 
  Music, 
  ArrowUpCircle, 
  Info,
  Waves,
  Coffee,
  Utensils
} from 'lucide-react';

interface SpatialHotspotLayerProps {
  hotspots: Hotspot[];
  isTransitioning: boolean;
  onHotspotClick: (hotspot: Hotspot) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Sparkles,
  Car,
  Droplets,
  Moon,
  Sun,
  Compass,
  Wine,
  Music,
  ArrowUpCircle,
  Waves,
  Coffee,
  Utensils,
};

export const SpatialHotspotLayer: React.FC<SpatialHotspotLayerProps> = ({
  hotspots,
  isTransitioning,
  onHotspotClick,
}) => {
  return (
    <div id="spatial-hotspots-layer" className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <AnimatePresence>
        {!isTransitioning &&
          hotspots.map((spot) => {
            const IconComponent = (spot.icon && iconMap[spot.icon]) || Info;

            return (
              <motion.div
                key={spot.id}
                id={`hotspot-${spot.id}`}
                className="absolute pointer-events-auto cursor-pointer group"
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.3 } }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onHotspotClick(spot)}
              >
                {/* حلقه پالس درخشان طلایی */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-10 h-10 rounded-full bg-amber-400/20 animate-ping" />
                  <span className="absolute w-8 h-8 rounded-full border border-amber-300/40 bg-neutral-900/60 backdrop-blur-md group-hover:scale-125 transition-transform duration-300 shadow-[0_0_20px_rgba(212,175,55,0.35)]" />
                  
                  {/* دکمه مرکزی نقطه تعاملی */}
                  <div className="relative z-10 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 text-neutral-950 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* پنجره راهنمای معلق لوکس */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-60 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover:translate-y-0 z-30">
                  <div className="bg-neutral-900/95 border border-amber-400/30 backdrop-blur-xl p-3.5 rounded-xl shadow-2xl text-right">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300 mb-1">
                      <span>{spot.tagline}</span>
                      {spot.action.type === 'navigate' ? (
                        <span className="text-amber-400/80 text-[10px]">ورود به فضا ←</span>
                      ) : (
                        <span className="text-neutral-400 text-[10px]">اطلاعات •</span>
                      )}
                    </div>
                    <div className="font-serif text-sm text-neutral-100 font-medium">
                      {spot.title}
                    </div>
                    <p className="text-xs text-neutral-300 line-clamp-2 mt-1 leading-relaxed">
                      {spot.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
};
