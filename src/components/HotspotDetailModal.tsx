/**
 * HotspotDetailModal.tsx
 * 
 * پنجره اختصاصی معرفی جزئیات شاهکارهای معماری و امکانات هتل قصر لورا
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hotspot } from '../types/cms';
import { X, Sparkles } from 'lucide-react';

interface HotspotDetailModalProps {
  hotspot: Hotspot | null;
  onClose: () => void;
}

export const HotspotDetailModal: React.FC<HotspotDetailModalProps> = ({
  hotspot,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {hotspot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-neutral-900 border border-amber-400/40 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-neutral-200"
          >
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1.5 rounded-full bg-neutral-800/80 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>شاهکار معماری و امکانات قصر</span>
              {hotspot.action.details?.badge && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px]">
                  {hotspot.action.details.badge}
                </span>
              )}
            </div>

            <h3 className="font-serif text-xl sm:text-2xl text-neutral-100 font-bold mb-1">
              {hotspot.title}
            </h3>
            <p className="text-xs text-amber-300/90 mb-3">
              {hotspot.tagline}
            </p>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-5">
              {hotspot.description}
            </p>

            {hotspot.action.details?.specs && (
              <div className="space-y-2 mb-6 border-t border-neutral-800 pt-3">
                {hotspot.action.details.specs.map((spec, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">{spec.label}</span>
                    <span className="text-amber-200 font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gradient-to-l from-amber-500 via-amber-400 to-amber-300 text-neutral-950 font-bold text-xs tracking-wide transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
            >
              ادامه گشت‌وگذار در قصر
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
