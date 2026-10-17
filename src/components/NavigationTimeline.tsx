import React from 'react';
import { Volume2, VolumeX, Sparkles, Workflow, Compass, CalendarCheck } from 'lucide-react';
import { SequenceNode } from '../types/sequenceGraph';

interface NavigationTimelineProps {
  nodes: SequenceNode[];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onOpenBooking?: () => void;
  onOpenMap?: () => void;
  onOpenAdmin?: () => void;
  onOpenStudio?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isTransitioning?: boolean;
  transitionSourceTitle?: string;
  transitionTargetTitle?: string;
  isReverseTransition?: boolean;
  isBookingOpen?: boolean;
}

export const NavigationTimeline: React.FC<NavigationTimelineProps> = ({
  nodes,
  currentNodeId,
  onSelectNode,
  onOpenBooking,
  onOpenMap,
  onOpenStudio,
  isMuted,
  onToggleMute,
  isTransitioning = false,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between pointer-events-none select-none font-['Vazirmatn']">
      {/* لوگوی مینیمال هتل */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/60 backdrop-blur-xl border border-white/10 shadow-lg">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span className="font-serif text-xs font-medium tracking-widest text-amber-100/90 uppercase">
            Laura Palace
          </span>
        </div>
      </div>

      {/* نقطه چین ناوبری فضاهای هتل */}
      <nav className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-950/60 backdrop-blur-xl border border-white/10 shadow-lg pointer-events-auto">
        {nodes.map((node, index) => {
          const isActive = node.id === currentNodeId;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              disabled={isTransitioning}
              title={`${index + 1}. ${node.persianTitle}`}
              className={`relative px-2 py-0.5 rounded-full text-[11px] transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  isActive ? 'bg-amber-300 scale-125' : 'bg-neutral-600'
                }`}
              />
              <span className="hidden md:inline">{node.persianTitle}</span>
            </button>
          );
        })}
      </nav>

      {/* دکمه‌های کنترل مینیمال هدر */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* دکمه رزرو */}
        {onOpenBooking && (
          <button
            onClick={onOpenBooking}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs backdrop-blur-xl transition-all cursor-pointer active:scale-95"
            title="رزرو اقامت"
          >
            <CalendarCheck className="w-3 h-3 text-amber-300" />
            <span>رزرو</span>
          </button>
        )}

        {/* دکمه صدا */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'پخش صدا' : 'قطع صدا'}
          className={`w-7 h-7 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isMuted
              ? 'bg-neutral-950/60 border-white/10 text-neutral-400 hover:text-white'
              : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-3 h-3 text-neutral-400" />
          ) : (
            <Volume2 className="w-3 h-3 text-amber-300" />
          )}
        </button>

        {/* دکمه نقشه فضایی */}
        {onOpenMap && (
          <button
            onClick={onOpenMap}
            title="نقشه هتل"
            className="w-7 h-7 rounded-full bg-neutral-950/60 border border-white/10 hover:border-amber-400/30 text-neutral-400 hover:text-amber-200 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Compass className="w-3 h-3" />
          </button>
        )}

        {/* استودیو کانواس نودها */}
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            title="کانواس طراحی (Studio)"
            className="w-7 h-7 rounded-full bg-neutral-950/60 border border-white/10 hover:border-amber-400/30 text-neutral-400 hover:text-amber-200 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Workflow className="w-3 h-3" />
          </button>
        )}
      </div>
    </header>
  );
};
