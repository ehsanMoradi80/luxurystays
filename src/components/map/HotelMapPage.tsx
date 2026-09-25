/**
 * HotelMapPage.tsx
 * 
 * صفحه نقشه و پلان چندطبقه هتل (Elevator / Multi-floor Environment Navigator)
 * - ناوبری ۳ سطحی: آسانسور طبقات -> پلان ویدیویی/تصویری طبقه -> تور ۳۶۰ درجه داخلی اتاق
 * - طراحی فوق‌العاده مینیمال و لوکس بدون متن‌های اضافه
 * - سوئیچ بین حالت پلان و تور ۳۶۰ با ترنزیشن نرم
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Utensils, 
  Waves, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Settings,
  MapPin
} from 'lucide-react';
import { useThemeAndSiteStore, MapHotspot } from '../../store/useThemeAndSiteStore';
import { HotelExperienceGraph } from '../../types/cms';
import { audioAmbiance } from '../../services/AudioAmbienceEngine';
import { Spatial360TourViewer } from './Spatial360TourViewer';

interface HotelMapPageProps {
  graph: HotelExperienceGraph;
  currentNodeId: string;
  onBack: () => void;
  onSelectScene: (targetNodeId: string) => void;
  onOpenAdmin: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  suite: Sparkles,
  lobby: Layers,
  dining: Utensils,
  pool: Waves,
  gate: Compass,
};

export const HotelMapPage: React.FC<HotelMapPageProps> = ({
  currentNodeId,
  onBack,
  onSelectScene,
  onOpenAdmin,
}) => {
  const { floors, activeFloorId, setActiveFloorId } = useThemeAndSiteStore();

  // فضا یا اتاقی که تور ۳۶۰ درجه آن فعال شده است
  const [activeTourHotspot, setActiveTourHotspot] = useState<MapHotspot | null>(null);

  // پیدا کردن طبقه بر اساس سکانس فعلی کاربر در اولین بارگذاری
  useEffect(() => {
    const matchingFloor = floors.find((fl) =>
      fl.hotspots.some((h) => h.nodeId === currentNodeId)
    );
    if (matchingFloor) {
      setActiveFloorId(matchingFloor.id);
    }
  }, [currentNodeId, floors, setActiveFloorId]);

  const currentFloor = floors.find((f) => f.id === activeFloorId) || floors[0] || {
    id: 'fl-1',
    code: '۱',
    name: '',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    hotspots: [],
  };

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  // کلید Escape برای بازگشت سریع
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTourHotspot) {
          setActiveTourHotspot(null);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTourHotspot, onBack]);

  const handleHotspotClick = (hs: MapHotspot) => {
    if (hs.has360Tour && hs.tour360Nodes && hs.tour360Nodes.length > 0) {
      audioAmbiance.playTransitionChime();
      setActiveTourHotspot(hs);
    } else {
      audioAmbiance.playTransitionChime();
      onSelectScene(hs.nodeId);
    }
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsVideoMuted(videoRef.current.muted);
  };

  // اگر کاربر وارد تور ۳۶۰ درجه یک اتاق شده باشد
  if (activeTourHotspot && activeTourHotspot.tour360Nodes && activeTourHotspot.tour360Nodes.length > 0) {
    return (
      <Spatial360TourViewer
        spaceTitle={activeTourHotspot.title}
        floorCode={currentFloor.code}
        floorName={currentFloor.name}
        nodes={activeTourHotspot.tour360Nodes}
        onExitToFloorPlan={() => setActiveTourHotspot(null)}
        onJumpToVideoTour={() => {
          setActiveTourHotspot(null);
          onSelectScene(activeTourHotspot.nodeId);
        }}
      />
    );
  }

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-neutral-950 flex flex-col font-sans select-none"
    >
      {/* =========================================================================
          هدر کاملاً خلوت: فقط دکمه بازگشت (آیکون) و دکمه تنظیمات (آیکون)
          ========================================================================= */}
      <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 z-30 flex items-center justify-between pointer-events-none">
        {/* دکمه بازگشت مینیمال بدون هیچ متن اضافه */}
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/85 border border-white/20 hover:border-amber-400/80 text-white hover:text-amber-400 flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all cursor-pointer active:scale-90"
          title="Back"
          aria-label="Back"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* دکمه تنظیمات نقشه ادمین */}
        <button
          type="button"
          onClick={onOpenAdmin}
          className="pointer-events-auto w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/85 border border-white/20 hover:border-amber-400/80 text-neutral-300 hover:text-amber-400 flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all cursor-pointer active:scale-90"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* =========================================================================
          سلکتور عمودی طبقات هتل (Elevator Floor Selector)
          فقط با نشانگر کدهای طبقات (مثلاً ۴، ۲، ۱، G) بدون هیچ متن شلوغ
          ========================================================================= */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 z-30 pointer-events-auto flex flex-col items-center gap-2.5 p-2 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-2xl shadow-2xl">
        {floors.map((floor) => {
          const isActive = floor.id === currentFloor.id;
          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => {
                setActiveFloorId(floor.id);
                audioAmbiance.playTick();
              }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 shadow-[0_0_16px_rgba(251,191,36,0.6)] scale-110 font-black'
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
          کانواس تمام‌صفحه نقشه با تصویر یا ویدیوی مجزا برای هر طبقه
          ========================================================================= */}
      <div className="relative flex-1 h-full w-full bg-neutral-950 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentFloor.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
            className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {currentFloor.mediaType === 'video' ? (
              <video
                ref={videoRef}
                key={currentFloor.mediaUrl}
                src={currentFloor.mediaUrl}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                className="w-full h-full object-cover pointer-events-auto"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
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

            {/* پین‌های تعاملی این طبقه - کلیک مستقیم و ورود فوری به تور ۳۶۰ یا سکانس */}
            <div className="absolute inset-0 pointer-events-none">
              {currentFloor.hotspots.map((hs) => {
                const isCurrentScene = hs.nodeId === currentNodeId;
                const Icon = ICON_MAP[hs.nodeId] || MapPin;

                return (
                  <div
                    key={hs.id}
                    style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 group"
                  >
                    {isCurrentScene && (
                      <span className="absolute -inset-2.5 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
                    )}

                    <button
                      type="button"
                      onClick={() => handleHotspotClick(hs)}
                      className={`relative w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl transition-all duration-300 cursor-pointer shadow-2xl active:scale-90 ${
                        isCurrentScene
                          ? 'bg-amber-400 text-neutral-950 border-white ring-4 ring-amber-400/40 scale-110'
                          : 'bg-black/80 text-amber-300 border-amber-400/60 hover:bg-amber-400 hover:text-neutral-950 hover:border-white hover:scale-110'
                      }`}
                      title={hs.has360Tour ? `تور ۳۶۰ درجه ${hs.title}` : hs.title}
                    >
                      <Icon className="w-5 h-5" />

                      {/* نشانگر ظریف ۳۶۰ درجه */}
                      {hs.has360Tour && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-[9px] font-black text-neutral-950 shadow-md">
                          360°
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* =========================================================================
            کنترل‌های مینیمال زوم و پخش ویدیو (فقط آیکون)
            ========================================================================= */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 bg-black/60 border border-white/15 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl">
          {currentFloor.mediaType === 'video' && (
            <>
              <button
                type="button"
                onClick={toggleVideoPlay}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Play/Pause"
              >
                {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={toggleVideoMute}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Sound"
              >
                {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
              </button>
              <div className="w-px h-4 bg-white/15 mx-0.5" />
            </>
          )}

          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5))}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75))}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
