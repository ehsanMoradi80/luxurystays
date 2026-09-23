/**
 * EnvironmentNode.tsx
 * 
 * گره اختصاصی بوم React Flow برای "محیط‌ها و فضاهای هتل" (Environment Node)
 * نمایانگر یک فضای فیزیکی دارای ویدیوی لوپ پیوسته (Ambient Video Loop)
 * با پشتیبانی کامل از زبان فارسی و فونت وزیرمتن
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Video, Layers, Monitor, Smartphone } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export type EnvironmentNodeType = Node<{
  title: string;
  category: string;
  slug: string;
  desktopUrl: string;
  mobileUrl: string;
  duration: number;
  description?: string;
}>;

export const EnvironmentNode: React.FC<NodeProps<EnvironmentNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const title = (data?.title as string) || 'فضای بدون نام';
  const category = (data?.category as string) || 'محیط اقامتی';
  const desktopUrl = (data?.desktopUrl as string) || '';
  const mobileUrl = (data?.mobileUrl as string) || '';
  const duration = (data?.duration as number) || 10;

  return (
    <div
      id={`flow-node-${id}`}
      dir="rtl"
      className={`w-72 rounded-xl bg-neutral-900/95 border backdrop-blur-md shadow-2xl transition-all font-sans text-xs ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-neutral-700/80 hover:border-neutral-500'
      }`}
    >
      {/* هَندل ورودی برای اتصال ترنزیشن‌هایی که به این فضا ختم می‌شوند */}
      <Handle
        type="target"
        position={Position.Right}
        id="in"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر گره */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-amber-400/80 block">
              {category}
            </span>
            <h4 className="font-semibold text-neutral-100 text-xs truncate max-w-[150px]">
              {title}
            </h4>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
          {id}
        </span>
      </div>

      {/* بدنه و تنظیمات رسانه‌ها */}
      <div className="p-3 space-y-2.5">
        {/* فیلد عنوان */}
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">نام فضا:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-200 text-[11px] focus:outline-none focus:border-amber-400/60 font-sans"
            placeholder="مثال: لابی مرکزی قصر"
          />
        </div>

        {/* فیلد ویدیوی لوپ دسکتاپ 16:9 */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3 text-sky-400" /> ویدیوی افقی ۱۶:۹ (دسکتاپ)
            </span>
            <span className="text-neutral-500 font-mono">{duration} ثانیه</span>
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

        {/* فیلد ویدیوی لوپ موبایل 9:16 */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" /> ویدیوی عمودی ۹:۱۶ (موبایل)
            </span>
            <span className="text-[9px] text-emerald-400/80">عمودی</span>
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

        {/* وضعیت لوپ */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3 text-amber-400" /> لوپ محیطی فعال
          </span>
          <span className="text-[9px] text-amber-400/70">پیوسته و بی‌پایان</span>
        </div>
      </div>

      {/* هَندل خروجی برای خروج ترنزیشن از این محیط */}
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-neutral-900 rounded-full"
      />
    </div>
  );
});

EnvironmentNode.displayName = 'EnvironmentNode';
