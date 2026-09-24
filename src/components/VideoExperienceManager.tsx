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
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { 
  HotelExperienceGraph, 
  SequencerStatus, 
  TransitionEdge,
  SpaceNode
} from '../types/cms';
import { audioAmbiance } from '../services/AudioAmbienceEngine';
import { preloadManager } from '../services/PreloadManager';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(InertiaPlugin);
}
import { 
  ArrowLeft, 
  ArrowRight, 
  MoveDown, 
  MoveUp, 
  Sparkles, 
  Database, 
  Keyboard, 
  Hand,
  Loader2,
  CheckCircle2,
  Wifi,
  Layers,
  Gauge
} from 'lucide-react';

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

/**
 * پیاده‌سازی استراتژی کش 'کمترین استفاده اخیر' (Least Recently Used - LRU)
 * برای بهینه‌سازی مصرف حافظه و مدیریت چرخه حیات منابع در گره‌های تجربه چندرسانه‌ای هتل.
 * نگاشت دسترسی‌ها با ثبت تقدم زمانی و تعیین ترتیبی نودها برای تخلیه صریح حافظه.
 */
export class NodeLRUCache {
  private accessLog: Map<string, number> = new Map();

  /**
   * ثبت یا به‌روزرسانی دسترسی به یک نود و تنظیم مجدد اولویت LRU
   */
  public touch(nodeId: string, timestamp: number = Date.now()): void {
    this.accessLog.delete(nodeId);
    this.accessLog.set(nodeId, timestamp);
  }

  /**
   * مرتب‌سازی شناسه‌های نود کاندید بر اساس اولویت LRU (قدیمی‌ترین دسترسی در ابتدا)
   */
  public getLRUOrder(candidates: string[]): string[] {
    return [...candidates].sort((a, b) => {
      const timeA = this.accessLog.get(a) || 0;
      const timeB = this.accessLog.get(b) || 0;
      return timeA - timeB;
    });
  }

  /**
   * دریافت زمان آخرین دسترسی به یک نود
   */
  public getLastAccess(nodeId: string): number {
    return this.accessLog.get(nodeId) || 0;
  }

