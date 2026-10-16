import React from 'react';
import { Volume2, VolumeX, MapPin, Calendar, Shield, Sparkles, Compass } from 'lucide-react';
import { SequenceNode } from '../types/sequenceGraph';

interface NavigationTimelineProps {
  nodes: SequenceNode[];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onOpenBooking: () => void;
  onOpenMap?: () => void;
  onOpenAdmin?: () => void;
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
  onOpenAdmin,
  isMuted,
  onToggleMute,
  isTransitioning = false,
  transitionTargetTitle,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between pointer-events-none select-none">
      {/* Brand & Emblem */}
      <div className="flex items-center gap-3.5 pointer-events-auto">
        <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 backdrop-blur-xl flex items-center justify-center shadow-lg shadow-amber-400/5">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold tracking-wider text-amber-200">LAURA PALACE</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold uppercase tracking-widest border border-amber-400/30">
              5-STAR LUXURY
            </span>
          </div>
          <span className="text-xs text-neutral-400 block font-light">هتل بین‌المللی و قصر باشکوه لورا</span>
        </div>
      </div>

      {/* Middle Sequence Timeline Breadcrumbs */}
      <nav className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-950/70 border border-white/10 backdrop-blur-2xl pointer-events-auto shadow-2xl">
        {nodes.map((node, index) => {
          const isActive = node.id === currentNodeId;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20 font-bold scale-105'
                  : 'text-neutral-400 hover:text-amber-200 hover:bg-white/5'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-neutral-950' : 'bg-neutral-500 group-hover:bg-amber-400'}`} />
              <span>{node.persianTitle}</span>
              <span className={`text-[10px] opacity-60 ${isActive ? 'text-neutral-950' : 'text-neutral-500'}`}>0{index + 1}</span>
            </button>
          );
        })}

        {isTransitioning && transitionTargetTitle && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-amber-300 animate-pulse">
            <Compass className="w-3.5 h-3.5 animate-spin" />
            <span>در حال انتقال به {transitionTargetTitle}...</span>
          </div>
        )}
      </nav>

      {/* Right Controls: Booking, Map, Sound, Admin */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Map Button */}
        {onOpenMap && (
          <button
            onClick={onOpenMap}
            title="نقشه سه‌بعدی و فضاهای هتل"
            className="w-10 h-10 rounded-xl bg-neutral-900/80 border border-white/10 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <MapPin className="w-4 h-4" />
          </button>
        )}

        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'فعال‌سازی موسیقی و صدای محیطی' : 'قطع صدای محیط'}
          className="w-10 h-10 rounded-xl bg-neutral-900/80 border border-white/10 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Admin Dashboard */}
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            title="پنل مدیریت هتل"
            className="hidden sm:flex w-10 h-10 rounded-xl bg-neutral-900/80 border border-white/10 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300 backdrop-blur-xl items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}

        {/* Booking CTA Button */}
        <button
          onClick={onOpenBooking}
          className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
        >
          <Calendar className="w-4 h-4" />
          <span>رزرو اقامتگاه</span>
        </button>
      </div>
    </header>
  );
};
