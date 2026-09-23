/**
 * NavigationTimeline.tsx
 * 
 * هدر و HUD اشرافی، مینیمال و هماهنگ با درخواست:
 * - هدر بالای صفحه شامل نام هتل، نشان، و دکمه قطع/وصل صدا
 * - نوار پیشرفت موقت سکانس‌ها زیر هدر (به جای پایین صفحه):
 *   نمایش نوار پیشرفت مرحله‌ای و افقی سکانس جاری بر اساس ترتیب گراف (مثلاً سکانس ۱ از ۵)
 * - نوار پیشرفت ترنزیشن تعاملی هنگام اسکرابینگ، زیر هدر
 */

import React from 'react';
import { Volume2, VolumeX, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { SpaceNode } from '../types/cms';

interface NavigationTimelineProps {
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  isAdmin?: boolean;
  onOpenFlowCanvas?: () => void;
  // مشخصات سکانس و ترنزیشن برای نوار پروگرس زیر هدر
  currentIndex: number;
  totalScenes: number;
  currentNode: SpaceNode;
  isTransitioning?: boolean;
  transitionProgress?: number;
  transitionSourceTitle?: string;
  transitionTargetTitle?: string;
  isReverseTransition?: boolean;
}

export const NavigationTimeline: React.FC<NavigationTimelineProps> = ({
  isAudioMuted,
  onToggleAudio,
  isAdmin = false,
  onOpenFlowCanvas,
  currentIndex,
  totalScenes,
  currentNode,
  isTransitioning = false,
  transitionProgress = 0,
  transitionSourceTitle = '',
  transitionTargetTitle = '',
  isReverseTransition = false,
}) => {
  const sceneNumber = currentIndex + 1;
  const isFirstScene = currentIndex === 0;
  const isLastScene = currentIndex === totalScenes - 1;

  return (
    <div id="navigation-hud-layer" className="absolute top-0 left-0 right-0 pointer-events-none z-40 flex flex-col p-4 sm:p-6 md:p-8">
      {/* =========================================================================
          هدر بالای صفحه: لوکس، خلوت و رسمی
          ========================================================================= */}
      <header className="flex items-center justify-between pointer-events-auto w-full">
        {/* نشان و نام هتل */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 rounded-full border border-amber-400/50 bg-black/60 backdrop-blur-xl flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <span className="font-serif text-amber-300 font-bold text-sm tracking-wider">ق</span>
          </div>
          <div>
            <span className="font-serif text-sm sm:text-base tracking-[0.2em] text-white font-semibold drop-shadow-md block">
              قصر لورا
            </span>
            <span className="text-[9px] text-amber-300/80 tracking-widest uppercase font-light block">
              Hotel & Sanctuary
            </span>
          </div>
        </div>

        {/* دکمه‌های کنترل */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-audio"
            onClick={onToggleAudio}
            className="w-9 h-9 rounded-full bg-black/50 border border-white/20 hover:border-amber-400/80 text-white hover:text-amber-300 backdrop-blur-xl flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
            title={isAudioMuted ? 'پخش نوای آرامش‌بخش' : 'قطع صدا'}
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-neutral-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
          </button>

          {isAdmin && onOpenFlowCanvas && (
            <button
              id="btn-open-admin-panel"
              onClick={onOpenFlowCanvas}
              className="px-3 py-1.5 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-xl hover:bg-amber-400/20 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px]">پنل گراف</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          نوار پروگرس زیر هدر (Temporary Progress Bar Under Header)
          طبق درخواست، این نوار موقت در زیر هدر قرار دارد تا ترتیب سکانس‌ها و ترنزیشن
          به طور کامل و واضح قابل مشاهده باشد.
          ========================================================================= */}
      <div className="w-full max-w-3xl mx-auto mt-4 pointer-events-auto">
        <div className="bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:px-5 sm:py-3 shadow-2xl transition-all duration-200">
          {/* حالت ۱: ترنزیشن در حال انجام است */}
          {isTransitioning ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    {isReverseTransition
                      ? `ترنزیشن دنده عقب: به سوی سکانس ${currentIndex}`
                      : `ترنزیشن رو به جلو: به سوی سکانس ${currentIndex + 2}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300 text-[11px]">
                  <span>{transitionSourceTitle}</span>
                  {isReverseTransition ? (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="text-amber-300 font-semibold">{transitionTargetTitle}</span>
                  <span className="font-mono text-amber-400 font-bold ml-1 text-xs">
                    {Math.round(transitionProgress * 100)}%
                  </span>
                </div>
              </div>

              {/* نوار ترنزیشن اسکرول */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-200 transition-all duration-75 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                  style={{ width: `${Math.round(transitionProgress * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>{isReverseTransition ? 'اسکرول به بالا: پیشروی دنده عقب' : 'اسکرول به پایین: پیشروی به جلو'}</span>
                <span>توقف اسکرول = نگه‌داشت فریم</span>
                <span>تکمیل در ۹۵٪</span>
              </div>
            </div>
          ) : (
            /* حالت ۲: سکانس پایدار (بدون ترنزیشن) */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                    سکانس {sceneNumber} از {totalScenes}
                  </span>
                  <span className="text-white font-bold text-xs sm:text-sm">
                    {currentNode.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  {isFirstScene && (
                    <span className="text-neutral-500 font-medium bg-white/5 px-2 py-0.5 rounded">
                      (سکانس اول - شروع مسیر)
                    </span>
                  )}
                  {isLastScene && (
                    <span className="text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      (سکانس آخر - انتهای مسیر)
                    </span>
                  )}
                  <span className="text-neutral-400 hidden sm:inline">
                    {isFirstScene
                      ? 'فقط اسکرول به پایین مجاز است'
                      : isLastScene
                      ? 'فقط اسکرول به بالا (دنده عقب) مجاز است'
                      : 'اسکرول به بالا = قبل | اسکرول به پایین = بعد'}
                  </span>
                </div>
              </div>

              {/* قطعات مرحله‌ای پیشرفت سکانس‌ها در گراف (۱، ۲، ۳، ۴، ۵) */}
              <div className="grid grid-cols-5 gap-1.5 w-full">
                {Array.from({ length: totalScenes }).map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isPassed = idx < currentIndex;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-1"
                    >
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isCurrent
                            ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                            : isPassed
                            ? 'bg-neutral-500'
                            : 'bg-white/15'
                        }`}
                      />
                      <span className={`text-[9px] text-center font-mono ${isCurrent ? 'text-amber-300 font-bold' : 'text-neutral-500'}`}>
                        {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
