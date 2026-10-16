import React, { useEffect } from 'react';
import { X, Sparkles, Calendar, ChevronLeft } from 'lucide-react';
import { SpatialHotspot } from '../types/sequenceGraph';

interface HotspotDetailModalProps {
  hotspot: SpatialHotspot | null;
  onClose: () => void;
  onBookExperience: () => void;
}

export const HotspotDetailModal: React.FC<HotspotDetailModalProps> = ({
  hotspot,
  onClose,
  onBookExperience,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!hotspot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-neutral-900/95 border border-amber-400/40 p-6 sm:p-8 shadow-2xl text-right overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-amber-400/50 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="بستن (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
          {hotspot.title}
        </h2>

        {/* Description */}
        <p className="text-sm text-neutral-300/90 leading-relaxed font-light mb-6">
          {hotspot.description}
        </p>

        {/* Features / Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-black/40 border border-white/5">
          <div>
            <span className="text-[11px] text-neutral-500 block mb-1">دسترسی تشریفاتی</span>
            <span className="text-xs font-bold text-amber-300">مختص مهمانان VIP هتل</span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block mb-1">خدمات اختصاصی</span>
            <span className="text-xs font-bold text-amber-300">سرویس ۲۴ ساعته کانسیرژ</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onBookExperience();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>رزرو و هماهنگی این فضا</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition-all cursor-pointer"
          >
            بستن (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
