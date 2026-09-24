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
import { Music } from 'lucide-react';

interface ExperienceEngineProps {
  graph?: SequenceGraph;
  initialNodeId?: string;
  onClose?: () => void;
}

export const ExperienceEngine: React.FC<ExperienceEngineProps> = ({
  graph = sampleGraphData as unknown as SequenceGraph,
  initialNodeId,
  onClose,
}) => {
  // شناسه گره فعال در موتور تجربه
  const [activeNodeId, setActiveNodeId] = useState<string>(
    initialNodeId || graph.initialNodeId || graph.nodes[0]?.id || 'env-gate'
  );

  // دریافت شیء گره فعال از روی شناسه
  const activeNode = useMemo<ExperienceNodeData>(() => {
    return graph.nodes.find((n) => n.id === activeNodeId) || graph.nodes[0];
  }, [graph.nodes, activeNodeId]);

  // پیدا کردن نود صوتی موازی (Parallel Audio) که به گره فعلی متصل است
  const parallelAudioNode = useMemo<AudioNodeData | undefined>(() => {
    const parallelEdge = graph.edges?.find(
      (e) => e.edgeType === 'parallel_audio' && e.targetNodeId === activeNodeId
    );
    if (parallelEdge) {
      return graph.nodes.find(
        (n) => n.id === parallelEdge.sourceNodeId && n.type === 'audioNode'
      ) as AudioNodeData | undefined;
    }

    return graph.nodes.find(
      (n) => n.type === 'audioNode' && (n as AudioNodeData).parallelTargetSequenceId === activeNodeId
    ) as AudioNodeData | undefined;
  }, [graph.nodes, graph.edges, activeNodeId]);

  // کنترل همگام پخش صوت در صورت تغییر نود فعال یا تغییر گره صوتی موازی
  useEffect(() => {
    if (parallelAudioNode) {
      audioAmbiance.playAmbiance(parallelAudioNode.ambientTone as any, parallelAudioNode.volume);
    } else if (activeNode.type === 'environmentNode' && (activeNode as EnvironmentNodeData).audioProfile) {
      const profile = (activeNode as EnvironmentNodeData).audioProfile!;
      audioAmbiance.playAmbiance(profile.ambienceTone as any, profile.volume);
    }
  }, [activeNode, parallelAudioNode]);

  // بازگشت به گره اصلی (یا بستن در صورت وجود onClose)
  const handleReturnToMainSequence = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setActiveNodeId(graph.initialNodeId || 'env-gate');
    }
  }, [onClose, graph.initialNodeId]);

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
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-neutral-950 p-6 text-center select-none font-sans">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 mb-4 animate-pulse">
              <Music className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{activeNode.title}</h2>
            <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
              این گره یک منظره صوتی موازی (Parallel Audio) است که با سکانس ویدیویی تالار مرمر همگام اجرا می‌شود.
            </p>
            <button
              onClick={handleReturnToMainSequence}
              className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-neutral-950 font-bold text-xs cursor-pointer shadow-lg active:scale-95 transition-all"
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
      {renderExperienceBlock()}
    </div>
  );
};
