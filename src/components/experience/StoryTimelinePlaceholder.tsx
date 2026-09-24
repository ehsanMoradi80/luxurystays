/**
 * StoryTimelinePlaceholder.tsx
 * 
 * کامپوننت فرانت‌اند روایت داستان (Story Timeline Client Placeholder)
 * تایم‌لاین تعاملی اسکرولی که در هر نقطه (Waypoint) محتوا، انیمیشن یا متنی را ظاهر می‌کند
 */

import React, { useState } from 'react';
import { StoryTimelineNodeData } from '../../types/sequenceGraph';
import { BookOpen, Milestone, Clock, ChevronDown, Quote, Sparkles } from 'lucide-react';
import { toPersianDigits, autoPersianText } from '../../utils/JalaliDate';

interface StoryTimelinePlaceholderProps {
  nodeData: StoryTimelineNodeData;
  onClose?: () => void;
}

export const StoryTimelinePlaceholder: React.FC<StoryTimelinePlaceholderProps> = ({
  nodeData,
  onClose,
}) => {
  const waypoints = nodeData.waypoints || [];
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number>(0);

  const activeWaypoint = waypoints[activeWaypointIndex] || waypoints[0];

  return (
    <div id="story-timeline-view" dir="rtl" className="relative w-full h-full bg-neutral-950 text-neutral-100 overflow-hidden flex flex-col font-sans select-none">
      {/* =========================================================================
          پس‌زمینه تصویر یا مدیا با ترنزیشن فید نرم
          ========================================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          key={activeWaypoint?.id}
          src={activeWaypoint?.mediaUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80'}
          alt={activeWaypoint?.title}
          className="w-full h-full object-cover filter brightness-[0.4] contrast-[1.1] scale-105 transition-all duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-neutral-950/80" />
      </div>

      {/* =========================================================================
          هدر روایت
          ========================================================================= */}
      <div className="relative z-20 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/50 backdrop-blur-xl flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <BookOpen className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 font-mono tracking-widest uppercase">
                Interactive Storyline
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-400/10 text-rose-300 border border-rose-400/30">
                {toPersianDigits(nodeData.era || '۱۹۲۴ - ۲۰۲۶')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-white font-bold tracking-wide">
              {autoPersianText(nodeData.chapterTitle || nodeData.title)}
            </h2>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 text-neutral-200 text-xs font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
          >
            بازگشت به سکانس‌ها &times;
          </button>
        )}
      </div>

      {/* =========================================================================
          محتوای متمرکز ایستگاه فعلی (Waypoint Center Card)
          ========================================================================= */}
      <div className="relative z-20 flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-center">
        {activeWaypoint && (
          <div className="bg-black/75 backdrop-blur-2xl border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                <span className="text-xs text-rose-400 font-bold">
                  {toPersianDigits(activeWaypoint.timeLabel)}
                </span>
              </div>
              <span className="text-neutral-400 text-xs">
                گام {toPersianDigits(activeWaypointIndex + 1)} از {toPersianDigits(waypoints.length)}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
              {autoPersianText(activeWaypoint.title)}
            </h3>

            <p className="text-neutral-200 text-sm sm:text-base leading-relaxed">
              {autoPersianText(activeWaypoint.narrative)}
            </p>

            {activeWaypoint.quote && (
              <div className="bg-rose-950/30 border-r-4 border-rose-400 p-4 rounded-xl flex items-start gap-3">
                <Quote className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="font-serif italic text-rose-200 text-xs sm:text-sm">
                  {activeWaypoint.quote}
                </p>
              </div>
            )}

            {activeWaypoint.architecturalNote && (
              <div className="text-xs text-neutral-400 flex items-center gap-2 pt-2 border-t border-white/5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>نکته معماری: {activeWaypoint.architecturalNote}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          ناوبری خط زمانی و انتخاب ایستگاه در پایین صفحه (Waypoint Stepper)
          ========================================================================= */}
      <div className="relative z-20 p-6 max-w-4xl mx-auto w-full">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 shadow-2xl">
          {waypoints.map((wp, index) => {
            const isActive = index === activeWaypointIndex;
            return (
              <button
                key={wp.id || index}
                onClick={() => setActiveWaypointIndex(index)}
                className={`flex-1 p-2 sm:p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.03]'
                    : 'bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-neutral-200 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs font-bold">
                  <Milestone className="w-3.5 h-3.5 text-rose-400" />
                  <span>{wp.timeLabel}</span>
                </div>
                <span className="text-[11px] truncate max-w-[120px] hidden sm:block">
                  {wp.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
