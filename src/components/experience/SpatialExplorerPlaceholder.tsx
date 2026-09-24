/**
 * SpatialExplorerPlaceholder.tsx
 * 
 * کامپوننت فرانت‌اند کاوشگر سه‌بعدی و ۳۶۰ درجه (Spatial 360 Explorer Client Placeholder)
 * شبیه‌سازی نمای سراسرنمای تعاملی ۳۶۰ درجه با درگ ماوس یا لمس،
 * همراه با هات‌اسپات‌های تعاملی (Hotspots) روی نقاط حساس معماری هتل
 */

import React, { useState, useRef, useCallback } from 'react';
import { SpatialNodeData, SpatialHotspotConfig } from '../../types/sequenceGraph';
import { Compass, Move, MapPin, X, Info, Sparkles } from 'lucide-react';
import { toPersianDigits, autoPersianText } from '../../utils/JalaliDate';

interface SpatialExplorerPlaceholderProps {
  nodeData: SpatialNodeData;
  onClose?: () => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export const SpatialExplorerPlaceholder: React.FC<SpatialExplorerPlaceholderProps> = ({
  nodeData,
  onClose,
  onNavigateToNode,
}) => {
  // موقعیت زاویه دید (Yaw و Pitch)
  const [yaw, setYaw] = useState<number>(nodeData.initialYaw || 180);
  const [pitch, setPitch] = useState<number>(nodeData.initialPitch || 0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({ x: 0, y: 0, yaw: 0, pitch: 0 });

  // وضعیت هات‌اسپات انتخاب شده برای مدال جزئیات
  const [selectedHotspot, setSelectedHotspot] = useState<SpatialHotspotConfig | null>(null);

  // درگ ماوس روی پانوراما
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw,
      pitch,
    };
  }, [yaw, pitch]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // حساسیت چرخش
    const newYaw = (dragStartRef.current.yaw - dx * 0.25) % 360;
    const newPitch = Math.max(-45, Math.min(45, dragStartRef.current.pitch + dy * 0.2));

    setYaw(newYaw >= 0 ? newYaw : newYaw + 360);
    setPitch(newPitch);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const hotspots = nodeData.hotspots || [];

  return (
    <div
      id="spatial-360-container"
      dir="rtl"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full bg-neutral-950 text-neutral-100 overflow-hidden flex flex-col font-sans select-none cursor-${
        isDragging ? 'grabbing' : 'grab'
      }`}
    >
      {/* تصویر پانوراما با جابجایی ترنسلیت بر اساس Yaw و Pitch */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[300vw] h-[160vh] -top-[30vh] -left-[100vw] transition-transform duration-75 ease-out"
          style={{
            backgroundImage: `url(${nodeData.panoramaUrl || 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=2400&q=85'})`,
            backgroundPosition: `${(yaw / 360) * 100}% ${50 + (pitch / 45) * 15}%`,
            backgroundSize: 'cover',
            filter: 'brightness(0.95) contrast(1.08)',
          }}
        />
        {/* لایه وینیتینگ سینمایی اطراف */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/70" />
      </div>

      {/* =========================================================================
          هدر کاوشگر ۳۶۰ درجه
          ========================================================================= */}
      <div className="relative z-20 flex items-center justify-between p-6 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-xl flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-mono tracking-widest uppercase">
                360° Spatial Explorer
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                کاوشگر سه‌بعدی
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-white font-bold tracking-wide">
              {nodeData.title}
            </h2>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 text-neutral-200 text-xs font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
          >
            بازگشت به سکانس‌ها &times;
          </button>
        )}
      </div>

      {/* =========================================================================
          هات‌اسپات‌های تعاملی معلق روی فضای ۳۶۰ درجه
          ========================================================================= */}
      <div className="relative z-10 flex-1 pointer-events-none">
        {hotspots.map((hs, idx) => {
          // محاسبه موقعیت افقی و عمودی روی پرده براساس Yaw و Pitch کاربر
          const relYaw = ((hs.yaw - yaw + 540) % 360) - 180; // بین -۱۸۰ تا +۱۸۰
          const isVisible = Math.abs(relYaw) < 55; // فقط اگر در میدان دید باشد

          if (!isVisible) return null;

          const screenX = 50 + (relYaw / 55) * 45; // 0 to 100%
          const screenY = 50 - ((hs.pitch - pitch) / 45) * 40;

          return (
            <div
              key={hs.id || idx}
              style={{ left: `${screenX}%`, top: `${screenY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-100 hover:scale-110"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHotspot(hs);
                }}
                className="group relative flex items-center justify-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-400/20 border-2 border-emerald-400 animate-ping absolute inset-0" />
                <div className="w-10 h-10 rounded-full bg-black/75 border border-emerald-400 text-emerald-300 flex items-center justify-center backdrop-blur-md shadow-2xl group-hover:bg-emerald-400 group-hover:text-black transition-all">
                  <MapPin className="w-4 h-4 fill-current" />
                </div>
                {/* برچسب شناور هات‌اسپات */}
                <div className="absolute top-12 whitespace-nowrap bg-black/80 border border-white/20 px-3 py-1 rounded-full text-xs font-medium text-white shadow-xl opacity-90 group-hover:opacity-100">
                  {hs.title}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          راهنمای ناوبری در پایین تصویر
          ========================================================================= */}
      <div className="relative z-20 p-6 flex items-center justify-between pointer-events-none">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs text-neutral-300 shadow-xl pointer-events-auto">
          <Move className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>برای چرخیدن ۳۶۰ درجه، ماوس را کلیک کرده و بکشید</span>
        </div>

        <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-emerald-400 pointer-events-auto">
          زاویه افقی: {toPersianDigits(Math.round(yaw))}° | زاویه عمودی: {toPersianDigits(Math.round(pitch))}°
        </div>
      </div>

      {/* =========================================================================
          مودال جزئیات هات‌اسپات انتخاب شده
          ========================================================================= */}
      {selectedHotspot && (
        <div
          onClick={() => setSelectedHotspot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-neutral-900 border border-emerald-400/50 rounded-3xl p-6 shadow-2xl text-neutral-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-[10px] text-emerald-400 tracking-wider">
                    {autoPersianText(selectedHotspot.details?.badge || 'نقطه جذابیت معماری')}
                  </span>
                  <h3 className="font-bold text-base text-white">{autoPersianText(selectedHotspot.title)}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedHotspot.details?.imageUrl && (
              <img
                src={selectedHotspot.details.imageUrl}
                alt={selectedHotspot.title}
                className="w-full h-44 object-cover rounded-2xl mb-4 border border-neutral-800"
              />
            )}

            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              {autoPersianText(selectedHotspot.details?.description || selectedHotspot.tagline || 'شرح تفصیلی شاهکار معماری هتل')}
            </p>

            {selectedHotspot.details?.specs && (
              <div className="space-y-1.5 bg-neutral-950 p-3 rounded-2xl border border-neutral-800 mb-4">
                {selectedHotspot.details.specs.map((spec, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-neutral-400">{autoPersianText(spec.label)}:</span>
                    <span className="text-emerald-300 font-semibold">{toPersianDigits(spec.value)}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedHotspot(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-all cursor-pointer"
            >
              بستن و ادامه کاوش ۳۶۰ درجه
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
