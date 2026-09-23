/**
 * VideoExperienceManager.tsx
 * 
 * معماری هسته مدیریت و توالی‌سنج تعاملی سکانس‌ها و ترنزیشن‌ها
 * بر اساس آخرین اصلاحات درخواست‌شده:
 * ۱. سکانس‌ها و ترنزیشن‌ها دارای «ترتیب خطی، اول و آخر قطعی» هستند و نباید لوپ شوند:
 *    - سکانس اول: هیچ سکانس یا ترنزیشن قبلی ندارد (دنده عقب در سکانس اول غیرمجاز است).
 *    - سکانس آخر: هیچ ترنزیشن یا سکانس بعدی ندارد (اسکرول به پایین در سکانس آخر متوقف می‌شود).
 * ۲. حذف ویدیوهای فعلی:
 *    - تا زمان آماده شدن فایل‌های ویدیویی نهایی، به جای پخش ویدیو، صفحه سکانس به صورت یک پلیس‌هولدر
 *      بسیار زیبا با تایپوگرافی سینمایی، گرادیان تاریک اشرافی، و عنوان اختصاصی نشان داده می‌شود:
 *      «سکانس اول»، «سکانس دوم»، «سکانس سوم»، «سکانس چهارم»، «سکانس پنجم».
 * ۳. ترنزیشن‌ها به صورت پلیس‌هولدر تعاملی با کنترل فیزیکی اسکرابینگ:
 *    - عنوان مرحله: «ترنزیشن اول: سکانس اول ← سکانس دوم»، «ترنزیشن دوم»، و غیره.
 *    - نوار پروگرس اسکرابینگ با نگه‌داشت روی فریم (Hold State) در هر درصدی از توقف اسکرول.
 *    - دنده عقب دقیق: در صورت اسکرول به بالا، ترنزیشن بازگشت به سکانس ماقبل فعال می‌شود.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import gsap from 'gsap';
import { 
  HotelExperienceGraph, 
  SequencerStatus, 
  TransitionEdge,
  SpaceNode
} from '../types/cms';
import { audioAmbiance } from '../services/AudioAmbienceEngine';
import { preloadManager } from '../services/PreloadManager';
import { ArrowLeft, ArrowRight, MoveDown, MoveUp, Sparkles, Database, Keyboard, Hand } from 'lucide-react';

export interface VideoExperienceManagerProps {
  graph: HotelExperienceGraph;
  currentNodeId: string;
  onNodeChange: (newNodeId: string) => void;
  onStatusChange?: (
    status: SequencerStatus, 
    progress: number, 
    extra?: { sourceTitle: string; targetTitle: string; isReverse: boolean }
  ) => void;
  enableScrollScrubbing?: boolean;
  onTransitionStart?: (edge: TransitionEdge) => void;
  onTransitionEnd?: (targetNodeId: string) => void;
}

export interface VideoManagerHandle {
  transitionTo: (targetNodeId: string) => void;
  transitionBackward: () => void;
  scrubToProgress: (progress: number) => void;
}

const PERSIAN_ORDINALS = [
  'اول',
  'دوم',
  'سوم',
  'چهارم',
  'پنجم',
  'ششم',
  'هفتم',
  'هشتم',
];

export const VideoExperienceManager = React.forwardRef<VideoManagerHandle, VideoExperienceManagerProps>(
  (
    {
      graph,
      currentNodeId,
      onNodeChange,
      onStatusChange,
      enableScrollScrubbing = true,
      onTransitionStart,
      onTransitionEnd,
    },
    ref
  ) => {
    const [status, setStatus] = useState<SequencerStatus>('IDLE_LOOP');

    // پروگرس تعاملی ترنزیشن جاری (۰ تا ۱)
    const [transitionProgress, setTransitionProgress] = useState<number>(0);

    // اطلاعات ترنزیشن فعال
    const [activeTransitionEdge, setActiveTransitionEdge] = useState<TransitionEdge | null>(null);
    const [sourceNodeTitle, setSourceNodeTitle] = useState<string>('');
    const [targetNodeTitle, setTargetNodeTitle] = useState<string>('');
    const [isReverseTransition, setIsReverseTransition] = useState<boolean>(false);

    const isTransitioningRef = useRef<boolean>(false);
    const currentEdgeRef = useRef<TransitionEdge | null>(null);
    const targetNodeIdRef = useRef<string | null>(null);
    const originNodeIdRef = useRef<string>(currentNodeId);
    const isReverseRef = useRef<boolean>(false);
    const progressRef = useRef<number>(0);
    const targetProgressRef = useRef<number>(0);
    const scrubTweenRef = useRef<gsap.core.Tween | null>(null);
    const autoPlayTweenRef = useRef<gsap.core.Tween | null>(null);

    // زمان‌بند جلوگیری از پرش سکانس‌ها در یک سوایپ ممتد (Cooldown after arrival)
    const arrivalCooldownUntilRef = useRef<number>(0);

    const currentNodeIdRef = useRef<string>(currentNodeId);
    currentNodeIdRef.current = currentNodeId;

    const currentNode = graph.nodes.find((n) => n.id === currentNodeId) || graph.nodes[0];
    const currentNodeRef = useRef(currentNode);
    currentNodeRef.current = currentNode;

    // شماره و ترتیب ترتیبی و مطلق سکانس
    const totalScenes = graph.nodes.length;
    const currentNodeIndex = graph.nodes.findIndex((n) => n.id === currentNode.id);
    const currentIndex = currentNodeIndex !== -1 ? currentNodeIndex : 0;
    const sceneOrdinalName = PERSIAN_ORDINALS[currentIndex] || `شماره ${currentIndex + 1}`;

    const isFirstScene = currentIndex === 0;
    const isLastScene = currentIndex === totalScenes - 1;

    // =========================================================================
    // ۱. سیستم مدیریت چرخه حیات منابع (Resource Lifecycle Manager) و پیش‌بارگذاری هوشمند
    // =========================================================================

    // محاسبه گره‌های مجاور در گراف خطی (گره قبلی و گره بعدی)
    const adjacentNeighbors = useMemo(() => {
      const prevNode: SpaceNode | undefined = currentIndex > 0 ? graph.nodes[currentIndex - 1] : undefined;
      const nextNode: SpaceNode | undefined = currentIndex < totalScenes - 1 ? graph.nodes[currentIndex + 1] : undefined;
      return { prevNode, nextNode };
    }, [graph.nodes, currentIndex, totalScenes]);

    // مدیر چرخه حیات منابع: پیش‌بارگذاری گره‌های مجاور و پاک‌سازی کامل حافظه کش پلیس‌هولدرها،
    // ویدیوها، آبجکت‌یوآرال‌ها و بافرهای صوتی گره‌های غیرمجاور برای ممانعت از نشت حافظه (Memory Leaks)
    useEffect(() => {
      if (!currentNode) return;

      // الف) پخش نوای آرامش‌بخش سکانس فعال
      audioAmbiance.playAmbiance(currentNode.audioProfile.tone, currentNode.audioProfile.volume);

      // ب) گرم‌کردن و پیش‌بارگذاری فرکانس‌ها و منابع صوتی گره‌های مجاور (قبلی و بعدی)
      if (adjacentNeighbors.prevNode) {
        audioAmbiance.warmUpAudioProfile(adjacentNeighbors.prevNode.audioProfile.tone);
      }
      if (adjacentNeighbors.nextNode) {
        audioAmbiance.warmUpAudioProfile(adjacentNeighbors.nextNode.audioProfile.tone);
      }

      // ج) پیش‌بارگذاری بافر و ساختار ویدیویی/مدیای گره‌های مجاور در موتور پری‌لود
      preloadManager.preloadNodeNeighborhood(graph, currentNode.id);

      // د) مدیر چرخه حیات حافظه: پاک‌سازی تمام منابع گره‌های غیرمجاور (فاصله > ۱)
      // آزادسازی آبجکت‌های کش‌شده ویدیوها، پلیس‌هولدرها و ریووک کردن blob urlها
      preloadManager.pruneDistantNodes(graph, currentIndex, 1);

      // ه) پاک‌سازی و سبک‌سازی بافرهای صوتی گره‌های غیرمجاور
      const allowedTones = [
        currentNode.audioProfile.tone,
        adjacentNeighbors.prevNode?.audioProfile.tone,
        adjacentNeighbors.nextNode?.audioProfile.tone,
      ].filter(Boolean) as string[];
      audioAmbiance.pruneNonAdjacentAudio(allowedTones);

    }, [currentNode, adjacentNeighbors, graph, currentIndex]);

    // =========================================================================
    // ۲. آغاز ترنزیشن تعاملی (جلو یا دنده عقب)
    // =========================================================================
    const initTransition = useCallback(
      (edge: TransitionEdge, initialProgress = 0, isReverse = false, onReadyCallback?: () => void) => {
        if (isTransitioningRef.current) return;

        if (autoPlayTweenRef.current) {
          autoPlayTweenRef.current.kill();
          autoPlayTweenRef.current = null;
        }

        const sourceNode = currentNodeRef.current;
        const targetNode = graph.nodes.find((n) => n.id === edge.targetNodeId);

        isTransitioningRef.current = true;
        currentEdgeRef.current = edge;
        targetNodeIdRef.current = edge.targetNodeId;
        originNodeIdRef.current = currentNodeIdRef.current;
        isReverseRef.current = isReverse;
        progressRef.current = initialProgress;
        targetProgressRef.current = initialProgress;

        if (scrubTweenRef.current) {
          scrubTweenRef.current.kill();
          scrubTweenRef.current = null;
        }

        setActiveTransitionEdge(edge);
        setIsReverseTransition(isReverse);
        const srcTitle = sourceNode?.title || 'سکانس مبدأ';
        const tgtTitle = targetNode?.title || edge.label || 'سکانس مقصد';
        setSourceNodeTitle(srcTitle);
        setTargetNodeTitle(tgtTitle);
        setTransitionProgress(initialProgress);

        setStatus('TRANSITIONING');
        onStatusChange?.('TRANSITIONING', initialProgress, {
          sourceTitle: srcTitle,
          targetTitle: tgtTitle,
          isReverse,
        });
        onTransitionStart?.(edge);
        audioAmbiance.playTransitionChime();

        if (onReadyCallback) onReadyCallback();
      },
      [graph.nodes, onStatusChange, onTransitionStart]
    );

    // تکمیل ورود به سکانس مقصد
    const completeArrival = useCallback(
      (targetNodeId: string) => {
        const targetNode = graph.nodes.find((n) => n.id === targetNodeId);
        if (!targetNode) return;

        setStatus('ARRIVING');
        onStatusChange?.('ARRIVING', 1);

        onNodeChange(targetNodeId);
        onTransitionEnd?.(targetNodeId);

        // تنظیم مهلت امنیتی (Cooldown) ۳۵۰ میلی‌ثانیه برای جلوگیری از بلعیده شدن سکانس‌های بعدی در یک سوایپ کشیده
        arrivalCooldownUntilRef.current = Date.now() + 380;

        setTimeout(() => {
          if (scrubTweenRef.current) {
            scrubTweenRef.current.kill();
            scrubTweenRef.current = null;
          }
          isTransitioningRef.current = false;
          currentEdgeRef.current = null;
          targetNodeIdRef.current = null;
          progressRef.current = 0;
          targetProgressRef.current = 0;
          setTransitionProgress(0);
          setActiveTransitionEdge(null);
          setStatus('IDLE_LOOP');
          onStatusChange?.('IDLE_LOOP', 0);
        }, 150);
      },
      [graph.nodes, onNodeChange, onStatusChange, onTransitionEnd]
    );

    // لغو ترنزیشن و بازگشت به سکانس مبدأ
    const cancelBackToOrigin = useCallback(() => {
      if (scrubTweenRef.current) {
        scrubTweenRef.current.kill();
        scrubTweenRef.current = null;
      }
      isTransitioningRef.current = false;
      currentEdgeRef.current = null;
      targetNodeIdRef.current = null;
      progressRef.current = 0;
      targetProgressRef.current = 0;
      setTransitionProgress(0);
      setActiveTransitionEdge(null);
      setStatus('IDLE_LOOP');
      onStatusChange?.('IDLE_LOOP', 0);
    }, [onStatusChange]);

    // =========================================================================
    // ۳. ترتیب خطی قطعی: سکانس اول قبلی ندارد، سکانس آخر بعدی ندارد (بدون لوپ)
    // =========================================================================

    // ترنزیشن رو به جلو: فقط در صورتی که سکانس آخر نباشد
    const getForwardTransition = useCallback((): { edge: TransitionEdge; isReverse: boolean } | undefined => {
      const cIndex = graph.nodes.findIndex((n) => n.id === currentNodeRef.current.id);
      if (cIndex === -1 || cIndex >= graph.nodes.length - 1) {
        // سکانس آخر است، سکانس بعدی وجود ندارد!
        return undefined;
      }

      const nextNode = graph.nodes[cIndex + 1];
      const edgeToNext = currentNodeRef.current.transitions.find((t) => t.targetNodeId === nextNode.id);
      if (edgeToNext) {
        return { edge: edgeToNext, isReverse: false };
      }

      // یال ترنزیشن خطی معتبر به گره بعدی
      const forwardEdge: TransitionEdge = {
        targetNodeId: nextNode.id,
        label: `گذر به ${nextNode.title}`,
        triggerType: 'scroll',
        direction: 'forward',
        video: nextNode.ambientLoop,
      };
      return { edge: forwardEdge, isReverse: false };
    }, [graph.nodes]);

    // ترنزیشن دنده عقب: فقط در صورتی که سکانس اول نباشد
    const getBackwardTransition = useCallback((): { edge: TransitionEdge; isReverse: boolean } | undefined => {
      const cIndex = graph.nodes.findIndex((n) => n.id === currentNodeRef.current.id);
      if (cIndex <= 0) {
        // سکانس اول است، سکانس قبلی وجود ندارد!
        return undefined;
      }

      const prevNode = graph.nodes[cIndex - 1];
      const edgeToPrev = currentNodeRef.current.transitions.find((t) => t.targetNodeId === prevNode.id);
      if (edgeToPrev) {
        return { edge: edgeToPrev, isReverse: true };
      }

      // یال ترنزیشن خطی معتبر به گره قبلی
      const backwardEdge: TransitionEdge = {
        targetNodeId: prevNode.id,
        label: `دنده عقب به ${prevNode.title}`,
        triggerType: 'scroll',
        direction: 'backward',
        video: prevNode.ambientLoop,
      };
      return { edge: backwardEdge, isReverse: true };
    }, [graph.nodes]);

    // =========================================================================
    // ۴. کنترل فیزیکی اسکرول با نگه‌داشت فریم و دنده عقب
    // =========================================================================
    useEffect(() => {
      if (!enableScrollScrubbing) return;

      let touchStartY = 0;
      let touchStartX = 0;
      let lastTouchY = 0;
      let lastTouchTime = 0;
      let touchVelocityY = 0;
      let isTouching = false;
      let isHorizontalGesture = false;

      const handleScrubDelta = (delta: number) => {
        // اگر هنوز در مهلت خنک‌سازی بعد از رسیدن به سکانس جدید هستیم، سوایپ اضافه نادیده گرفته می‌شود
        if (Date.now() < arrivalCooldownUntilRef.current) {
          return;
        }

        // ۱. اگر ترنزیشنی در جریان نیست (آغاز ملایم ترنزیشن با آستانه مطمئن):
        if (!isTransitioningRef.current) {
          // آستانه آغاز ترنزیشن به ۱۴ واحد افزایش یافت تا تکان‌های تصادفی فعالش نکنند
          if (delta > 14) {
            // اسکرول یا سوایپ به بالا / کشیدن صفحه به پایین (delta > 0) -> ترنزیشن به سکانس بعدی
            const res = getForwardTransition();
            if (res) {
              initTransition(res.edge, 0.02, false);
            }
          } else if (delta < -14) {
            // اسکرول یا سوایپ به پایین / کشیدن صفحه به بالا (delta < 0) -> ترنزیشن دنده عقب به سکانس قبلی
            const res = getBackwardTransition();
            if (res) {
              initTransition(res.edge, 0.02, true);
            }
          }
          return;
        }

        // ۲. اگر کاربر درون ترنزیشن فعال است:
        if (autoPlayTweenRef.current) {
          autoPlayTweenRef.current.kill();
          autoPlayTweenRef.current = null;
        }

        const isRev = isReverseRef.current;
        // در ترنزیشن دنده عقب، کشیدن به بالا (delta < 0) پروگرس را زیاد می‌کند
        const rawEffectiveDelta = isRev ? -delta : delta;

        // مهار شتاب‌های جهشی بزرگ (Clamping) حداکثر تا ۲۸ واحد در هر فریم حرکت
        const clampedDelta = Math.max(-28, Math.min(28, rawEffectiveDelta));

        // ضریب ملایم و سنگین پیشروی اسکرابینگ
        const step = clampedDelta * 0.0011;
        const newTargetProgress = Math.max(0, Math.min(1, targetProgressRef.current + step));
        targetProgressRef.current = newTargetProgress;

        // اینترپولیشن روان و سنگین با استفاده از GSAP Ease به جای اتصال ۱:۱ سفت و خشک
        if (scrubTweenRef.current) {
          scrubTweenRef.current.kill();
        }

        const currentProg = progressRef.current;
        const diff = Math.abs(newTargetProgress - currentProg);
        // مدت زمان ملایم متناسب با فاصله دلتا (حداقل ۰.۲۵ ثانیه برای احساس وزن و لختی سینمایی)
        const duration = Math.min(0.55, Math.max(0.24, diff * 1.2));

        const animProxy = { progress: currentProg };
        scrubTweenRef.current = gsap.to(animProxy, {
          progress: newTargetProgress,
          duration: duration,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: () => {
            const interpolatedProgress = animProxy.progress;
            progressRef.current = interpolatedProgress;
            setTransitionProgress(interpolatedProgress);

            onStatusChange?.('TRANSITIONING', interpolatedProgress, {
              sourceTitle: sourceNodeTitle,
              targetTitle: targetNodeTitle,
              isReverse: isRev,
            });

            // ۳. آستانه‌های اتمام یا انصراف درون آپدیت اینترپولیشن:
            if (interpolatedProgress >= 0.96 && targetNodeIdRef.current) {
              if (scrubTweenRef.current) {
                scrubTweenRef.current.kill();
                scrubTweenRef.current = null;
              }
              const targetId = targetNodeIdRef.current;
              completeArrival(targetId);
              return;
            }

            if (interpolatedProgress <= 0.02 && clampedDelta < 0) {
              if (scrubTweenRef.current) {
                scrubTweenRef.current.kill();
                scrubTweenRef.current = null;
              }
              cancelBackToOrigin();
              return;
            }
          },
        });
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        // نرم کردن دلتای ماوس برای جلوگیری از پرش چرخ ماوس‌های پله‌ای
        const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 40);
        handleScrubDelta(normalizedDelta);
      };

      // مدیریت پیشرفته ژست‌های لمسی (Touch-based Gestures: Swipe Up / Swipe Down)
      // همگام با توالی اسکرابینگ GSAP و یکنواخت با رفتار ماوس/اسکرول
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
          lastTouchY = touchStartY;
          lastTouchTime = Date.now();
          touchVelocityY = 0;
          isTouching = true;
          isHorizontalGesture = false;

          if (autoPlayTweenRef.current) {
            autoPlayTweenRef.current.kill();
            autoPlayTweenRef.current = null;
          }
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0 && isTouching) {
          const currentY = e.touches[0].clientY;
          const currentX = e.touches[0].clientX;
          const now = Date.now();

          // بررسی اینکه ژست عمدتاً افقی نیست (جلوگیری از تداخل با کشیدن‌های جانبی)
          if (!isHorizontalGesture) {
            const deltaX = Math.abs(currentX - touchStartX);
            const deltaY = Math.abs(currentY - touchStartY);
            if (deltaX > 25 && deltaX > deltaY) {
              isHorizontalGesture = true;
              return;
            }
          }

          if (isHorizontalGesture) return;

          const dt = Math.max(1, now - lastTouchTime);
          const dy = lastTouchY - currentY;
          touchVelocityY = dy / dt; // سرعت حرکت انگشت بر حسب پیکسل بر میلی‌ثانیه

          lastTouchY = currentY;
          lastTouchTime = now;

          // ضریب ملایم و ارگونومیک ۰.۸۵ برای احساس وزن یکنواخت لمسی با اسکرول ماوس
          const scrubDelta = (dy) * 0.85;
          handleScrubDelta(scrubDelta);
        }
      };

      const onTouchEnd = () => {
        if (!isTouching) return;
        isTouching = false;

        // ممنتوم پایانی لمسی (Touch Momentum / Flick): در صورتی که کاربر سوایپ سریع انجام داده باشد
        if (!isHorizontalGesture && Math.abs(touchVelocityY) > 0.4) {
          const momentumDelta = Math.sign(touchVelocityY) * Math.min(28, Math.abs(touchVelocityY * 18));
          handleScrubDelta(momentumDelta);
        }
      };

      // ۵. لیسنر کلیدهای کیبورد (ArrowDown و ArrowUp) برای ناوبری یکپارچه با منطق اسکرول
      const onKeyDown = (e: KeyboardEvent) => {
        // جلوگیری از تداخل در صورت باز بودن فیلدهای متنی یا ورودی‌ها
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // شبیه‌سازی گام اسکرول رو به جلو (به سمت سکانس بعد)
          handleScrubDelta(24);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          // شبیه‌سازی گام اسکرول رو به بالا (دنده عقب به سمت سکانس قبل)
          handleScrubDelta(-24);
        }
      };

      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('keydown', onKeyDown);

      return () => {
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('keydown', onKeyDown);
      };
    }, [
      enableScrollScrubbing, 
      getForwardTransition, 
      getBackwardTransition, 
      initTransition, 
      completeArrival, 
      cancelBackToOrigin, 
      onStatusChange,
      sourceNodeTitle,
      targetNodeTitle
    ]);

    // متدهای بیرونی در صورت نیاز به کنترل دستوری
    React.useImperativeHandle(ref, () => ({
      transitionTo: (targetId: string) => {
        const edge = currentNodeRef.current.transitions.find((t) => t.targetNodeId === targetId);
        if (edge) initTransition(edge, 0, false);
      },
      transitionBackward: () => {
        const res = getBackwardTransition();
        if (res) initTransition(res.edge, 0, true);
      },
      scrubToProgress: (prog: number) => {
        const clamped = Math.max(0, Math.min(1, prog));
        if (scrubTweenRef.current) {
          scrubTweenRef.current.kill();
          scrubTweenRef.current = null;
        }
        progressRef.current = clamped;
        targetProgressRef.current = clamped;
        setTransitionProgress(clamped);
      },
    }));

    // محاسبه شماره ترنزیشن (ترنزیشن اول، دوم، سوم، چهارم)
    const transitionOrdinal = PERSIAN_ORDINALS[isReverseTransition ? currentIndex - 1 : currentIndex] || 'اول';

    return (
      <div id="video-experience-sequencer" className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-950 z-0">
        {/* =========================================================================
            پلیس‌هولدر سکانس (به جای ویدیوی خام) - مطابق با درخواست:
            فقط نوشته «سکانس اول»، «سکانس دوم» با گرادیان پس‌زمینه اشرافی هتل
            ========================================================================= */}
        <div 
          id="scene-placeholder-canvas"
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center select-none pointer-events-none"
        >
          {/* پس‌زمینه با نورپردازی مخملین و متالیک هتل */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black opacity-95" />
          
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
            {/* بج شماره سکانس با حروف فارسی */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm font-bold mb-6 tracking-wide shadow-[0_0_20px_rgba(251,191,36,0.15)]">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>پلیس‌هولدر ویدیوی سکانس {sceneOrdinalName}</span>
            </div>

            {/* تیتر بزرگ و شاخص سکانس */}
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white/90 tracking-tight mb-4 drop-shadow-2xl">
              سکانس {sceneOrdinalName}
            </h2>

            <p className="text-xl sm:text-2xl text-amber-200/90 font-medium mb-3">
              {currentNode.title}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-400 mt-2 mb-4">
              <span>سکانس {currentIndex + 1} از {totalScenes} هتل قصر لورا</span>
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              <span className="inline-flex items-center gap-1 text-emerald-400/90 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 font-mono text-[11px]">
                <Database className="w-3 h-3" />
                <span>مدیریت منابع فعال: کش غیرمجاور آزاد شد</span>
                {adjacentNeighbors.nextNode && <span>(بعدی: {adjacentNeighbors.nextNode.title})</span>}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              <span className="inline-flex items-center gap-1.5 text-neutral-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 text-[11px]">
                <Hand className="w-3 h-3 text-amber-400" />
                <span>سوایپ لمسی ↑↓ یا اسکرول ماوس</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-600 hidden sm:inline-block" />
              <span className="hidden sm:inline-flex items-center gap-1.5 text-neutral-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 text-[11px]">
                <Keyboard className="w-3 h-3 text-amber-400" />
                <span>کلیدهای جهت‌نما</span>
              </span>
            </div>
          </div>

          {/* خطوط نوری متالیک */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
        </div>

        {/* =========================================================================
            پلیس‌هولدر تعاملی ترنزیشن (Interactive Transition Placeholder)
            ========================================================================= */}
        {status === 'TRANSITIONING' && activeTransitionEdge && (
          <div 
            id="transition-scrubbing-overlay"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-2xl select-none transition-all duration-200"
          >
            {/* کارت شفاف و متمرکز پلیس‌هولدر ترنزیشن */}
            <div className="w-full max-w-xl bg-neutral-900/95 border border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center relative overflow-hidden">
              {/* هدر ترنزیشن با نام ترتیبی (ترنزیشن اول، ترنزیشن دوم و...) */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-xs font-bold mb-4">
                <span>پلیس‌هولدر ترنزیشن {transitionOrdinal}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-amber-200 font-extrabold">
                  {isReverseTransition ? 'دنده عقب به سکانس قبلی' : 'حرکت به سکانس بعدی'}
                </span>
              </div>

              {/* مسیر ترنزیشن: مبدأ به مقصد */}
              <div className="flex items-center justify-center gap-3 text-base sm:text-lg font-bold text-white mb-2">
                <span className="text-neutral-400">{sourceNodeTitle}</span>
                {isReverseTransition ? (
                  <ArrowRight className="w-5 h-5 text-amber-400 animate-pulse" />
                ) : (
                  <ArrowLeft className="w-5 h-5 text-amber-400 animate-pulse" />
                )}
                <span className="text-amber-300">{targetNodeTitle}</span>
              </div>

              <p className="text-xs text-neutral-400 mb-6">
                «{activeTransitionEdge.label}»
              </p>

              {/* نوار پروگرس تعاملی بزرگ اسکرابینگ ترنزیشن */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-neutral-400">پیشرفت اسکرول و ترنزیشن</span>
                  <span className="text-amber-400 font-mono text-base font-bold">
                    {Math.round(transitionProgress * 100)}%
                  </span>
                </div>

                <div className="relative w-full h-3.5 bg-neutral-800 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-l from-amber-300 via-amber-400 to-amber-500 rounded-full transition-all duration-75 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                    style={{ width: `${Math.round(transitionProgress * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-neutral-500 px-1">
                  <span>۰٪ (شروع ترنزیشن)</span>
                  <span className="text-amber-300/80 font-medium">نگه‌داشت روی فریم با توقف اسکرول</span>
                  <span>۱۰۰٪ (تکمیل ورود)</span>
                </div>
              </div>

              {/* راهنما و کلیدهای کنترل تعامل */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10 text-xs">
                {isReverseTransition ? (
                  <div className="flex items-center gap-1.5 text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                    <MoveUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>ادامه اسکرول / سوایپ به بالا یا کلید ↑ برای دنده عقب</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                    <MoveDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>ادامه اسکرول / سوایپ به پایین یا کلید ↓ برای سکانس بعد</span>
                  </div>
                )}

                <button
                  id="btn-complete-transition-now"
                  onClick={() => targetNodeIdRef.current && completeArrival(targetNodeIdRef.current)}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  تکمیل ورود
                </button>

                <button
                  id="btn-cancel-transition-now"
                  onClick={cancelBackToOrigin}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

VideoExperienceManager.displayName = 'VideoExperienceManager';
