import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HotelExperienceGraph, SequenceNode } from './types/sequenceGraph';
import hotelExperienceData from './data/hotelExperienceGraph.json';
import { NavigationTimeline } from './components/NavigationTimeline';
import { SpaceInfoOverlay } from './components/SpaceInfoOverlay';
import { VideoExperienceManager, VideoExperienceManagerRef } from './components/VideoExperienceManager';
import { LuxuryBookingPage } from './components/booking/LuxuryBookingPage';
import { HotelMapPage } from './components/map/HotelMapPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { audioAmbiance } from './services/AudioAmbienceEngine';

export function App() {
  const graph = hotelExperienceData as HotelExperienceGraph;
  const [currentNodeId, setCurrentNodeId] = useState<string>(graph.initialNodeId);
  const [activeView, setActiveView] = useState<'EXPERIENCE' | 'BOOKING' | 'MAP' | 'ADMIN'>('EXPERIENCE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionTargetTitle, setTransitionTargetTitle] = useState<string>('');

  const videoExperienceRef = useRef<VideoExperienceManagerRef | null>(null);

  const currentIndex = graph.nodes.findIndex((n) => n.id === currentNodeId);
  const currentNode: SequenceNode = graph.nodes[currentIndex] || graph.nodes[0];

  const handleNextScene = useCallback(() => {
    videoExperienceRef.current?.goToNext();
  }, []);

  const handlePrevScene = useCallback(() => {
    videoExperienceRef.current?.goToPrev();
  }, []);

  const handleJumpToScene = useCallback((nodeId: string) => {
    videoExperienceRef.current?.jumpToNode(nodeId);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = audioAmbiance.toggleMute();
    setIsMuted(nextMuted);
  }, []);

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

  // =========================================================================
  // 1. Standalone View: Hotel Map Atlas
  // =========================================================================
  if (activeView === 'MAP') {
    return (
      <HotelMapPage
        nodes={graph.nodes}
        currentNodeId={currentNodeId}
        onSelectNode={handleJumpToScene}
        onBackToExperience={() => setActiveView('EXPERIENCE')}
      />
    );
  }

  // =========================================================================
  // 2. Standalone View: Admin Dashboard
  // =========================================================================
  if (activeView === 'ADMIN') {
    return (
      <AdminDashboard
        graph={graph}
        onBackToExperience={() => setActiveView('EXPERIENCE')}
      />
    );
  }

  // =========================================================================
  // 3. Standalone View: Luxury Booking Wizard
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
  // 4. Main Experience View: Cinematic Sequencer with Ambient Video Tour
  // =========================================================================
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none font-sans">
      {/* Video Sequencer Engine */}
      <VideoExperienceManager
        ref={videoExperienceRef}
        graph={graph}
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

      {/* Cinematic Space Information & Controls */}
      <SpaceInfoOverlay
        currentNode={currentNode}
        isTransitioning={isTransitioning}
        onOpenBooking={() => setActiveView('BOOKING')}
        currentIndex={currentIndex !== -1 ? currentIndex : 0}
        totalScenes={graph.nodes.length}
        onSelectScene={handleJumpToScene}
        onNextScene={handleNextScene}
        onPrevScene={handlePrevScene}
      />

      {/* Main Site Header & Timeline Navigation */}
      <NavigationTimeline
        nodes={graph.nodes}
        currentNodeId={currentNodeId}
        onSelectNode={handleJumpToScene}
        onOpenBooking={() => setActiveView('BOOKING')}
        onOpenMap={() => setActiveView('MAP')}
        onOpenAdmin={() => setActiveView('ADMIN')}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isTransitioning={isTransitioning}
        transitionTargetTitle={transitionTargetTitle}
      />
    </main>
  );
}

export default App;
