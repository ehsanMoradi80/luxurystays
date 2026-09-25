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
import { Volume2, VolumeX, SlidersHorizontal, Map } from 'lucide-react';
import { SpaceNode } from '../types/cms';
import { useThemeAndSiteStore } from '../store/useThemeAndSiteStore';

interface NavigationTimelineProps {
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  isAdmin?: boolean;
  onOpenFlowCanvas?: () => void;
  onOpenAdmin?: () => void;
  onOpenMap?: () => void;
  currentIndex: number;
  totalScenes: number;
  currentNode: SpaceNode;
  isTransitioning?: boolean;
  transitionProgress?: number;
  transitionSourceTitle?: string;
  transitionTargetTitle?: string;
  isReverseTransition?: boolean;
  isBookingOpen?: boolean;
}

export const NavigationTimeline: React.FC<NavigationTimelineProps> = ({
  isAudioMuted,
  onToggleAudio,
  isAdmin = false,
  onOpenFlowCanvas,
  onOpenAdmin,
  onOpenMap,
  currentIndex,
  totalScenes,
  isTransitioning = false,
  transitionProgress = 0,
  isReverseTransition = false,
  isBookingOpen = false,
}) => {
  const { sites, activeSiteId } = useThemeAndSiteStore();
  const currentSite = sites[activeSiteId];

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
              {currentSite?.name || 'قصر لورا'}
            </span>
            <span className="text-[9px] text-amber-300/80 tracking-widest uppercase font-light block">
              {currentSite?.location || 'Hotel & Sanctuary'}
            </span>
          </div>
        </div>

        {/* دکمه‌های کنترل */}
        <div className="flex items-center gap-2.5">
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

          {/* دکمه نقشه هتل (جایگزین دکمه تنظیمات طبق درخواست) */}
          {onOpenMap && (
            <button
              id="btn-open-hotel-map"
              onClick={onOpenMap}
              className="px-3.5 py-1.5 rounded-full bg-black/60 border border-amber-400/60 hover:border-amber-400 text-amber-300 text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-xl hover:bg-amber-400/20 transition-all shadow-lg active:scale-95"
              title="مشاهده نقشه و پلان فضایی هتل"
            >
              <Map className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold">نقشه هتل</span>
            </button>
          )}

          {isAdmin && onOpenFlowCanvas && (
            <button
              id="btn-open-admin-panel"
              onClick={onOpenFlowCanvas}
              className="px-3 py-1.5 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-xl hover:bg-amber-400/20 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px]">گراف</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          نوار پروگرس سکانس‌ها: در زمان رزرواسیون پنهان شده تا ویزارد مستقیماً زیر هدر داک شود
          ========================================================================= */}
      {!isBookingOpen && (
        <div className="w-full max-w-3xl mx-auto mt-2 pointer-events-none">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full">
            {Array.from({ length: totalScenes }).map((_, idx) => {
              let widthPercent = 0;
              let barStyle = 'bg-white/20';

              if (isTransitioning) {
                if (isReverseTransition) {
                  if (idx < currentIndex) {
                    widthPercent = 100;
                    barStyle = idx === currentIndex - 1 ? 'bg-amber-400' : 'bg-neutral-400/80';
                  } else if (idx === currentIndex) {
                    widthPercent = Math.max(0, Math.min(100, Math.round((1 - transitionProgress) * 100)));
                    barStyle = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]';
                  } else {
                    widthPercent = 0;
                  }
                } else {
                  if (idx <= currentIndex) {
                    widthPercent = 100;
                    barStyle = idx === currentIndex ? 'bg-amber-400' : 'bg-neutral-400/80';
                  } else if (idx === currentIndex + 1) {
                    widthPercent = Math.max(0, Math.min(100, Math.round(transitionProgress * 100)));
                    barStyle = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]';
                  } else {
                    widthPercent = 0;
                  }
                }
              } else {
                if (idx < currentIndex) {
                  widthPercent = 100;
                  barStyle = 'bg-neutral-400/80';
                } else if (idx === currentIndex) {
                  widthPercent = 100;
                  barStyle = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]';
                } else {
                  widthPercent = 0;
                }
              }

              return (
                <div
                  key={idx}
                  className="relative h-1 sm:h-1.5 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${barStyle}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

