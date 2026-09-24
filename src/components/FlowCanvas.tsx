/**
 * FlowCanvas.tsx
 * 
 * پنل ادمین: بوم بصری گره‌محور (Node-based Flow Canvas)
 * پشتیبانی کامل از بلوک‌های تجربه پیشرفته (Advanced Experience Blocks):
 * ۱. SpatialNode (کاوشگر ۳۶۰ درجه و تور پانوراما)
 * ۲. AtmosphereNode (کنترلر اتمسفر نوری و اسلایدر روز/شب با رندر زنده در بوم)
 * ۳. AudioNode (منظره صوتی با اجرای موازی)
 * ۴. StoryTimelineNode (روایت تعاملی تاریخ هتل با نقاط عطف اسکرولی)
 * ۵. ComparisonNode (مقایسه داینامیک دو فضا یا اتاق با اسلایدر Before/After)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap,
  BackgroundVariant 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from '../store/useFlowStore';
import { EnvironmentNode } from './flow/EnvironmentNode';
import { TransitionNode } from './flow/TransitionNode';
import { AtmosphereNode } from './flow/AtmosphereNode';
import { SpatialNode } from './flow/SpatialNode';
import { AudioNode } from './flow/AudioNode';
import { StoryTimelineNode } from './flow/StoryTimelineNode';
import { ComparisonNode } from './flow/ComparisonNode';

import { 
  Layers, 
  Film, 
  Download, 
  RotateCcw, 
  Copy, 
  Check, 
  Code2, 
  X,
  Play,
  Sparkles,
  Compass,
  Music,
  BookOpen,
  Columns,
  SlidersHorizontal
} from 'lucide-react';

interface FlowCanvasProps {
  onSwitchToExperience?: () => void;
  onPreviewNode?: (nodeId: string) => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ onSwitchToExperience, onPreviewNode }) => {
  const {
    nodes,
    edges,
    hotelTitle,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addEnvironmentNode,
    addTransitionNode,
    addAtmosphereNode,
    addSpatialNode,
    addAudioNode,
    addStoryTimelineNode,
    addComparisonNode,
    exportSequenceGraph,
    resetToSample,
  } = useFlowStore();

  // رجیستری انواع نودهای سفارشی بوم React Flow
  const nodeTypes = useMemo(
    () => ({
      environmentNode: EnvironmentNode,
      transitionNode: TransitionNode,
      atmosphereNode: AtmosphereNode,
      spatialNode: SpatialNode,
      audioNode: AudioNode,
      storyTimelineNode: StoryTimelineNode,
      comparisonNode: ComparisonNode,
    }),
    []
  );

  // وضعیت مودال نمایش خروجی JSON
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportedJson, setExportedJson] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // عملیات استخراج JSON با ساختار توسعه‌یافته
  const handleExportJson = useCallback(() => {
    const graphData = exportSequenceGraph();
    setExportedJson(JSON.stringify(graphData, null, 2));
    setIsExportModalOpen(true);
  }, [exportSequenceGraph]);

  const handleCopyJson = useCallback(() => {
    if (!exportedJson) return;
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportedJson]);

  return (
    <div id="flow-builder-container" dir="rtl" className="relative w-full h-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* =========================================================================
          نوار ابزار بالای بوم (پنل ادمین گراف سکانس‌ها و بلوک‌های تعاملی)
          ========================================================================= */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between">
          {/* برند و عنوان پروژه */}
          <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 backdrop-blur-md px-3.5 py-2 rounded-xl pointer-events-auto shadow-2xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-bold text-xs shadow-md">
              ادمین
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-semibold text-neutral-100">
                  سازنده گراف تجربه هتل لوکس
                </h1>
                <span className="text-[10px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono">
                  React Flow Engine v2.0
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[220px]">
                {hotelTitle}
              </p>
            </div>
          </div>

          {/* اکشن‌های سمت چپ نوار بالا */}
          <div className="flex items-center gap-2 pointer-events-auto bg-neutral-900/90 border border-neutral-800 backdrop-blur-md p-1.5 rounded-xl shadow-2xl">
            {/* ریست به نمونه اولیه */}
            <button
              id="btn-reset-flow"
              onClick={resetToSample}
              className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
              title="بازنشانی بوم به گراف پیش‌فرض"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* استخراج JSON */}
            <button
              id="btn-export-sequence-json"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>خروجی گراف JSON</span>
            </button>

            {/* دکمه پیش‌نمایش در فرانت‌اند لوکس */}
            {onSwitchToExperience && (
              <button
                id="btn-preview-experience"
                onClick={onSwitchToExperience}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>اجرای زنده در فرانت‌اند</span>
              </button>
            )}
          </div>
        </div>

        {/* نوار دکمه‌های افزودن نودها (شامل ۵ بلوک پیشرفته) */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800/90 backdrop-blur-md pointer-events-auto shadow-2xl scrollbar-none">
          <span className="text-[11px] text-neutral-400 font-medium px-2 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            افزودن گره جدید:
          </span>

          {/* ۱. گره محیط (لوپ) */}
          <button
            onClick={() => addEnvironmentNode('فضای جدید هتل')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-medium transition-all cursor-pointer shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ گره محیط (Video)</span>
          </button>

          {/* ۲. گره ترنزیشن */}
          <button
            onClick={() => addTransitionNode('ترنزیشن ویدیویی دوربین')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-medium transition-all cursor-pointer shrink-0"
          >
            <Film className="w-3.5 h-3.5" />
            <span>+ ترنزیشن (Camera)</span>
          </button>

          {/* ۳. گره کنترلر اتمسفر (AtmosphereNode) */}
          <button
            onClick={() => addAtmosphereNode('کنترلر اتمسفر و نورپردازی')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>+ کنترلر اتمسفر (Atmosphere)</span>
          </button>

          {/* ۴. گره کاوشگر ۳۶۰ درجه (SpatialNode) */}
          <button
            onClick={() => addSpatialNode('کاوشگر ۳۶۰ درجه گنبد')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-medium transition-all cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ کاوشگر ۳۶۰° (Spatial)</span>
          </button>

          {/* ۵. گره منظره صوتی موازی (AudioNode) */}
          <button
            onClick={() => addAudioNode('منظره صوتی هارمونیک')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-300 text-xs font-medium transition-all cursor-pointer shrink-0"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>+ صوت موازی (Audio)</span>
          </button>

          {/* ۶. گره روایت داستان (StoryTimelineNode) */}
          <button
            onClick={() => addStoryTimelineNode('روایت یک سده شکوه هتل')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-xs font-medium transition-all cursor-pointer shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-rose-400" />
            <span>+ روایت داستان (Storyline)</span>
          </button>

          {/* ۷. گره مقایسه داینامیک (ComparisonNode) */}
          <button
            onClick={() => addComparisonNode('مقایسه داینامیک اقامتگاه‌ها')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-medium transition-all cursor-pointer shrink-0"
          >
            <Columns className="w-3.5 h-3.5 text-cyan-400" />
            <span>+ مقایسه داینامیک (Compare)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          بوم اصلی React Flow
          ========================================================================= */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-neutral-950 font-sans"
      >
        <Background 
          color="#333" 
          gap={24} 
          size={1.5} 
          variant={BackgroundVariant.Dots} 
        />
        <Controls 
          className="!bg-neutral-900 !border-neutral-800 !fill-neutral-300 !text-neutral-300 !rounded-xl !shadow-2xl" 
        />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'atmosphereNode') return '#f59e0b';
            if (n.type === 'spatialNode') return '#10b981';
            if (n.type === 'audioNode') return '#a855f7';
            if (n.type === 'storyTimelineNode') return '#f43f5e';
            if (n.type === 'comparisonNode') return '#06b6d4';
            if (n.type === 'environmentNode') return '#fbbf24';
            return '#38bdf8';
          }}
          maskColor="rgba(0, 0, 0, 0.75)"
          className="!bg-neutral-900 !border-neutral-800 !rounded-xl !overflow-hidden"
        />
      </ReactFlow>

      {/* =========================================================================
          مودال خروجی JSON توسعه‌یافته
          ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[85vh] bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* هدر مودال */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-sm text-neutral-100">
                    خروجی ساختار استاندارد گراف گسترش‌یافته (Extended SequenceGraph JSON)
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    شامل ۵ بلوک پیشرفته: SpatialNode, AtmosphereNode, AudioNode, StoryTimelineNode, ComparisonNode
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی کد JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* بدنه کد JSON */}
            <div dir="ltr" className="p-4 flex-1 overflow-auto bg-neutral-950 font-mono text-xs text-amber-200/90 leading-relaxed">
              <pre className="whitespace-pre-wrap">{exportedJson}</pre>
            </div>

            {/* فوتر مودال */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-400">
              <span>تعداد کل گره‌ها: {nodes.length} &bull; اتصالات گراف: {edges.length}</span>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
