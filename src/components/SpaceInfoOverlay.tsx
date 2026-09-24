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
import { Sparkles } from 'lucide-react';
import { CustomButton } from './ui/CustomButton';
import { autoPersianText } from '../utils/JalaliDate';

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
}) => {
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
            {/* عنوان فضا فقط با فونت وزیرمتن و ارقام فارسی */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl text-white font-black leading-tight mb-4 drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] tracking-tight">
              {autoPersianText(currentNode.title)}
            </h1>

            {currentNode.subtitle && (
              <p className="text-sm sm:text-base text-neutral-300/90 mb-6 font-light max-w-xl">
                {autoPersianText(currentNode.subtitle)}
              </p>
            )}

            {/* دکمه رزرو اقامت */}
            <div className="flex items-center gap-3 sm:gap-4">
              <CustomButton
                id="btn-open-booking"
                onClick={onOpenBooking}
                size="lg"
                variant="primary"
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="shadow-2xl hover:scale-[1.03]"
              >
                رزرو اقامتگاه تشریفاتی
              </CustomButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

