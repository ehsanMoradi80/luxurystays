import React from 'react';
import { ArrowRight, Compass, MapPin, Sparkles, Navigation, Layers } from 'lucide-react';
import { SequenceNode } from '../../types/sequenceGraph';

interface HotelMapPageProps {
  nodes: SequenceNode[];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onBackToExperience: () => void;
}

export const HotelMapPage: React.FC<HotelMapPageProps> = ({
  nodes,
  currentNodeId,
  onSelectNode,
  onBackToExperience,
}) => {
  return (
    <div className="w-full min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black text-neutral-100 font-sans flex flex-col relative selection:bg-amber-400 selection:text-neutral-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 sm:px-8 py-3.5 bg-neutral-950/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToExperience}
            className="group px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/60 border border-white/15 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95 text-xs"
            title="بازگشت به گشت سینمایی (Esc)"
          >
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            <span className="font-medium">بازگشت به تور (Esc)</span>
          </button>

          <div className="flex items-center gap-2 border-r border-white/10 pr-3 text-xs">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="font-serif text-amber-300 font-medium">نقشه و طبقات قصر لورا</span>
          </div>
        </div>

        <button
          onClick={onBackToExperience}
          className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs border border-white/10"
        >
          بستن (Esc)
        </button>
      </header>

      {/* Main Map Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">پیمایش فضایی</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">اطلس فضاهای قصر لورا</h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            برای جهش مستقیم به هر بخش از هتل، روی کارت مربوطه کلیک کنید یا با دکمه بازگشت به گشت آزاد برگردید.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {nodes.map((node, index) => {
            const isCurrent = node.id === currentNodeId;
            return (
              <div
                key={node.id}
                onClick={() => {
                  onSelectNode(node.id);
                  onBackToExperience();
                }}
                className={`group rounded-2xl overflow-hidden border p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-amber-400/10 border-amber-400 ring-1 ring-amber-400 shadow-xl shadow-amber-400/10'
                    : 'bg-neutral-900/50 border-white/10 hover:border-amber-400/40 hover:bg-neutral-900/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-mono text-amber-300 border border-white/10">
                      سکانس 0{index + 1}
                    </span>
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      {node.floorLevel || 'همکف'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-1">
                    {node.persianTitle}
                  </h3>
                  <p className="text-xs text-amber-200/80 font-serif italic mb-2">{node.subtitle}</p>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">{node.description}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500 font-medium">بخش {node.category}</span>
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      isCurrent ? 'text-amber-400' : 'text-neutral-400 group-hover:text-amber-300'
                    }`}
                  >
                    <span>{isCurrent ? 'فضای فعال کنونی' : 'مشاهده در تور'}</span>
                    <Navigation className="w-3 h-3 rotate-45" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
