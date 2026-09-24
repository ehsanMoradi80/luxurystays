/**
 * ComparisonPlaceholder.tsx
 * 
 * کامپوننت فرانت‌اند مقایسه داینامیک (Dynamic Comparison Client Placeholder)
 * رابط کاربری مقایسه بصری دو موجودیت (مثل پنت‌هاوس در برابر ویلای ساحلی، یا Before/After)
 * با اسلایدر تفکیک تصویر، درگ تعاملی و جدول مقایسه مشخصات اختصاصی
 */

import React, { useState, useRef, useCallback } from 'react';
import { ComparisonNodeData } from '../../types/sequenceGraph';
import { Columns, ArrowLeftRight, Check, Sparkles, Building, Waves } from 'lucide-react';

interface ComparisonPlaceholderProps {
  nodeData: ComparisonNodeData;
  onClose?: () => void;
}

export const ComparisonPlaceholder: React.FC<ComparisonPlaceholderProps> = ({
  nodeData,
  onClose,
}) => {
  const [splitRatio, setSplitRatio] = useState<number>(nodeData.initialSplitRatio || 50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const entityA = nodeData.entityA;
  const entityB = nodeData.entityB;

  // مدیریت درگ اسلایدر تقسیم
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitRatio(percent);
  }, []);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  return (
    <div
      id="comparison-view"
      dir="rtl"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full bg-neutral-950 text-neutral-100 overflow-hidden flex flex-col font-sans select-none"
    >
      {/* =========================================================================
          هدر مقایسه
          ========================================================================= */}
      <div className="relative z-30 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 backdrop-blur-xl flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Columns className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-cyan-400 font-mono tracking-widest uppercase">
                Dynamic Comparison Matrix
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                مقایسه هوشمند اقامتگاه‌ها
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
          بخش اسلایدر بصری Before / After (Split Image Slider)
          ========================================================================= */}
      <div
        ref={containerRef}
        onTouchMove={handleTouchMove}
        className="relative flex-1 w-full overflow-hidden cursor-ew-resize"
      >
        {/* تصویر سمت چپ (Entity B: ویلای ساحلی) */}
        <div className="absolute inset-0">
          <img
            src={entityB.mediaUrl || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80'}
            alt={entityB.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-10 left-10 z-10 bg-black/75 backdrop-blur-xl border border-amber-400/30 p-4 rounded-2xl max-w-sm pointer-events-none">
            <span className="text-[10px] text-amber-400 font-mono uppercase block">{entityB.badge}</span>
            <h3 className="font-serif text-lg font-bold text-white mt-0.5">{entityB.title}</h3>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{entityB.subtitle}</p>
          </div>
        </div>

        {/* تصویر سمت راست (Entity A: پنت‌هاوس) با کات ماسک بر اساس splitRatio */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${splitRatio}%` }}
        >
          <img
            src={entityA.mediaUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80'}
            alt={entityA.title}
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100vw' }}
          />
          <div className="absolute bottom-10 right-10 z-10 bg-black/75 backdrop-blur-xl border border-cyan-400/30 p-4 rounded-2xl max-w-sm pointer-events-none">
            <span className="text-[10px] text-cyan-400 font-mono uppercase block">{entityA.badge}</span>
            <h3 className="font-serif text-lg font-bold text-white mt-0.5">{entityA.title}</h3>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{entityA.subtitle}</p>
          </div>
        </div>

        {/* خط جداکننده و دستگیره درگ وسط پرده */}
        <div
          onMouseDown={handleMouseDown}
          style={{ left: `${splitRatio}%` }}
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20 flex items-center justify-center -translate-x-1/2 cursor-ew-resize"
        >
          <div className="w-10 h-10 rounded-full bg-black/90 border-2 border-white text-white flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-110 transition-transform">
            <ArrowLeftRight className="w-4 h-4 text-cyan-300" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          جدول مقایسه مشخصات و ویژگی‌ها در پایین صفحه
          ========================================================================= */}
      <div className="relative z-30 p-5 bg-black/85 backdrop-blur-2xl border-t border-white/10 max-h-56 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              {entityA.title}
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              اسلایدر تفکیک تصویر: {Math.round(splitRatio)}% / {Math.round(100 - splitRatio)}%
            </span>
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Waves className="w-4 h-4" />
              {entityB.title}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {entityA.specs?.map((specA, index) => {
              const specB = entityB.specs?.[index];
              return (
                <div
                  key={index}
                  className="grid grid-cols-3 gap-2 bg-neutral-900/60 p-2 rounded-xl border border-white/5 items-center text-center"
                >
                  <div className="font-medium text-cyan-200 truncate">{specA.value}</div>
                  <div className="text-[10px] text-neutral-400 font-mono">{specA.label}</div>
                  <div className="font-medium text-amber-200 truncate">{specB?.value || '—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
