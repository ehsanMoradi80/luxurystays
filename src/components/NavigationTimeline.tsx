import React from 'react';
import { Volume2, VolumeX, MapPin, Shield, Sparkles } from 'lucide-react';
import { SequenceNode } from '../types/sequenceGraph';

interface NavigationTimelineProps {
  nodes: SequenceNode[];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onOpenBooking?: () => void;
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
          </div>
          <span className="text-xs text-neutral-400 block font-light">هتل بین‌المللی و قصر باشکوه لورا</span>
        </div>
      </div>



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
      </div>
    </header>
  );
};
