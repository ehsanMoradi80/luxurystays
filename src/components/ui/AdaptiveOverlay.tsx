/**
 * AdaptiveOverlay.tsx
 * 
 * کامپوننت اورلی تطبیقی و موبایل‌فرست (Adaptive Overlay)
 * 
 * بر اساس الزامات صریح کاربر:
 * ۱. در موبایل: تبدیل به «باتم شیت» (Bottom Sheet) ارگونومیک با گوشه‌های گرد بالا.
 *    - الزامی: باتم شیت به هیچ عنوان نباید دکمه ضربدر (X) داشته باشد!
 *    - با درگ کردن به سمت پایین (Swipe / Drag down) یا لمس پس‌زمینه بسته می‌شود.
 * ۲. در دسکتاپ و لپ‌تاپ (Landscape): به ویژه برای محتواهای حجیم، تبدیل به «ساید شیت» (Side Sheet)
 *    یا مودال سنترال لوکس می‌شود.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { X, ArrowRight, FastForward } from 'lucide-react';
import { useThemeAndSiteStore } from '../../store/useThemeAndSiteStore';
import { RADIUS_CLASSES, SITE_THEMES } from '../../theme/themeConfig';

export interface AdaptiveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  mode?: 'auto' | 'bottom-sheet' | 'side-sheet' | 'modal';
  side?: 'right' | 'left';
  maxWidthClass?: string;
  showBackdrop?: boolean;
}

export const AdaptiveOverlay: React.FC<AdaptiveOverlayProps> = ({
  isOpen,
  onClose,
  onSkip,
  title,
  subtitle,
  children,
  mode = 'auto',
  side = 'right',
  maxWidthClass = 'max-w-2xl',
  showBackdrop = true,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const { radius, siteTheme, sites, activeSiteId } = useThemeAndSiteStore();
  const currentSite = sites[activeSiteId];
  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;
  const radiusConfig = RADIUS_CLASSES[currentSite?.radius || radius];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // قفل اسکرول بدنه هنگام باز بودن
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // تعیین حالت نهایی نمایش
  const effectiveMode: 'bottom-sheet' | 'side-sheet' | 'modal' =
    mode === 'auto'
      ? isMobile
        ? 'bottom-sheet'
        : currentSite?.overlayMode || 'side-sheet'
      : mode;

  // هندلر درگ باتم شیت جهت بسته شدن با کشیدن به پایین
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // اگر به میزان کافی کشیده شد یا با سرعت به پایین پرتاب شد، بسته شود
    if (info.offset.y > 90 || info.velocity.y > 350) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none">
          {/* لایه پس‌زمینه محو و تیره (Backdrop) */}
          {showBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />
          )}

          {/* =========================================================================
              حالت اول: باتم شیت موبایل (Bottom Sheet)
              - دارای دسته درگ (Drag Handle)
              - بدون دکمه ضربدر (X) طبق دستور قطعی کاربر
              - امکان بستن با درگ به پایین (Drag down to dismiss)
              ========================================================================= */}
          {effectiveMode === 'bottom-sheet' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.8 }}
              onDragEnd={handleDragEnd}
              className={`absolute inset-x-0 bottom-0 max-h-[92vh] flex flex-col bg-neutral-900 border-t border-neutral-700/80 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] ${radiusConfig.sheetTop} overflow-hidden`}
              style={{ touchAction: 'none' }}
            >
              {/* دستگیره درگ جهت کشیدن به پایین (بدون هیچ ضربدری!) */}
              <div className="pt-3 pb-2 cursor-grab active:cursor-grabbing flex flex-col items-center shrink-0">
                <div className="w-12 h-1.5 bg-neutral-600 rounded-full hover:bg-neutral-500 transition-colors" />
                <span className="text-[10px] text-neutral-500 mt-1">برای بستن به پایین بکشید</span>
              </div>

              {/* هدر باتم شیت (فقط عنوان و زیرعنوان، اکیداً بدون دکمه ضربدر) */}
              {(title || subtitle) && (
                <div className="px-5 pb-3 border-b border-neutral-800 text-right shrink-0">
                  {title && (
                    <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <div className="text-xs text-neutral-400 mt-0.5">{subtitle}</div>
                  )}
                </div>
              )}

              {/* بدنه محتوا با اسکرول لمسی روان */}
              <div
                className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-neutral-700"
                style={{ touchAction: 'pan-y' }}
              >
                {children}
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              حالت دوم: ساید شیت دسکتاپ / لندسکیپ (Side Sheet)
              - ایده‌آل برای محتوای پرجزئیات مانند رزرو هتل و فرم‌های چند مرحله‌ای
              ========================================================================= */}
          {effectiveMode === 'side-sheet' && (
            <motion.div
              initial={{ x: side === 'right' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: side === 'right' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`absolute inset-y-0 ${
                side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
              } ${maxWidthClass} w-full bg-neutral-900 border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-right z-10`}
            >
              {/* هدر ساید شیت با دکمه بستن زیبا */}
              <div className="p-5 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950/40">
                <div>
                  {title && (
                    <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2.5">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <div className="text-xs text-neutral-400 mt-1">{subtitle}</div>
                  )}
                </div>

                {onSkip ? (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 hover:border-amber-400 text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-md active:scale-95"
                    title="رد کردن (Skip)"
                  >
                    <span>رد کردن</span>
                    <FastForward className="w-3.5 h-3.5 text-amber-400" style={{ transform: 'scaleX(-1)' }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                    title="بستن پنجره"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">بستن</span>
                  </button>
                )}
              </div>

              {/* بدنه ساید شیت */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
                {children}
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              حالت سوم: مودال دسکتاپ سنترال (Center Modal)
              ========================================================================= */}
          {effectiveMode === 'modal' && (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-10 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto bg-neutral-900 border ${currentTheme.colors.borderActive} ${radiusConfig.sheetFull} ${maxWidthClass} w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right`}
              >
                {/* هدر مودال */}
                <div className="p-5 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950/40">
                  <div>
                    {title && (
                      <h2 className="text-lg sm:text-xl font-bold text-neutral-100">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <div className="text-xs text-neutral-400 mt-1">{subtitle}</div>
                    )}
                  </div>

                  {onSkip ? (
                    <button
                      type="button"
                      onClick={onSkip}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 hover:border-amber-400 text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-md active:scale-95"
                      title="رد کردن (Skip)"
                    >
                      <span>رد کردن</span>
                      <FastForward className="w-3.5 h-3.5 text-amber-400" style={{ transform: 'scaleX(-1)' }} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* بدنه مودال */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
                  {children}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
