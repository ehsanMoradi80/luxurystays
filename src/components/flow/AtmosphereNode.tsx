/**
 * AtmosphereNode.tsx
 * 
 * گره کنترلر اتمسفر (Atmosphere Controller Node) در بوم React Flow
 * دارای کنترلر بصری تعاملی درون گره برای تنظیم حالت روز/شب، دمای رنگ نوری و پریست‌های لوکس
 */

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Sun, Moon, Sparkles, Sliders, Sunset, Flame } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export interface AtmosphereNodeDataState extends Record<string, unknown> {
  title: string;
  targetSceneId?: string;
  baseMediaUrl?: string;
  timeOfDay: 'dawn' | 'zenith' | 'golden_hour' | 'midnight' | number;
  colorTemperatureK: number;
  activePresetId?: string;
  interactiveControls?: boolean;
}

export type AtmosphereNodeType = Node<AtmosphereNodeDataState>;

export const AtmosphereNode: React.FC<NodeProps<AtmosphereNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const title = (data?.title as string) || 'کنترلر اتمسفر و نورپردازی';
  const colorTemp = (data?.colorTemperatureK as number) || 3200;
  const activePreset = (data?.activePresetId as string) || 'preset-golden';
  const targetSceneId = (data?.targetSceneId as string) || 'env-lobby';

  // تغییر اسلایدر دمای رنگ
  const handleTempChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    updateNodeData(id, { colorTemperatureK: val });
  }, [id, updateNodeData]);

  // انتخاب سریع پریست اتمسفر
  const handleSelectPreset = useCallback((presetId: string, tempK: number) => {
    updateNodeData(id, {
      activePresetId: presetId,
      colorTemperatureK: tempK,
      timeOfDay: presetId.replace('preset-', '')
    });
  }, [id, updateNodeData]);

  return (
    <div
      id={`flow-node-${id}`}
      dir="rtl"
      className={`w-80 rounded-2xl bg-neutral-900/95 border backdrop-blur-xl shadow-2xl transition-all font-sans text-xs select-none ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-amber-600/40 hover:border-amber-400/70'
      }`}
    >
      {/* هَندل اتصال لایه اتمسفر به سکانس‌های تصویری (خروجی مدولاسیون) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="atmosphere-modulate"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-neutral-900 rounded-full"
        title="اتصال لایه اتمسفر به سکانس ویدیویی (Atmosphere Layer)"
      />

      {/* هَندل‌های استاندارد جریان */}
      <Handle
        type="target"
        position={Position.Right}
        id="in"
        className="w-3.5 h-3.5 !bg-amber-500 !border-2 !border-neutral-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر اختصاصی گره اتمسفر */}
      <div className="p-3.5 border-b border-neutral-800 bg-gradient-to-l from-amber-950/40 to-neutral-900 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-400 font-semibold tracking-wider">
                بلوک تجربه پیشرفته
              </span>
              <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-mono">
                Atmosphere
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

      {/* بدنه و کنترلر اتمسفر در بوم ادمین */}
      <div className="p-3.5 space-y-3">
        {/* فیلد عنوان */}
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">نام کنترلر:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-amber-400 font-sans"
            placeholder="مثال: کنترلر اتمسفر نوری شاه‌نشین"
          />
        </div>

        {/* پیش‌نمایش زنده گرادیان نوری فعلی */}
        <div
          className="h-10 rounded-xl border border-neutral-800 flex items-center justify-between px-3 text-[11px] font-medium shadow-inner transition-all duration-300"
          style={{
            background:
              activePreset === 'preset-midnight'
                ? 'linear-gradient(90deg, #090d16 0%, #1e1b4b 100%)'
                : activePreset === 'preset-dawn'
                ? 'linear-gradient(90deg, #fdba74 0%, #bfdbfe 100%)'
                : activePreset === 'preset-zenith'
                ? 'linear-gradient(90deg, #fef08a 0%, #e0f2fe 100%)'
                : 'linear-gradient(90deg, #f59e0b 0%, #7c2d12 100%)',
            color: activePreset === 'preset-midnight' ? '#cbd5e1' : '#18181b',
          }}
        >
          <span className="flex items-center gap-1.5 font-bold">
            {activePreset === 'preset-midnight' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            {activePreset === 'preset-golden' && <Sunset className="w-3.5 h-3.5 text-amber-950" />}
            {activePreset === 'preset-dawn' && <Flame className="w-3.5 h-3.5 text-orange-900" />}
            {activePreset === 'preset-zenith' && <Sun className="w-3.5 h-3.5 text-amber-900" />}
            {activePreset === 'preset-golden' ? 'ساعت طلایی سلطنتی' : activePreset}
          </span>
          <span className="font-mono text-[10px] bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded text-white font-bold">
            {colorTemp}K
          </span>
        </div>

        {/* پریست‌های آماده اتمسفر */}
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1.5">پریست‌های نوری هتل:</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPreset('preset-dawn', 4800)}
              className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                activePreset === 'preset-dawn'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span>پگاه (Dawn)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('preset-zenith', 5800)}
              className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                activePreset === 'preset-zenith'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sun className="w-3 h-3 text-yellow-400" />
              <span>نیمروز (Zenith)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('preset-golden', 3000)}
              className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                activePreset === 'preset-golden'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sunset className="w-3 h-3 text-amber-400" />
              <span>ساعت طلایی</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('preset-midnight', 2600)}
              className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                activePreset === 'preset-midnight'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Moon className="w-3 h-3 text-indigo-400" />
              <span>نیمه‌شب مخملین</span>
            </button>
          </div>
        </div>

        {/* اسلایدر تنظیم پیوسته دمای رنگ (Kelvin) */}
        <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              دمای رنگ (Kelvin):
            </span>
            <span className="font-mono text-amber-300 font-bold">{colorTemp} K</span>
          </div>
          <input
            type="range"
            min={2400}
            max={6500}
            step={50}
            value={colorTemp}
            onChange={handleTempChange}
            className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono mt-1">
            <span>۲۴۰۰K (گرم/شمع)</span>
            <span>۶۵۰۰K (سرد/روز)</span>
          </div>
        </div>

        {/* شناسه سکانس هدف */}
        <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-800/80">
          <span>اعمال روی سکانس:</span>
          <span className="font-mono text-amber-300/80 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            {targetSceneId || 'همه سکانس‌ها'}
          </span>
        </div>
      </div>
    </div>
  );
});

AtmosphereNode.displayName = 'AtmosphereNode';
