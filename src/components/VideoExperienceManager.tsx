/**
 * VideoExperienceManager.tsx
 * 
 * موتور سینمایی سکانس‌ها و سکانس‌های ترنزیشن با فیزیک کشیدن و اینرسی (Drag & Inertia Engine)
 * کاملاً منطبق با درخواست اختصاصی کاربر:
 * ۱. ترنزیشن فقط و فقط با کشیدن (Drag) و اینرسی فیزیکی حرکت می‌کند.
 * ۲. هنگام بی‌حرکتی، هیچ‌گونه پروگرس خودکار (No Auto-Progress) وجود ندارد؛ ویدیو کاملاً متوقف می‌ماند.
 * ۳. هماهنگی صدم‌ثانیه‌ای فریم‌های ویدیوی MP4 با پیشرفت کشش کاربر.
 * ۴. پشتیبانی هم‌زمان از درگ ماوس، ژست لمسی موبایل، ترک‌پد و اسکرول با اینرسی طبیعی (Damping Friction).
 * ۵. مدیریت بهینه مموری و بافر دیکودر ویدیویی (Zero Memory Leaks).
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  HotelExperienceGraph,
  TransitionEdge,
} from '../types/sequenceGraph';
import { MoveVertical } from 'lucide-react';

export interface VideoExperienceManagerRef {
  goToNext: () => void;
  goToPrev: () => void;
  jumpToNode: (nodeId: string) => void;
  cancelTransition: () => void;
}

interface VideoExperienceManagerProps {
  graph: HotelExperienceGraph;
  currentNodeId: string;
  onNodeChange: (nodeId: string) => void;
  onOpenBooking: () => void;
  onStatusChange?: (status: 'IDLE' | 'TRANSITIONING') => void;
  onTransitionStart?: (edge: TransitionEdge) => void;
  onTransitionEnd?: () => void;
  enableScrollScrubbing?: boolean;
}

export const VideoExperienceManager = forwardRef<
  VideoExperienceManagerRef,
  VideoExperienceManagerProps
>(
  (
    {
      graph,
      currentNodeId,
      onNodeChange,
      onStatusChange,
      onTransitionStart,
      onTransitionEnd,
    },
    ref
  ) => {
    // -------------------------------------------------------------------------
    // ۱. استیت‌های هسته (Core State)
    // -------------------------------------------------------------------------
    const [mode, setMode] = useState<'SCENE' | 'TRANSITION'>('SCENE');
    const [activeEdge, setActiveEdge] = useState<TransitionEdge | null>(null);
    const [isReverse, setIsReverse] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // ارجاعات به عناصر ویدیو و کانتینر
    const sceneVideoRef = useRef<HTMLVideoElement | null>(null);
    const transitionVideoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // مقادیر فیزیک اینرسی
    const velocityRef = useRef<number>(0);
    const inertiaRafRef = useRef<number | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const dragStartYRef = useRef<number>(0);
    const dragLastYRef = useRef<number>(0);
    const dragLastTimeRef = useRef<number>(0);

    // رفرنس‌های فرار از closure
    const modeRef = useRef<'SCENE' | 'TRANSITION'>('SCENE');
    modeRef.current = mode;

    const progressRef = useRef<number>(0);
    progressRef.current = progress;

    const activeEdgeRef = useRef<TransitionEdge | null>(null);
    activeEdgeRef.current = activeEdge;

    const isReverseRef = useRef<boolean>(false);
    isReverseRef.current = isReverse;

    // استخراج گره فعلی و شاخص
    const currentIndex = graph.nodes.findIndex((n) => n.id === currentNodeId);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const currentNode = graph.nodes[validIndex] || graph.nodes[0];
    const isFirstScene = validIndex === 0;
    const isLastScene = validIndex === graph.nodes.length - 1;

    // پیدا کردن لبه ترنزیشن بعدی و قبلی
    const forwardTransitionEdge: TransitionEdge | undefined =
      currentNode?.transitions?.[0] ||
      (!isLastScene
        ? {
            id: `auto-fwd-${currentNode.id}`,
            targetNodeId: graph.nodes[validIndex + 1].id,
            label: graph.nodes[validIndex + 1].persianTitle,
            reverseAllowed: true,
            video: {
              mediaType: 'video',
              landscapeUrl: `/videos/trans-0${validIndex + 1}-to-0${validIndex + 2}.mp4`,
              durationSeconds: 6,
            },
          }
        : undefined);

    const prevNode = !isFirstScene ? graph.nodes[validIndex - 1] : null;
    const backwardTransitionEdge: TransitionEdge | undefined = prevNode
      ? prevNode.transitions?.[0] || {
          id: `auto-rev-${currentNode.id}`,
          targetNodeId: prevNode.id,
          label: prevNode.persianTitle,
          reverseAllowed: true,
          video: {
            mediaType: 'video',
            landscapeUrl: `/videos/trans-0${validIndex}-to-0${validIndex + 1}.mp4`,
            durationSeconds: 6,
          },
        }
      : undefined;

    // -------------------------------------------------------------------------
    // ۲. مدیریت بهینه مموری و بافر دیکودر ویدیو (Purge & Memory Management)
    // -------------------------------------------------------------------------
    const purgeVideoElement = useCallback((video: HTMLVideoElement | null) => {
      if (!video) return;
      try {
        video.pause();
        video.removeAttribute('src');
        video.load(); // تخلیه فوری بافر GPU
      } catch {
        // خطاهای احتمالی نادیده گرفته شوند
      }
    }, []);

    const stopInertia = useCallback(() => {
      if (inertiaRafRef.current) {
        cancelAnimationFrame(inertiaRafRef.current);
        inertiaRafRef.current = null;
      }
      velocityRef.current = 0;
    }, []);

    // -------------------------------------------------------------------------
    // ۳. تکمیل ترنزیشن یا بازگشت (Completion & Reversal)
    // -------------------------------------------------------------------------
    const completeTransition = useCallback(() => {
      stopInertia();
      const edge = activeEdgeRef.current;
      const reverse = isReverseRef.current;

      const targetId = reverse
        ? prevNode?.id || currentNode.id
        : edge?.targetNodeId || currentNode.id;

      purgeVideoElement(transitionVideoRef.current);

      setMode('SCENE');
      setActiveEdge(null);
      setProgress(0);
      setIsDragging(false);

      onNodeChange(targetId);
      onStatusChange?.('IDLE');
      onTransitionEnd?.();
    }, [currentNode.id, onNodeChange, onStatusChange, onTransitionEnd, prevNode?.id, purgeVideoElement, stopInertia]);

    const cancelBackToOrigin = useCallback(() => {
      stopInertia();
      purgeVideoElement(transitionVideoRef.current);

      setMode('SCENE');
      setActiveEdge(null);
      setProgress(0);
      setIsDragging(false);

      onStatusChange?.('IDLE');
      onTransitionEnd?.();
    }, [onStatusChange, onTransitionEnd, purgeVideoElement, stopInertia]);

    // -------------------------------------------------------------------------
    // ۴. شروع ترنزیشن با آماده‌سازی ویدیو در حالت متوقف (Paused & Ready to Scrub)
    // -------------------------------------------------------------------------
    const startTransition = useCallback(
      (edge: TransitionEdge, reverse: boolean = false, initialVelocity: number = 0) => {
        if (modeRef.current === 'TRANSITION') return;

        stopInertia();
        setActiveEdge(edge);
        setIsReverse(reverse);
        const startProg = reverse ? 1 : 0;
        setProgress(startProg);
        progressRef.current = startProg;
        setMode('TRANSITION');

        onStatusChange?.('TRANSITIONING');
        onTransitionStart?.(edge);

        const tVideo = transitionVideoRef.current;
        if (tVideo) {
          const videoUrl =
            edge.video?.landscapeUrl ||
            `/videos/trans-0${validIndex + 1}-to-0${validIndex + 2}.mp4`;

          if (tVideo.src !== videoUrl && !tVideo.src.endsWith(videoUrl)) {
            tVideo.src = videoUrl;
          }
          tVideo.pause(); // به هیچ عنوان خودکار پخش نشود!
          const dur = tVideo.duration || 6;
          tVideo.currentTime = startProg * dur;
        }

        if (Math.abs(initialVelocity) > 0.0001) {
          velocityRef.current = initialVelocity;
          startInertiaLoop();
        }
      },
      [onStatusChange, onTransitionStart, stopInertia, validIndex]
    );

    // -------------------------------------------------------------------------
    // ۵. حلقه فیزیک اینرسی (Physics Inertia RAF Loop with Damping)
    // وقتی کاربر کاری نمی‌کند و سرعت صفر می‌شود، پروگرس کاملاً متوقف می‌ماند
    // -------------------------------------------------------------------------
    const startInertiaLoop = useCallback(() => {
      if (inertiaRafRef.current) {
        cancelAnimationFrame(inertiaRafRef.current);
      }

      const step = () => {
        // اگر کاربر در حال لمس/درگ فعال است، حلقه اینرسی منتظر می‌ماند
        if (isDraggingRef.current) {
          inertiaRafRef.current = null;
          return;
        }

        const v = velocityRef.current;
        if (Math.abs(v) < 0.00008) {
          // اینرسی تمام شد؛ توقف کامل! هیچ حرکتی بدون دستور کاربر اتفاق نمی‌افتد
          velocityRef.current = 0;
          inertiaRafRef.current = null;
          return;
        }

        // اعمال سرعت به پروگرس
        let next = progressRef.current + v;

        // اصطکاک میرایی اینرسی (Damping coefficient) - حس غوطه‌وری و نرمی لوکس
        velocityRef.current = v * 0.91;

        if (next >= 0.99) {
          // به انتهای ترنزیشن رسیدیم -> ورود به سکانس بعد
          setProgress(1);
          progressRef.current = 1;
          completeTransition();
          return;
        }

        if (next <= 0.01 && isReverseRef.current) {
          // بازگشت کامل به سکانس مبدأ
          setProgress(0);
          progressRef.current = 0;
          cancelBackToOrigin();
          return;
        }

        next = Math.max(0, Math.min(1, next));
        setProgress(next);
        progressRef.current = next;

        // هماهنگ‌سازی فریم ویدیو با زمان دقیق پروگرس
        const tVideo = transitionVideoRef.current;
        if (tVideo && tVideo.duration) {
          try {
            tVideo.currentTime = next * tVideo.duration;
          } catch {
            // ignore seek
          }
        }

        inertiaRafRef.current = requestAnimationFrame(step);
      };

      inertiaRafRef.current = requestAnimationFrame(step);
    }, [cancelBackToOrigin, completeTransition]);

    // -------------------------------------------------------------------------
    // ۶. اسکراب مستقیم با درگ یا اسکرول (Direct Scrubbing Handlers)
    // -------------------------------------------------------------------------
    const applyDirectDelta = useCallback(
      (deltaProgress: number, instantVelocity: number) => {
        stopInertia();

        let next = progressRef.current + deltaProgress;
        if (next >= 0.99) {
          setProgress(1);
          progressRef.current = 1;
          completeTransition();
          return;
        }

        if (next <= 0.01 && isReverseRef.current) {
          setProgress(0);
          progressRef.current = 0;
          cancelBackToOrigin();
          return;
        }

        next = Math.max(0, Math.min(1, next));
        setProgress(next);
        progressRef.current = next;

        // تنظیم فریم ویدیو
        const tVideo = transitionVideoRef.current;
        if (tVideo && tVideo.duration) {
          try {
            tVideo.currentTime = next * tVideo.duration;
          } catch {
            // ignore seek
          }
        }

        velocityRef.current = instantVelocity;
      },
      [cancelBackToOrigin, completeTransition, stopInertia]
    );

    // -------------------------------------------------------------------------
    // ۷. کنترل جامع رویدادهای ماوس، لمس و اسکرول چرخشی (Touch, Mouse Drag & Wheel)
    // -------------------------------------------------------------------------
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // الف) ماوس داون / تاچ استارت
      const handleStart = (clientY: number) => {
        stopInertia();
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartYRef.current = clientY;
        dragLastYRef.current = clientY;
        dragLastTimeRef.current = performance.now();
      };

      // ب) ماوس موو / تاچ موو
      const handleMove = (clientY: number) => {
        if (!isDraggingRef.current) return;

        const now = performance.now();
        const dt = Math.max(8, now - dragLastTimeRef.current);
        const dy = dragLastYRef.current - clientY; // کشیدن رو به بالا -> مقدار مثبت
        dragLastYRef.current = clientY;
        dragLastTimeRef.current = now;

        if (modeRef.current === 'SCENE') {
          // اگر کاربر در حال مشاهده سکانس است و مسافتی بیشتر از ۱۵ پیکسل کشید:
          const totalDist = dragStartYRef.current - clientY;
          if (totalDist > 20 && !isLastScene && forwardTransitionEdge) {
            isDraggingRef.current = true;
            startTransition(forwardTransitionEdge, false, 0.008);
          } else if (totalDist < -20 && !isFirstScene && backwardTransitionEdge) {
            isDraggingRef.current = true;
            startTransition(backwardTransitionEdge, true, -0.008);
          }
        } else if (modeRef.current === 'TRANSITION') {
          // در حالت ترنزیشن: کشش دست کاربر مستقیماً ویدیو را جابجا می‌کند
          const screenH = window.innerHeight || 800;
          const deltaProgress = (dy / screenH) * 1.35; // حساسیت بهینه
          const currentVel = (deltaProgress / dt) * 16; // سرعت لحظه‌ای نرمال‌شده بر مبنای ۶۰ فریم

          applyDirectDelta(deltaProgress, currentVel);
        }
      };

      // ج) ماوس آپ / تاچ اند
      const handleEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);

        if (modeRef.current === 'TRANSITION') {
          // رها کردن دست -> شروع اینرسی بر اساس آخرین سرعت لمس
          if (Math.abs(velocityRef.current) > 0.0001) {
            startInertiaLoop();
          }
        }
      };

      // د) ایونت چرخ ماوس و تاچ‌پد (Wheel Event with Inertia)
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY;

        if (modeRef.current === 'SCENE') {
          if (delta > 15 && !isLastScene && forwardTransitionEdge) {
            startTransition(forwardTransitionEdge, false, 0.015);
          } else if (delta < -15 && !isFirstScene && backwardTransitionEdge) {
            startTransition(backwardTransitionEdge, true, -0.015);
          }
        } else if (modeRef.current === 'TRANSITION') {
          // تزریق گشتاور و تکانه به اینرسی
          const deltaProg = delta / 2200;
          velocityRef.current += deltaProg * 0.45;
          startInertiaLoop();
        }
      };

      // ه) ایونت کیبورد
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          if (modeRef.current === 'SCENE' && !isLastScene && forwardTransitionEdge) {
            startTransition(forwardTransitionEdge, false, 0.018);
          } else if (modeRef.current === 'TRANSITION') {
            velocityRef.current += 0.018;
            startInertiaLoop();
          }
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          if (modeRef.current === 'SCENE' && !isFirstScene && backwardTransitionEdge) {
            startTransition(backwardTransitionEdge, true, -0.018);
          } else if (modeRef.current === 'TRANSITION') {
            velocityRef.current -= 0.018;
            startInertiaLoop();
          }
        }
      };

      // اتصال Listenerها
      const onMouseDown = (e: MouseEvent) => {
        if ((e.target as HTMLElement)?.closest('button, nav, header')) return;
        handleStart(e.clientY);
      };
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
      const onMouseUp = () => handleEnd();

      const onTouchStart = (e: TouchEvent) => {
        if ((e.target as HTMLElement)?.closest('button, nav, header')) return;
        if (e.touches[0]) handleStart(e.touches[0].clientY);
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) handleMove(e.touches[0].clientY);
      };
      const onTouchEnd = () => handleEnd();

      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);

      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);

        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [
      applyDirectDelta,
      backwardTransitionEdge,
      forwardTransitionEdge,
      isFirstScene,
      isLastScene,
      startInertiaLoop,
      startTransition,
      stopInertia,
    ]);

    // -------------------------------------------------------------------------
    // ۸. پخش ویدیوی سکانس اصلی (Scene Loop Video)
    // -------------------------------------------------------------------------
    useEffect(() => {
      const sVideo = sceneVideoRef.current;
      if (!sVideo) return;

      const targetSrc = currentNode.ambientLoop?.landscapeUrl || `/videos/${currentNode.id}.mp4`;
      if (sVideo.src !== targetSrc && !sVideo.src.endsWith(targetSrc)) {
        sVideo.src = targetSrc;
      }
      sVideo.play().catch(() => {});
    }, [currentNode]);

    // -------------------------------------------------------------------------
    // ۹. رفرنس بیرونی (Imperative Handle)
    // -------------------------------------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        goToNext: () => {
          if (!isLastScene && forwardTransitionEdge) {
            startTransition(forwardTransitionEdge, false, 0.02);
          }
        },
        goToPrev: () => {
          if (!isFirstScene && backwardTransitionEdge) {
            startTransition(backwardTransitionEdge, true, -0.02);
          }
        },
        jumpToNode: (nodeId: string) => {
          if (nodeId === currentNode.id) return;
          stopInertia();
          purgeVideoElement(transitionVideoRef.current);
          setMode('SCENE');
          setActiveEdge(null);
          setProgress(0);
          onNodeChange(nodeId);
          onStatusChange?.('IDLE');
          onTransitionEnd?.();
        },
        cancelTransition: cancelBackToOrigin,
      }),
      [
        cancelBackToOrigin,
        currentNode.id,
        forwardTransitionEdge,
        backwardTransitionEdge,
        isFirstScene,
        isLastScene,
        onNodeChange,
        onStatusChange,
        onTransitionEnd,
        purgeVideoElement,
        startTransition,
        stopInertia,
      ]
    );

    // آدرس فایل ویدیوی ترنزیشن جاری
    const transitionVideoSrc =
      activeEdge?.video?.landscapeUrl ||
      `/videos/trans-0${validIndex + 1}-to-0${validIndex + 2}.mp4`;

    return (
      <div
        ref={containerRef}
        className={`relative w-screen h-screen overflow-hidden bg-black select-none font-['Vazirmatn'] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* ۱. ویدیوی سکانس اصلی - با کیفیت عالی در پس‌زمینه */}
        <video
          ref={sceneVideoRef}
          src={currentNode.ambientLoop?.landscapeUrl || `/videos/${currentNode.id}.mp4`}
          poster={currentNode.ambientLoop?.posterUrl}
          playsInline
          muted
          loop
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
            mode === 'TRANSITION' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
        />

        {/* ۲. ویدیوی ترنزیشن بین‌سکانسی - کنترل ۱۰۰٪ وابسته به کشیدن و اینرسی */}
        {mode === 'TRANSITION' && (
          <div className="absolute inset-0 z-10 w-full h-full bg-black">
            <video
              ref={transitionVideoRef}
              src={transitionVideoSrc}
              playsInline
              muted
              autoPlay={false} // مطلقا اتوپلی ندارد
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* نشانگر بسیار مینیمال اینرسی و کشیدن در بالای خط پیشرفت */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5 opacity-80 transition-opacity">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/70 border border-white/10 backdrop-blur-md text-[11px] text-amber-200/90 shadow-xl">
                <MoveVertical className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>برای حرکت بکشید</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="font-mono text-amber-300 font-medium">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>

            {/* خط باریک پیشرفت اینرسی در پایین صفحه */}
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-20">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-[width] duration-75"
                style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* ۳. راهنمای بسیار ملایم کشیدن/اسکرول در حالت سکانس */}
        {mode === 'SCENE' && !isLastScene && (
          <button
            type="button"
            onClick={() => {
              if (forwardTransitionEdge) startTransition(forwardTransitionEdge, false, 0.015);
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950/60 hover:bg-neutral-900/80 border border-white/10 hover:border-amber-400/40 backdrop-blur-md transition-all cursor-pointer group shadow-xl"
            title="برای ورود به ترنزیشن بکشید یا اسکرول کنید"
          >
            <span className="text-[11px] text-neutral-300 group-hover:text-amber-200 transition-colors font-light">
              بکشید یا اسکرول کنید
            </span>
            <div className="w-4 h-4 rounded-full border border-amber-400/50 flex items-center justify-center text-amber-300 group-hover:translate-y-0.5 transition-transform">
              <span className="text-[9px]">↓</span>
            </div>
          </button>
        )}
      </div>
    );
  }
);

VideoExperienceManager.displayName = 'VideoExperienceManager';
