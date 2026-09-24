/**
 * ComparisonNode.tsx
 * 
 * گره مقایسه داینامیک (Comparison Node) در بوم React Flow
 * مقایسه هوشمند دو سوئیت، دو نما یا حالت قبل/بعد با اسلایدر تفکیک تصویر (Split Slider)
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Columns, SplitSquareVertical, ArrowRightLeft } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export interface ComparisonNodeDataState extends Record<string, unknown> {
  title: string;
  comparisonMode?: 'split_slider' | 'toggle_fade' | 'side_by_side';
  initialSplitRatio?: number;
  entityA?: { title: string; subtitle?: string; badge?: string };
  entityB?: { title: string; subtitle?: string; badge?: string };
}

export type ComparisonNodeType = Node<ComparisonNodeDataState>;

export const ComparisonNode: React.FC<NodeProps<ComparisonNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const title = (data?.title as string) || 'مقایسه داینامیک اقامتگاه‌ها';
  const mode = data?.comparisonMode || 'split_slider';
  const entityA = data?.entityA || { title: 'پنت‌هاوس امپریال', badge: 'دید افق دریا' };
  const entityB = data?.entityB || { title: 'ویلای ساحلی', badge: 'دسترسی شن‌های ساحل' };

  return (
    <div
      id={`flow-node-${id}`}
      dir="rtl"
      className={`w-80 rounded-2xl bg-neutral-900/95 border backdrop-blur-xl shadow-2xl transition-all font-sans text-xs select-none ${
        selected ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-cyan-600/40 hover:border-cyan-400/70'
      }`}
    >
      <Handle
        type="target"
        position={Position.Right}
        id="in-a"
        className="w-3.5 h-3.5 !bg-cyan-500 !border-2 !border-neutral-900 rounded-full"
        title="ورودی هویت اول (Entity A)"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-b"
        className="w-3.5 h-3.5 !bg-cyan-400 !border-2 !border-neutral-900 rounded-full"
        title="ورودی هویت دوم (Entity B)"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-cyan-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر */}
      <div className="p-3.5 border-b border-neutral-800 bg-gradient-to-l from-cyan-950/40 to-neutral-900 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
            <Columns className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-cyan-400 font-semibold tracking-wider">
                مقایسه تعاملی
              </span>
              <span className="text-[9px] px-1 rounded bg-cyan-400/20 text-cyan-300 font-mono">
                Comparison
              </span>
            </div>
            <h4 className="font-bold text-neutral-100 text-xs truncate max-w-[160px]">
              {title}
            </h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700">
          {id}
        </span>
      </div>

      {/* بدنه و تنظیمات مقایسه */}
      <div className="p-3.5 space-y-3">
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">عنوان بلوک مقایسه:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-cyan-400 font-sans"
          />
        </div>

        {/* کارت‌های مقایسه دو موجودیت */}
        <div className="grid grid-cols-2 gap-2">
          {/* هویت الف */}
          <div className="bg-neutral-950/90 border border-cyan-500/30 rounded-xl p-2.5">
            <span className="text-[9px] text-cyan-400 font-mono block mb-1">گزینه ۱ (الف)</span>
            <span className="font-semibold text-neutral-200 text-[11px] block truncate">
              {entityA.title}
            </span>
            <span className="text-[9px] text-neutral-400 block mt-0.5 truncate">
              {entityA.badge || 'سوئیت اول'}
            </span>
          </div>

          {/* هویت ب */}
          <div className="bg-neutral-950/90 border border-amber-500/30 rounded-xl p-2.5">
            <span className="text-[9px] text-amber-400 font-mono block mb-1">گزینه ۲ (ب)</span>
            <span className="font-semibold text-neutral-200 text-[11px] block truncate">
              {entityB.title}
            </span>
            <span className="text-[9px] text-neutral-400 block mt-0.5 truncate">
              {entityB.badge || 'سوئیت دوم'}
            </span>
          </div>
        </div>

        {/* حالت رندر مقایسه */}
        <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
          <span className="flex items-center gap-1.5 text-neutral-300">
            <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-400" />
            حالت نمایش:
          </span>
          <span className="font-mono text-cyan-300 font-semibold">
            {mode === 'split_slider' ? 'اسلایدر Before/After' : 'پهلو به پهلو'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
          <span className="flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
            کنترل: درگ هندل تقسیم
          </span>
          <span className="text-cyan-400 font-mono">نسبت ۵۰/۵۰</span>
        </div>
      </div>
    </div>
  );
});

ComparisonNode.displayName = 'ComparisonNode';
