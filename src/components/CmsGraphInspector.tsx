/**
 * CmsGraphInspector.tsx
 * 
 * لایه Z-Index 50: پنل تعاملی بازرسی گراف CMS و دیباگ توالی ویدیوها (CMS Graph Inspector)
 * به ادمین یا توسعه‌دهنده اجازه می‌دهد ساختار گره‌ها، ترنزیشن‌ها، ویدیوهای موبایل/دسکتاپ
 * و وضعیت پیش‌بارگذاری بافرها را به صورت زنده بررسی و آزمایش کند.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HotelExperienceGraph, SpaceNode, Hotspot } from '../types/cms';
import { 
  X, 
  Layers, 
  GitBranch, 
  Film, 
  Smartphone, 
  Monitor, 
  Play, 
  Copy, 
  Check, 
  ExternalLink,
  Code
} from 'lucide-react';

interface CmsGraphInspectorProps {
  isOpen: boolean;
  graph: HotelExperienceGraph;
  currentNodeId: string;
  onClose: () => void;
  onTriggerTransition: (targetNodeId: string) => void;
  selectedHotspotModal: Hotspot | null;
  onCloseHotspotModal: () => void;
}

export const CmsGraphInspector: React.FC<CmsGraphInspectorProps> = ({
  isOpen,
  graph,
  currentNodeId,
  onClose,
  onTriggerTransition,
  selectedHotspotModal,
  onCloseHotspotModal,
}) => {
  const [activeTab, setActiveTab] = useState<'nodes' | 'raw_json'>('nodes');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(currentNodeId);
  const [copied, setCopied] = useState<boolean>(false);

  const activeNode = graph.nodes.find((n) => n.id === selectedNodeId) || graph.nodes[0];

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* مودال جزئیات Hotspot در صورتی که کاربر روی یک نقطه تعاملی کلیک کرده باشد */}
      <AnimatePresence>
        {selectedHotspotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-amber-400/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={onCloseHotspotModal}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full bg-neutral-800/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 tracking-wider mb-2">
                <span>Hotspot Feature</span>
                {selectedHotspotModal.action.details?.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px]">
                    {selectedHotspotModal.action.details.badge}
                  </span>
                )}
              </div>

              <h3 className="font-serif text-2xl text-neutral-100 font-normal mb-1">
                {selectedHotspotModal.title}
              </h3>
              <p className="text-xs text-amber-200/80 italic mb-4">
                {selectedHotspotModal.tagline}
              </p>
              <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                {selectedHotspotModal.description}
              </p>

              {selectedHotspotModal.action.details?.specs && (
                <div className="space-y-2 mb-6 border-t border-neutral-800 pt-4">
                  {selectedHotspotModal.action.details.specs.map((spec, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-neutral-400">{spec.label}</span>
                      <span className="text-neutral-200 font-mono font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onCloseHotspotModal}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Return to Exploration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* دراور بازرسی گراف CMS */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-2xl h-full bg-neutral-900/95 border-l border-neutral-800 flex flex-col shadow-2xl text-neutral-200"
            >
              {/* هدر دراور */}
              <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-100 tracking-wide">
                      Headless CMS Sequence Graph
                    </h2>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      {graph.hotelName} • v{graph.version}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* تب‌ها: نمای گراف در مقابل JSON خام */}
              <div className="flex border-b border-neutral-800 px-5 bg-neutral-950/40">
                <button
                  onClick={() => setActiveTab('nodes')}
                  className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'nodes'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Nodes & Transitions ({graph.nodes.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('raw_json')}
                  className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'raw_json'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Raw CMS JSON Schema</span>
                </button>
              </div>

              {/* بدنه دراور */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === 'nodes' ? (
                  <div className="space-y-6">
                    {/* انتخابگر نودها */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono block mb-2">
                        Select Node to Inspect:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {graph.nodes.map((node) => (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              node.id === selectedNodeId
                                ? 'bg-amber-400/10 border-amber-400/60 text-amber-200'
                                : 'bg-neutral-800/40 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span className="uppercase">{node.id}</span>
                              {node.id === currentNodeId && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold text-[9px]">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="font-serif text-xs truncate">{node.title}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* مشخصات نود انتخاب‌شده */}
                    <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400">
                            Node Metadata
                          </span>
                          <h3 className="font-serif text-lg text-neutral-100">{activeNode.title}</h3>
                          <p className="text-xs text-neutral-400 italic">{activeNode.subtitle}</p>
                        </div>
                        {activeNode.id !== currentNodeId && (
                          <button
                            onClick={() => {
                              onTriggerTransition(activeNode.id);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-semibold text-xs transition-transform hover:scale-105 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Jump to Space</span>
                          </button>
                        )}
                      </div>

                      {/* ویدیوهای محیطی لوپ (Loop Media Specs) */}
                      <div className="border-t border-neutral-800/80 pt-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-2">
                          <Film className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ambient Loop Media Sources</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                            <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono mb-1">
                              <Monitor className="w-3 h-3" />
                              <span>Desktop (16:9 Landscape)</span>
                            </div>
                            <p className="text-[11px] text-neutral-400 truncate font-mono">
                              {activeNode.ambientLoop.landscapeUrl}
                            </p>
                          </div>
                          <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                            <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono mb-1">
                              <Smartphone className="w-3 h-3" />
                              <span>Mobile (9:16 Portrait)</span>
                            </div>
                            <p className="text-[11px] text-neutral-400 truncate font-mono">
                              {activeNode.ambientLoop.portraitUrl}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ترنزیشن‌های خروجی این نود (Outgoing Transitions) */}
                      <div className="border-t border-neutral-800/80 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                            <span>Outgoing Sequence Transitions ({activeNode.transitions.length})</span>
                          </span>
                        </div>
                        <div className="space-y-2">
                          {activeNode.transitions.map((edge, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-amber-300 uppercase">
                                    {edge.triggerType}
                                  </span>
                                  <span className="text-xs text-neutral-200 font-medium">
                                    → {edge.targetNodeId.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400">{edge.label}</p>
                                <p className="text-[10px] text-neutral-500 font-mono">
                                  Duration: {edge.video.duration}s • Direction: {edge.direction || 'forward'}
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  onTriggerTransition(edge.targetNodeId);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-400/30 transition-colors cursor-pointer"
                              >
                                Test Transition
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* نقاط تعاملی (Hotspots) */}
                      <div className="border-t border-neutral-800/80 pt-3">
                        <span className="text-xs font-semibold text-neutral-300 block mb-2">
                          Configured Hotspots ({activeNode.hotspots.length})
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {activeNode.hotspots.map((spot) => (
                            <div
                              key={spot.id}
                              className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-xs"
                            >
                              <div className="font-serif text-neutral-200 truncate">{spot.title}</div>
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                Pos: ({spot.x}%, {spot.y}%) • Action: {spot.action.type}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
                      {JSON.stringify(graph, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
