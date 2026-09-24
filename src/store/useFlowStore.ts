/**
 * useFlowStore.ts
 * 
 * Zustand Store برای مدیریت وضعیت بوم گره‌محور (Node-based Flow Canvas) در پنل ادمین
 * پشتیبانی کامل از انواع گره‌های پیشرفته:
 * - EnvironmentNode (سکانس تصویری)
 * - TransitionNode (ترنزیشن ویدیویی)
 * - AtmosphereNode (کنترلر اتمسفر و نورپردازی)
 * - SpatialNode (کاوشگر سه‌بعدی و تصاویر ۳۶۰)
 * - AudioNode (منظره صوتی موازی)
 * - StoryTimelineNode (روایت تاریخی هتل)
 * - ComparisonNode (مقایسه داینامیک اقامتگاه‌ها)
 */

import { create } from 'zustand';
import { 
  Node, 
  Edge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge, 
  NodeChange, 
  EdgeChange, 
  Connection 
} from '@xyflow/react';
import { 
  SequenceGraph, 
  ExperienceNodeData, 
  TransitionEdgeData,
  EnvironmentNodeData,
  SpatialNodeData,
  AtmosphereNodeData,
  AudioNodeData,
  StoryTimelineNodeData,
  ComparisonNodeData
} from '../types/sequenceGraph';
import sampleGraphData from '../data/sampleSequenceGraph.json';

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  hotelTitle: string;
  
  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHotelTitle: (title: string) => void;
  
  // Node Creation
  addEnvironmentNode: (title?: string) => void;
  addTransitionNode: (label?: string) => void;
  addAtmosphereNode: (title?: string) => void;
  addSpatialNode: (title?: string) => void;
  addAudioNode: (title?: string) => void;
  addStoryTimelineNode: (title?: string) => void;
  addComparisonNode: (title?: string) => void;
  
  // Data Mutation
  updateNodeData: (id: string, data: Record<string, any>) => void;
  deleteNode: (id: string) => void;
  
  // Graph Import / Export
  exportSequenceGraph: () => SequenceGraph;
  loadFromSequenceGraph: (graph: SequenceGraph) => void;
  resetToSample: () => void;
}

