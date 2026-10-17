import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Video, Image as ImageIcon, Sparkles, Sliders, Volume2, Layers } from 'lucide-react';
import { ExperienceNode } from '../../engine/types';

interface ExperienceNodeProps {
  id: string;
  data: ExperienceNode;
  selected?: boolean;
}

export const ExperienceNodeComponent: React.FC<ExperienceNodeProps> = memo(({ id, data, selected }) => {
  const isVideo = data.primaryMedia?.type === 'video';
  const hasOverlay = !!data.secondaryOverlay;

  return (
    <div
      dir="rtl"
      className={`relative w-72 rounded-2xl bg-neutral-900/90 border transition-all duration-200 select-none backdrop-blur-2xl shadow-2xl overflow-hidden font-['Vazirmatn'] ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/10'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Input Handle (Incoming transition gate) */}
      <Handle
        type="target"
        position={Position.Right}
        id="in"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-neutral-950 transition-transform hover:scale-125"
      />

      {/* Header */}
      <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
            {isVideo ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[140px]">{data.title}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 font-mono">
          {data.type}
        </span>
      </div>

      {/* Media Thumbnail & Overlay Stack */}
      <div className="relative h-32 w-full bg-neutral-950 overflow-hidden">
        {data.primaryMedia?.posterUrl && data.primaryMedia.posterUrl.trim() !== '' ? (
          <img
            src={data.primaryMedia.posterUrl}
            alt={data.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
            بدون پیش‌نمایش
          </div>
        )}

        {/* Dual Layer Badge */}
        {hasOverlay && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 border border-white/15 text-[10px] text-amber-300 flex items-center gap-1 backdrop-blur-md">
            <Layers className="w-3 h-3" />
            <span>Overlay ({data.secondaryOverlay?.blendMode})</span>
          </div>
        )}

        {/* Pointer Reaction Badge */}
        {data.lighting?.followPointer && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-amber-300 border border-amber-400/30 flex items-center gap-1 backdrop-blur-md">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Pointer Active</span>
          </div>
        )}
      </div>

      {/* Footer Specs & Quick Settings */}
      <div className="p-3 bg-neutral-950/70 text-right space-y-2 text-[11px]">
        {data.subtitle && (
          <p className="text-neutral-400 text-[10px] truncate">{data.subtitle}</p>
        )}

        <div className="flex items-center justify-between text-neutral-500 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-amber-400/80" />
            <span className="text-[10px]">{data.audioTrack?.tone || 'بدون صوت'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-neutral-400" />
            <span className="text-[10px]">{data.lighting?.colorK || 3000}K</span>
          </div>
        </div>
      </div>

      {/* Output Handle (Outgoing transition gate) */}
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-neutral-950 transition-transform hover:scale-125"
      />
    </div>
  );
});

ExperienceNodeComponent.displayName = 'ExperienceNodeComponent';
