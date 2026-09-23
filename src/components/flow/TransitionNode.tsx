/**
 * TransitionNode.tsx
 * 
 * گره اختصاصی بوم React Flow برای "ویدیوهای ترنزیشن بین محیط‌ها" (Transition Node)
 * نمایانگر حرکت پیوسته دوربین بین دو فضا با امکان تنظیم ویدیوهای دسکتاپ و موبایل
 * با پشتیبانی کامل از زبان فارسی و فونت وزیرمتن
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Film, Monitor, Smartphone, Sliders } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export type TransitionNodeType = Node<{
  label: string;
  triggerType: string;
  duration: number;
  desktopUrl: string;
  mobileUrl: string;
}>;

export const TransitionNode: React.FC<NodeProps<TransitionNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const label = (data?.label as string) || 'سکانس گذر دوربین';
  const triggerType = (data?.triggerType as string) || 'scroll';
  const duration = (data?.duration as number) || 4.5;
  const desktopUrl = (data?.desktopUrl as string) || '';
  const mobileUrl = (data?.mobileUrl as string) || '';

  return (
    <div
      id={`flow-transition-node-${id}`}
      dir="rtl"
      className={`w-64 rounded-xl bg-neutral-900/95 border backdrop-blur-md shadow-2xl transition-all font-sans text-xs ${
        selected ? 'border-sky-400 ring-2 ring-sky-400/20' : 'border-neutral-700/80 hover:border-neutral-500'
      }`}
    >
      {/* هَندل ورودی: اتصال از گره محیط مبدا */}
      <Handle
        type="target"
        position={Position.Right}
        id="trans-in"
        className="w-3.5 h-3.5 !bg-sky-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر گره ترنزیشن */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-sky-950/20 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-300">
            <Film className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-sky-400/80 block">
              سکانس ترنزیشن
            </span>
            <h4 className="font-semibold text-neutral-100 text-xs truncate max-w-[130px]">
              {label}
            </h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
          {id}
        </span>
      </div>

      {/* فیلدها و جزئیات ترنزیشن */}
      <div className="p-3 space-y-2.5">
        {/* عنوان ترنزیشن */}
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">عنوان ترنزیشن:</label>
          <input
            type="text"
            value={label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-200 text-[11px] focus:outline-none focus:border-sky-400/60 font-sans"
            placeholder="مثال: پرواز دوربین به تالار لابی"
          />
        </div>

        {/* نوع تریگر و مدت زمان */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">روش اجرا:</label>
            <select
              value={triggerType}
              onChange={(e) => updateNodeData(id, { triggerType: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 text-[10px] focus:outline-none focus:border-sky-400/60 font-sans"
            >
              <option value="scroll">اسکرول (Scrub)</option>
              <option value="click">کلیک مستقیم</option>
              <option value="hotspot">نقطه تعاملی</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">مدت زمان (ثانیه):</label>
            <input
              type="number"
              step="0.1"
              value={duration}
              onChange={(e) => updateNodeData(id, { duration: parseFloat(e.target.value) || 0 })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 text-[10px] font-mono focus:outline-none focus:border-sky-400/60"
            />
          </div>
        </div>

        {/* آدرس ویدیوی ترنزیشن دسکتاپ 16:9 */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3 text-sky-400" /> ویدیوی ۱۶:۹ دسکتاپ
            </span>
          </div>
          <input
            type="text"
            dir="ltr"
            value={desktopUrl}
            onChange={(e) => updateNodeData(id, { desktopUrl: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 text-[10px] font-mono truncate focus:outline-none focus:border-sky-400/60"
            placeholder="https://...mp4"
          />
        </div>

        {/* آدرس ویدیوی ترنزیشن موبایل 9:16 */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" /> ویدیوی ۹:۱۶ عمودی
            </span>
          </div>
          <input
            type="text"
            dir="ltr"
            value={mobileUrl}
            onChange={(e) => updateNodeData(id, { mobileUrl: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 text-[10px] font-mono truncate focus:outline-none focus:border-emerald-400/60"
            placeholder="https://...mp4"
          />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-sky-400" /> ویدیوی غیر لوپ (متحرک)
          </span>
          <span className="text-[9px] text-sky-400/80">بدون لگ</span>
        </div>
      </div>

      {/* هَندل خروجی: اتصال به گره محیط مقصد */}
      <Handle
        type="source"
        position={Position.Left}
        id="trans-out"
        className="w-3.5 h-3.5 !bg-sky-400 !border-2 !border-neutral-900 rounded-full"
      />
    </div>
  );
});

TransitionNode.displayName = 'TransitionNode';