// ساخت چیدمان اولیه با نودهای پایه و نودهای تجربه پیشرفته
const generateInitialFlow = () => {
  const initialNodes: Node[] = [
    // ۱. گره ورودی محیط اول
    {
      id: 'env-gate',
      type: 'environmentNode',
      position: { x: 50, y: 160 },
      data: {
        title: "The Cypress Portal & Arrival Court",
        category: "Arrival",
        slug: "arrival-court",
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-exterior-of-a-luxurious-hotel-at-night-42790-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-exterior-of-a-luxurious-hotel-at-night-42790-large.mp4",
        duration: 9.5,
      },
    },
    // ۲. ترنزیشن به لابی
    {
      id: 'trans-gate-lobby',
      type: 'transitionNode',
      position: { x: 420, y: 160 },
      data: {
        label: "ورود از درگاه برنزی به تالار مرمر",
        triggerType: "click",
        duration: 4.8,
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
      },
    },
    // ۳. گره لابی مرکزی
    {
      id: 'env-lobby',
      type: 'environmentNode',
      position: { x: 780, y: 160 },
      data: {
        title: "The Grand Marble Atrium & Lobby",
        category: "Sanctuary",
        slug: "grand-atrium",
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
        duration: 12.0,
      },
    },
    // ۴. کنترلر اتمسفر نوری متصل به لابی
    {
      id: 'atmosphere-lobby-lighting',
      type: 'atmosphereNode',
      position: { x: 780, y: -230 },
      data: {
        title: "کنترلر اتمسفر نوری شاه‌نشین",
        targetSceneId: "env-lobby",
        timeOfDay: "golden_hour",
        colorTemperatureK: 3200,
        activePresetId: "preset-golden",
        interactiveControls: true,
      },
    },
    // ۵. گره صوتی اجرای موازی با لابی
    {
      id: 'audio-atrium-parallel',
      type: 'audioNode',
      position: { x: 420, y: -190 },
      data: {
        title: "منظره صوتی هارمونیک تالار مرمر",
        ambientTone: "marble_hall_reverb",
        volume: 0.65,
        fadeInDuration: 2.5,
        fadeOutDuration: 3.0,
        loop: true,
        isParallelAttachment: true,
        parallelTargetSequenceId: "env-lobby",
      },
    },
    // ۶. کاوشگر ۳۶۰ درجه منشعب از لابی
    {
      id: 'spatial-360-atrium',
      type: 'spatialNode',
      position: { x: 1200, y: 20 },
      data: {
        title: "کاوشگر ۳۶۰ درجه گنبد مرمرین قصر",
        panoramaUrl: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=2400&q=85",
        initialFov: 75,
        initialYaw: 180,
        hotspots: [
          { id: 'hs-chandelier', title: 'لوستر کریستال باکارا ۱۹۲۴' },
          { id: 'hs-fountain', title: 'آب‌نمای ابسیدین سیاه' },
        ],
      },
    },
    // ۷. تایم‌لاین روایت تاریخی قصر
    {
      id: 'story-heritage-timeline',
      type: 'storyTimelineNode',
      position: { x: 1200, y: 380 },
      data: {
        title: "تایم‌لاین روایت تاریخی قصر لورا",
        chapterTitle: "میراث یک سده شکوه معماری سلطنتی",
        era: "۱۹۲۴ - ۲۰۲۶",
        waypoints: [
          { id: 'wp-1', timeLabel: '۱۹۲۴ میلادی', title: 'بنیان‌گذاری کاخ بر فراز صخره مرمرین' },
          { id: 'wp-2', timeLabel: '۱۹۶۸ میلادی', title: 'پذیرایی از پادشاهان و سوئیت‌های سلطنتی' },
          { id: 'wp-3', timeLabel: 'عصر حاضر', title: 'بازآفرینی دیجیتال و زیست‌بوم آینده' },
        ],
      },
    },
    // ۸. مقایسه داینامیک پنت‌هاوس در برابر ویلای ساحلی
    {
      id: 'comparison-penthouse-vs-villa',
      type: 'comparisonNode',
      position: { x: 780, y: 550 },
      data: {
        title: "مقایسه داینامیک: پنت‌هاوس در برابر ویلا",
        comparisonMode: "split_slider",
        initialSplitRatio: 50,
        entityA: { title: "پنت‌هاوس سلطنتی امپریال", badge: "خط افق دریا" },
        entityB: { title: "ویلای ساحلی نیلوفر آبی", badge: "دسترسی مستقیم دریا" },
      },
    },
    // ۹. استخر اینفینیتی و صخره ساحلی
    {
      id: 'env-pool',
      type: 'environmentNode',
      position: { x: 1200, y: 720 },
      data: {
        title: "Azure Coastal Infinity Oasis",
        category: "Wellness",
        slug: "infinity-oasis",
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-resort-with-swimming-pools-42794-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-resort-with-swimming-pools-42794-large.mp4",
        duration: 10.2,
      },
    },
  ];

  const initialEdges: Edge[] = [
    // ترنزیشن ورودی به لابی
    {
      id: 'e-gate-trans',
      source: 'env-gate',
      target: 'trans-gate-lobby',
      animated: true,
      style: { stroke: '#fbbf24', strokeWidth: 2.5 },
    },
    {
      id: 'e-trans-lobby',
      source: 'trans-gate-lobby',
      target: 'env-lobby',
      animated: true,
      style: { stroke: '#fbbf24', strokeWidth: 2.5 },
    },
    // لایه‌گذاری کنترلر اتمسفر روی لابی (زرد طلایی و خط‌چین)
    {
      id: 'e-atmo-lobby',
      source: 'atmosphere-lobby-lighting',
      sourceHandle: 'atmosphere-modulate',
      target: 'env-lobby',
      targetHandle: 'in',
      animated: true,
      label: 'لایه اتمسفر (Atmosphere Layer)',
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' },
    },
    // اجرای موازی صوت با لابی (بنفش)
    {
      id: 'e-audio-lobby-parallel',
      source: 'audio-atrium-parallel',
      sourceHandle: 'parallel-audio-out',
      target: 'env-lobby',
      targetHandle: 'in',
      animated: true,
      label: 'صوت موازی (Parallel Audio)',
      style: { stroke: '#c084fc', strokeWidth: 2, strokeDasharray: '5 5' },
    },
    // انشعاب تعاملی به کاوشگر ۳۶۰ درجه (سبز زمردی)
    {
      id: 'e-lobby-spatial',
      source: 'env-lobby',
      target: 'spatial-360-atrium',
      animated: true,
      label: 'کاوشگر ۳۶۰° (360 Branch)',
      style: { stroke: '#34d399', strokeWidth: 2.5 },
    },
    // انشعاب به تایم‌لاین روایت تاریخی (سرخابی)
    {
      id: 'e-lobby-story',
      source: 'env-lobby',
      target: 'story-heritage-timeline',
      animated: true,
      label: 'روایت تاریخ (Storyline)',
      style: { stroke: '#fb7185', strokeWidth: 2 },
    },
    // انشعاب مقایسه اقامتگاه‌ها (فیروزه‌ای)
    {
      id: 'e-lobby-compare',
      source: 'env-lobby',
      target: 'comparison-penthouse-vs-villa',
      animated: true,
      label: 'مقایسه داینامیک (Comparison)',
      style: { stroke: '#22d3ee', strokeWidth: 2 },
    },
    // ترنزیشن به استخر
    {
      id: 'e-lobby-pool',
      source: 'env-lobby',
      target: 'env-pool',
      animated: true,
      label: 'گذر به ساحل و استخر',
      style: { stroke: '#38bdf8', strokeWidth: 2.5 },
    },
  ];

  return { initialNodes, initialEdges };
};

