/**
 * AudioNode.tsx
 * 
 * گره منظره صوتی (Audio Soundscape Node) در بوم React Flow
 * پشتیبانی از اتصال و اجرای موازی (Parallel Execution) با سکانس‌های ویدیویی،
 * تنظیمات ولوم، محو شدن تدریجی (Fade In/Out) و لوپ نامحدود
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Music, Volume2, Radio, GitFork, Sliders } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export interface AudioNodeDataState extends Record<string, unknown> {
  title: string;
  ambientTone: string;
  volume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  loop: boolean;
  isParallelAttachment: boolean;
  parallelTargetSequenceId?: string;
}

export type AudioNodeType = Node<AudioNodeDataState>;

export const AudioNode: React.FC<NodeProps<AudioNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const title = (data?.title as string) || 'منظره صوتی فراگیر';
  const ambientTone = (data?.ambientTone as string) || 'marble_hall_reverb';
  const volume = (data?.volume as number) !== undefined ? (data?.volume as number) : 0.6;
  const fadeIn = (data?.fadeInDuration as number) || 2.5;
  const isParallel = data?.isParallelAttachment !== false;
  const targetSeq = (data?.parallelTargetSequenceId as string) || 'env-lobby';

  return (
    <div
      id={`flow-node-${id}`}
      dir="rtl"
      className={`w-76 rounded-2xl bg-neutral-900/95 border backdrop-blur-xl shadow-2xl transition-all font-sans text-xs select-none ${
        selected ? 'border-purple-400 ring-2 ring-purple-400/30' : 'border-purple-600/40 hover:border-purple-400/70'
      }`}
    >
      {/* هَندل پیوند موازی (Parallel Edge Connection Handle) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="parallel-audio-out"
        className="w-3.5 h-3.5 !bg-purple-400 !border-2 !border-neutral-900 rounded-full"
        title="اتصال اجرای موازی به سکانس ویدیویی (Parallel Audio)"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in"
        className="w-3.5 h-3.5 !bg-purple-500 !border-2 !border-neutral-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-purple-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر */}
      <div className="p-3.5 border-b border-neutral-800 bg-gradient-to-l from-purple-950/40 to-neutral-900 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
            <Music className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-400 font-semibold tracking-wider">
                صوت فضایی موازی
              </span>
              <span className="text-[9px] px-1 rounded bg-purple-400/20 text-purple-300 font-mono">
                Parallel Audio
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

      {/* بدنه و کنترل‌های صوتی */}
      <div className="p-3.5 space-y-3">
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">نام قطعه / منظره صوتی:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-purple-400 font-sans"
          />
        </div>

        {/* انتخاب تن صوتی */}
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">پروفایل تن صدا:</label>
          <select
            value={ambientTone}
            onChange={(e) => updateNodeData(id, { ambientTone: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-purple-300 text-xs focus:outline-none focus:border-purple-400 font-sans cursor-pointer"
          >
            <option value="marble_hall_reverb">طنین تالار مرمر (Marble Hall Reverb)</option>
            <option value="welcoming_strings">سازهای زهی خوش‌آمدگویی (Warm Strings)</option>
            <option value="ocean_breeze">نسیم اقیانوس و امواج ساحل (Ocean Breeze)</option>
            <option value="crystal_water">آبشار کریستالی و استخر (Crystal Water)</option>
            <option value="jazz_lounge">نوای مخملین جز لاونج (Midnight Jazz)</option>
          </select>
        </div>

        {/* اسلایدر ولوم */}
        <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              شدت صدا (Volume):
            </span>
            <span className="font-mono text-purple-300 font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => updateNodeData(id, { volume: parseFloat(e.target.value) })}
            className="w-full accent-purple-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* اتصال موازی به سکانس */}
        <div className="bg-purple-950/20 border border-purple-800/30 p-2 rounded-xl flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-purple-300">
            <GitFork className="w-3 h-3 text-purple-400" />
            اجرای همگام با سکانس:
          </span>
          <span className="font-mono text-neutral-200 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700">
            {targetSeq}
          </span>
        </div>

        {/* فید این / فید اوت */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
          <span>فید نرم: {fadeIn}s Fade In/Out</span>
          <span className="text-emerald-400 font-mono">Loop: پیوسته</span>
        </div>
      </div>
    </div>
  );
});

AudioNode.displayName = 'AudioNode';
