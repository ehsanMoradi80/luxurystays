/**
 * VideoExperienceManager.tsx
 * 
 * موتور سینمایی سکانس‌ها و ترنزیشن‌های ویدیویی پیوسته (Zero Black Screen Engine)
 * 
 * اصول کلیدی تضمین عدم سیاهی صفحه و فیزیک واقع‌گرایانه:
 * ۱. معماری بافر دوگانه (Dual-Buffer Ping-Pong Scene Slots):
 *    دو المان ویدیویی مجزای سکانس (Slot A و Slot B) در دام مونت هستند. هرگز src ویدیوی در حال نمایش
 *    عوض نمی‌شود تا دیکودر مرورگر سیاه نکند؛ سکانس جدید در اسلات پس‌زمینه لود شده و تنها پس از دریافت
 *    رویداد `playing` (وجود فریم واقعی روی GPU) سوئیچ انجام می‌شود.
 * ۲. تداوم فریم ترنزیشن (Transition Frame Continuity):
 *    ویدیوی ترنزیشن تا زمانی که ویدیوی سکانس مقصد شروع به پخش نکرده است در لایه بالا با شفافیت ۱۰۰٪
 *    روی آخرین فریم خود می‌ماند. بنابراین حتی یک میلی‌ثانیه فضای مشکی ظاهر نمی‌شود.
 * ۳. کنترل شتاب و اینرسی (Velocity Clamping):
 *    حداکثر سرعت به صورت سخت‌گیرانه لیمیت شده است (MAX_INERTIA_VELOCITY = 0.007) تا ویدیو مثل فشنگ رد نشود
 *    و کاربر تمام فریم‌های ترنزیشن را با وقار سینمایی تجربه کند.
 * ۴. صفر بودن پیشرفت خودکار: در غیاب لمس یا کشیدن کاربر، هیچ اتوپروگرسی وجود ندارد و ویدیو روی همان فریم متوقف می‌ماند.
 * ۵. مدیریت بهینه حافظه: بافر لغزان فقط نود قبلی، فعلی و بعدی را در حافظه نگه می‌دارد.
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
import { preloadManager } from '../services/PreloadManager';

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
  onProgressChange?: (progress: number, overallProgress: number) => void;
  enableScrollScrubbing?: boolean;
}

// ثوابت فیزیک اینرسی لوکس و سقف سرعت تایم‌لاین ویدیو (Playhead Speed Limit)
const MAX_PLAYHEAD_SPEED_PER_SEC = 0.38; // حداکثر پیشرفت مجاز تایم‌لاین در هر ثانیه (حداقل ۲.۶ ثانیه برای دیدن کامل فریم‌ها)
const MAX_INERTIA_VELOCITY = 0.0048; // سقف سرعت اینرسی در هر فریم
const INERTIA_DAMPING = 0.95; // ضریب میرایی و اصطکاک نرم
const VELOCITY_STOP_THRESHOLD = 0.00004; // آستانه توقف قطعی بدون هیچ حرکت خودکار
const MAX_SINGLE_FRAME_DELTA = 0.0075; // حداکثر جابجایی پیشرفت در یک فریم (ممانعت از پرش ناگهانی)

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
      onProgressChange,
    },
    ref
  ) => {
    // -------------------------------------------------------------------------
    // ۱. ارجاعات ویدیوها و وضعیت بافر دوگانه (Dual-Buffer)
    // -------------------------------------------------------------------------
    const containerRef = useRef<HTMLDivElement | null>(null);

    // اسلات‌های ویدیوی سکانس
    const videoSlotARef = useRef<HTMLVideoElement | null>(null);
    const videoSlotBRef = useRef<HTMLVideoElement | null>(null);
    const transitionVideoRef = useRef<HTMLVideoElement | null>(null);

    // مشخص کردن گره فعلی و شاخص در گراف
    const currentIndex = graph.nodes.findIndex((n) => n.id === currentNodeId);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const currentNode = graph.nodes[validIndex] || graph.nodes[0];
    const isFirstScene = validIndex === 0;
    const isLastScene = validIndex === graph.nodes.length - 1;

    // پیدا کردن لبه‌های ترنزیشن بعدی و قبلی
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

    // مدیریت اسلات‌های صحنه: Slot A و Slot B
    const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
    const [slotASrc, setSlotASrc] = useState<string | undefined>(
      currentNode.ambientLoop?.landscapeUrl || `/videos/${currentNode.id}.mp4` || undefined
    );
    const [slotBSrc, setSlotBSrc] = useState<string | undefined>(() => {
      const neighborNode = !isLastScene
        ? graph.nodes[validIndex + 1]
        : (!isFirstScene ? graph.nodes[validIndex - 1] : null);
      return neighborNode?.ambientLoop?.landscapeUrl || (neighborNode ? `/videos/${neighborNode.id}.mp4` : undefined);
    });

    // وضعیت ترنزیشن
    const [mode, setMode] = useState<'SCENE' | 'TRANSITION'>('SCENE');
    const [isTransitionVisible, setIsTransitionVisible] = useState(false);
    const [activeEdge, setActiveEdge] = useState<TransitionEdge | null>(null);
    const [isReverse, setIsReverse] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // آدرس فایل ویدیوی ترنزیشن فعال
    const defaultForwardUrl = !isLastScene
      ? `/videos/trans-0${validIndex + 1}-to-0${validIndex + 2}.mp4`
      : (backwardTransitionEdge?.video?.landscapeUrl || undefined);
    const currentTransitionSrc = activeEdge?.video?.landscapeUrl || defaultForwardUrl || undefined;

    // رفرنس‌های فوری جهت حلقه‌های انیمیشن بدون لگ ری‌رندر
    const modeRef = useRef<'SCENE' | 'TRANSITION'>('SCENE');
    modeRef.current = mode;

    const activeSlotRef = useRef<'A' | 'B'>('A');
    activeSlotRef.current = activeSlot;

    const progressRef = useRef<number>(0);
    progressRef.current = progress;

    const activeEdgeRef = useRef<TransitionEdge | null>(null);
    activeEdgeRef.current = activeEdge;

    const isReverseRef = useRef<boolean>(false);
    isReverseRef.current = isReverse;

    const velocityRef = useRef<number>(0);
    const inertiaRafRef = useRef<number | null>(null);

    const isDraggingRef = useRef(false);
    const dragStartYRef = useRef(0);
    const dragLastYRef = useRef(0);
    const dragLastTimeRef = useRef(0);

    // پیگیری رویدادهای لود و پخش برای سوئیچ بدون وقفه
    const isTransitioningOutRef = useRef(false);

    // محاسبه پیشرفت کلی در طول تمام سکانس‌ها (بین 0 تا 1)
    const totalJourneySteps = Math.max(1, graph.nodes.length - 1);
    const computeOverall = useCallback(
      (baseIndex: number, prog: number, reverse: boolean) => {
        let frac = !reverse ? baseIndex + prog : baseIndex - (1 - prog);
        return Math.max(0, Math.min(1, frac / totalJourneySteps));
      },
      [totalJourneySteps]
    );

    // -------------------------------------------------------------------------
    // ۲. متدهای اسکراب فریم ویدیوی ترنزیشن
    // -------------------------------------------------------------------------
    const syncTransitionVideoFrame = useCallback((prog: number) => {
      const tVideo = transitionVideoRef.current;
      if (!tVideo) return;
      const dur = tVideo.duration;
      if (!dur || isNaN(dur) || dur <= 0) return;

      const targetTime = Math.max(0.001, Math.min(dur - 0.001, prog * dur));
      if (Math.abs(tVideo.currentTime - targetTime) > 0.015) {
        if ('fastSeek' in tVideo && typeof (tVideo as any).fastSeek === 'function') {
          (tVideo as any).fastSeek(targetTime);
        } else {
          tVideo.currentTime = targetTime;
        }
      }
    }, []);

    // -------------------------------------------------------------------------
    // ۳. مدیریت اینرسی
    // -------------------------------------------------------------------------
    const stopInertia = useCallback(() => {
      if (inertiaRafRef.current) {
        cancelAnimationFrame(inertiaRafRef.current);
        inertiaRafRef.current = null;
      }
      velocityRef.current = 0;
    }, []);

    // -------------------------------------------------------------------------
    // ۴. اتمام ترنزیشن بدون صفحه سیاه (Zero-Black-Screen Handshake)
    // -------------------------------------------------------------------------
    const completeTransition = useCallback(() => {
      if (isTransitioningOutRef.current) return;
      isTransitioningOutRef.current = true;
      stopInertia();

      const edge = activeEdgeRef.current;
      const reverse = isReverseRef.current;
      const targetId = reverse
        ? prevNode?.id || currentNode.id
        : edge?.targetNodeId || currentNode.id;

      const targetNode = graph.nodes.find((n) => n.id === targetId) || currentNode;
      const targetVideoUrl =
        targetNode.ambientLoop?.landscapeUrl || `/videos/${targetNode.id}.mp4`;

      // تعیین اسلات مقصد در معماری دوگانه
      const currentActive = activeSlotRef.current;
      const targetSlot: 'A' | 'B' = currentActive === 'A' ? 'B' : 'A';
      const targetVideoEl =
        targetSlot === 'A' ? videoSlotARef.current : videoSlotBRef.current;
      const currentVideoEl =
        currentActive === 'A' ? videoSlotARef.current : videoSlotBRef.current;

      // تابع نهایی سوئیچ بعد از آغاز رندر فریم‌های ویدیوی جدید
      const finalizeSceneSwitch = () => {
        // فعال‌سازی اسلات جدید با شفافیت ۱۰۰٪
        setActiveSlot(targetSlot);
        activeSlotRef.current = targetSlot;

        // اکنون که ویدیوی جدید در حال پخش است، ویدیوی ترنزیشن محو می‌شود
        setIsTransitionVisible(false);
        setMode('SCENE');
        setActiveEdge(null);
        setProgress(0);
        progressRef.current = 0;
        setIsDragging(false);
        isTransitioningOutRef.current = false;

        // توقف ویدیوی قبلی
        if (currentVideoEl) {
          try {
            currentVideoEl.pause();
          } catch {}
        }

        // اطلاع‌رسانی به والد و به‌روزرسانی پروگرس بار کلی
        const targetIdx = graph.nodes.findIndex((n) => n.id === targetId);
        const resolvedIdx = targetIdx >= 0 ? targetIdx : validIndex;
        onProgressChange?.(0, resolvedIdx / totalJourneySteps);

        onNodeChange(targetId);
        onStatusChange?.('IDLE');
        onTransitionEnd?.();
      };

      if (!targetVideoEl) {
        finalizeSceneSwitch();
        return;
      }

      // اطمینان از تنظیم سورس اسلات مقصد
      if (!targetVideoEl.src.endsWith(targetVideoUrl)) {
        if (targetSlot === 'A') {
          setSlotASrc(targetVideoUrl);
        } else {
          setSlotBSrc(targetVideoUrl);
        }
        targetVideoEl.src = targetVideoUrl;
        targetVideoEl.load();
      }

      // شنود رویداد پخش: تنها زمانی که فریم واقعی در حال رندر است سوئیچ انجام می‌شود
      let hasSwitched = false;
      const onTargetPlaying = () => {
        if (hasSwitched) return;
        hasSwitched = true;
        targetVideoEl.removeEventListener('playing', onTargetPlaying);
        finalizeSceneSwitch();
      };

      targetVideoEl.addEventListener('playing', onTargetPlaying, { once: true });

      // پخش اسلات مقصد
      targetVideoEl.play().catch(() => {
        // در صورت خطای اتوپلی، بدون توقف سوئیچ انجام می‌شود
        if (!hasSwitched) {
          hasSwitched = true;
          finalizeSceneSwitch();
        }
      });

      // زمان‌بندی محافظ جهت تضمین عدم گیر کردن در صورت کندی شبکه
      setTimeout(() => {
        if (!hasSwitched) {
          hasSwitched = true;
          targetVideoEl.removeEventListener('playing', onTargetPlaying);
          finalizeSceneSwitch();
        }
      }, 500);
    }, [
      currentNode,
      graph.nodes,
      onNodeChange,
      onStatusChange,
      onTransitionEnd,
      prevNode?.id,
      stopInertia,
    ]);

    // بازگشت به مبدأ در صورت کنسل شدن ترنزیشن
    const cancelBackToOrigin = useCallback(() => {
      stopInertia();
      setIsTransitionVisible(false);
      setMode('SCENE');
      setActiveEdge(null);
      setProgress(0);
      progressRef.current = 0;
      setIsDragging(false);
      isTransitioningOutRef.current = false;

      // اطمینان از ادامه پخش اسلات جاری
      const currentActive = activeSlotRef.current;
      const currentVideoEl =
        currentActive === 'A' ? videoSlotARef.current : videoSlotBRef.current;
      if (currentVideoEl) {
        currentVideoEl.play().catch(() => {});
      }

      onProgressChange?.(0, validIndex / totalJourneySteps);
      onStatusChange?.('IDLE');
      onTransitionEnd?.();
    }, [onProgressChange, onStatusChange, onTransitionEnd, stopInertia, totalJourneySteps, validIndex]);

    // -------------------------------------------------------------------------
    // ۵. شروع ترنزیشن با فیزیک و سورس از پیش‌آماده
    // -------------------------------------------------------------------------
    const startTransition = useCallback(
      (edge: TransitionEdge, reverse: boolean = false, initialVelocity: number = 0) => {
        if (modeRef.current === 'TRANSITION' || isTransitioningOutRef.current) return;

        stopInertia();
        setActiveEdge(edge);
        setIsReverse(reverse);
        const startProg = reverse ? 1 : 0;
        setProgress(startProg);
        progressRef.current = startProg;

        onProgressChange?.(startProg, computeOverall(validIndex, startProg, reverse));

        setMode('TRANSITION');
        setIsTransitionVisible(true);

        onStatusChange?.('TRANSITIONING');
        onTransitionStart?.(edge);

        const tVideo = transitionVideoRef.current;
        if (tVideo) {
          const videoUrl = edge.video?.landscapeUrl || currentTransitionSrc;
          if (videoUrl && !tVideo.src.endsWith(videoUrl)) {
            tVideo.src = videoUrl;
            tVideo.load();
          }
          tVideo.pause();
          const dur = tVideo.duration || 6;
          tVideo.currentTime = startProg * dur;
        }

        // اعمال سرعت اولیه کلمپ‌شده
        const clampedInitialVel = Math.max(
          -MAX_INERTIA_VELOCITY,
          Math.min(MAX_INERTIA_VELOCITY, initialVelocity)
        );

        if (Math.abs(clampedInitialVel) > 0.0001) {
          velocityRef.current = clampedInitialVel;
          startInertiaLoop();
        }
      },
      [computeOverall, currentTransitionSrc, onProgressChange, onStatusChange, onTransitionStart, stopInertia, validIndex]
    );

    // -------------------------------------------------------------------------
    // ۶. حلقه اینرسی فیزیکی با سقف شتاب
    // -------------------------------------------------------------------------
    const startInertiaLoop = useCallback(() => {
      if (inertiaRafRef.current) {
        cancelAnimationFrame(inertiaRafRef.current);
      }

      const step = () => {
        if (isDraggingRef.current || isTransitioningOutRef.current) {
          inertiaRafRef.current = null;
          return;
        }

        const v = velocityRef.current;
        if (Math.abs(v) < VELOCITY_STOP_THRESHOLD) {
          // سرعت به صفر رسید؛ توقف کامل بدون هیچ پیشروی خودکار!
          velocityRef.current = 0;
          inertiaRafRef.current = null;
          return;
        }

        let next = progressRef.current + v;

        // اعمال اصطکاک میرایی ملایم
        velocityRef.current = v * INERTIA_DAMPING;

        if (next >= 0.985) {
          setProgress(1);
          progressRef.current = 1;
          completeTransition();
          return;
        }

        if (next <= 0.015 && isReverseRef.current) {
          setProgress(0);
          progressRef.current = 0;
          cancelBackToOrigin();
          return;
        }

        next = Math.max(0, Math.min(1, next));
        setProgress(next);
        progressRef.current = next;

        onProgressChange?.(next, computeOverall(validIndex, next, isReverseRef.current));
        syncTransitionVideoFrame(next);

        inertiaRafRef.current = requestAnimationFrame(step);
      };

      inertiaRafRef.current = requestAnimationFrame(step);
    }, [cancelBackToOrigin, completeTransition, computeOverall, onProgressChange, syncTransitionVideoFrame, validIndex]);

    // -------------------------------------------------------------------------
    // ۷. اسکراب دستی مستقیم (Direct Drag Scrubber)
    // -------------------------------------------------------------------------
    const applyDirectDelta = useCallback(
      (deltaProgress: number, instantVelocity: number) => {
        if (isTransitioningOutRef.current) return;
        stopInertia();

        // اعمال لیمیت قطعی برای پیشرفت در هر فرخوانی تا ویدیو هرگز جهش ناگهانی نداشته باشد
        const clampedDelta =
          Math.sign(deltaProgress) *
          Math.min(Math.abs(deltaProgress), MAX_SINGLE_FRAME_DELTA);

        let next = progressRef.current + clampedDelta;
        if (next >= 0.985) {
          setProgress(1);
          progressRef.current = 1;
          completeTransition();
          return;
        }

        if (next <= 0.015 && isReverseRef.current) {
          setProgress(0);
          progressRef.current = 0;
          cancelBackToOrigin();
          return;
        }

        next = Math.max(0, Math.min(1, next));
        setProgress(next);
        progressRef.current = next;

        onProgressChange?.(next, computeOverall(validIndex, next, isReverseRef.current));
        syncTransitionVideoFrame(next);

        // اعمال لیمیت قطعی برای سرعت اینرسی پس از رهاسازی دست
        velocityRef.current = Math.max(
          -MAX_INERTIA_VELOCITY,
          Math.min(MAX_INERTIA_VELOCITY, instantVelocity)
        );
      },
      [cancelBackToOrigin, completeTransition, computeOverall, onProgressChange, stopInertia, syncTransitionVideoFrame, validIndex]
    );

    // -------------------------------------------------------------------------
    // ۸. شنود رویدادهای تعاملی (ماوس، تاچ، اسکرول و کیبورد) با کنترل سخت‌گیرانه سقف سرعت
    // -------------------------------------------------------------------------
    useEffect(() => {
      const handleStart = (clientY: number) => {
        if (isTransitioningOutRef.current) return;
        stopInertia();
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartYRef.current = clientY;
        dragLastYRef.current = clientY;
        dragLastTimeRef.current = performance.now();
      };

      const handleMove = (clientY: number) => {
        if (!isDraggingRef.current || isTransitioningOutRef.current) return;

        const now = performance.now();
        const dt = Math.max(8, Math.min(100, now - dragLastTimeRef.current));
        const dy = dragLastYRef.current - clientY;
        dragLastYRef.current = clientY;
        dragLastTimeRef.current = now;

        if (modeRef.current === 'SCENE') {
          const totalDist = dragStartYRef.current - clientY;
          if (totalDist > 20 && !isLastScene && forwardTransitionEdge) {
            isDraggingRef.current = true;
            startTransition(forwardTransitionEdge, false, 0.002);
          } else if (totalDist < -20 && !isFirstScene && backwardTransitionEdge) {
            isDraggingRef.current = true;
            startTransition(backwardTransitionEdge, true, -0.002);
          }
        } else if (modeRef.current === 'TRANSITION') {
          const screenH = window.innerHeight || 800;
          const rawDelta = (dy / screenH) * 0.35;
          // لیمیت سخت‌گیرانه سرعت پیشرفت تایم‌لاین ویدیو (حداکثر پیشروی مجاز در بازه میلی‌ثانیه‌ای dt)
          const maxDeltaForDt = (MAX_PLAYHEAD_SPEED_PER_SEC * dt) / 1000;
          const speedLimitedDelta =
            Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), maxDeltaForDt);

          const rawVel = (speedLimitedDelta / dt) * 16;
          const instantVel = Math.max(
            -MAX_INERTIA_VELOCITY,
            Math.min(MAX_INERTIA_VELOCITY, rawVel * 0.18)
          );

          applyDirectDelta(speedLimitedDelta, instantVel);
        }
      };

      const handleEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);

        if (modeRef.current === 'TRANSITION' && !isTransitioningOutRef.current) {
          if (Math.abs(velocityRef.current) > 0.0001) {
            startInertiaLoop();
          }
        }
      };

      const handleWheel = (e: WheelEvent) => {
        if (isTransitioningOutRef.current) return;
        e.preventDefault();
        const delta = e.deltaY;

        if (modeRef.current === 'SCENE') {
          if (delta > 15 && !isLastScene && forwardTransitionEdge) {
            startTransition(forwardTransitionEdge, false, 0.0025);
          } else if (delta < -15 && !isFirstScene && backwardTransitionEdge) {
            startTransition(backwardTransitionEdge, true, -0.0025);
          }
        } else if (modeRef.current === 'TRANSITION') {
          const rawWheelDelta = (delta / 3200) * 0.1;
          const maxWheelStep = 0.0018;
          const clampedWheelDelta =
            Math.sign(rawWheelDelta) * Math.min(Math.abs(rawWheelDelta), maxWheelStep);
          const currentV = velocityRef.current;
          const nextV = Math.max(
            -MAX_INERTIA_VELOCITY,
            Math.min(MAX_INERTIA_VELOCITY, currentV + clampedWheelDelta)
          );
          velocityRef.current = nextV;
          startInertiaLoop();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (isTransitioningOutRef.current) return;
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          if (modeRef.current === 'SCENE' && !isLastScene && forwardTransitionEdge) {
            startTransition(forwardTransitionEdge, false, 0.0025);
          } else if (modeRef.current === 'TRANSITION') {
            velocityRef.current = Math.min(MAX_INERTIA_VELOCITY, velocityRef.current + 0.0025);
            startInertiaLoop();
          }
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          if (modeRef.current === 'SCENE' && !isFirstScene && backwardTransitionEdge) {
            startTransition(backwardTransitionEdge, true, -0.0025);
          } else if (modeRef.current === 'TRANSITION') {
            velocityRef.current = Math.max(-MAX_INERTIA_VELOCITY, velocityRef.current - 0.0025);
            startInertiaLoop();
          }
        }
      };

      const onMouseDown = (e: MouseEvent) => {
        if ((e.target as HTMLElement)?.closest('button, nav, header')) return;
        handleStart(e.clientY);
      };
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
      const onMouseUp = () => handleEnd();

      const onTouchStart = (e: TouchEvent) => {
        if ((e.target as HTMLElement)?.closest('button, nav, header')) return;
        if (e.touches.length > 0) handleStart(e.touches[0].clientY);
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) handleMove(e.touches[0].clientY);
      };
      const onTouchEnd = () => handleEnd();

      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });

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
    // ۹. همگام‌سازی نود جاری و آماده‌سازی پس‌زمینه اسلات‌ها و ترنزیشن
    // -------------------------------------------------------------------------
    useEffect(() => {
      // آماده‌سازی اسلات‌ها بر مبنای نود جاری
      const currentUrl = currentNode.ambientLoop?.landscapeUrl || `/videos/${currentNode.id}.mp4`;
      const currentActive = activeSlotRef.current;

      if (currentActive === 'A') {
        const videoA = videoSlotARef.current;
        if (videoA && (!videoA.src || !videoA.src.endsWith(currentUrl))) {
          videoA.src = currentUrl;
          videoA.play().catch(() => {});
        }
        // آماده‌سازی اسلات B با نود مجاور (بعدی یا قبلی) جهت سوئیچ فوری
        const standbyNode = !isLastScene
          ? graph.nodes[validIndex + 1]
          : (!isFirstScene ? graph.nodes[validIndex - 1] : null);
        if (standbyNode) {
          const nextUrl = standbyNode.ambientLoop?.landscapeUrl || `/videos/${standbyNode.id}.mp4`;
          const videoB = videoSlotBRef.current;
          if (videoB && !videoB.src.endsWith(nextUrl)) {
            setSlotBSrc(nextUrl);
            videoB.src = nextUrl;
            videoB.load();
          }
        }
      } else {
        const videoB = videoSlotBRef.current;
        if (videoB && (!videoB.src || !videoB.src.endsWith(currentUrl))) {
          videoB.src = currentUrl;
          videoB.play().catch(() => {});
        }
        // آماده‌سازی اسلات A با نود مجاور
        const standbyNode = !isLastScene
          ? graph.nodes[validIndex + 1]
          : (!isFirstScene ? graph.nodes[validIndex - 1] : null);
        if (standbyNode) {
          const nextUrl = standbyNode.ambientLoop?.landscapeUrl || `/videos/${standbyNode.id}.mp4`;
          const videoA = videoSlotARef.current;
          if (videoA && !videoA.src.endsWith(nextUrl)) {
            setSlotASrc(nextUrl);
            videoA.src = nextUrl;
            videoA.load();
          }
        }
      }

      // آماده‌سازی ویدیوی ترنزیشن در پس‌زمینه در صورت وجود آدرس معتبر
      const tVideo = transitionVideoRef.current;
      if (tVideo && defaultForwardUrl && typeof defaultForwardUrl === 'string' && defaultForwardUrl.trim() !== '') {
        if (!tVideo.src.endsWith(defaultForwardUrl)) {
          tVideo.src = defaultForwardUrl;
          tVideo.load();
        }
      }

      // همگام‌سازی حافظه لغزان (نود قبلی، فعلی و بعدی)
      preloadManager.syncSlidingWindow(graph.nodes, validIndex);

      // به‌روزرسانی پروگرس بار کلی
      onProgressChange?.(0, validIndex / totalJourneySteps);
    }, [currentNode, defaultForwardUrl, graph.nodes, isLastScene, onProgressChange, totalJourneySteps, validIndex]);

    // -------------------------------------------------------------------------
    // ۱۰. هندل متدهای خارجی (Imperative Handle)
    // -------------------------------------------------------------------------
    useImperativeHandle(
      ref,
      () => ({
        goToNext: () => {
          if (!isLastScene && forwardTransitionEdge) {
            startTransition(forwardTransitionEdge, false, 0.0035);
          }
        },
        goToPrev: () => {
          if (!isFirstScene && backwardTransitionEdge) {
            startTransition(backwardTransitionEdge, true, -0.0035);
          }
        },
        jumpToNode: (nodeId: string) => {
          if (nodeId === currentNode.id || isTransitioningOutRef.current) return;
          stopInertia();

          const targetNode = graph.nodes.find((n) => n.id === nodeId);
          if (!targetNode) return;
          const targetUrl =
            targetNode.ambientLoop?.landscapeUrl || `/videos/${targetNode.id}.mp4`;

          // پرش سریع با کراس‌فید بدون صفحه سیاه بین اسلات‌ها
          const currentActive = activeSlotRef.current;
          const targetSlot: 'A' | 'B' = currentActive === 'A' ? 'B' : 'A';
          const targetVideoEl =
            targetSlot === 'A' ? videoSlotARef.current : videoSlotBRef.current;
          const currentVideoEl =
            currentActive === 'A' ? videoSlotARef.current : videoSlotBRef.current;

          if (!targetVideoEl) {
            onNodeChange(nodeId);
            return;
          }

          if (targetSlot === 'A') setSlotASrc(targetUrl);
          else setSlotBSrc(targetUrl);

          targetVideoEl.src = targetUrl;
          targetVideoEl.load();

          let switched = false;
          const onPlaying = () => {
            if (switched) return;
            switched = true;
            targetVideoEl.removeEventListener('playing', onPlaying);
            setActiveSlot(targetSlot);
            activeSlotRef.current = targetSlot;
            setIsTransitionVisible(false);
            setMode('SCENE');
            if (currentVideoEl) {
              try {
                currentVideoEl.pause();
              } catch {}
            }
            const tIdx = graph.nodes.findIndex((n) => n.id === nodeId);
            if (tIdx >= 0) {
              onProgressChange?.(0, tIdx / totalJourneySteps);
            }
            onNodeChange(nodeId);
          };

          targetVideoEl.addEventListener('playing', onPlaying, { once: true });
          targetVideoEl.play().catch(() => {
            if (!switched) onPlaying();
          });

          setTimeout(() => {
            if (!switched) onPlaying();
          }, 450);
        },
        cancelTransition: cancelBackToOrigin,
      }),
      [
        cancelBackToOrigin,
        currentNode.id,
        forwardTransitionEdge,
        backwardTransitionEdge,
        graph.nodes,
        isFirstScene,
        isLastScene,
        onNodeChange,
        startTransition,
        stopInertia,
      ]
    );

    return (
      <div
        ref={containerRef}
        className={`relative w-screen h-screen overflow-hidden bg-neutral-950 select-none font-['Vazirmatn'] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* ۱. اسلات ویدیویی A سکانس */}
        <video
          ref={videoSlotARef}
          src={slotASrc || undefined}
          playsInline
          muted
          loop
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-opacity duration-300 ${
            activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        />

        {/* ۲. اسلات ویدیویی B سکانس (بافر دوگانه جهت سوئیچ بدون وقفه) */}
        <video
          ref={videoSlotBRef}
          src={slotBSrc || undefined}
          playsInline
          muted
          loop
          className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-opacity duration-300 ${
            activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        />

        {/* ۳. ویدیوی ترنزیشن پیوسته در لایه فوقانی (Z-20) */}
        <video
          ref={transitionVideoRef}
          src={currentTransitionSrc || undefined}
          playsInline
          muted
          autoPlay={false}
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-opacity duration-150 ${
            isTransitionVisible ? 'opacity-100 z-20' : 'opacity-0 pointer-events-none z-0'
          }`}
        />

        {/* ۴. پروگرس‌بار خطی نازک کف ویوپورت برای نودهای ترنزیشن سکانس */}
        <div
          className={`fixed bottom-0 inset-x-0 z-30 pointer-events-none transition-opacity duration-200 ${
            mode === 'TRANSITION' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* تراک باریک محو در کف صفحه */}
          <div className="h-[2px] w-full bg-white/10 backdrop-blur-sm">
            {/* خط پرشده طلایی که پیشرفت دقیق ترنزیشن بین دو سکانس را نمایش می‌دهد */}
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-200 transition-[width] duration-75 ease-out shadow-[0_0_8px_rgba(251,191,36,0.7)]"
              style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
);

VideoExperienceManager.displayName = 'VideoExperienceManager';
