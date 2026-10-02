/**
 * DedicatedExperiencePlayer.tsx
 * 
 * پخش‌کننده سینمایی و فوق‌لوکس برای «تجربه اختصاصی» هتل (سوئیت، کافه، گیم‌روم، اتاق، رستوران، اسپا و...)
 * - الهام‌گرفته مستقیم از صفحه اصلی:
 *   - جابجایی بین سکانس‌ها صرفاً از طریق اسکرول (Wheel / Touch Swipe) و همراه با پخش ویدیوی ترنزیشن
 *   - پروگرس‌بار چسبیده به سقف صفحه (Ceiling Progress Bar) برای نمایش توالی سکانس‌ها
 *   - حذف تمامی دکمه‌های زائد نویگیشن (فلش‌ها و دکمه‌های تایم‌لاین حذف شده‌اند)
 *   - هدر کاملاً مینیمال (فقط دکمه بازگشت و دکمه صدا)
 *   - عنوان و زیرعنوان فضا همراه با دکمه رزرو اقامتگاه/تجربه
 *   - جلوگیری کامل از Memory Leak با مدیریت چرخه حیات ویدیوها و لیسنرها
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Sparkles 
} from 'lucide-react';
import { DedicatedExperience, DedicatedTransition, DedicatedSequence } from '../types/cms';
import { formatPersianPrice } from '../utils/jalali';
import { audioAmbiance } from '../services/AudioAmbienceEngine';
import { preloadManager } from '../services/PreloadManager';

interface DedicatedExperiencePlayerProps {
  experience: DedicatedExperience;
  initialSequenceId?: string;
  onClose: () => void;
  onBookNow?: (experience: DedicatedExperience) => void;
}

export const DedicatedExperiencePlayer: React.FC<DedicatedExperiencePlayerProps> = ({
  experience,
  initialSequenceId,
  onClose,
  onBookNow,
}) => {
  const sequences = experience.sequences || [];
  const transitions = experience.transitions || [];

  // Active sequence state
  const [currentSeqId, setCurrentSeqId] = useState<string>(() => {
    if (initialSequenceId && sequences.some((s) => s.id === initialSequenceId)) {
      return initialSequenceId;
    }
    return sequences[0]?.id || '';
  });

  // Transition state
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [activeTransition, setActiveTransition] = useState<DedicatedTransition | null>(null);

  // Audio state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Video refs for memory leak prevention
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  const transVideoRef = useRef<HTMLVideoElement>(null);

  // Scroll and transition throttling
  const lastScrollTimeRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);
  const activeTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const currentSequence = sequences.find((s) => s.id === currentSeqId) || sequences[0];
  const currentIndex = sequences.findIndex((s) => s.id === currentSequence?.id);

  // Preload adjacent sequences and transitions in background
  useEffect(() => {
    if (!currentSequence) return;

    // Preload current sequence video
    if (currentSequence.videoUrl) {
      preloadManager.preloadVideo(currentSequence.videoUrl);
    }
    
    // Preload current sequence audio if available
    if (currentSequence.audioUrl) {
      preloadManager.preloadAudio(currentSequence.audioUrl);
    }

    // Preload poster
    if (currentSequence.posterUrl) {
      preloadManager.preloadPlaceholderTexture(currentSequence.posterUrl);
    }

    // Preload adjacent sequences (previous and next)
    const prevSeq = sequences[currentIndex - 1];
    const nextSeq = sequences[currentIndex + 1];

    [prevSeq, nextSeq].forEach((seq) => {
      if (!seq) return;
      if (seq.videoUrl) {
        preloadManager.preloadVideo(seq.videoUrl);
      }
      if (seq.audioUrl) {
        preloadManager.preloadAudio(seq.audioUrl);
      }
      if (seq.posterUrl) {
        preloadManager.preloadPlaceholderTexture(seq.posterUrl);
      }
    });

    // Preload transitions to/from adjacent sequences
    const relevantTransitions = transitions.filter((t) => 
      t.fromSequenceId === currentSeqId || 
      t.toSequenceId === currentSeqId ||
      (prevSeq && (t.fromSequenceId === prevSeq.id || t.toSequenceId === prevSeq.id)) ||
      (nextSeq && (t.fromSequenceId === nextSeq.id || t.toSequenceId === nextSeq.id))
    );

    relevantTransitions.forEach((trans) => {
      if (trans.videoUrl) {
        preloadManager.preloadVideo(trans.videoUrl);
      }
      if (trans.audioUrl) {
        preloadManager.preloadAudio(trans.audioUrl);
      }
      if (trans.reverseAudioUrl) {
        preloadManager.preloadAudio(trans.reverseAudioUrl);
      }
    });
  }, [currentSeqId, sequences, transitions, currentIndex]);

  // Execute transition between sequences
  const transitionToSequence = useCallback((targetSeqId: string) => {
    if (targetSeqId === currentSeqId || isTransitioning) return;

    let trans = transitions.find(
      (t) => t.fromSequenceId === currentSeqId && t.toSequenceId === targetSeqId
    );

    if (!trans) {
      trans = transitions.find((t) => t.toSequenceId === targetSeqId) || {
        id: `trans-${currentSeqId}-${targetSeqId}`,
        fromSequenceId: currentSeqId,
        toSequenceId: targetSeqId,
        label: 'انتقال سینمایی',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.5,
        direction: 'forward',
      };
    }

    audioAmbiance.playTransitionChime();
    setActiveTransition(trans);
    setIsTransitioning(true);

    if (loopVideoRef.current) {
      loopVideoRef.current.pause();
    }
  }, [currentSeqId, isTransitioning, transitions]);

  // Handle transition end
  const handleTransitionEnded = useCallback(() => {
    if (activeTransition) {
      setCurrentSeqId(activeTransition.toSequenceId);
    }
    setIsTransitioning(false);
    setActiveTransition(null);

    if (loopVideoRef.current) {
      loopVideoRef.current.currentTime = 0;
      loopVideoRef.current.play().catch(() => {});
    }
  }, [activeTransition]);

  // کنترل جابجایی با اسکرول (Wheel / Trackpad)
  useEffect(() => {
    let accumulatedDelta = 0;
    let resetTimer: NodeJS.Timeout;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (isTransitioning || now - lastScrollTimeRef.current < 650) return;

      accumulatedDelta += e.deltaY;

      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        accumulatedDelta = 0;
      }, 250);

      if (accumulatedDelta > 40) {
        accumulatedDelta = 0;
        if (currentIndex < sequences.length - 1) {
          lastScrollTimeRef.current = now;
          transitionToSequence(sequences[currentIndex + 1].id);
        }
      } else if (accumulatedDelta < -40) {
        accumulatedDelta = 0;
        if (currentIndex > 0) {
          lastScrollTimeRef.current = now;
          transitionToSequence(sequences[currentIndex - 1].id);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(resetTimer);
    };
  }, [currentIndex, isTransitioning, sequences, transitionToSequence]);

  // کنترل جابجایی با سوایپ لمسی (Touch Swipe) در صفحات لمسی
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null || isTransitioning) return;
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 650) return;

      const deltaY = e.touches[0].clientY - touchStartYRef.current;

      // کشیدن به بالا => رفتن به سکانس بعد
      if (deltaY < -45) {
        touchStartYRef.current = null;
        if (currentIndex < sequences.length - 1) {
          lastScrollTimeRef.current = now;
          transitionToSequence(sequences[currentIndex + 1].id);
        }
      } 
      // کشیدن به پایین => بازگشت به سکانس قبل
      else if (deltaY > 45) {
        touchStartYRef.current = null;
        if (currentIndex > 0) {
          lastScrollTimeRef.current = now;
          transitionToSequence(sequences[currentIndex - 1].id);
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentIndex, isTransitioning, sequences, transitionToSequence]);

  // کلیدهای میانبر (Escape برای بستن، بالا/پایین برای اسکرول)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowLeft') && currentIndex < sequences.length - 1) {
        transitionToSequence(sequences[currentIndex + 1].id);
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowRight') && currentIndex > 0) {
        transitionToSequence(sequences[currentIndex - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, sequences, transitionToSequence, onClose]);

  // جلوگیری کامل از Memory Leak در هنگام Unmount
  useEffect(() => {
    const timeouts = activeTimeoutsRef.current;
    const loopVideo = loopVideoRef.current;
    const transVideo = transVideoRef.current;

    return () => {
      timeouts.forEach(clearTimeout);

      if (loopVideo) {
        try {
          loopVideo.pause();
          loopVideo.removeAttribute('src');
          loopVideo.load();
        } catch {
          // ignore
        }
      }

      if (transVideo) {
        try {
          transVideo.pause();
          transVideo.removeAttribute('src');
          transVideo.load();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div 
      dir="rtl"
      className="fixed inset-0 w-screen h-screen z-50 bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none overflow-hidden touch-none"
    >
      {/* =========================================================================
          پروگرس‌بار چسبیده به سقف صفحه (Sticky Ceiling Progress Bar)
          دقیقاً الهام‌گرفته از ساختار نوار سقف صفحه اصلی
          ========================================================================= */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center gap-1.5 px-4 sm:px-8 pt-2.5 pointer-events-none">
        {sequences.map((seq, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div 
              key={seq.id} 
              className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden backdrop-blur-md transition-all"
            >
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                  isPast 
                    ? 'w-full bg-amber-400' 
                    : isCurrent 
                    ? 'w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)]' 
                    : 'w-0'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          لایه Z-0: ویدیوهای لوپ و ترنزیشن
          ========================================================================= */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-950 z-0">
        {/* ۱. ویدیوی لوپ سکانس جاری */}
        {currentSequence?.videoUrl && (
          <video
            ref={loopVideoRef}
            key={`loop-${currentSequence.id}`}
            src={currentSequence.videoUrl}
            poster={currentSequence.posterUrl}
            autoPlay
            loop
            muted={isAudioMuted}
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
              isTransitioning ? 'opacity-0 scale-105 filter blur-xs' : 'opacity-100 scale-100'
            }`}
          />
        )}

        {/* ۲. ویدیوی ترنزیشن سینمایی بین دو سکانس */}
        {isTransitioning && activeTransition && (
          <video
            ref={transVideoRef}
            key={`trans-${activeTransition.id}`}
            src={activeTransition.videoUrl}
            autoPlay
            playsInline
            muted={isAudioMuted}
            onEnded={handleTransitionEnded}
            className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
          />
        )}

        {/* گرادینت تیره جهت خوانایی عنوان و المان‌ها */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-neutral-950/60 pointer-events-none z-10" />
      </div>

      {/* =========================================================================
          هدر کاملاً مینیمال (فقط دکمه بازگشت در راست و دکمه صدا در چپ)
          بدون هیچ دکمه اضافه یا متن شلوغ
          ========================================================================= */}
      <header className="relative z-40 px-5 sm:px-8 pt-6 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/20 hover:border-amber-400 text-white hover:text-amber-400 flex items-center justify-center backdrop-blur-2xl shadow-2xl transition-all cursor-pointer active:scale-90"
            title="بازگشت"
            aria-label="Back"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <span className="text-sm font-bold text-white/90 drop-shadow hidden sm:inline-block">
            {experience.title}
          </span>
        </div>

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/20 hover:border-amber-400 text-neutral-300 hover:text-white flex items-center justify-center backdrop-blur-2xl transition-all cursor-pointer active:scale-90"
            title={isAudioMuted ? 'پخش صدا' : 'قطع صدا'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          فضای میانی: کاملاً خالی و شفاف (بدون دکمه‌های نویگیشن فلش کناری)
          ========================================================================= */}
      <div className="flex-1 pointer-events-none" />

      {/* =========================================================================
          لایه پایینی صفحه: عنوان، زیرعنوان و دکمه رزرو اقامتگاه / تجربه
          (بدون دکمه‌های تایم‌لاین، نویگیشن صرفاً با اسکرول انجام می‌پذیرد)
          ========================================================================= */}
      <footer className="relative z-30 px-6 sm:px-12 pb-8 pt-4 pointer-events-none">
        <div className="pointer-events-auto max-w-2xl text-right space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSequence?.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-1"
            >
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] tracking-tight">
                {currentSequence?.title}
              </h1>

              {currentSequence?.subtitle && (
                <p className="text-xs sm:text-sm text-neutral-300 font-light drop-shadow line-clamp-2 max-w-xl">
                  {currentSequence.subtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* دکمه رزرو اقامتگاه / تجربه */}
          {onBookNow && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onBookNow(experience)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(251,191,36,0.5)] flex items-center gap-2 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 fill-neutral-950" />
                <span>رزرو این اقامتگاه / تجربه</span>
                <span className="text-[11px] font-bold text-neutral-800 mr-2 bg-black/10 px-2 py-0.5 rounded-lg">
                  {formatPersianPrice(experience.price)}
                </span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
