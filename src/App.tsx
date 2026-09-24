/**
 * App.tsx
 * 
 * سایت و موتور خلق تجربه دیجیتال هتل ۵ ستاره فوق لوکس قصر لورا
 * پشتیبانی از معماری تعاملی و بلوک‌های تجربه پیشرفته:
 * - ExperienceEngine: رندر هوشمند بر اساس نوع گره (سکانس‌های ویدیویی، کاوشگر ۳۶۰، کنترلر اتمسفر، روایت داستان، مقایسه)
 * - FlowCanvas: بوم گره‌محور React Flow برای مدیریت معماری و استخراج JSON
 */

import React, { useState } from 'react';
import { FlowCanvas } from './components/FlowCanvas';
import { ExperienceEngine } from './components/ExperienceEngine';
import sampleGraphData from './data/sampleSequenceGraph.json';
import { SequenceGraph } from './types/sequenceGraph';

export default function App() {
  const [activeView, setActiveView] = useState<'EXPERIENCE' | 'FLOW_BUILDER'>('EXPERIENCE');
  const [previewNodeId, setPreviewNodeId] = useState<string>('env-gate');

  // سوئیچ به پنل بوم ادمین React Flow
  const handleOpenFlowCanvas = () => {
    setActiveView('FLOW_BUILDER');
  };

  // سوئیچ به فرانت‌اند تجربه زنده
  const handleSwitchToExperience = () => {
    setActiveView('EXPERIENCE');
  };

  // پیش‌نمایش مستقیم یک گره خاص در فرانت‌اند
  const handlePreviewNode = (nodeId: string) => {
    setPreviewNodeId(nodeId);
    setActiveView('EXPERIENCE');
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none font-sans">
      {activeView === 'FLOW_BUILDER' ? (
        <FlowCanvas
          onSwitchToExperience={handleSwitchToExperience}
          onPreviewNode={handlePreviewNode}
        />
      ) : (
        <ExperienceEngine
          graph={sampleGraphData as unknown as SequenceGraph}
          initialNodeId={previewNodeId}
          onOpenFlowCanvas={handleOpenFlowCanvas}
          isAdmin={true}
        />
      )}
    </main>
  );
}
