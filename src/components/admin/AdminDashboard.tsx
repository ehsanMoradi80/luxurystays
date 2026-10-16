import React, { useState } from 'react';
import { ArrowRight, Shield, Layers, Video, Sliders, CheckCircle2 } from 'lucide-react';
import { HotelExperienceGraph } from '../../types/sequenceGraph';

interface AdminDashboardProps {
  graph: HotelExperienceGraph;
  onBackToExperience: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ graph, onBackToExperience }) => {
  const [activeTab, setActiveTab] = useState<'SEQUENCES' | 'SETTINGS'>('SEQUENCES');

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
            <span className="font-medium">بازگشت به سایت (Esc)</span>
          </button>

          <div className="flex items-center gap-2 border-r border-white/10 pr-3 text-xs">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-serif text-amber-300 font-medium">پنل مدیریت محتوا و گراف تجارب قصر لورا</span>
          </div>
        </div>

        <button
          onClick={onBackToExperience}
          className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs border border-white/10"
        >
          خروج (Esc)
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">مدیریت سکانس‌های ویدیویی</h2>
            <p className="text-xs text-neutral-400">تنظیمات ترنزیشن‌ها، ویدیوهای لوپ و شناسنامه‌های آکوستیک هتل</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('SEQUENCES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'SEQUENCES' ? 'bg-amber-400 text-neutral-950 font-bold' : 'bg-white/5 text-neutral-400'
              }`}
            >
              سکانس‌ها ({graph.nodes.length})
            </button>
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'SETTINGS' ? 'bg-amber-400 text-neutral-950 font-bold' : 'bg-white/5 text-neutral-400'
              }`}
            >
              تنظیمات عمومی
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {graph.nodes.map((node, i) => (
            <div key={node.id} className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
                  0{i + 1}
                </span>
                <div>
                  <div className="text-sm font-bold text-white">{node.persianTitle}</div>
                  <div className="text-xs text-neutral-400 font-serif">{node.title} &bull; {node.category}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[11px]">
                  صدا: {node.audioProfile.tone} ({Math.round(node.audioProfile.volume * 100)}%)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  فعال
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
