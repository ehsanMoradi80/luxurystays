/**
 * App.tsx
 * 
 * سایت اختصاصی هتل ۵ ستاره فوق لوکس قصر لورا
 * - صفحه اصلی کاملاً لوکس، اختصاصی مهمانان، بدون هیچ دکمه یا المان ادمین
 * - سکانس‌ها و ترنزیشن‌ها بر اساس ترتیب خطی و قطعی (اول و آخر مشخص - بدون لوپ)
 * - هدر اشرافی با نوار پروگرس زیر هدر و ناوبری اسکرولی پیوسته
 * - دسترسی به پنل ادمین React Flow منحصراً از طریق آدرس (?admin=true یا #admin)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { hotelExperienceGraphData, getNodeById } from './data/mockCmsData';
import { 
  SequencerStatus, 
  TransitionEdge 
} from './types/cms';
import { 
  VideoExperienceManager, 
  VideoManagerHandle 
} from './components/VideoExperienceManager';
import { SpaceInfoOverlay } from './components/SpaceInfoOverlay';
import { NavigationTimeline } from './components/NavigationTimeline';
import { LuxuryBookingPage } from './components/booking/LuxuryBookingPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { audioAmbiance } from './services/AudioAmbienceEngine';
import { useThemeAndSiteStore } from './store/useThemeAndSiteStore';

export default function App() {
  const graph = hotelExperienceGraphData;
  const { setPreSelectedRoomId } = useThemeAndSiteStore();

  // بررسی وضعیت ادمین بر اساس پارامتر URL یا هش (#admin یا ?admin=true)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.search.includes('admin') ||
        window.location.hash.toLowerCase().includes('admin')
      );
    }
    return false;
  });

  const [activeView, setActiveView] = useState<'EXPERIENCE' | 'BOOKING' | 'ADMIN'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('admin') || window.location.hash.includes('admin')) {
        return 'ADMIN';
      }
      if (window.location.search.includes('booking') || window.location.hash.includes('booking')) {
        return 'BOOKING';
      }
    }
    return 'EXPERIENCE';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hasAdmin = hash.includes('admin') || search.includes('admin');
      const hasBooking = hash.includes('booking') || search.includes('booking');
      
      setIsAdmin(hasAdmin);
      if (hasAdmin) {
        setActiveView('ADMIN');
      } else if (hasBooking) {
        setActiveView('BOOKING');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [currentNodeId, setCurrentNodeId] = useState<string>(graph.initialNodeId);
  const [status, setStatus] = useState<SequencerStatus>('IDLE_LOOP');

  // وضعیت و متادیتای ترنزیشن برای نوار پیشرفت زیر هدر
  const [transitionProgress, setTransitionProgress] = useState<number>(0);
  const [transitionSourceTitle, setTransitionSourceTitle] = useState<string>('');
  const [transitionTargetTitle, setTransitionTargetTitle] = useState<string>('');
  const [isReverseTransition, setIsReverseTransition] = useState<boolean>(false);

  // وضعیت صدا (به‌صورت پیش‌فرض قطع تا کاربر فعال کند)
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  const videoManagerRef = useRef<VideoManagerHandle | null>(null);

  const currentNode = getNodeById(graph, currentNodeId) || graph.nodes[0];
  const isTransitioning = status === 'TRANSITIONING' || status === 'PREPARING_TRANSITION';

  const currentIndex = graph.nodes.findIndex((n) => n.id === currentNode.id);
  const totalScenes = graph.nodes.length;

  // سوئیچ پخش صدا
  const handleToggleAudio = useCallback(() => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    audioAmbiance.setMuted(nextMuted);
    if (!nextMuted) {
      audioAmbiance.playAmbiance(currentNode.audioProfile.tone, currentNode.audioProfile.volume);
    }
  }, [isAudioMuted, currentNode]);

  const handleStatusChange = useCallback(
    (
      newStatus: SequencerStatus,
      progress: number,
      extra?: { sourceTitle: string; targetTitle: string; isReverse: boolean }
    ) => {
      setStatus(newStatus);
      setTransitionProgress(progress);
      if (extra) {
        setTransitionSourceTitle(extra.sourceTitle);
        setTransitionTargetTitle(extra.targetTitle);
        setIsReverseTransition(extra.isReverse);
      }
    },
    []
  );

  const handleTransitionStart = useCallback((_edge: TransitionEdge) => {}, []);
  const handleTransitionEnd = useCallback((_targetId: string) => {}, []);

  const handleOpenBooking = () => {
    // تطبیق سکانس جاری با اتاق مناسب در صورت امکان
    if (currentNode.id.includes('suite') || currentNode.id.includes('atrium')) {
      setPreSelectedRoomId('suite-penthouse');
    }
    setActiveView('BOOKING');
  };

  // ۱. حالت ادمین: پنل مدیریت جامع هتل (سیستم تم، شخصی‌سازی سایت‌ها، ماتریس دسترسی و گراف)
  if (activeView === 'ADMIN') {
    return (
      <AdminDashboard onReturnToExperience={() => setActiveView('EXPERIENCE')} />
    );
  }

  // ۲. حالت اصلی (شامل گشت سینمایی و ویزارد رزرو داک‌شده مستقیماً زیر هدر اصلی سایت)
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none font-sans">
      {/* =========================================================================
          لایه Z-0: توالی‌سنج سینمایی سکانس‌ها و ترنزیشن‌ها (با کش LRU و اسکرول نرم)
          ========================================================================= */}
      <VideoExperienceManager
        ref={videoManagerRef}
        graph={graph}
        currentNodeId={currentNodeId}
        onNodeChange={setCurrentNodeId}
        onStatusChange={handleStatusChange}
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
        enableScrollScrubbing={activeView !== 'BOOKING'}
      />

      {/* =========================================================================
          لایه Z-20: اطلاعات فضا، عنوان و دکمه باز کردن صفحه رزرواسیون (تنها در حالت گشت)
          ========================================================================= */}
      {activeView !== 'BOOKING' && (
        <SpaceInfoOverlay
          currentNode={currentNode}
          isTransitioning={isTransitioning}
          onOpenBooking={handleOpenBooking}
          currentIndex={currentIndex !== -1 ? currentIndex : 0}
          totalScenes={totalScenes}
        />
      )}

      {/* =========================================================================
          لایه Z-40: هدر لوکس هتل (Main Site Header)
          ========================================================================= */}
      <NavigationTimeline
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        isAdmin={isAdmin}
        onOpenAdmin={() => setActiveView('ADMIN')}
        currentIndex={currentIndex !== -1 ? currentIndex : 0}
        totalScenes={totalScenes}
        currentNode={currentNode}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
        transitionSourceTitle={transitionSourceTitle}
        transitionTargetTitle={transitionTargetTitle}
        isReverseTransition={isReverseTransition}
        isBookingOpen={activeView === 'BOOKING'}
      />

      {/* =========================================================================
          لایه Z-30: ویزارد رزرواسیون کاملاً شفاف و داک‌شده مستقیماً زیر هدر اصلی سایت
          ========================================================================= */}
      {activeView === 'BOOKING' && (
        <div className="absolute inset-x-0 top-[68px] sm:top-[80px] md:top-[88px] bottom-0 z-30 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-amber-400/30">
          <LuxuryBookingPage
            onBackToExperience={() => setActiveView('EXPERIENCE')}
          />
        </div>
      )}
    </main>
  );
}
