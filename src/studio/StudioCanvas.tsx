import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Play, 
  Plus, 
  Layers, 
  Download, 
  Sliders, 
  X, 
  Sparkles, 
  Video, 
  Eye, 
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { useStudioStore } from './store';
import { ExperienceNodeComponent } from './nodes/ExperienceNodeComponent';
import { ExperienceNode, BlendMode } from '../engine/types';

interface StudioCanvasProps {
  onExitStudio: () => void;
  onLaunchJourney: (graph: any) => void;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({ onExitStudio, onLaunchJourney }) => {
  const {
    graph,
    flowNodes,
    flowEdges,
    selectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    updateNodeData,
    addSceneNode,
  } = useStudioStore();

  const nodeTypes = useMemo(
    () => ({
      experienceNode: ExperienceNodeComponent,
    }),
    []
  );

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graph, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${graph.id || 'experience'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div dir="rtl" className="relative w-screen h-screen bg-neutral-950 text-neutral-100 flex overflow-hidden font-['Vazirmatn'] select-none">
      {/* =========================================================================
          Top Studio Toolbar (Dark Glassmorphic Luxury Bar)
          ========================================================================= */}
      <header className="absolute top-4 inset-x-4 z-40 h-14 px-5 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitStudio}
            className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/50 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="خروج از استودیو"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-white">استودیوی معمار تجربه (Visual Builder)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono">
                ENGINE V2
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block font-light">طراحی نود-بیس ماشین حالت تعاملی بدون کدنویسی</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addSceneNode('scene')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-xs font-medium text-neutral-200 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>افزودن سکانس</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-xs font-medium text-neutral-200 transition-all cursor-pointer active:scale-95"
            title="دریافت ساختار JSON"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>اکسپورت</span>
          </button>

          <button
            onClick={() => onLaunchJourney(graph)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-neutral-950" />
            <span>اجرای زنده Journey (بدون لودینگ)</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          Main Node Canvas Area (React Flow with Infinite Dark Grid)
          ========================================================================= */}
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(null)}
          fitView
          colorMode="dark"
          className="bg-neutral-950"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#262626" />
          <Controls className="!bg-neutral-900 !border-white/10 !rounded-xl overflow-hidden" />
          <MiniMap
            nodeColor="#fbbf24"
            maskColor="rgba(0, 0, 0, 0.75)"
            className="!bg-neutral-900/90 !border-white/10 !rounded-2xl"
          />

          <Panel position="bottom-left" className="m-5 text-neutral-500 text-[11px] pointer-events-none">
            <span>درگ گره‌ها برای جابجایی &bull; اتصال خروجی به ورودی برای تعریف گیت ترنزیشن پیوسته</span>
          </Panel>
        </ReactFlow>
      </div>

      {/* =========================================================================
          Right Property Inspector Drawer (When Node is Selected)
          ========================================================================= */}
      {selectedNode && (
        <aside className="w-80 h-full bg-neutral-900/95 border-r border-white/10 backdrop-blur-2xl p-5 overflow-y-auto flex flex-col justify-between shadow-2xl z-30 animate-fade-in">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">تنظیمات گره تعاملی</span>
              </div>
              <button
                onClick={() => selectNode(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">عنوان سکانس</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-amber-400 text-xs text-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">زیرعنوان اتمسفریک</label>
                <input
                  type="text"
                  value={selectedNode.subtitle || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-amber-400 text-xs text-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Primary Media Config */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <span className="text-xs font-bold text-amber-300 block">رسانه پایه (Base Media)</span>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">نوع رسانه</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      updateNodeData(selectedNode.id, {
                        primaryMedia: { ...selectedNode.primaryMedia, type: 'video' },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selectedNode.primaryMedia.type === 'video'
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-neutral-400'
                    }`}
                  >
                    ویدیو لوپ
                  </button>
                  <button
                    onClick={() =>
                      updateNodeData(selectedNode.id, {
                        primaryMedia: { ...selectedNode.primaryMedia, type: 'image' },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selectedNode.primaryMedia.type === 'image'
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-neutral-400'
                    }`}
                  >
                    عکس عریض
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">آدرس ویدیو یا تصویر (URL)</label>
                <input
                  type="text"
                  value={selectedNode.primaryMedia.url}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      primaryMedia: { ...selectedNode.primaryMedia, url: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 focus:border-amber-400 text-[11px] text-neutral-200 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">تصویر پلیس‌هولدر / تکسچر (Poster)</label>
                <input
                  type="text"
                  value={selectedNode.primaryMedia.posterUrl || ''}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      primaryMedia: { ...selectedNode.primaryMedia, posterUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 focus:border-amber-400 text-[11px] text-neutral-200 outline-none font-mono"
                />
              </div>
            </div>

            {/* Dual Layer Overlay Config */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">لایه ترکیبی دوم (Dual Overlay)</span>
                <input
                  type="checkbox"
                  checked={!!selectedNode.secondaryOverlay}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateNodeData(selectedNode.id, {
                        secondaryOverlay: {
                          media: {
                            id: `ov-${Date.now()}`,
                            type: 'image',
                            url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80',
                          },
                          blendMode: 'overlay',
                          opacity: 0.3,
                          depthConfig: { factorX: -20, factorY: -16, scaleBase: 1.08 },
                        },
                      });
                    } else {
                      updateNodeData(selectedNode.id, { secondaryOverlay: undefined });
                    }
                  }}
                  className="accent-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>

              {selectedNode.secondaryOverlay && (
                <div className="space-y-2 p-3 rounded-xl bg-black/40 border border-white/5">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Blend Mode تلفیق</label>
                    <select
                      value={selectedNode.secondaryOverlay.blendMode}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          secondaryOverlay: {
                            ...selectedNode.secondaryOverlay!,
                            blendMode: e.target.value as BlendMode,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-neutral-800 border border-white/10 text-xs text-amber-300 outline-none"
                    >
                      <option value="overlay">Overlay (طبیعی)</option>
                      <option value="screen">Screen (درخشش نوری)</option>
                      <option value="soft-light">Soft-Light (ملایم)</option>
                      <option value="multiply">Multiply (تاریک/سایه)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                      <span>شدت شفافیت (Opacity)</span>
                      <span>{Math.round((selectedNode.secondaryOverlay.opacity || 0.3) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={selectedNode.secondaryOverlay.opacity}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          secondaryOverlay: {
                            ...selectedNode.secondaryOverlay!,
                            opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pointer & Lighting Reactions */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              <span className="text-xs font-bold text-amber-300 block">پاسخ به پوینتر و نورپردازی</span>
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span>تعقیب پوینتر ماوس (Parallax Tilt)</span>
                <input
                  type="checkbox"
                  checked={selectedNode.lighting?.followPointer ?? true}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      lighting: {
                        colorK: selectedNode.lighting?.colorK || 3000,
                        specularIntensity: selectedNode.lighting?.specularIntensity || 0.8,
                        followPointer: e.target.checked,
                      },
                    })
                  }
                  className="accent-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => onLaunchJourney(graph)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              <span>پیش‌نمایش این سکانس در Journey</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
