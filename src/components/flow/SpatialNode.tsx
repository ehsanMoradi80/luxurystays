/**
 * SpatialNode.tsx
 * 
 * گره کاوشگر سه‌بعدی و تصاویر ۳۶۰ درجه (Spatial 360 Explorer Node) در بوم React Flow
 * تنظیم تصویر پانوراما، زاویه دید (FOV/Yaw/Pitch) و نقاط تعاملی قابل کلیک (Hotspots)
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Compass, Eye, MapPin, Image as ImageIcon } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export interface SpatialNodeDataState extends Record<string, unknown> {
  title: string;
  category?: string;
  panoramaUrl: string;
  initialFov?: number;
  initialYaw?: number;
  initialPitch?: number;
  hotspots?: Array<{ id: string; title: string }>;
}

export type SpatialNodeType = Node<SpatialNodeDataState>;

export const SpatialNode: React.FC<NodeProps<SpatialNodeType>> = memo(({ id, data, selected }) => {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const title = (data?.title as string) || 'کاوشگر ۳۶۰ درجه و تور مجازی';
  const panoramaUrl = (data?.panoramaUrl as string) || '';
  const initialFov = (data?.initialFov as number) || 75;
  const initialYaw = (data?.initialYaw as number) || 180;
  const hotspotsCount = (data?.hotspots as any[])?.length || 2;

  return (
    <div
      id={`flow-node-${id}`}
      dir="rtl"
      className={`w-76 rounded-2xl bg-neutral-900/95 border backdrop-blur-xl shadow-2xl transition-all font-sans text-xs select-none ${
        selected ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-emerald-600/40 hover:border-emerald-400/70'
      }`}
    >
      <Handle
        type="target"
        position={Position.Right}
        id="in"
        className="w-3.5 h-3.5 !bg-emerald-500 !border-2 !border-neutral-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="w-3.5 h-3.5 !bg-emerald-400 !border-2 !border-neutral-900 rounded-full"
      />

      {/* هدر نود */}
      <div className="p-3.5 border-b border-neutral-800 bg-gradient-to-l from-emerald-950/40 to-neutral-900 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider">
                بلوک سه‌بعدی
              </span>
              <span className="text-[9px] px-1 rounded bg-emerald-400/20 text-emerald-300 font-mono">
                360° Spatial
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

      {/* فیلدها و پیش‌نمایش ۳۶۰ */}
      <div className="p-3.5 space-y-3">
        <div>
          <label className="block text-[10px] text-neutral-400 mb-1">عنوان کاوشگر:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-emerald-400 font-sans"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-emerald-400" />
              آدرس تصویر سراسرنما (Equirectangular 360):
            </span>
          </div>
          <input
            type="text"
            dir="ltr"
            value={panoramaUrl}
            onChange={(e) => updateNodeData(id, { panoramaUrl: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 text-[10px] font-mono truncate focus:outline-none focus:border-emerald-400"
            placeholder="https://...360.jpg"
          />
        </div>

        {/* مشخصات دید و هات‌اسپات‌ها */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800">
            <div className="text-[9px] text-neutral-400">زاویه دید (FOV)</div>
            <div className="text-emerald-300 font-mono font-bold text-xs mt-0.5">{initialFov}°</div>
          </div>
          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800">
            <div className="text-[9px] text-neutral-400">زاویه Yaw</div>
            <div className="text-emerald-300 font-mono font-bold text-xs mt-0.5">{initialYaw}°</div>
          </div>
          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800">
            <div className="text-[9px] text-neutral-400">هات‌اسپات‌ها</div>
            <div className="text-emerald-300 font-mono font-bold text-xs mt-0.5 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              {hotspotsCount} نقطه
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-emerald-400" />
            ژیروسکوپ / کشیدن ماوس:
          </span>
          <span className="text-emerald-400 font-semibold">فعال ۳۶۰°</span>
        </div>
      </div>
    </div>
  );
});

SpatialNode.displayName = 'SpatialNode';
