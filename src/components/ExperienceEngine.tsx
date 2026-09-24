/**
 * ExperienceEngine.tsx
 * 
 * موتور اجرای تجربه تعاملی فرانت‌اند (Frontend Interactive Experience Engine)
 * استفاده از الگوی switch/case برای هدایت و رندر داینامیک کامپوننت‌های مناسب
 * بر اساس نوع گره دریافتی از گراف CMS (SequenceGraph):
 * 
 * - environmentNode -> رندر سکانس ویدیویی پیوسته (VideoExperienceManager)
 * - spatialNode     -> رندر کاوشگر سه‌بعدی ۳۶۰ درجه (SpatialExplorerPlaceholder)
 * - atmosphereNode  -> رندر کنترلر اتمسفر و نورپردازی (AtmosphereController)
 * - storyTimelineNode -> رندر تایم‌لاین روایت تاریخی (StoryTimelinePlaceholder)
 * - comparisonNode  -> رندر مقایسه داینامیک اقامتگاه‌ها (ComparisonPlaceholder)
 * - audioNode       -> مدیریت و اجرای موازی صوت فضایی در پس‌زمینه
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  SequenceGraph, 
  ExperienceNodeData, 
  EnvironmentNodeData,
  SpatialNodeData,
  AtmosphereNodeData,
  StoryTimelineNodeData,
  ComparisonNodeData,
  AudioNodeData 
} from '../types/sequenceGraph';
import { hotelExperienceGraphData } from '../data/mockCmsData';
import sampleGraphData from '../data/sampleSequenceGraph.json';
import { audioAmbiance } from '../services/AudioAmbienceEngine';

// کامپوننت‌های رندر انواع بلوک‌های تجربه
import { VideoExperienceManager } from './VideoExperienceManager';
import { AtmosphereController } from './experience/AtmosphereController';
import { SpatialExplorerPlaceholder } from './experience/SpatialExplorerPlaceholder';
import { StoryTimelinePlaceholder } from './experience/StoryTimelinePlaceholder';
import { ComparisonPlaceholder } from './experience/ComparisonPlaceholder';

import { 
  Sparkles, 
  Compass, 
  Layers, 
  BookOpen, 
  Columns, 
  Music, 
  Volume2, 
  VolumeX, 
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface ExperienceEngineProps {
  graph?: SequenceGraph;
  initialNodeId?: string;
  onOpenFlowCanvas?: () => void;
  isAdmin?: boolean;
}

export const ExperienceEngine: React.FC<ExperienceEngineProps> = ({
  graph = sampleGraphData as unknown as SequenceGraph,
  initialNodeId,
  onOpenFlowCanvas,
  isAdmin = true,
}) => {
  // شناسه گره فعال فعلی در موتور تجربه
  const [activeNodeId, setActiveNodeId] = useState<string>(
    initialNodeId || graph.initialNodeId || graph.nodes[0]?.id || 'env-gate'
  );

  // وضعیت صدا
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // دریافت شیء گره فعال از روی شناسه
  const activeNode = useMemo<ExperienceNodeData>(() => {
    return graph.nodes.find((n) => n.id === activeNodeId) || graph.nodes[0];
  }, [graph.nodes, activeNodeId]);

  // پیدا کردن نود صوتی موازی (Parallel Audio) که به گره فعلی متصل است
  const parallelAudioNode = useMemo<AudioNodeData | undefined>(() => {
    // بررسی یال‌های موازی
    const parallelEdge = graph.edges?.find(
      (e) => e.edgeType === 'parallel_audio' && e.targetNodeId === activeNodeId
    );
    if (parallelEdge) {
      return graph.nodes.find(
        (n) => n.id === parallelEdge.sourceNodeId && n.type === 'audioNode'
      ) as AudioNodeData | undefined;
    }

    // یا جستجو مستقیم در صفت parallelTargetSequenceId
    return graph.nodes.find(
      (n) => n.type === 'audioNode' && (n as AudioNodeData).parallelTargetSequenceId === activeNodeId
    ) as AudioNodeData | undefined;
  }, [graph.nodes, graph.edges, activeNodeId]);

  // کنترل همگام پخش صوت در صورت تغییر نود فعال یا تغییر گره صوتی موازی
  useEffect(() => {
    if (isAudioMuted) return;

    if (parallelAudioNode) {
      // اجرای منظره صوتی موازی
      audioAmbiance.playAmbiance(parallelAudioNode.ambientTone as any, parallelAudioNode.volume);
    } else if (activeNode.type === 'environmentNode' && (activeNode as EnvironmentNodeData).audioProfile) {
      const profile = (activeNode as EnvironmentNodeData).audioProfile!;
      audioAmbiance.playAmbiance(profile.ambienceTone as any, profile.volume);
    }
  }, [activeNode, parallelAudioNode, isAudioMuted]);

  // سوئیچ قطع و وصل سراسری صدا
  const handleToggleAudio = useCallback(() => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    audioAmbiance.setMuted(nextMuted);
    if (!nextMuted) {
      if (parallelAudioNode) {
        audioAmbiance.playAmbiance(parallelAudioNode.ambientTone as any, parallelAudioNode.volume);
      } else if (activeNode.type === 'environmentNode' && (activeNode as EnvironmentNodeData).audioProfile) {
        const profile = (activeNode as EnvironmentNodeData).audioProfile!;
        audioAmbiance.playAmbiance(profile.ambienceTone as any, profile.volume);
      }
    }
  }, [isAudioMuted, parallelAudioNode, activeNode]);

  // بازگشت به گره اصلی (معمولاً لابی یا گیت)
  const handleReturnToMainSequence = useCallback(() => {
    setActiveNodeId('env-lobby');
  }, []);

  // هدایت به گره دلخواه
  const handleNavigateToNode = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId);
  }, []);

  // =========================================================================
  // هسته تصمیم‌گیری الگوی Switch/Case بر اساس نوع گره دریافتی از CMS
  // =========================================================================
  const renderExperienceBlock = () => {
    const nodeType = activeNode.type || 'environmentNode';

    switch (nodeType) {
      // ۱. کاوشگر سه‌بعدی و تصاویر ۳۶۰ درجه
      case 'spatialNode':
        return (
          <SpatialExplorerPlaceholder
            nodeData={activeNode as SpatialNodeData}
            onClose={handleReturnToMainSequence}
            onNavigateToNode={handleNavigateToNode}
          />
        );

      // ۲. کنترلر اتمسفر و نورپردازی
      case 'atmosphereNode':
        return (
          <AtmosphereController
            nodeData={activeNode as AtmosphereNodeData}
            onClose={handleReturnToMainSequence}
          />
        );

      // ۳. تایم‌لاین روایت تاریخی و داستان هتل
      case 'storyTimelineNode':
        return (
          <StoryTimelinePlaceholder
            nodeData={activeNode as StoryTimelineNodeData}
            onClose={handleReturnToMainSequence}
          />
        );

      // ۴. مقایسه داینامیک دو اقامتگاه (Before/After Split Slider)
      case 'comparisonNode':
        return (
          <ComparisonPlaceholder
            nodeData={activeNode as ComparisonNodeData}
            onClose={handleReturnToMainSequence}
          />
        );

      // ۵. گره منظره صوتی
      case 'audioNode':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-neutral-950 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 mb-4 animate-pulse">
              <Music className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{activeNode.title}</h2>
            <p className="text-xs text-neutral-400 max-w-md mb-6">
              این گره یک منظره صوتی موازی (Parallel Audio) است که با سکانس ویدیویی تالار مرمر همگام اجرا می‌شود.
            </p>
            <button
              onClick={handleReturnToMainSequence}
              className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-neutral-950 font-bold text-xs"
            >
              بازگشت به سکانس تصویری
            </button>
          </div>
        );

      // پیش‌فرض: سکانس‌های ویدیویی پیوسته هتل (Environment Node)
      case 'environmentNode':
      default:
        return (
          <div className="relative w-full h-full">
            <VideoExperienceManager
              graph={hotelExperienceGraphData}
              currentNodeId={activeNode.id}
              onNodeChange={setActiveNodeId}
              enableScrollScrubbing={true}
            />
          </div>
        );
    }
  };

  return (
    <div id="experience-engine-root" dir="rtl" className="relative w-full h-full overflow-hidden bg-neutral-950 font-sans">
      {/* رندر بلوک فعال بر اساس نوع گره */}
      <div className="w-full h-full">{renderExperienceBlock()}</div>

      {/* =========================================================================
          داک شناور زیر هدر برای پرش سریع بین انواع گره‌های تجربه پیشرفته (Quick Switcher)
          ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* برند و عنوان هتل */}
        <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full pointer-events-auto">
          <div className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center font-serif font-bold text-xs">
            ق
          </div>
          <span className="font-serif text-xs text-white tracking-widest font-semibold">
            قصر لورا &bull; {activeNode.title}
          </span>
        </div>

        {/* لیست دسترسی مستقیم به بلوک‌های فعال گراف */}
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-xl border border-white/15 p-1 rounded-full pointer-events-auto shadow-2xl">
          {graph.nodes.map((node) => {
            const isSelected = node.id === activeNodeId;
            let icon = <Layers className="w-3.5 h-3.5" />;
            let activeColor = 'bg-amber-400 text-neutral-950';

            if (node.type === 'atmosphereNode') {
              icon = <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
              activeColor = 'bg-amber-500 text-neutral-950';
            } else if (node.type === 'spatialNode') {
              icon = <Compass className="w-3.5 h-3.5 text-emerald-400" />;
              activeColor = 'bg-emerald-500 text-neutral-950';
            } else if (node.type === 'storyTimelineNode') {
              icon = <BookOpen className="w-3.5 h-3.5 text-rose-400" />;
              activeColor = 'bg-rose-500 text-white';
            } else if (node.type === 'comparisonNode') {
              icon = <Columns className="w-3.5 h-3.5 text-cyan-400" />;
              activeColor = 'bg-cyan-500 text-neutral-950';
            } else if (node.type === 'audioNode') {
              icon = <Music className="w-3.5 h-3.5 text-purple-400" />;
              activeColor = 'bg-purple-500 text-white';
            }

            return (
              <button
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                title={node.title}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? `${activeColor} font-bold shadow-lg scale-105`
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {icon}
                <span className="hidden md:inline">{node.title.slice(0, 18)}...</span>
              </button>
            );
          })}

          <div className="w-[1px] h-5 bg-white/20 mx-1" />

          {/* دکمه صدا */}
          <button
            onClick={handleToggleAudio}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title={isAudioMuted ? 'پخش صدا' : 'قطع صدا'}
          >
            {isAudioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
          </button>

          {/* دکمه ورود به پنل ادمین Flow Canvas */}
          {isAdmin && onOpenFlowCanvas && (
            <button
              onClick={onOpenFlowCanvas}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-xs font-medium transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>پنل ادمین React Flow</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
