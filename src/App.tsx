import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HotelExperienceGraph, SequenceNode } from './types/sequenceGraph';
import hotelExperienceData from './data/hotelExperienceGraph.json';
import { NavigationTimeline } from './components/NavigationTimeline';
import { SpaceInfoOverlay } from './components/SpaceInfoOverlay';
import { VideoExperienceManager, VideoExperienceManagerRef } from './components/VideoExperienceManager';
import { LuxuryBookingPage } from './components/booking/LuxuryBookingPage';
import { HotelMapPage } from './components/map/HotelMapPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudioCanvas } from './studio/StudioCanvas';
import { immersiveGraphToHotelGraph } from './utils/graphAdapters';
import { audioAmbiance } from './services/AudioAmbienceEngine';

export function App() {
  const [currentGraph, setCurrentGraph] = useState<HotelExperienceGraph>(hotelExperienceData as unknown as HotelExperienceGraph);
  const [currentNodeId, setCurrentNodeId] = useState<string>(currentGraph.initialNodeId);
  const [activeView, setActiveView] = useState<'EXPERIENCE' | 'BOOKING' | 'MAP' | 'ADMIN' | 'STUDIO'>('EXPERIENCE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionTargetTitle, setTransitionTargetTitle] = useState<string>('');

  const videoExperienceRef = useRef<VideoExperienceManagerRef | null>(null);

  const currentIndex = currentGraph.nodes.findIndex((n: any) => n.id === currentNodeId);
  const currentNode: SequenceNode = (currentGraph.nodes[currentIndex] as SequenceNode) || (currentGraph.nodes[0] as SequenceNode);

  const handleNextScene = useCallback(() => {
    videoExperienceRef.current?.goToNext?.();
  }, []);

  const handlePrevScene = useCallback(() => {
    videoExperienceRef.current?.goToPrev?.();
  }, []);

  const handleJumpToScene = useCallback((nodeId: string) => {
    videoExperienceRef.current?.jumpToNode?.(nodeId);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = audioAmbiance.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Handle custom graph launch from Visual Builder
  const handleLaunchCustomGraph = useCallback((customGraph: any) => {
    if (customGraph?.nodes) {
      const adapted = immersiveGraphToHotelGraph(customGraph);
      setCurrentGraph(adapted);
      setCurrentNodeId(adapted.initialNodeId || adapted.nodes[0]?.id || currentNodeId);
    }
    setActiveView('EXPERIENCE');
  }, [currentNodeId]);

  // Audio start upon initial user interaction
  useEffect(() => {
    const startAudioOnGesture = () => {
      audioAmbiance.playAmbiance(currentNode?.audioProfile?.tone || 'welcoming_strings', 0.6);
      window.removeEventListener('click', startAudioOnGesture);
    };

    window.addEventListener('click', startAudioOnGesture, { once: true });

    return () => {
      window.removeEventListener('click', startAudioOnGesture);
    };
  }, [currentNode]);

  // Keyboard shortcut: Press 'B' to toggle Visual Builder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') {
        setActiveView((prev) => (prev === 'STUDIO' ? 'EXPERIENCE' : 'STUDIO'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // =========================================================================
  // 1. Standalone View: Node-based Visual Builder (Studio Canvas)
  // =========================================================================
  if (activeView === 'STUDIO') {
    return (
      <StudioCanvas
        onExitStudio={() => setActiveView('EXPERIENCE')}
        onLaunchJourney={handleLaunchCustomGraph}
      />
    );
  }

  // =========================================================================
  // 2. Standalone View: Hotel Map Atlas
  // =========================================================================
  if (activeView === 'MAP') {
    return (
      <HotelMapPage
        nodes={currentGraph.nodes}
        currentNodeId={currentNodeId}
        onSelectNode={handleJumpToScene}
        onBackToExperience={() => setActiveView('EXPERIENCE')}
      />
    );
  }

  // =========================================================================
  // 3. Standalone View: Admin Dashboard
  // =========================================================================
  if (activeView === 'ADMIN') {
    return (
      <AdminDashboard
        graph={currentGraph}
        onBackToExperience={() => setActiveView('EXPERIENCE')}
        onLaunchJourney={handleLaunchCustomGraph}
      />
    );
  }

  // =========================================================================
  // 4. Standalone View: Luxury Booking Wizard
  // =========================================================================
  if (activeView === 'BOOKING') {
    return (
      <div className="relative w-screen h-screen overflow-y-auto overflow-x-hidden bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-400 selection:text-neutral-950">
        <LuxuryBookingPage
          onBackToExperience={() => setActiveView('EXPERIENCE')}
          onPreviewExperience={(sceneId) => {
            setActiveView('EXPERIENCE');
            setTimeout(() => {
              handleJumpToScene(sceneId);
            }, 60);
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // 5. Main Experience View: Cinematic Sequencer with Ambient Video Tour
  // =========================================================================
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none font-sans">
      {/* Video Sequencer Engine */}
      <VideoExperienceManager
        ref={videoExperienceRef}
        graph={currentGraph as any}
        currentNodeId={currentNodeId}
        onNodeChange={setCurrentNodeId}
        onOpenBooking={() => setActiveView('BOOKING')}
        onStatusChange={(status) => {
          setIsTransitioning(status === 'TRANSITIONING');
        }}
        onTransitionStart={(edge) => {
          setIsTransitioning(true);
          setTransitionTargetTitle(edge.label || '');
        }}
        onTransitionEnd={() => {
          setIsTransitioning(false);
          setTransitionTargetTitle('');
        }}
        enableScrollScrubbing={true}
      />

      {/* Cinematic Space Information Overlay */}
      <SpaceInfoOverlay
        currentNode={currentNode}
        isTransitioning={isTransitioning}
        onOpenBooking={() => setActiveView('BOOKING')}
        currentIndex={currentIndex}
        totalScenes={currentGraph.nodes.length}
      />

      {/* Main Site Header & Timeline Navigation */}
      <NavigationTimeline
        nodes={currentGraph.nodes}
        currentNodeId={currentNodeId}
        onSelectNode={handleJumpToScene}
        onOpenBooking={() => setActiveView('BOOKING')}
        onOpenMap={() => setActiveView('MAP')}
        onOpenAdmin={() => setActiveView('ADMIN')}
        onOpenStudio={() => setActiveView('STUDIO')}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isTransitioning={isTransitioning}
        transitionTargetTitle={transitionTargetTitle}
      />
    </main>
  );
}

export default App;
