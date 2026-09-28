/**
 * HotelMapPage.tsx
 * 
 * صفحه نقشه معماری و پلان از بالای طبقات هتل
 * - زوم این (+) و زوم اوت (-) کاملاً تست‌شده و فعال بدون تداخل انیمیشن
 * - پشتیبانی از ژست‌های حرکتی لمسی (Pinch to Zoom) در صفحات لمسی با دو انگشت
 * - پشتیبانی از اسکرول ماوس (Wheel) برای زوم و درگ (Pan) برای جابجایی نقشه
 * - الویتور طبقات در گوشه پایین سمت چپ با ابعاد مینیاتوری و شکیل
 * - اسپات‌های مینیاتوری و جذاب بدون هیچ‌گونه متن اضافه روی نقشه
 * - پیشگیری کامل از Memory Leak در چرخه حیات کامپوننت و ویدیوها
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Crown, 
  Coffee, 
  Gamepad2, 
  Bed, 
  Utensils, 
  Waves, 
  Layers, 
  Compass, 
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { useThemeAndSiteStore, MapHotspot } from '../../store/useThemeAndSiteStore';
import { HotelExperienceGraph } from '../../types/cms';
import { audioAmbiance } from '../../services/AudioAmbienceEngine';

interface HotelMapPageProps {
  graph: HotelExperienceGraph;
  currentNodeId: string;
  onBack: () => void;
  onSelectScene: (targetNodeId: string) => void;
  onOpenAdmin: () => void;
  onSelectExperience?: (experienceId: string, initialSequenceId?: string) => void;
  onBookExperience?: (experienceId: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  suite: Crown,
  room: Bed,
  cafe: Coffee,
  gameroom: Gamepad2,
  dining: Utensils,
  pool: Waves,
  lobby: Layers,
  gate: Compass,
};

export const HotelMapPage: React.FC<HotelMapPageProps> = ({
  currentNodeId,
  onBack,
  onSelectScene,
  onSelectExperience,
}) => {
  const { floors, activeFloorId, setActiveFloorId, dedicatedExperiences } = useThemeAndSiteStore();

  // مقادیر زوم و پن (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // رفرنس‌های مهار درگ ماوس و پینچ لمسی
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mouseDragRef = useRef<{ isDown: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // متغیرهای تاچ برای پینچ دو انگشتی (Pinch to Zoom)
  const touchStateRef = useRef<{
    initialDist: number | null;
    initialZoom: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    initialDist: null,
    initialZoom: 1,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // پیدا کردن طبقه بر اساس سکانس فعلی کاربر
  useEffect(() => {
    const matchingFloor = floors.find((fl) =>
      fl.hotspots.some((h) => 
        h.nodeId === currentNodeId || 
        h.subSequences?.some((sub) => sub.id === currentNodeId)
      )
    );
    if (matchingFloor) {
      setActiveFloorId(matchingFloor.id);
    }
  }, [currentNodeId, floors, setActiveFloorId]);

  const currentFloor = floors.find((f) => f.id === activeFloorId) || floors[0] || {
    id: 'fl-4',
    code: '۴',
    name: 'طبقه ۴',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=85',
    hotspots: [],
  };

  // بازنشانی مقادیر هنگام تعویض طبقه
  const handleFloorChange = (floorId: string) => {
    setActiveFloorId(floorId);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    audioAmbiance.playTick();
  };

  // عملیات‌های صریح زوم (Zoom In / Zoom Out)
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3, +(prev + 0.4).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(1, +(prev - 0.4).toFixed(2));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // زوم با چرخ ماوس (Mouse Wheel) روی کانتینر
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoom((prev) => {
        const next = Math.min(3, Math.max(1, +(prev + delta).toFixed(2)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  // مدیریت حرکات تاچ لمسی (Pinch to Zoom و Pan تک‌انگشتی)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getDistance = (t1: Touch, t2: Touch) => {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // شروع پینچ دو انگشتی
        setIsInteracting(true);
        touchStateRef.current.initialDist = getDistance(e.touches[0], e.touches[1]);
        touchStateRef.current.initialZoom = zoom;
      } else if (e.touches.length === 1 && zoom > 1) {
        // شروع پن تک‌انگشتی
        setIsInteracting(true);
        touchStateRef.current.startX = e.touches[0].clientX;
        touchStateRef.current.startY = e.touches[0].clientY;
        touchStateRef.current.startPanX = pan.x;
        touchStateRef.current.startPanY = pan.y;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current.initialDist !== null) {
        e.preventDefault();
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDist / touchStateRef.current.initialDist;
        const newZoom = Math.min(3, Math.max(1, +(touchStateRef.current.initialZoom * scaleChange).toFixed(2)));
        setZoom(newZoom);
        if (newZoom === 1) {
          setPan({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && zoom > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStateRef.current.startX;
        const dy = e.touches[0].clientY - touchStateRef.current.startY;
        setPan({
          x: touchStateRef.current.startPanX + dx,
          y: touchStateRef.current.startPanY + dy,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStateRef.current.initialDist = null;
      }
      if (e.touches.length === 0) {
        setIsInteracting(false);
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [zoom, pan]);

  // مدیریت درگ ماوس برای حرکت روی نقشه
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsInteracting(true);
    mouseDragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseDragRef.current.isDown || zoom <= 1) return;
    const dx = e.clientX - mouseDragRef.current.startX;
    const dy = e.clientY - mouseDragRef.current.startY;
    setPan({
      x: mouseDragRef.current.startPanX + dx,
      y: mouseDragRef.current.startPanY + dy,
    });
  };

  const handleMouseUp = () => {
    mouseDragRef.current.isDown = false;
    setIsInteracting(false);
  };

  // پیشگیری از Memory Leak و پاکسازی ویدیو
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // کلید Escape برای بازگشت سریع
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // کلیک روی هر اسپات -> ورود مستقیم به تجربه اختصاصی آن فضا
  const handlePinClick = (hs: MapHotspot) => {
    audioAmbiance.playTransitionChime();

    if (hs.experiencePackageId && onSelectExperience) {
      onSelectExperience(hs.experiencePackageId);
    } else {
      const matchingExp = dedicatedExperiences.find(
        (e) => e.id === hs.nodeId || e.category === hs.nodeId
      );
      if (matchingExp && onSelectExperience) {
        onSelectExperience(matchingExp.id);
      } else {
        onSelectScene(hs.nodeId);
      }
    }
  };

  return (
    <div 
      dir="rtl"
      className="relative w-screen h-screen overflow-hidden bg-neutral-950 flex flex-col font-sans select-none"
      onMouseUp={handleMouseUp}
    >
      {/* =========================================================================
          دکمه بازگشت (Back) مینیمال در گوشه بالا
          ========================================================================= */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/20 hover:border-amber-400 text-white hover:text-amber-400 flex items-center justify-center backdrop-blur-2xl shadow-2xl transition-all cursor-pointer active:scale-90"
          title="بازگشت به سایت اصلی"
          aria-label="Back"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* =========================================================================
          الویتور طبقات هتل (Elevator Selector)
          پایین‌تر در گوشه سمت چپ، کوچک‌تر و ظریف‌تر
          ========================================================================= */}
      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 z-40 pointer-events-auto flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-black/65 border border-white/15 backdrop-blur-2xl shadow-2xl">
        {floors.map((floor) => {
          const isActive = floor.id === currentFloor.id;
          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => handleFloorChange(floor.id)}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 shadow-[0_0_14px_rgba(251,191,36,0.6)] scale-105 font-black'
                  : 'bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10'
              }`}
              title={floor.name}
            >
              <span>{floor.code}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          کنترل‌های فعال و قطعی زوم (Zoom In / Zoom Out)
          در گوشه پایین سمت راست
          ========================================================================= */}
      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/65 border border-white/15 backdrop-blur-2xl shadow-2xl">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-25 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
          title="بزرگ‌نمایی (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-mono font-bold text-neutral-300 px-1 select-none">
          {Math.round(zoom * 100)}٪
        </span>

        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-25 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
          title="کوچک‌نمایی (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {zoom > 1 && (
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 flex items-center justify-center transition-all cursor-pointer active:scale-90"
            title="بازنشانی اندازه نقشه"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* =========================================================================
          کانواس تمام‌صفحه نقشه طبقه با پشتیبانی مستقیم از Zoom و Pan
          (بدون تداخل با ترنزیشن‌های انیمیشن فریمورک)
          ========================================================================= */}
      <div 
        ref={containerRef}
        className={`relative flex-1 h-full w-full bg-neutral-950 overflow-hidden flex items-center justify-center touch-none ${
          zoom > 1 ? (isInteracting ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentFloor.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
          >
            {/* لایه مقیاس‌پذیر نقشه با CSS Transform صریح */}
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isInteracting ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="relative w-full h-full flex items-center justify-center will-change-transform"
            >
              {/* تصویر یا ویدیوی پلان از بالا */}
              {currentFloor.mediaType === 'video' ? (
                <video
                  ref={videoRef}
                  key={currentFloor.mediaUrl}
                  src={currentFloor.mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <img
                  key={currentFloor.mediaUrl}
                  src={currentFloor.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />
              )}

              {/* گرادینت تیره ملایم */}
              <div className="absolute inset-0 bg-neutral-950/30 pointer-events-none" />

              {/* =====================================================================
                  اسپات‌های تعاملی نقشه:
                  - ابعاد کوچک‌تر و شکیل‌تر
                  - بدون هیچ متن اضافه روی نقشه
                  ===================================================================== */}
              <div className="absolute inset-0 pointer-events-none">
                {currentFloor.hotspots.map((hs) => {
                  const Icon = ICON_MAP[hs.nodeId] || MapPin;

                  return (
                    <div
                      key={hs.id}
                      style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 flex flex-col items-center group cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinClick(hs);
                      }}
                      title={hs.title}
                    >
                      {/* حلقه تپنده دور پین */}
                      <span className="absolute inset-0 rounded-xl bg-amber-400/35 animate-ping pointer-events-none" />

                      {/* دکمه اسپات کوچک و جذاب (بدون متن روی نقشه) */}
                      <button
                        type="button"
                        className="relative w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center border border-amber-400/80 bg-black/85 text-amber-300 hover:bg-amber-400 hover:text-neutral-950 hover:border-white hover:scale-115 backdrop-blur-2xl transition-all duration-200 shadow-[0_4px_18px_rgba(0,0,0,0.8)] active:scale-90 cursor-pointer"
                        title={hs.title}
                        aria-label={hs.title}
                      >
                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