const { initialNodes, initialEdges } = generateInitialFlow();

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  hotelTitle: "L'Aura Palace & Royal Sanctuary",

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    // تعیین رنگ خط بر اساس نوع اتصال
    let strokeColor = '#fbbf24';
    if (connection.sourceHandle?.includes('atmosphere')) {
      strokeColor = '#f59e0b';
    } else if (connection.sourceHandle?.includes('parallel-audio')) {
      strokeColor = '#c084fc';
    }

    set({
      edges: addEdge(
        { 
          ...connection, 
          animated: true, 
          style: { stroke: strokeColor, strokeWidth: 2 } 
        }, 
        get().edges
      ),
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHotelTitle: (title) => set({ hotelTitle: title }),

  // ۱. افزودن گره محیطی (ویدیو لوپ)
  addEnvironmentNode: (title = 'محیط اقامتی جدید') => {
    const newId = `env-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'environmentNode',
      position: { x: 250 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        title,
        category: 'Sanctuary',
        slug: `space-${Date.now()}`,
        desktopUrl: 'https://assets.mixkit.co/videos/preview/mixkit-exterior-of-a-luxurious-hotel-at-night-42790-large.mp4',
        mobileUrl: 'https://assets.mixkit.co/videos/preview/mixkit-exterior-of-a-luxurious-hotel-at-night-42790-large.mp4',
        duration: 10.0,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ۲. افزودن گره ترنزیشن ویدیویی
  addTransitionNode: (label = 'ترنزیشن سینمایی') => {
    const newId = `trans-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'transitionNode',
      position: { x: 450 + Math.random() * 80, y: 250 + Math.random() * 80 },
      data: {
        label,
        triggerType: 'click',
        duration: 4.5,
        desktopUrl: 'https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4',
        mobileUrl: 'https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4',
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ۳. افزودن گره کنترلر اتمسفر
  addAtmosphereNode: (title = 'کنترلر اتمسفر و نورپردازی') => {
    const newId = `atmosphere-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'atmosphereNode',
      position: { x: 300 + Math.random() * 100, y: 80 + Math.random() * 80 },
      data: {
        title,
        targetSceneId: 'env-lobby',
        timeOfDay: 'golden_hour',
        colorTemperatureK: 3200,
        activePresetId: 'preset-golden',
        interactiveControls: true,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ۴. افزودن گره کاوشگر ۳۶۰ درجه
  addSpatialNode: (title = 'کاوشگر ۳۶۰ درجه فضا') => {
    const newId = `spatial-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'spatialNode',
      position: { x: 500 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: {
        title,
        panoramaUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=2400&q=85',
        initialFov: 75,
        initialYaw: 180,
        hotspots: [{ id: 'hs-1', title: 'نقطه جذابیت معماری' }],
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ۵. افزودن گره منظره صوتی موازی
  addAudioNode: (title = 'منظره صوتی فراگیر') => {
    const newId = `audio-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'audioNode',
      position: { x: 350 + Math.random() * 100, y: 100 + Math.random() * 80 },
      data: {
        title,
        ambientTone: 'marble_hall_reverb',
        volume: 0.6,
        fadeInDuration: 2.0,
        fadeOutDuration: 2.5,
        loop: true,
        isParallelAttachment: true,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ۶. افزودن گره روایت داستان
  addStoryTimelineNode: (title = 'روایت تاریخی هتل') => {
    const newId = `story-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'storyTimelineNode',
      position: { x: 550 + Math.random() * 100, y: 300 + Math.random() * 100 },
      data: {
        title,
        chapterTitle: 'فصل جدید شکوه قصر',
        era: '۱۹۲۴ - ۲۰۲۶',
        waypoints: [
          { id: '1', timeLabel: 'آغاز', title: 'نقطه آغاز روایت' },
          { id: '2', timeLabel: 'توسعه', title: 'سازه اختصاصی' },
        ],
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ۷. افزودن گره مقایسه داینامیک
  addComparisonNode: (title = 'مقایسه داینامیک اقامتگاه‌ها') => {
    const newId = `comparison-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'comparisonNode',
      position: { x: 450 + Math.random() * 100, y: 400 + Math.random() * 100 },
      data: {
        title,
        comparisonMode: 'split_slider',
        initialSplitRatio: 50,
        entityA: { title: 'سوئیت اول', badge: 'دید دریا' },
        entityB: { title: 'سوئیت دوم', badge: 'دید باغ' },
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // به‌روزرسانی اطلاعات یک گره
  updateNodeData: (id: string, partialData: Record<string, any>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...partialData,
            },
          };
        }
        return node;
      }),
    });
  },

  // حذف گره
  deleteNode: (id: string) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
    });
  },

  // استخراج SequenceGraph استاندارد جهت استفاده فرانت‌اند
  exportSequenceGraph: (): SequenceGraph => {
    const state = get();
    
    // تبدیل تمام نودها به فرمت ساخت‌یافته ExperienceNodeData
    const nodes: ExperienceNodeData[] = state.nodes.map((n) => {
      const type = n.type;
      if (type === 'atmosphereNode') {
        const atmo: AtmosphereNodeData = {
          id: n.id,
          type: 'atmosphereNode',
          title: String(n.data?.title || 'کنترلر اتمسفر'),
          targetSceneId: String(n.data?.targetSceneId || 'env-lobby'),
          baseMediaUrl: String(n.data?.baseMediaUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80'),
          timeOfDay: (n.data?.timeOfDay as any) || 'golden_hour',
          colorTemperatureK: Number(n.data?.colorTemperatureK) || 3200,
          activePresetId: String(n.data?.activePresetId || 'preset-golden'),
          interactiveControls: true,
          presets: (sampleGraphData.nodes.find((item: any) => item.id === 'atmosphere-lobby-lighting') as any)?.presets || [],
        };
        return atmo;
      }
      if (type === 'spatialNode') {
        const spatial: SpatialNodeData = {
          id: n.id,
          type: 'spatialNode',
          title: String(n.data?.title || 'کاوشگر ۳۶۰ درجه'),
          slug: `spatial-${n.id}`,
          category: 'Sanctuary',
          description: 'کاوشگر تعاملی سه‌بعدی',
          panoramaUrl: String(n.data?.panoramaUrl || 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=2400&q=85'),
          initialFov: Number(n.data?.initialFov) || 75,
          initialYaw: Number(n.data?.initialYaw) || 180,
          hotspots: (sampleGraphData.nodes.find((item: any) => item.id === 'spatial-360-atrium') as any)?.hotspots || [],
        };
        return spatial;
      }
      if (type === 'audioNode') {
        const audio: AudioNodeData = {
          id: n.id,
          type: 'audioNode',
          title: String(n.data?.title || 'منظره صوتی'),
          ambientTone: String(n.data?.ambientTone || 'marble_hall_reverb'),
          volume: Number(n.data?.volume) || 0.6,
          fadeInDuration: Number(n.data?.fadeInDuration) || 2.5,
          fadeOutDuration: Number(n.data?.fadeOutDuration) || 3.0,
          loop: true,
          isParallelAttachment: true,
          parallelTargetSequenceId: String(n.data?.parallelTargetSequenceId || 'env-lobby'),
        };
        return audio;
      }
      if (type === 'storyTimelineNode') {
        const story: StoryTimelineNodeData = {
          id: n.id,
          type: 'storyTimelineNode',
          title: String(n.data?.title || 'روایت داستان'),
          chapterTitle: String(n.data?.chapterTitle || 'تاریخچه قصر'),
          era: String(n.data?.era || '۱۹۲۴ - ۲۰۲۶'),
          description: 'روایت اسکرولی تاریخی هتل',
          waypoints: (sampleGraphData.nodes.find((item: any) => item.id === 'story-heritage-timeline') as any)?.waypoints || [],
        };
        return story;
      }
      if (type === 'comparisonNode') {
        const comp: ComparisonNodeData = {
          id: n.id,
          type: 'comparisonNode',
          title: String(n.data?.title || 'مقایسه داینامیک'),
          category: 'Sanctuary',
          comparisonMode: (n.data?.comparisonMode as any) || 'split_slider',
          initialSplitRatio: Number(n.data?.initialSplitRatio) || 50,
          entityA: (sampleGraphData.nodes.find((item: any) => item.id === 'comparison-penthouse-vs-villa') as any)?.entityA || {
            id: 'entity-a',
            title: 'پنت‌هاوس سلطنتی',
            subtitle: 'دید افق دریا',
            badge: 'شکوه و حریم خصوصی',
            mediaUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
            description: 'اقامتگاه شاهانه بر فراز دریا',
            specs: [],
          },
          entityB: (sampleGraphData.nodes.find((item: any) => item.id === 'comparison-penthouse-vs-villa') as any)?.entityB || {
            id: 'entity-b',
            title: 'ویلای ساحلی',
            subtitle: 'دسترسی شن‌های ساحل',
            badge: 'آرامش ژرف',
            mediaUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80',
            description: 'باغ ساحلی با استخر اختصاصی',
            specs: [],
          },
        };
        return comp;
      }

      // به صورت پیش‌فرض EnvironmentNodeData
      const env: EnvironmentNodeData = {
        id: n.id,
        type: 'environmentNode',
        title: String(n.data?.title || 'فضای بدون نام'),
        slug: String(n.data?.slug || n.id),
        category: String(n.data?.category || 'Sanctuary'),
        description: String(n.data?.description || 'محیط لوکس هتل'),
        ambientLoop: {
          desktopUrl: String(n.data?.desktopUrl || 'https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4'),
          mobileUrl: String(n.data?.mobileUrl || 'https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4'),
          duration: Number(n.data?.duration) || 10,
          fps: 30,
        },
      };
      return env;
    });

    // ساخت یال‌ها
    const edges: TransitionEdgeData[] = state.edges.map((e, idx) => ({
      id: e.id || `edge-${idx}`,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      label: (e.label as string) || 'اتصال پیوسته',
      triggerType: 'click',
      direction: 'forward',
      transitionVideo: {
        desktopUrl: 'https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4',
        mobileUrl: 'https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4',
        duration: 4.8,
        fps: 30,
      },
    }));

    return {
      hotelName: state.hotelTitle,
      version: '2.0.0',
      initialNodeId: nodes[0]?.id || 'env-gate',
      nodes,
      edges,
    };
  },

  loadFromSequenceGraph: (graph: SequenceGraph) => {
    const newNodes: Node[] = graph.nodes.map((n, index) => {
      const type = n.type || 'environmentNode';
      return {
        id: n.id,
        type,
        position: { x: 80 + (index % 3) * 380, y: 120 + Math.floor(index / 3) * 320 },
        data: {
          title: n.title,
          ...((n as any).ambientLoop ? {
            desktopUrl: (n as any).ambientLoop.desktopUrl,
            mobileUrl: (n as any).ambientLoop.mobileUrl,
            duration: (n as any).ambientLoop.duration,
            category: (n as any).category,
          } : {}),
          ...((n as any).colorTemperatureK ? {
            colorTemperatureK: (n as any).colorTemperatureK,
            timeOfDay: (n as any).timeOfDay,
            targetSceneId: (n as any).targetSceneId,
          } : {}),
          ...((n as any).panoramaUrl ? {
            panoramaUrl: (n as any).panoramaUrl,
            initialFov: (n as any).initialFov,
            hotspots: (n as any).hotspots,
          } : {}),
          ...((n as any).ambientTone ? {
            ambientTone: (n as any).ambientTone,
            volume: (n as any).volume,
            isParallelAttachment: (n as any).isParallelAttachment,
          } : {}),
        },
      };
    });

    const newEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      label: e.label,
      animated: true,
      style: { stroke: '#fbbf24', strokeWidth: 2 },
    }));

    set({
      hotelTitle: graph.hotelName,
      nodes: newNodes,
      edges: newEdges,
    });
  },

  resetToSample: () => {
    const { initialNodes, initialEdges } = generateInitialFlow();
    set({
      nodes: initialNodes,
      edges: initialEdges,
      hotelTitle: "L'Aura Palace & Royal Sanctuary",
    });
  },
}));