  /**
   * پاکسازی کامل تاریخچه دسترسی
   */
  public clear(): void {
    this.accessLog.clear();
  }
}

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

    // وضعیت کش منبع ویدیویی باکیفیت (High-Res) سکانس بعدی (برای مینی‌اورلی لودینگ در اتصالات کند)
    const [isNextSceneCached, setIsNextSceneCached] = useState<boolean>(false);

    const isTransitioningRef = useRef<boolean>(false);
    const currentEdgeRef = useRef<TransitionEdge | null>(null);
    const targetNodeIdRef = useRef<string | null>(null);
    const originNodeIdRef = useRef<string>(currentNodeId);
    const isReverseRef = useRef<boolean>(false);
    const progressRef = useRef<number>(0);
    const targetProgressRef = useRef<number>(0);
    const scrubTweenRef = useRef<gsap.core.Tween | null>(null);
    const autoPlayTweenRef = useRef<gsap.core.Tween | null>(null);
    // تایم‌لاین اختصاصی اسکرول‌محور GSAP برای همگامی با سرعت بصری تور سینمایی
    const scrubTimelineRef = useRef<gsap.core.Timeline | null>(null);

    // ردیابی جهت لحظه‌ای اسکرول برای بارگذاری مستقیم تکسچرها در بافر GPU
    const currentScrollDirectionRef = useRef<'forward' | 'backward'>('forward');
    const [scrollDirection, setScrollDirection] = useState<'forward' | 'backward'>('forward');
    const [gpuTexturesPreloadedCount, setGpuTexturesPreloadedCount] = useState<number>(0);

    // متغیرهای محاسبه تکانه و شتاب (Momentum & Velocity Tracking for Scrub Timeline)
    const scrubVelocityRef = useRef<number>(0);
    const lastScrubTimestampRef = useRef<number>(0);
    const momentumContinuationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // دی‌بانس هوشمند و انباشتگر دلتا برای جلوگیری از پرش ترنزیشن در ژست‌های سریع ترک‌پد (Trackpad High-Speed Debounce)
    const accumulatedTrackpadDeltaRef = useRef<number>(0);
    const trackpadDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTrackpadEventTimeRef = useRef<number>(0);

    // نگاشت برچسب‌های تایم‌لاین غیرخطی GSAP به پروگرس و گره‌های سکانس
    const sequenceTimelineRef = useRef<gsap.core.Timeline | null>(null);
    const [activeSequenceLabel, setActiveSequenceLabel] = useState<string>('');

    // زمان‌بند جلوگیری از پرش سکانس‌ها در یک سوایپ ممتد (Cooldown after arrival)
    const arrivalCooldownUntilRef = useRef<number>(0);

    // ترشولد شتاب و سقف سرعت سینمایی برای مهار سوایپ‌های محکم (Speed Ceiling & Acceleration Governor)
    const transitionStartTimeRef = useRef<number>(0);
    const [isSpeedGovernorActive, setIsSpeedGovernorActive] = useState<boolean>(false);
    const speedGovernorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerSpeedGovernor = useCallback(() => {
      setIsSpeedGovernorActive(true);
      if (speedGovernorTimerRef.current) {
        clearTimeout(speedGovernorTimerRef.current);
      }
      speedGovernorTimerRef.current = setTimeout(() => {
        setIsSpeedGovernorActive(false);
      }, 1400);
    }, []);

    // =========================================================================
    // الگوریتم محدودکننده نرخ شتاب (Acceleration Limiter) برای محاسبات دلتای اسکرول (deltaY)
    // ارزیابی مشتق زمانی تغییرات شتاب (Slew Rate Limiting) برای جلوگیری از جهش‌های ناگهانی بین سکانس‌ها
    // =========================================================================
    const prevScrollDeltaRef = useRef<number>(0);
    const lastScrollDeltaTimeRef = useRef<number>(0);

    const applyAccelerationLimiter = useCallback((incomingRawDelta: number): number => {
      const now = performance.now();
      const dt = Math.max(1, Math.min(80, now - lastScrollDeltaTimeRef.current));
      lastScrollDeltaTimeRef.current = now;

      // نادیده گرفتن نویزهای میکروسکوپی سنسور ترک‌پد و ماوس
      if (Math.abs(incomingRawDelta) < 0.2) {
        prevScrollDeltaRef.current *= 0.5;
        return 0;
      }

      const prevDelta = prevScrollDeltaRef.current;
      const deltaChange = incomingRawDelta - prevDelta;
      const instantAccelRate = deltaChange / dt; // نرخ تغییر دلتا بر حسب میلی‌ثانیه

      // در صورت جهش شدید شتاب لحظه‌ای یا سوایپ ناگهانی، گاورنر سرعت فعال می‌شود
      if (Math.abs(instantAccelRate) > 0.42 || Math.abs(incomingRawDelta) > 18) {
        triggerSpeedGovernor();
      }

      // سقف مجاز نرخ شتاب در هر میلی‌ثانیه (Max Permissible Slew Rate)
      const MAX_ACCEL_RATE = 0.5;
      const clampedAccelRate = Math.max(-MAX_ACCEL_RATE, Math.min(MAX_ACCEL_RATE, instantAccelRate));

      // محاسبه دلتای محدودشده بر اساس نرخ شتاب مجاز
      let limitedDelta = prevDelta + (clampedAccelRate * dt);

      // فشرده‌سازی غیرخطی لگاریتمی (Soft-Knee Curve) برای دلتاهای فراتر از آستانه بحرانی
      const CRITICAL_THRESHOLD = 12;
      if (Math.abs(limitedDelta) > CRITICAL_THRESHOLD) {
        const sign = Math.sign(limitedDelta);
        const excess = Math.abs(limitedDelta) - CRITICAL_THRESHOLD;
        limitedDelta = sign * (CRITICAL_THRESHOLD + Math.log1p(excess) * 2.8);
      }

      // سقف فیزیکی نهایی برای تضمین عدم پرش لحظه‌ای بین فریم‌ها
      limitedDelta = Math.max(-16, Math.min(16, limitedDelta));
      prevScrollDeltaRef.current = limitedDelta * 0.75;

      return limitedDelta;
    }, [triggerSpeedGovernor]);

    // ثبت دسترسی گره‌ها بر اساس الگوریتم 'کمترین استفاده اخیر' (LRU Cache Strategy)
    const lruCacheRef = useRef<NodeLRUCache>(new NodeLRUCache());
    const [lruMetrics, setLruMetrics] = useState<{
      evictedNodesCount: number;
      protectedNodesCount: number;
      lastEvictedTitle: string | null;
      purgedPlaceholdersCount: number;
      purgedAudioBuffersCount: number;
    }>({
      evictedNodesCount: 0,
      protectedNodesCount: 0,
      lastEvictedTitle: null,
      purgedPlaceholdersCount: 0,
      purgedAudioBuffersCount: 0,
    });

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
    // ۱. سیستم مدیریت چرخه حیات منابع با استراتژی کش LRU (Least Recently Used Cache Strategy)
    // - گره‌های در محدوده فاصله <= ۲ نسبت به شاخص جاری (Current Index ± 2) حفظ و در حافظه محافظت می‌شوند.
    // - گره‌هایی که بیش از ۲ سکانس با شاخص جاری فاصله دارند (distance > 2)، بر اساس تقدم تاریخی LRU
    //   هدف قرار گرفته و پلیس‌هولدرهای سکانس و بافرهای صوتی آن‌ها به طور صریح تخلیه و Purge می‌شوند.
    // =========================================================================

    // محاسبه گره‌های مجاور در گراف خطی (گره قبلی و گره بعدی)
    const adjacentNeighbors = useMemo(() => {
      const prevNode: SpaceNode | undefined = currentIndex > 0 ? graph.nodes[currentIndex - 1] : undefined;
      const nextNode: SpaceNode | undefined = currentIndex < totalScenes - 1 ? graph.nodes[currentIndex + 1] : undefined;
      return { prevNode, nextNode };
    }, [graph.nodes, currentIndex, totalScenes]);

    // مدیر چرخه حیات منابع بر اساس سیاست LRU (Least Recently Used):
    useEffect(() => {
      if (!currentNode) return;

      const now = Date.now();
      // ۱. به‌روزرسانی تاریخچه زمانی دسترسی گره فعال در ثبّات LRU
      lruCacheRef.current.touch(currentNode.id, now);

      // الف) پخش نوای آرامش‌بخش سکانس فعال
      audioAmbiance.playAmbiance(currentNode.audioProfile.tone, currentNode.audioProfile.volume);

      // ب) گرم‌کردن و پیش‌بارگذاری فرکانس‌ها و منابع صوتی گره‌های مجاور (قبلی و بعدی)
      if (adjacentNeighbors.prevNode) {
        lruCacheRef.current.touch(adjacentNeighbors.prevNode.id, now - 100);
        audioAmbiance.warmUpAudioProfile(adjacentNeighbors.prevNode.audioProfile.tone);
      }
      if (adjacentNeighbors.nextNode) {
        lruCacheRef.current.touch(adjacentNeighbors.nextNode.id, now - 100);
        audioAmbiance.warmUpAudioProfile(adjacentNeighbors.nextNode.audioProfile.tone);
      }

      // ج) پیش‌بارگذاری بافر و ساختار ویدیویی/مدیای گره‌های مجاور در موتور پری‌لود
      preloadManager.preloadNodeNeighborhood(graph, currentNode.id);

      // د) پیاده‌سازی و اجرای سیاست کش LRU:
      // گره‌های مجاز و محافظت‌شده در پنجره شاخص فعال (فاصله <= ۲ گام)
      const maxProtectedDistance = 2;
      const protectedNodes = graph.nodes.filter((_, idx) => Math.abs(idx - currentIndex) <= maxProtectedDistance);
      const protectedTones = new Set(protectedNodes.map((n) => n.audioProfile.tone));

      // تجمیع کلیه آدرس‌های تصاویر پلیس‌هولدر محافظت‌شده (پوستر لوپ و ترنزیشن‌ها)
      const protectedPlaceholderUrls = new Set<string>();
      protectedNodes.forEach((node) => {
        if (node.ambientLoop.posterUrl) {
          protectedPlaceholderUrls.add(node.ambientLoop.posterUrl);
        }
        node.transitions.forEach((t) => {
          if (t.video.posterUrl) {
            protectedPlaceholderUrls.add(t.video.posterUrl);
          }
          if (t.reverseVideo?.posterUrl) {
            protectedPlaceholderUrls.add(t.reverseVideo.posterUrl);
          }
        });
      });

      // شناسایی گره‌های دورافتاده با فاصله بیش از ۲ گام از شاخص فعال (distance > 2)
      const distantCandidates = graph.nodes
        .map((node, index) => ({
          node,
          index,
          distance: Math.abs(index - currentIndex),
          lastAccess: lruCacheRef.current.getLastAccess(node.id),
        }))
        .filter((item) => item.distance > maxProtectedDistance);

      // مرتب‌سازی کاندیداها طبق سیاست LRU: کمترین استفاده اخیر (قدیمی‌ترین دسترسی در ابتدا)
      const candidateIds = distantCandidates.map((c) => c.node.id);
      const orderedEvictionNodeIds = lruCacheRef.current.getLRUOrder(candidateIds);

      // ۱. تخلیه صریح پلیس‌هولدرهای سکانس (Scene Placeholders) برای گره‌های بیش از ۲ گام فاصله:
      let purgedPlaceholdersCount = 0;
      orderedEvictionNodeIds.forEach((nodeId) => {
        const distantNode = graph.nodes.find((n) => n.id === nodeId);
        if (!distantNode) return;

        // پلیس‌هولدر اصلی لوپ سکانس
        if (distantNode.ambientLoop.posterUrl && !protectedPlaceholderUrls.has(distantNode.ambientLoop.posterUrl)) {
          preloadManager.unloadPlaceholderTexture(distantNode.ambientLoop.posterUrl);
          purgedPlaceholdersCount++;
        }

        // پلیس‌هولدرهای ترنزیشن‌های رو به جلو و دنده عقب
        distantNode.transitions.forEach((t) => {
          if (t.video.posterUrl && !protectedPlaceholderUrls.has(t.video.posterUrl)) {
            preloadManager.unloadPlaceholderTexture(t.video.posterUrl);
            purgedPlaceholdersCount++;
          }
          if (t.reverseVideo?.posterUrl && !protectedPlaceholderUrls.has(t.reverseVideo.posterUrl)) {
            preloadManager.unloadPlaceholderTexture(t.reverseVideo.posterUrl);
            purgedPlaceholdersCount++;
          }
        });
      });

      // ۲. تخلیه صریح بافرهای صوتی (Audio Buffers) گره‌های با فاصله بیش از ۲ گام:
      // شناسایی فرکانس‌ها و پروفایل‌های صوتی گره‌های دور که در گره‌های محافظت‌شده استفاده نشده‌اند
      const evictedTones = Array.from(
        new Set(
          distantCandidates
            .map((c) => c.node.audioProfile.tone)
            .filter((tone) => !protectedTones.has(tone))
        )
      );

      // تخلیه و آزادسازی صریح بافرهای وب‌آودیو از حافظه
      const audioPurgeResult = audioAmbiance.purgeAudioBuffersForTones(evictedTones);
      audioAmbiance.pruneNonAdjacentAudio(Array.from(protectedTones));

      // ۳. تخلیه هدفمند تکسچرهای پلیس‌هولدر باکیفیت و بافرهای ویدیویی توسط موتور پری‌لود
      preloadManager.pruneLRUResources(graph, currentIndex, orderedEvictionNodeIds, maxProtectedDistance);

      // ه) پیش‌بارگذاری و کش مستقیم تکسچرهای پلیس‌هولدر در بافر GPU بر اساس جهت اسکرول جاری
      // (GPU Texture Pre-fetching to prevent frame stutter during navigation)
      preloadManager
        .prefetchDirectionalTextures(graph, currentIndex, currentScrollDirectionRef.current)
        .then((res) => {
          setGpuTexturesPreloadedCount(res.count);
        });

      setLruMetrics({
        evictedNodesCount: orderedEvictionNodeIds.length,
        protectedNodesCount: protectedNodes.length,
        lastEvictedTitle: distantCandidates.length > 0 ? distantCandidates[0].node.title : null,
        purgedPlaceholdersCount,
        purgedAudioBuffersCount: audioPurgeResult.purgedCount,
      });

    }, [currentNode, adjacentNeighbors, graph, currentIndex]);

    // بررسی مداوم و زنده وضعیت آماده بودن کش منبع ویدیویی باکیفیت (High-Res) سکانس بعدی
    const checkNextSceneCacheStatus = useCallback(() => {
      if (!adjacentNeighbors.nextNode) {
        setIsNextSceneCached(true);
        return;
      }
      const orientation = preloadManager.getDeviceOrientation();
      const nextLoopUrl = preloadManager.resolveMediaUrl(adjacentNeighbors.nextNode.ambientLoop, orientation);
      const transitionToNext = currentNode.transitions.find((t) => t.targetNodeId === adjacentNeighbors.nextNode?.id);
      const transitionUrl = transitionToNext ? preloadManager.resolveMediaUrl(transitionToNext.video, orientation) : null;

      const isLoopReady = preloadManager.isVideoCached(nextLoopUrl);
      const isTransitionReady = transitionUrl ? preloadManager.isVideoCached(transitionUrl) : true;

      setIsNextSceneCached(isLoopReady && isTransitionReady);
    }, [adjacentNeighbors.nextNode, currentNode.transitions]);

    useEffect(() => {
      checkNextSceneCacheStatus();

      // شنونده رویدادهای پیشرفت پری‌لودر
      const unsubscribe = preloadManager.onProgress(() => {
        checkNextSceneCacheStatus();
      });

      // بررسی دوره‌ای سریع برای همگامی با اتمام دانلود ویدیو
      const interval = setInterval(checkNextSceneCacheStatus, 400);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }, [checkNextSceneCacheStatus]);

    // =========================================================================
    // ۱.۵. ساخت تایم‌لاین کلی توالی غیرخطی GSAP با برچسب‌گذاری (Timeline Labels) برای هر گره
    // این ساختار امکان کنترل میلی‌متری و جستجوی غیرخطی بین سکانس‌ها را فراهم می‌آورد.
    // =========================================================================
    useEffect(() => {
      if (sequenceTimelineRef.current) {
        sequenceTimelineRef.current.kill();
      }

      const masterTimeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      const totalNodes = graph.nodes.length;
      if (totalNodes > 0) {
        const stepDuration = 1; // مدت زمان واحد هر ترنزیشن بین دو سکانس متوالی در خط زمان
        graph.nodes.forEach((node, idx) => {
          const labelName = `node_${node.id}`;
          const timePosition = idx * stepDuration;
          
          // برچسب آغازین برای گره سکانس
          masterTimeline.addLabel(labelName, timePosition);

          // برای هر ترنزیشن غیرخطی موجود در گره، برچسب‌های فرعی ثبت می‌شوند
          node.transitions.forEach((trans) => {
            const branchLabel = `branch_${node.id}_to_${trans.targetNodeId}`;
            masterTimeline.addLabel(branchLabel, timePosition + 0.5);
          });

          // اضافه کردن توئین مجازی بین گام‌ها
          if (idx < totalNodes - 1) {
            masterTimeline.to({}, { duration: stepDuration }, timePosition);
          }
        });
      }

      sequenceTimelineRef.current = masterTimeline;

      // همگام‌سازی برچسب فعال با گره جاری
      const initialLabel = `node_${currentNodeId}`;
      setActiveSequenceLabel(initialLabel);

      return () => {
        masterTimeline.kill();
      };
    }, [graph.nodes, currentNodeId]);

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
        transitionStartTimeRef.current = performance.now();

        if (scrubTweenRef.current) {
          scrubTweenRef.current.kill();
          scrubTweenRef.current = null;
        }

        if (scrubTimelineRef.current) {
          scrubTimelineRef.current.kill();
          scrubTimelineRef.current = null;
        }

        // ساخت خط زمان اسکرول‌محور GSAP با تابع Easing مشخص power3.out برای همگامی با سرعت بصری تور سینمایی هتل
        const tl = gsap.timeline({
          paused: true,
          defaults: {
            ease: "power3.out",
          },
        });
        const tlState = { progress: initialProgress };
        tl.to(tlState, {
          progress: 1,
          duration: 1,
          ease: "power3.out",
        });
        scrubTimelineRef.current = tl;

        setActiveTransitionEdge(edge);
        setIsReverseTransition(isReverse);
        const srcTitle = sourceNode?.title || 'سکانس مبدأ';
        const tgtTitle = targetNode?.title || edge.label || 'سکانس مقصد';
        setSourceNodeTitle(srcTitle);
        setTargetNodeTitle(tgtTitle);
        setTransitionProgress(initialProgress);

        // برچسب گذاری شاخه غیرخطی در تایم‌لاین کلی توالی GSAP
        const branchLabel = `branch_${sourceNode?.id}_to_${edge.targetNodeId}`;
        setActiveSequenceLabel(branchLabel);

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

        if (momentumContinuationTimerRef.current) {
          clearTimeout(momentumContinuationTimerRef.current);
          momentumContinuationTimerRef.current = null;
        }
        scrubVelocityRef.current = 0;

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
          if (scrubTimelineRef.current) {
            scrubTimelineRef.current.kill();
            scrubTimelineRef.current = null;
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

          // تثبیت برچسب گره مقصد در تایم‌لاین غیرخطی GSAP
          const arrivalLabel = `node_${targetNodeId}`;
          setActiveSequenceLabel(arrivalLabel);
          if (sequenceTimelineRef.current && sequenceTimelineRef.current.labels[arrivalLabel] !== undefined) {
            sequenceTimelineRef.current.seek(arrivalLabel);
          }
        }, 150);
      },
      [graph.nodes, onNodeChange, onStatusChange, onTransitionEnd]
    );

    // لغو ترنزیشن و بازگشت به سکانس مبدأ
    const cancelBackToOrigin = useCallback(() => {
      if (momentumContinuationTimerRef.current) {
        clearTimeout(momentumContinuationTimerRef.current);
        momentumContinuationTimerRef.current = null;
      }
      scrubVelocityRef.current = 0;

      if (scrubTweenRef.current) {
        scrubTweenRef.current.kill();
        scrubTweenRef.current = null;
      }
      if (scrubTimelineRef.current) {
        scrubTimelineRef.current.kill();
        scrubTimelineRef.current = null;
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

      // بازگشت برچسب تایم‌لاین به گره مبدأ
      const originLabel = `node_${originNodeIdRef.current}`;
      setActiveSequenceLabel(originLabel);
      if (sequenceTimelineRef.current && sequenceTimelineRef.current.labels[originLabel] !== undefined) {
        sequenceTimelineRef.current.seek(originLabel);
      }
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

        // تشخیص جهت اسکرول و پیش‌بارگذاری هوشمند تکسچرهای پلیس‌هولدر در بافر GPU برای جلوگیری از هرگونه لگ و استاتر فریم
        const detectedDirection: 'forward' | 'backward' = delta > 0 ? 'forward' : 'backward';
        if (currentScrollDirectionRef.current !== detectedDirection) {
          currentScrollDirectionRef.current = detectedDirection;
          setScrollDirection(detectedDirection);
        }
        preloadManager
          .prefetchDirectionalTextures(graph, currentIndex, detectedDirection)
          .then((res) => {
            if (res.count > 0) setGpuTexturesPreloadedCount(res.count);
          });

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

        // ترشولد شتاب سوایپ محکم (Heavy Swipe Acceleration Threshold):
        // هرگاه سوایپ یا اسکرول کاربر از آستانه شتاب مشخصی فراتر رود، سقف سرعت فعال می‌شود
        const isHardSwipe = Math.abs(rawEffectiveDelta) >= 15;
        if (isHardSwipe) {
          triggerSpeedGovernor();
        }

        // سقف سرعتی و فشرده‌سازی غیرخطی دلتا (Non-linear Velocity Compression & Speed Ceiling):
        // مقادیر فراتر از ۱۲ واحد به صورت لگاریتمی نرم می‌شوند تا سوایپ‌های ناگهانی ترنزیشن را درجا رد نکنند
        let compressedDelta = rawEffectiveDelta;
        if (Math.abs(compressedDelta) > 12) {
          const s = Math.sign(compressedDelta);
          const excess = Math.abs(compressedDelta) - 12;
          compressedDelta = s * (12 + Math.log1p(excess) * 3.2);
        }
        // مهار نهایی سقف فیزیکی در هر فریم ورودی
        const clampedDelta = Math.max(-18, Math.min(18, compressedDelta));

        // محاسبه شتاب لحظه‌ای و میانگین متحرک سرعت (Momentum & Velocity Tracking)
        const now = performance.now();
        const dt = Math.max(8, now - lastScrubTimestampRef.current);
        lastScrubTimestampRef.current = now;

        const instantVelocity = (clampedDelta * 0.00095) / (dt / 16.67);
        scrubVelocityRef.current = scrubVelocityRef.current * 0.65 + instantVelocity * 0.35;

        // سقف حداکثر پیشروی پروگرس در هر فریم (Progress Rate Ceiling):
        // در هر تکانه، پیشروی از ۰.۰۱۸ فراتر نمی‌رود تا حس وزن دوربین سینمایی کاملاً لمس شود
        const step = Math.sign(clampedDelta) * Math.min(0.018, Math.abs(clampedDelta * 0.00095));
        const newTargetProgress = Math.max(0, Math.min(1, targetProgressRef.current + step));
        targetProgressRef.current = newTargetProgress;

        // لغو تایمر ادامه‌دهنده ممنتوم قبلی هنگام ادامه اسکرول توسط کاربر
        if (momentumContinuationTimerRef.current) {
          clearTimeout(momentumContinuationTimerRef.current);
          momentumContinuationTimerRef.current = null;
        }

        // اینترپولیشن روان با استفاده از تابع Easing سفارشی power3.out همگام با سرعت بصری تور سینمایی
        if (scrubTweenRef.current) {
          scrubTweenRef.current.kill();
        }

        const currentProg = progressRef.current;
        const diff = Math.abs(newTargetProgress - currentProg);
        
        // سقف سرعت و حداقل مدت زمان ترنزیشن (Cinematic Duration Floor):
        // در سوایپ‌های محکم، حداقل مدت زمان انیمیشن روی ۰.۸۵ ثانیه تنظیم می‌شود تا ترنزیشن با وقار طی شود
        const minCinematicDuration = isHardSwipe ? 0.85 : 0.42;
        const dynamicDuration = Math.min(
          1.25, 
          Math.max(minCinematicDuration, diff * 2.4 + Math.abs(scrubVelocityRef.current) * 0.38)
        );

        const animProxy = { progress: currentProg };
        scrubTweenRef.current = gsap.to(animProxy, {
          progress: newTargetProgress,
          duration: dynamicDuration,
          ease: "power3.out", // اعمال صریح پارامتر ease: "power3.out" برای همگام‌سازی سرعت ترنزیشن با شتاب بصری تور سینمایی
          overwrite: 'auto',
          onUpdate: () => {
            const interpolatedProgress = animProxy.progress;
            progressRef.current = interpolatedProgress;
            setTransitionProgress(interpolatedProgress);

            // همگام‌سازی موقعیت خط زمان اسکرول‌محور GSAP
            if (scrubTimelineRef.current) {
              scrubTimelineRef.current.progress(interpolatedProgress);
            }

            // نگاشت دقیق پروگرس اسکرول به برچسب‌های تایم‌لاین توالی غیرخطی GSAP
            if (sequenceTimelineRef.current) {
              const srcId = originNodeIdRef.current;
              const tgtId = targetNodeIdRef.current;
              const srcLabel = `node_${srcId}`;
              const tgtLabel = `node_${tgtId}`;
              const srcTime = sequenceTimelineRef.current.labels[srcLabel] ?? 0;
              const tgtTime = sequenceTimelineRef.current.labels[tgtLabel] ?? (srcTime + 1);
              const mappedTime = srcTime + (tgtTime - srcTime) * interpolatedProgress;
              sequenceTimelineRef.current.time(Math.max(0, mappedTime));
            }

            onStatusChange?.('TRANSITIONING', interpolatedProgress, {
              sourceTitle: sourceNodeTitle,
              targetTitle: targetNodeTitle,
              isReverse: isRev,
            });

            // ۳. آستانه‌های اتمام یا انصراف با تضمین حداقل زمان مکث برای رویت فضا (Minimum Dwell Guard):
            const elapsedSinceStart = performance.now() - transitionStartTimeRef.current;
            const MIN_CINEMATIC_DWELL = 680; // حداقل زمان ۶۸۰ میلی‌ثانیه برای جلوگیری از رد شدن برق‌آسا

            if (interpolatedProgress >= 0.96 && targetNodeIdRef.current) {
              if (elapsedSinceStart < MIN_CINEMATIC_DWELL) {
                // سقف سرعتی: پروگرس را تا انقضای زمان مهار در ۰.۹۳ نگه می‌داریم تا سکانس به صورت جهشی رد نشود
                const holdingProgress = 0.93;
                animProxy.progress = holdingProgress;
                progressRef.current = holdingProgress;
                setTransitionProgress(holdingProgress);
                return;
              }

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

        // بازنویسی منطق GSAP Scrubbing با استفاده از پارامترهای 'inertia' و 'ease: "power3.out"'
        // تا پس از توقف اسکرول کاربر، انیمیشن ترنزیشن با یک حرکت نرم و سینمایی به پایان برسد.
        momentumContinuationTimerRef.current = setTimeout(() => {
          if (!isTransitioningRef.current) return;
          const residualVelocity = scrubVelocityRef.current;

          if (Math.abs(residualVelocity) > 0.003) {
            const currentP = progressRef.current;
            if (scrubTweenRef.current) {
              scrubTweenRef.current.kill();
            }

            const animProxy = { progress: currentP };

            // اجرای انیمیشن نهایی مهار سرعت و پایان ترنزیشن با پارامترهای inertia و ease: "power3.out"
            scrubTweenRef.current = gsap.to(animProxy, {
              inertia: {
                resistance: 350,
                progress: {
                  velocity: residualVelocity * 1.5,
                  min: 0,
                  max: 1,
                },
              },
              ease: "power3.out",
              overwrite: 'auto',
              onUpdate: () => {
                const prog = animProxy.progress;
                progressRef.current = prog;
                setTransitionProgress(prog);

                if (scrubTimelineRef.current) {
                  scrubTimelineRef.current.progress(prog);
                }

                if (sequenceTimelineRef.current) {
                  const srcId = originNodeIdRef.current;
                  const tgtId = targetNodeIdRef.current;
                  const srcLabel = `node_${srcId}`;
                  const tgtLabel = `node_${tgtId}`;
                  const srcTime = sequenceTimelineRef.current.labels[srcLabel] ?? 0;
                  const tgtTime = sequenceTimelineRef.current.labels[tgtLabel] ?? (srcTime + 1);
                  const mappedTime = srcTime + (tgtTime - srcTime) * prog;
                  sequenceTimelineRef.current.time(Math.max(0, mappedTime));
                }

                onStatusChange?.('TRANSITIONING', prog, {
                  sourceTitle: sourceNodeTitle,
                  targetTitle: targetNodeTitle,
                  isReverse: isRev,
                });

                const elapsed = performance.now() - transitionStartTimeRef.current;
                const MIN_CINEMATIC_DWELL = 680;

                if (prog >= 0.96 && targetNodeIdRef.current) {
                  if (elapsed < MIN_CINEMATIC_DWELL) {
                    const holdingProgress = 0.93;
                    animProxy.progress = holdingProgress;
                    progressRef.current = holdingProgress;
                    setTransitionProgress(holdingProgress);
                    return;
                  }

                  if (scrubTweenRef.current) {
                    scrubTweenRef.current.kill();
                    scrubTweenRef.current = null;
                  }
                  const targetId = targetNodeIdRef.current;
                  completeArrival(targetId);
                  return;
                }

                if (prog <= 0.02 && residualVelocity < 0) {
                  if (scrubTweenRef.current) {
                    scrubTweenRef.current.kill();
                    scrubTweenRef.current = null;
                  }
                  cancelBackToOrigin();
                  return;
                }
              },
              onComplete: () => {
                scrubVelocityRef.current = 0;
                const finalP = animProxy.progress;
                if (finalP >= 0.94 && targetNodeIdRef.current) {
                  completeArrival(targetNodeIdRef.current);
                } else if (finalP <= 0.05) {
                  cancelBackToOrigin();
                }
              },
            });
          }
        }, 75);
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();

        // ۱. محاسبه دقیق deltaY با پشتیبانی از تمامی حالت‌های deltaMode:
        // deltaMode 0: پیکسل (معمولاً تاچ‌پد و ماوس‌های بدون پله)
        // deltaMode 1: خطوط متنی (چرخ ماوس پله‌ای استاندارد) -> هر خط تقریباً ۱۶ تا ۱۸ پیکسل
        // deltaMode 2: صفحات کامل -> هر صفحه بر اساس ارتفاع پنجره نمایش
        let rawDelta = e.deltaY;
        if (e.deltaMode === 1) {
          rawDelta *= 18;
        } else if (e.deltaMode === 2) {
          rawDelta *= (window.innerHeight || 800);
        }

        // ۲. الگوریتم محدودکننده نرخ شتاب (Acceleration Limiter) برای محاسبات deltaY:
        // مهار جهش‌های ناگهانی deltaY در هنگام سوایپ‌های شتابان با استفاده از Slew-Rate Limiting
        const limitedDelta = applyAccelerationLimiter(rawDelta);
        if (Math.abs(limitedDelta) < 0.25) return; // نادیده گرفتن نویزهای میکروسکوپی سنسور ترک‌پد

        // ۳. مکانیزم دی‌بانس هوشمند و انباشتگر دلتا برای حرکات سریع ترک‌پد (Trackpad High-Speed Debounce)
        // در سوایپ‌های شتابان ترک‌پد، رویدادها با فرکانس بسیار بالا (بیش از ۱۲۰ هرتز) ارسال می‌شوند.
        // انباشتگر این رویدادها را در بازه کوتاه جمع‌آوری و با نرخ پایدار اعمال می‌کند تا هیچ ماشه ترنزیشنی از دست نرود.
        const now = performance.now();
        const timeSinceLastWheel = now - lastTrackpadEventTimeRef.current;
        lastTrackpadEventTimeRef.current = now;

        accumulatedTrackpadDeltaRef.current += limitedDelta;

        // اجرای فوری بخش کنترل‌شده، و اجرای باقیمانده انباشت از طریق دی‌بانس در صورت فرکانس بیش از حد
        if (timeSinceLastWheel > 12) {
          const deltaToProcess = accumulatedTrackpadDeltaRef.current;
          accumulatedTrackpadDeltaRef.current = 0;
          handleScrubDelta(deltaToProcess);
        } else {
          // دی‌بانس میکروثانیه‌ای برای ادغام پالس‌های فوق سریع بدون از دست رفتن ترنزیشن (Trigger Skip Prevention)
          if (trackpadDebounceTimerRef.current) {
            clearTimeout(trackpadDebounceTimerRef.current);
          }
          trackpadDebounceTimerRef.current = setTimeout(() => {
            if (accumulatedTrackpadDeltaRef.current !== 0) {
              const flushedDelta = accumulatedTrackpadDeltaRef.current;
              accumulatedTrackpadDeltaRef.current = 0;
              handleScrubDelta(flushedDelta);
            }
          }, 14);
        }
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

          // اعمال الگوریتم محدودکننده نرخ شتاب روی ورودی لمسی (Touch Acceleration Limiter)
          const limitedTouchDelta = applyAccelerationLimiter(dy * 0.85);
          if (Math.abs(limitedTouchDelta) > 0.2) {
            handleScrubDelta(limitedTouchDelta);
          }
        }
      };

      const onTouchEnd = () => {
        if (!isTouching) return;
        isTouching = false;

        // ممنتوم پایانی لمسی همراه با اعمال الگوریتم محدودکننده نرخ شتاب
        if (!isHorizontalGesture && Math.abs(touchVelocityY) > 0.35) {
          const rawFlickDelta = Math.sign(touchVelocityY) * Math.min(18, Math.abs(touchVelocityY * 12));
          const limitedFlickDelta = applyAccelerationLimiter(rawFlickDelta);
          handleScrubDelta(limitedFlickDelta);
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
          handleScrubDelta(20);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          // شبیه‌سازی گام اسکرول رو به بالا (دنده عقب به سمت سکانس قبل)
          handleScrubDelta(-20);
        }
      };

      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('keydown', onKeyDown);

      return () => {
        if (momentumContinuationTimerRef.current) {
          clearTimeout(momentumContinuationTimerRef.current);
          momentumContinuationTimerRef.current = null;
        }
        if (trackpadDebounceTimerRef.current) {
          clearTimeout(trackpadDebounceTimerRef.current);
          trackpadDebounceTimerRef.current = null;
        }
        if (speedGovernorTimerRef.current) {
          clearTimeout(speedGovernorTimerRef.current);
          speedGovernorTimerRef.current = null;
        }
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
      targetNodeTitle,
      triggerSpeedGovernor,
      applyAccelerationLimiter
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
        if (scrubTimelineRef.current) {
          scrubTimelineRef.current.progress(clamped);
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
            پلیس‌هولدر سکانس (به جای ویدیوی خام) - با تکسچر بافرشده GPU در پس‌زمینه
            ========================================================================= */}
        <div 
          id="scene-placeholder-canvas"
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center select-none pointer-events-none"
        >
          {/* تکسچر باکیفیت بارگذاری‌شده در بافر GPU برای جلوگیری کامل از لکنت فریم */}
          {currentNode.ambientLoop.posterUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 pointer-events-none transition-transform duration-1000 ease-out filter saturate-125 brightness-75"
              style={{ backgroundImage: `url(${currentNode.ambientLoop.posterUrl})` }}
            />
          )}

          {/* پس‌زمینه با نورپردازی مخملین و متالیک هتل */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/90 via-neutral-950/95 to-black opacity-95" />
          
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
              <span 
                className="inline-flex items-center gap-1 text-emerald-400/90 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 font-mono text-[11px]"
                title="استراتژی LRU: محافظت از نودهای در محدوده فاصله ۲ و تخلیه صریح تکسچرها و بافرهای صوتی نودهای دورافتاده"
              >
                <Database className="w-3 h-3 text-emerald-400" />
                <span>سیاست LRU فعال: تخلیه فاصله &gt; ۲</span>
                {lruMetrics.evictedNodesCount > 0 ? (
                  <span className="text-emerald-300/90">
                    ({lruMetrics.evictedNodesCount} گره | {lruMetrics.purgedPlaceholdersCount} پلیس‌هولدر | {lruMetrics.purgedAudioBuffersCount} بافر صوتی)
                  </span>
                ) : (
                  <span className="text-emerald-400/60">(همه در محدوده امن ۲ گام)</span>
                )}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              <span className="inline-flex items-center gap-1 text-purple-300/90 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-400/25 font-mono text-[11px]">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>برچسب تایم‌لاین: {activeSequenceLabel || `node_${currentNode.id}`}</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              <span className="inline-flex items-center gap-1 text-cyan-300/90 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/25 font-mono text-[11px]">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>بافر GPU تکسچرها: {scrollDirection === 'forward' ? 'پیش‌بارگذاری جلو' : 'پیش‌بارگذاری عقب'}</span>
              </span>
              {isSpeedGovernorActive && (
                <>
                  <span className="w-1 h-1 rounded-full bg-neutral-600" />
                  <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-mono text-[11px] animate-pulse">
                    <Gauge className="w-3 h-3 text-amber-400" />
                    <span>سقف سرعت سینمایی: مهار شتاب شدید سوایپ</span>
                  </span>
                </>
              )}
              {adjacentNeighbors.nextNode && (
                <>
                  <span className="w-1 h-1 rounded-full bg-neutral-600" />
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-mono text-[11px] ${
                    isNextSceneCached 
                      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-amber-300 bg-amber-500/10 border-amber-500/30 animate-pulse'
                  }`}>
                    {isNextSceneCached ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>ویدیوی HD بعدی در کش آماده است</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                        <span>در حال بافر کیفیت بالای سکانس بعد</span>
                      </>
                    )}
                  </span>
                </>
              )}
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
            مینی‌اورلی لودینگ سکانس بعدی (Mini Loading Overlay for Next Scene)
            تنها در صورتی که منبع ویدیویی باکیفیت (High-Res) سکانس بعدی هنوز در حافظه کش آماده نشده باشد ظاهر می‌شود.
            تضمین تجربه روان و بدون لکنت حتی در اتصالات کند اینترنت.
            ========================================================================= */}
        {!isNextSceneCached && adjacentNeighbors.nextNode && (
          <div
            id="next-scene-mini-loading-overlay"
            className="absolute top-6 left-6 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-amber-400/40 shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-right animate-in fade-in slide-in-from-top-2 duration-300 max-w-[calc(100vw-3rem)] pointer-events-auto"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                <span>بافر سکانس بعدی: {adjacentNeighbors.nextNode.title}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-amber-400/20 text-amber-300 rounded font-mono border border-amber-400/30">
                  <Wifi className="w-2.5 h-2.5" />
                  <span>HD Stream</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                در حال پیش‌بارگذاری بافر کیفیت بالا برای اتصال کند جهت انتقال بدون مکث و پرش...
              </p>
            </div>
          </div>
        )}

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

              <p className="text-xs text-neutral-400 mb-4">
                «{activeTransitionEdge.label}»
              </p>

              {!isNextSceneCached && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[11px] mb-4 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                  <span>در حال پیش‌بارگذاری بافر باکیفیت سکانس مقصد برای اتصال‌های کند...</span>
                </div>
              )}

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

              {/* نشانگر هماهنگی سرعت بصری سینمایی، تایم‌لاین غیرخطی GSAP و بافر GPU */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400 bg-white/5 rounded-xl px-3.5 py-2 border border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>سرعت سینمایی: power3.out</span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-neutral-600" />
                  <span className="flex items-center gap-1.5 text-purple-300/90 font-mono text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-400/25">
                    <span>برچسب توالی: {activeSequenceLabel || `node_${targetNodeTitle}`}</span>
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-cyan-300/90 font-mono">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>بافر GPU: {scrollDirection === 'forward' ? 'پیش‌بارگذاری جلو' : 'پیش‌بارگذاری عقب'}</span>
                </span>
              </div>

              {/* نشانگر فعال بودن سقف شتاب در سوایپ‌های محکم */}
              {isSpeedGovernorActive && (
                <div className="flex items-center justify-center gap-2 text-amber-300 bg-amber-500/15 border border-amber-400/30 px-3.5 py-1.5 rounded-xl font-mono text-xs mb-3 animate-pulse">
                  <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>سقف سرعت فعال: شتاب ضربه شدید سوایپ مهار شد تا ترنزیشن با وقار سینمایی طی شود</span>
                </div>
              )}

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
