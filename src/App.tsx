/**
 * App.tsx
 * 
 * سایت اختصاصی هتل ۵ ستاره قصر لورا
 * - سکانس‌ها و ترنزیشن‌ها بر اساس ترتیب خطی و قطعی (اول و آخر مشخص - بدون لوپ)
 * - ویدیوهای خام موقتاً برداشته شده و با پلیس‌هولدرهای متنی متمرکز («سکانس اول»، «ترنزیشن اول») جایگزین شدند
 * - نوار پروگرس زیر هدر قرار گرفت
 * - دکمه‌های بعد و قبل از سکانس‌ها برداشته شدند تا ناوبری کاملاً مبتنی بر اسکرول فیزیکی باشد
 */

import React, { useState, useRef, useCallback } from 'react';
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
import { ConciergeBookingModal } from './components/ConciergeBookingModal';
import { FlowCanvas } from './components/FlowCanvas';
import { audioAmbiance } from './services/AudioAmbienceEngine';

export default function App() {
  const graph = hotelExperienceGraphData;
  const [activeView, setActiveView] = useState<'EXPERIENCE' | 'FLOW_BUILDER'>('EXPERIENCE');
  const [currentNodeId, setCurrentNodeId] = useState<string>(graph.initialNodeId);
  const [status, setStatus] = useState<SequencerStatus>('IDLE_LOOP');

  // وضعیت و متادیتای ترنزیشن برای نوار پیشرفت زیر هدر
  const [transitionProgress, setTransitionProgress] = useState<number>(0);
  const [transitionSourceTitle, setTransitionSourceTitle] = useState<string>('');
  const [transitionTargetTitle, setTransitionTargetTitle] = useState<string>('');
  const [isReverseTransition, setIsReverseTransition] = useState<boolean>(false);

  // دسترسی ادمین
  const [isAdmin] = useState<boolean>(false);

  // وضعیت صدا
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // مودال رزرو
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);

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

  // نمایش پنل مدیریت گراف در صورت ادمین بودن
  if (activeView === 'FLOW_BUILDER' && isAdmin) {
    return (
      <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
        <FlowCanvas onSwitchToExperience={() => setActiveView('EXPERIENCE')} />
      </main>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none font-sans">
      {/* =========================================================================
          لایه Z-0: توالی‌سنج سکانس‌ها و ترنزیشن‌ها (با پلیس‌هولدرهای متنی متمرکز)
          ========================================================================= */}
      <VideoExperienceManager
        ref={videoManagerRef}
        graph={graph}
        currentNodeId={currentNodeId}
        onNodeChange={setCurrentNodeId}
        onStatusChange={handleStatusChange}
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
        enableScrollScrubbing={true}
      />

      {/* =========================================================================
          لایه Z-30: عنوان فضا و رزرو اقامت (بدون دکمه‌های بعد و قبل)
          ========================================================================= */}
      <SpaceInfoOverlay
        currentNode={currentNode}
        isTransitioning={isTransitioning}
        onOpenBooking={() => setIsBookingOpen(true)}
        currentIndex={currentIndex !== -1 ? currentIndex : 0}
        totalScenes={totalScenes}
      />

      {/* =========================================================================
          لایه Z-40: هدر + نوار پروگرس موقت در زیر هدر
          ========================================================================= */}
      <NavigationTimeline
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        isAdmin={isAdmin}
        onOpenFlowCanvas={() => setActiveView('FLOW_BUILDER')}
        currentIndex={currentIndex !== -1 ? currentIndex : 0}
        totalScenes={totalScenes}
        currentNode={currentNode}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
        transitionSourceTitle={transitionSourceTitle}
        transitionTargetTitle={transitionTargetTitle}
        isReverseTransition={isReverseTransition}
      />

      {/* مودال رزرو */}
      <ConciergeBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        spaceTitle={currentNode.title}
      />
    </main>
  );
}
