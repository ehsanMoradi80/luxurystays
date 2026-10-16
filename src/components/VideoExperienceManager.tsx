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
  onOpenBooking?: () => void;
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
  goToNext?: () => boolean;
  goToPrev?: () => boolean;
  jumpToNode?: (targetNodeId: string) => void;
}

export type VideoExperienceManagerRef = VideoManagerHandle;

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

    // رصد وضعیت بافرینگ شبکه و ترنزیشن ویدیویی جهت فعال‌سازی اسکلتون و اسپینر اشرافی
    const [isTransitionVideoBuffering, setIsTransitionVideoBuffering] = useState<boolean>(false);
    const [isAmbientVideoBuffering, setIsAmbientVideoBuffering] = useState<boolean>(false);

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

    // ردیابی تعاملی پوینتر ماوس برای پارالاکس و افکت‌های اتمسفریک بلادرنگ
    const [pointerOffset, setPointerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
      const handlePointer = (e: MouseEvent) => {
        const nx = (e.clientX / (window.innerWidth || 1) - 0.5) * 2;
        const ny = (e.clientY / (window.innerHeight || 1) - 0.5) * 2;
        setPointerOffset({ x: nx, y: ny });
        setMousePos({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener('mousemove', handlePointer, { passive: true });
      return () => window.removeEventListener('mousemove', handlePointer);
    }, []);

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
    const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ارجاع مستقیم به المان‌های ویدیویی برای آزادسازی قطعی بافرها در هنگام unmount
    const ambientVideoRef = useRef<HTMLVideoElement | null>(null);
    const transitionVideoRef = useRef<HTMLVideoElement | null>(null);

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

    // Manager of resource lifecycle based on LRU (Least Recently Used) policy:
        useEffect(() => {
          if (!currentNode) return;

          const now = Date.now();
          // 1. Update access timestamp for active node in LRU registry
          lruCacheRef.current.touch(currentNode.id, now);

          // a) Play ambiance of active sequence and activate room-specific audio layer
          audioAmbiance.playAmbiance(currentNode.audioProfile.tone, currentNode.audioProfile.volume);
          audioAmbiance.setRoomAmbientLayer(currentNode.audioProfile.tone, currentNode.audioProfile.volume);

          // Smart initial preload based on current node
          preloadManager.predictivePreloadByVelocity(graph, currentNode.id, 0.4, 'forward');

          // b) Warm up and preload audio frequencies and resources of adjacent nodes (prev and next)
          if (adjacentNeighbors.prevNode) {
            lruCacheRef.current.touch(adjacentNeighbors.prevNode.id, now - 100);
            audioAmbiance.warmUpAudioProfile(adjacentNeighbors.prevNode.audioProfile.tone);
          }
          if (adjacentNeighbors.nextNode) {
            lruCacheRef.current.touch(adjacentNeighbors.nextNode.id, now - 100);
            audioAmbiance.warmUpAudioProfile(adjacentNeighbors.nextNode.audioProfile.tone);
          }

          // c) Preload video/media buffers of adjacent nodes in preload engine
          preloadManager.preloadNodeNeighborhood(graph, currentNode.id);

          // d) LRU cache policy implementation and execution:
          // Nodes allowed and protected within active index window (distance <= 2 steps)
          const maxProtectedDistance = 2;
          const protectedNodes = graph.nodes.filter((_, idx) => Math.abs(idx - currentIndex) <= maxProtectedDistance);
          const protectedTones = new Set(protectedNodes.map((n) => n.audioProfile.tone));

          // Aggregate all protected placeholder image URLs (loop posters and transitions)
          const protectedPlaceholderUrls = new Set<string>();
          // Also track protected audio URLs
          const protectedAudioUrls = new Set<string>();
          protectedNodes.forEach((node) => {
            if (node.ambientLoop.posterUrl) {
              protectedPlaceholderUrls.add(node.ambientLoop.posterUrl);
            }
            // Protect scene audio if available
            if ((node.ambientLoop as any).audioUrl) {
              protectedAudioUrls.add((node.ambientLoop as any).audioUrl);
            }
            node.transitions.forEach((t) => {
              if (t.video.posterUrl) {
                protectedPlaceholderUrls.add(t.video.posterUrl);
              }
              if (t.reverseVideo?.posterUrl) {
                protectedPlaceholderUrls.add(t.reverseVideo.posterUrl);
              }
              // Protect transition audio if available
              if (t.audioUrl) {
                protectedAudioUrls.add(t.audioUrl);
              }
              if (t.reverseAudioUrl) {
                protectedAudioUrls.add(t.reverseAudioUrl);
              }
            });
          });

          // Identify distant nodes with distance > 2 from active index
          const distantCandidates = graph.nodes
            .map((node, index) => ({
              node,
              index,
              distance: Math.abs(index - currentIndex),
              lastAccess: lruCacheRef.current.getLastAccess(node.id),
            }))
            .filter((item) => item.distance > maxProtectedDistance);

          // Sort candidates by LRU policy: least recently used first (oldest access first)
          const candidateIds = distantCandidates.map((c) => c.node.id);
          const orderedEvictionNodeIds = lruCacheRef.current.getLRUOrder(candidateIds);

          // 1. Explicit eviction of scene placeholders for nodes beyond 2 steps distance:
          let purgedPlaceholdersCount = 0;
          orderedEvictionNodeIds.forEach((nodeId) => {
            const distantNode = graph.nodes.find((n) => n.id === nodeId);
            if (!distantNode) return;

            // Main scene loop placeholder
            if (distantNode.ambientLoop.posterUrl && !protectedPlaceholderUrls.has(distantNode.ambientLoop.posterUrl)) {
              preloadManager.unloadPlaceholderTexture(distantNode.ambientLoop.posterUrl);
              purgedPlaceholdersCount++;
            }

            // Scene audio eviction if not protected
            if ((distantNode.ambientLoop as any).audioUrl && !protectedAudioUrls.has((distantNode.ambientLoop as any).audioUrl)) {
              preloadManager.unloadAudio((distantNode.ambientLoop as any).audioUrl);
            }

            // Forward and backward transition placeholders
            distantNode.transitions.forEach((t) => {
              if (t.video.posterUrl && !protectedPlaceholderUrls.has(t.video.posterUrl)) {
                preloadManager.unloadPlaceholderTexture(t.video.posterUrl);
                purgedPlaceholdersCount++;
              }
              if (t.reverseVideo?.posterUrl && !protectedPlaceholderUrls.has(t.reverseVideo.posterUrl)) {
                preloadManager.unloadPlaceholderTexture(t.reverseVideo.posterUrl);
                purgedPlaceholdersCount++;
              }
              // Transition audio eviction if not protected
              if (t.audioUrl && !protectedAudioUrls.has(t.audioUrl)) {
                preloadManager.unloadAudio(t.audioUrl);
              }
              if (t.reverseAudioUrl && !protectedAudioUrls.has(t.reverseAudioUrl)) {
                preloadManager.unloadAudio(t.reverseAudioUrl);
              }
            });
          });

          // 2. Explicit eviction of audio buffers for nodes beyond 2 steps distance:
          // Identify audio profiles of distant nodes not used in protected nodes
          const evictedTones = Array.from(
            new Set(
              distantCandidates
                .map((c) => c.node.audioProfile.tone)
                .filter((tone) => !protectedTones.has(tone))
            )
          );

          // Explicit eviction and release of Web Audio buffers from memory
          const audioPurgeResult = audioAmbiance.purgeAudioBuffersForTones(evictedTones);
          audioAmbiance.pruneNonAdjacentAudio(Array.from(protectedTones));

          // 3. Targeted eviction of high-res placeholder textures and video buffers by preload engine
          preloadManager.pruneLRUResources(graph, currentIndex, orderedEvictionNodeIds, maxProtectedDistance);

          // 4. Preload and cache placeholder textures directly in GPU buffer based on current scroll direction
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
    // بازرسی عمیق چرخه حیات (Deep Lifecycle Audit): آزادسازی قطعی منابع هنگام Unmount
    // حذف کلیه لیسنرها، توقف تایمرها و انیمیشن‌های GSAP و آزادسازی حافظه ویدیوها
    // =========================================================================
    useEffect(() => {
      return () => {
        // ۱. ابطال کلیه تایمرهای فعال
        if (arrivalTimerRef.current) {
          clearTimeout(arrivalTimerRef.current);
          arrivalTimerRef.current = null;
        }
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

        // ۲. متوقف‌سازی و تخریب توئین‌ها و تایم‌لاین‌های GSAP
        if (scrubTweenRef.current) {
          scrubTweenRef.current.kill();
          scrubTweenRef.current = null;
        }
        if (autoPlayTweenRef.current) {
          autoPlayTweenRef.current.kill();
          autoPlayTweenRef.current = null;
        }
        if (scrubTimelineRef.current) {
          scrubTimelineRef.current.kill();
          scrubTimelineRef.current = null;
        }
        if (sequenceTimelineRef.current) {
          sequenceTimelineRef.current.kill();
          sequenceTimelineRef.current = null;
        }

        // ۳. توقف پخش و آزادسازی حافظه بافرهای المان‌های ویدیویی فعال
        if (ambientVideoRef.current) {
          try {
            ambientVideoRef.current.pause();
            ambientVideoRef.current.removeAttribute('src');
            ambientVideoRef.current.load();
          } catch {}
          ambientVideoRef.current = null;
        }
        if (transitionVideoRef.current) {
          try {
            transitionVideoRef.current.pause();
            transitionVideoRef.current.removeAttribute('src');
            transitionVideoRef.current.load();
          } catch {}
          transitionVideoRef.current = null;
        }

        // ۴. صفر کردن رفرنس‌های حالت ترنزیشن
        isTransitioningRef.current = false;
        currentEdgeRef.current = null;
        targetNodeIdRef.current = null;
      };
    }, []);

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

        setIsTransitionVideoBuffering(true);
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

        if (arrivalTimerRef.current) {
          clearTimeout(arrivalTimerRef.current);
        }
        arrivalTimerRef.current = setTimeout(() => {
          arrivalTimerRef.current = null;
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
          setIsTransitionVideoBuffering(false);
          setStatus('IDLE_LOOP');
          onStatusChange?.('IDLE_LOOP', 0);

          // تثبیت لایه صوتی اختصاصی سکانس مقصد
          const arrivedNode = graph.nodes.find((n) => n.id === targetNodeId);
          if (arrivedNode) {
            audioAmbiance.setRoomAmbientLayer(arrivedNode.audioProfile.tone, arrivedNode.audioProfile.volume);
          }

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
      if (arrivalTimerRef.current) {
        clearTimeout(arrivalTimerRef.current);
        arrivalTimerRef.current = null;
      }
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
      setIsTransitionVideoBuffering(false);
      setStatus('IDLE_LOOP');
      onStatusChange?.('IDLE_LOOP', 0);

      // بازگشت لایه صوتی اختصاصی سکانس مبدأ
      const originNode = graph.nodes.find((n) => n.id === originNodeIdRef.current);
      if (originNode) {
        audioAmbiance.setRoomAmbientLayer(originNode.audioProfile.tone, originNode.audioProfile.volume);
      }

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

        // پیش‌بارگذاری هوشمند و بلادرنگ سکانس بعدی بر اساس شتاب و بردار اسکرول (Predictive Video Preloader)
        preloadManager.predictivePreloadByVelocity(
          graph,
          currentNodeRef.current.id,
          delta * 0.05,
          detectedDirection
        );

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

        // تنظیم بافر پری‌لودر هوشمند بر اساس شتاب متحرک کاربر
        preloadManager.predictivePreloadByVelocity(
          graph,
          currentNodeRef.current.id,
          scrubVelocityRef.current,
          scrubVelocityRef.current >= 0 ? 'forward' : 'backward'
        );

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

            // مدولاسیون پویای سانداسکیپ: شیفت فرکانس و فید تدریجی لایه‌های صوتی با پیشروی ترنزیشن
            const fromTone = currentNodeRef.current?.audioProfile?.tone || 'welcoming_strings';
            const toNode = graph.nodes.find((n) => n.id === targetNodeIdRef.current);
            const toTone = toNode?.audioProfile?.tone || 'marble_hall_reverb';
            audioAmbiance.modulateTransitionSoundscape(
              interpolatedProgress,
              fromTone,
              toTone,
              scrubVelocityRef.current
            );

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

                // مدولاسیون پویای سانداسکیپ در فاز تکانه و فرود
                const fromTone = currentNodeRef.current?.audioProfile?.tone || 'welcoming_strings';
                const toNode = graph.nodes.find((n) => n.id === targetNodeIdRef.current);
                const toTone = toNode?.audioProfile?.tone || 'marble_hall_reverb';
                audioAmbiance.modulateTransitionSoundscape(
                  prog,
                  fromTone,
                  toTone,
                  residualVelocity
                );

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
        if (targetId === currentNodeRef.current.id) return;
        const currentIdx = graph.nodes.findIndex((n) => n.id === currentNodeRef.current.id);
        const targetIdx = graph.nodes.findIndex((n) => n.id === targetId);
        const isRev = targetIdx !== -1 && currentIdx !== -1 && targetIdx < currentIdx;

        let edge = currentNodeRef.current.transitions.find((t) => t.targetNodeId === targetId);
        if (!edge) {
          const tgt = graph.nodes.find((n) => n.id === targetId);
          if (!tgt) return;
          edge = {
            targetNodeId: tgt.id,
            label: `انتقال به ${tgt.title}`,
            triggerType: 'click',
            direction: isRev ? 'backward' : 'forward',
            video: tgt.ambientLoop,
          };
        }

        preloadManager.predictivePreloadByVelocity(graph, currentNodeRef.current.id, isRev ? -0.8 : 0.8, isRev ? 'backward' : 'forward');

        initTransition(edge, 0, isRev, () => {
          if (autoPlayTweenRef.current) {
            autoPlayTweenRef.current.kill();
          }
          const animProxy = { progress: 0 };
          autoPlayTweenRef.current = gsap.to(animProxy, {
            progress: 1,
            duration: 0.9,
            ease: "power3.out",
            onUpdate: () => {
              const p = animProxy.progress;
              progressRef.current = p;
              setTransitionProgress(p);

              // مدولاسیون پویای سانداسکیپ با حرکت خودکار ترنزیشن
              const fromTone = currentNodeRef.current?.audioProfile?.tone || 'welcoming_strings';
              const toNode = graph.nodes.find((n) => n.id === targetId);
              const toTone = toNode?.audioProfile?.tone || 'marble_hall_reverb';
              audioAmbiance.modulateTransitionSoundscape(p, fromTone, toTone, 0.4);

              if (scrubTimelineRef.current) {
                scrubTimelineRef.current.progress(p);
              }
              onStatusChange?.('TRANSITIONING', p, {
                sourceTitle: currentNodeRef.current.title,
                targetTitle: edge?.label || 'سکانس مقصد',
                isReverse: isRev,
              });
            },
            onComplete: () => {
              completeArrival(targetId);
            }
          });
        });
      },
      transitionBackward: () => {
        const res = getBackwardTransition();
        if (!res) return;

        preloadManager.predictivePreloadByVelocity(graph, currentNodeRef.current.id, -0.8, 'backward');

        initTransition(res.edge, 0, true, () => {
          if (autoPlayTweenRef.current) {
            autoPlayTweenRef.current.kill();
          }
          const animProxy = { progress: 0 };
          autoPlayTweenRef.current = gsap.to(animProxy, {
            progress: 1,
            duration: 0.9,
            ease: "power3.out",
            onUpdate: () => {
              const p = animProxy.progress;
              progressRef.current = p;
              setTransitionProgress(p);

              // مدولاسیون پویای سانداسکیپ با حرکت دنده عقب
              const fromTone = currentNodeRef.current?.audioProfile?.tone || 'welcoming_strings';
              const toNode = graph.nodes.find((n) => n.id === res.edge.targetNodeId);
              const toTone = toNode?.audioProfile?.tone || 'marble_hall_reverb';
              audioAmbiance.modulateTransitionSoundscape(p, fromTone, toTone, -0.4);

              if (scrubTimelineRef.current) {
                scrubTimelineRef.current.progress(p);
              }
              onStatusChange?.('TRANSITIONING', p, {
                sourceTitle: currentNodeRef.current.title,
                targetTitle: res.edge.label,
                isReverse: true,
              });
            },
            onComplete: () => {
              completeArrival(res.edge.targetNodeId);
            }
          });
        });
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
      goToNext: () => {
        const res = getForwardTransition();
        if (res) {
          (ref as any)?.current?.transitionTo(res.edge.targetNodeId);
          return true;
        }
        return false;
      },
      goToPrev: () => {
        const res = getBackwardTransition();
        if (res) {
          (ref as any)?.current?.transitionBackward();
          return true;
        }
        return false;
      },
      jumpToNode: (targetId: string) => {
        (ref as any)?.current?.transitionTo(targetId);
      },
    }));

    // محاسبه شماره ترنزیشن
    const transitionOrdinal = PERSIAN_ORDINALS[isReverseTransition ? currentIndex - 1 : currentIndex] || 'اول';

    // گره مقصد در حین ترنزیشن
    const targetNode = targetNodeIdRef.current
      ? graph.nodes.find((n) => n.id === targetNodeIdRef.current)
      : null;

    // محاسبه شفافیت لایه‌ها برای ترکیب پیوسته و روان بدون لودینگ
    const isTrans = status === 'TRANSITIONING';
    const targetBlendOpacity = isTrans
      ? isReverseTransition
        ? 1 - transitionProgress
        : transitionProgress
      : 0;
    const currentBlendOpacity = isTrans
      ? isReverseTransition
        ? transitionProgress
        : 1 - transitionProgress
      : 1;

    return (
      <div id="video-experience-sequencer" className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-950 z-0 select-none">
        {/* =========================================================================
            ۱. لایه سکانس مبدأ (Current Sequence Media Layer)
            پشتیبانی از ویدیو، عکس، و ترکیب دو لایه همزمان با پارالاکس پویا متناسب با پوینتر ماوس
            ========================================================================= */}
        <div 
          className="absolute inset-0 w-full h-full transition-opacity duration-300 ease-out pointer-events-none"
          style={{
            opacity: currentBlendOpacity,
            transform: `translate3d(${pointerOffset.x * 14}px, ${pointerOffset.y * 10}px, 0) scale(1.05)`,
            transition: 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.25s ease-out',
          }}
        >
          {/* ویدیو یا عکس اصلی سکانس جاری */}
          {currentNode.ambientLoop.landscapeUrl ? (
            <video
              ref={ambientVideoRef}
              key={`ambient-${currentNode.id}`}
              src={currentNode.ambientLoop.landscapeUrl}
              poster={currentNode.ambientLoop.posterUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : currentNode.ambientLoop.posterUrl ? (
            <img
              src={currentNode.ambientLoop.posterUrl}
              alt={currentNode.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}

          {/* لایه دوم پوششی (Overlay Texture / Dual Layer) با جابجایی معکوس جهت عمق سه‌بعدی */}
          {currentNode.ambientLoop.posterUrl && currentNode.ambientLoop.landscapeUrl && (
            <div
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url(${currentNode.ambientLoop.posterUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `translate3d(${pointerOffset.x * -18}px, ${pointerOffset.y * -14}px, 0) scale(1.08)`,
                transition: 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)',
              }}
            />
          )}
        </div>

        {/* =========================================================================
            ۲. لایه سکانس مقصد در حین ترنزیشن (Target Sequence Layer - Seamless Blend)
            رندر همزمان و ترکیب بلادرنگ با اسکرابینگ بدون هیچ صفحه سیاه یا پیام لودینگ
            ========================================================================= */}
        {isTrans && targetNode && (
          <div 
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ease-out z-10"
            style={{
              opacity: targetBlendOpacity,
              transform: `translate3d(${pointerOffset.x * 10}px, ${pointerOffset.y * 8}px, 0) scale(${1.03 + (1 - targetBlendOpacity) * 0.04})`,
              transition: 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.2s ease-out',
            }}
          >
            {targetNode.ambientLoop.landscapeUrl ? (
              <video
                key={`target-ambient-${targetNode.id}`}
                src={targetNode.ambientLoop.landscapeUrl}
                poster={targetNode.ambientLoop.posterUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : targetNode.ambientLoop.posterUrl ? (
              <img
                src={targetNode.ambientLoop.posterUrl}
                alt={targetNode.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}

            {/* لایه ویدیوی ترنزیشن اختصاصی (در صورت تعریف شدن) */}
            {activeTransitionEdge?.video?.landscapeUrl && (
              <video
                ref={transitionVideoRef}
                key={`trans-video-${activeTransitionEdge.targetNodeId}`}
                src={activeTransitionEdge.video.landscapeUrl}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70 pointer-events-none"
              />
            )}
          </div>
        )}

        {/* =========================================================================
            ۳. افکت تعاملی اتمسفر و هاله نوری دنبال‌کننده پوینتر ماوس (Interactive Atmospheric Glow)
            ========================================================================= */}
        <div 
          className="absolute inset-0 pointer-events-none z-15"
          style={{
            background: mousePos.x 
              ? `radial-gradient(850px circle at ${mousePos.x}px ${mousePos.y}px, rgba(251, 191, 36, 0.07), transparent 70%)` 
              : 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.04), transparent 60%)',
          }}
        />

        {/* سایه گرادیان تیره پایین برای کنتراست سینمایی متن */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-neutral-950/20 pointer-events-none z-15" />

        {/* =========================================================================
            ۴. نشانگر نوری حداقلی ترنزیشن در بالای صفحه (Ultra-Minimal Hairline Indicator)
            فقط یک خط باریک لوکس برای حس اسکرابینگ، بدون هرگونه متن یا لودر
            ========================================================================= */}
        {isTrans && (
          <div 
            id="transition-minimal-indicator"
            className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
          >
            <div 
              className="h-0.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.9)] transition-all duration-75"
              style={{
                width: `${
                  isReverseTransition
                    ? Math.max(0, Math.min(100, Math.round((1 - transitionProgress) * 100)))
                    : Math.max(0, Math.min(100, Math.round(transitionProgress * 100)))
                }%`
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

VideoExperienceManager.displayName = 'VideoExperienceManager';
