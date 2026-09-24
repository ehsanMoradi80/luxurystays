/**
 * StoryTimelineNode.tsx
 * 
 * گره روایت داستان (Story Timeline Node) در بوم React Flow
 * تنظیم تایم‌لاین اسکرولی تعاملی هتل با نقاط عطف تاریخی (Waypoints) و نقل‌قول‌ها
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BookOpen, Milestone, Clock, Scroll } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export interface StoryTimelineNodeDataState extends Record<string, unknown> {
  title: string;
  chapterTitle?: string;
  era?: string;
  waypoints?: Array<{ id: string; timeLabel: string; title: string }>;
}

export type StoryTimelineNodeType = Node<StoryTimelineNodeDataState>;

export const StoryTimelineNode: React.FC<NodeProps<StoryTimelineNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const title = (data?.title as string) || 'تایم‌لاین روایت تاریخی هتل';
  const chapter = (data?.chapterTitle as string) || 'میراث یک سده شکوه سلطنتی';
  const era = (data?.era as string) || '۱۹۲۴ - ۲۰۲۶';
  const waypoints = (data?.waypoints as any[]) || [
    { id: '1', timeLabel: '۱۹۲۴', title: 'بنیان‌گذاری کاخ بر فراز صخره' },
    { id: '2', timeLabel: '۱۹۶۸', title: 'نشست‌های تاریخی و سوئیت‌های سلطنتی' },
    { id: '3', timeLabel: 'عصر حاضر', title: 'بازآفرینی دیجیتال و زیست‌بوم مدرن' },
  ];

  return (
    <div
      id={`flow-node-${id}`}
      dir="rtl"
      className={`w-76 rounded-2xl bg-neutral-900/95 border backdrop-blur-xl shadow-2xl transition-all font-sans text-xs select-none ${
        selected ? 'border-rose-400 ring-2 ring-rose-400/30' : 'border-rose-600/40 hover:border-rose-400/70'
      }`}
    >
      <Handle
        type="target"
        position={Position.Right}
        id="in"
        className="w-3.5 h-3.5 !bg-rose-500 !border-2 !border-neutral-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-rose-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر */}
      <div className="p-3.5 border-b border-neutral-800 bg-gradient-to-l from-rose-950/40 to-neutral-900 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shadow-inner">
            <BookOpen className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-rose-400 font-semibold tracking-wider">
                روایت تعاملی
              </span>
              <span className="text-[9px] px-1 rounded bg-rose-400/20 text-rose-300 font-mono">
                Storyline
              </span>
            </div>
            <h4 className="font-bold text-neutral-100 text-xs truncate max-w-[150px]">
              {title}
            </h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700">
          {id}
        </span>
      </div>

      {/* فیلدها و ایستگاه‌های روایت */}
      <div className="p-3.5 space-y-3">
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">عنوان فصل روایت:</label>
          <input
            type="text"
            value={chapter}
            onChange={(e) => updateNodeData(id, { chapterTitle: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-rose-400 font-sans"
          />
        </div>

        <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl border border-neutral-800 text-[10px]">
          <span className="flex items-center gap-1 text-neutral-400">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            بازه تاریخی:
          </span>
          <span className="font-mono text-rose-300 font-bold">{era}</span>
        </div>

        {/* پیش‌نمایش نقاط عطف (Waypoints) */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Milestone className="w-3.5 h-3.5 text-rose-400" />
              ایستگاه‌های اسکرولی ({waypoints.length} نقطه عطف):
            </span>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {waypoints.map((wp, idx) => (
              <div
                key={wp.id || idx}
                className="bg-neutral-950/70 border border-neutral-800/80 p-2 rounded-lg flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                  {idx + 1}
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] text-rose-400 font-mono block">{wp.timeLabel}</span>
                  <span className="text-[11px] text-neutral-300 font-medium truncate block">
                    {wp.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
          <span className="flex items-center gap-1">
            <Scroll className="w-3 h-3 text-rose-400" />
            ناوبری: اسکرول تعاملی
          </span>
          <span className="text-rose-400 font-semibold">پشتیبانی از GSAP</span>
        </div>
      </div>
    </div>
  );
});

StoryTimelineNode.displayName = 'StoryTimelineNode';
