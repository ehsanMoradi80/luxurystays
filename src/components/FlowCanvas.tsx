/**
 * FlowCanvas.tsx
 * 
 * پنل ادمین: بوم بصری گره‌محور (Node-based Visual Builder) شبیه به نسخه ساده ComfyUI
 * به زبان فارسی و با فونت اختصاصی وزیرمتن (Vazirmatn)
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
import { 
  Layers, 
  Film, 
  Download, 
  RotateCcw, 
  Copy, 
  Check, 
  Code2, 
  X,
  Play
} from 'lucide-react';

interface FlowCanvasProps {
  onSwitchToExperience?: () => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ onSwitchToExperience }) => {
  const {
    nodes,
    edges,
    hotelTitle,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addEnvironmentNode,
    addTransitionNode,
    exportSequenceGraph,
    resetToSample,
  } = useFlowStore();

  // رجیستری انواع نودهای سفارشی
  const nodeTypes = useMemo(
    () => ({
      environmentNode: EnvironmentNode,
      transitionNode: TransitionNode,
    }),
    []
  );

  // وضعیت مودال نمایش خروجی JSON
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportedJson, setExportedJson] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // عملیات استخراج JSON
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
          نوار ابزار بالای بوم (پنل ادمین با استایل شیک و زبان فارسی)
          ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* برند و عنوان پروژه */}
        <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 backdrop-blur-md px-4 py-2.5 rounded-xl pointer-events-auto shadow-2xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-bold text-xs">
            ادمین
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold text-neutral-100">
                سازنده گراف توالی و سکانس‌ها
              </h1>
              <span className="text-[10px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono">
                پنل مدیریت
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-[240px]">
              {hotelTitle}
            </p>
          </div>
        </div>

        {/* دکمه‌های کنترلی افزودن نودها و استخراج دیتا */}
        <div className="flex items-center gap-2 pointer-events-auto bg-neutral-900/90 border border-neutral-800 backdrop-blur-md p-1.5 rounded-xl shadow-2xl">
          {/* افزودن نود محیط */}
          <button
            id="btn-add-env-node"
            onClick={() => addEnvironmentNode('فضای جدید هتل')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-medium transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ گره محیط (لوپ)</span>
          </button>

          {/* افزودن نود ترنزیشن */}
          <button
            id="btn-add-trans-node"
            onClick={() => addTransitionNode('ترنزیشن ویدیویی دوربین')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-xs font-medium transition-all cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span>+ گره ترنزیشن (حرکت)</span>
          </button>

          <div className="w-[1px] h-6 bg-neutral-800 mx-1" />

          {/* ریست به نمونه اولیه */}
          <button
            id="btn-reset-flow"
            onClick={resetToSample}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>مشاهده سایت اصلی</span>
            </button>
          )}
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
          nodeColor={(n) => (n.type === 'environmentNode' ? '#fbbf24' : '#38bdf8')}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-neutral-900 !border-neutral-800 !rounded-xl !overflow-hidden"
        />
      </ReactFlow>

      {/* =========================================================================
          مودال نمایش خروجی JSON به زبان فارسی
          ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* هدر مودال */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-sm text-neutral-100">
                    خروجی ساختار استاندارد گراف (SequenceGraph JSON)
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    آماده برای تغذیه و اجرای زنده در فرانت‌اند سایت هتل
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
              <span>تعداد گره‌ها: {nodes.length} &bull; اتصالات: {edges.length}</span>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-medium cursor-pointer"
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
