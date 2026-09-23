/**
 * SpaceInfoOverlay.tsx
 * 
 * لایه Z-Index 30: هیروسکشن کاملاً تمیز، مینیمال و متمرکز بر عنوان سکانس
 * بر اساس درخواست:
 * - دکمه‌های بعدی و قبلی به طور کامل حذف شدند.
 * - تعامل به طور خالص بر اساس اسکرول فیزیکی (اسکرول به بالا = دنده عقب، اسکرول به پایین = سکانس بعد) هدایت می‌شود.
 * - دکمه رزرو اقامت برای دسترسی کانسیرژ حفظ شده است.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpaceNode } from '../types/cms';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SpaceInfoOverlayProps {
  currentNode: SpaceNode;
  isTransitioning: boolean;
  onOpenBooking: () => void;
  currentIndex: number;
  totalScenes: number;
}

export const SpaceInfoOverlay: React.FC<SpaceInfoOverlayProps> = ({
  currentNode,
  isTransitioning,
  onOpenBooking,
  currentIndex,
  totalScenes,
}) => {
  const isFirstScene = currentIndex === 0;
  const isLastScene = currentIndex === totalScenes - 1;

  return (
    <div id="space-info-overlay" className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end p-8 sm:p-14 md:p-16">
      <AnimatePresence mode="wait">
        {!isTransitioning && (
          <motion.div
            key={currentNode.id}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15, transition: { duration: 0.25 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl pointer-events-auto text-right select-none"
          >
            {/* عنوان فضا فقط با فونت وزیرمتن */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl text-white font-black leading-tight mb-4 drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] tracking-tight">
              {currentNode.title}
            </h1>

            {currentNode.subtitle && (
              <p className="text-sm sm:text-base text-neutral-300/90 mb-6 font-light max-w-xl">
                {currentNode.subtitle}
              </p>
            )}

            {/* کنترل‌های ضروری و نشانگر اسکرول (بدون دکمه‌های بعد و قبل) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* دکمه رزرو اقامت */}
              <button
                id="btn-open-booking"
                onClick={onOpenBooking}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/95 hover:bg-white text-neutral-950 font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer shadow-2xl"
              >
                <span>رزرو اقامت</span>
              </button>

              {/* راهنمای اسکرول متناسب با جایگاه در ترتیب اول و آخر */}
              <div className="flex items-center gap-2 text-neutral-400 text-xs">
                {!isLastScene && (
                  <span className="flex items-center gap-1.5 bg-black/50 px-3.5 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>اسکرول به پایین برای سکانس بعد</span>
                  </span>
                )}

                {!isFirstScene && (
                  <span className="flex items-center gap-1.5 bg-black/50 px-3.5 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <ChevronUp className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>اسکرول به بالا برای دنده عقب</span>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
