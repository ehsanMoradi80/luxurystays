import React from 'react';
import { Volume2, VolumeX, MapPin, Shield, Sparkles, Workflow, Compass, CalendarCheck } from 'lucide-react';
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
  onOpenAdmin,
  onOpenStudio,
  isMuted,
  onToggleMute,
  isTransitioning = false,
}) => {
  const currentIndex = nodes.findIndex((n) => n.id === currentNodeId);

  return (
    <header className="fixed top-0 inset-x-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between pointer-events-none select-none font-['Vazirmatn']">
      {/* Brand: Luxury Emblem & Title */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-950/70 backdrop-blur-xl border border-white/10 shadow-xl hover:border-amber-400/30 transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500/20 to-amber-300/30 border border-amber-400/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </div>
          <span className="font-serif text-sm font-semibold tracking-widest text-amber-100 uppercase">
            Laura Palace
          </span>
        </div>
      </div>

      {/* Center: Delicate Scene Dots Navigation */}
      <nav className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-950/70 backdrop-blur-xl border border-white/10 shadow-xl pointer-events-auto">
        {nodes.map((node, index) => {
          const isActive = node.id === currentNodeId;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              disabled={isTransitioning}
              title={`${index + 1}. ${node.persianTitle}`}
              className={`relative px-2.5 py-1 rounded-full text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 font-medium shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  isActive ? 'bg-amber-400 scale-125' : 'bg-neutral-600'
                }`}
              />
              <span className="text-[11px] hidden lg:inline">{node.persianTitle}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Redesigned Aesthetic Luxury Pill Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Reservation / Booking CTA Pill */}
        {onOpenBooking && (
          <button
            onClick={onOpenBooking}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-400/30 border border-amber-400/40 hover:border-amber-400/70 text-amber-200 hover:text-amber-100 text-xs font-medium backdrop-blur-xl shadow-lg shadow-amber-500/5 transition-all cursor-pointer active:scale-95"
            title="رزرو اختصاصی سوئیت‌ها و اقامتگاه"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>رزرو اقامت</span>
          </button>
        )}

        {/* Ambient Meditation Sound Toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'پخش صدای آرامش‌بخش مدیتیشن ۴۳۲Hz' : 'قطع صدای مدیتیشن'}
          className={`h-8 px-2.5 rounded-full backdrop-blur-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
            isMuted
              ? 'bg-neutral-950/70 border-white/10 text-neutral-400 hover:text-neutral-200'
              : 'bg-amber-400/10 border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.1)]'
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              {/* Subtle sound wave visualizer */}
              <span className="flex items-center gap-0.5 h-2.5">
                <span className="w-0.5 h-2 bg-amber-400/80 rounded-full animate-pulse" />
                <span className="w-0.5 h-3 bg-amber-400 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-0.5 h-1.5 bg-amber-400/60 rounded-full animate-pulse [animation-delay:300ms]" />
              </span>
            </>
          )}
        </button>

        {/* Hotel Map Atlas */}
        {onOpenMap && (
          <button
            onClick={onOpenMap}
            title="نقشه فضایی هتل"
            className="w-8 h-8 rounded-full bg-neutral-950/70 border border-white/10 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Visual Builder Studio */}
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            title="کانواس نود-بیس طراحی تجربه (Studio)"
            className="w-8 h-8 rounded-full bg-neutral-950/70 border border-white/10 hover:border-amber-400/40 text-neutral-300 hover:text-amber-300 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Workflow className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Admin Dashboard */}
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            title="پنل مدیریت هتل"
            className="hidden sm:flex w-8 h-8 rounded-full bg-neutral-950/70 border border-white/10 hover:border-amber-400/40 text-neutral-400 hover:text-amber-300 backdrop-blur-xl items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
