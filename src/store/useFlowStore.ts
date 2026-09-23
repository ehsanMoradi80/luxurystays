/**
 * useFlowStore.ts
 * 
 * Zustand Store برای مدیریت وضعیت بوم گره‌محور (Node-based Flow Canvas) در پنل ادمین
 * مدیریت گراف نودها، یال‌ها، افزودن نود محیطی، نود ترنزیشن و هماهنگ‌سازی خروجی JSON
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
import { SequenceGraph, EnvironmentNodeData, TransitionEdgeData } from '../types/sequenceGraph';
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
  
  // Data Mutation
  updateNodeData: (id: string, data: Record<string, any>) => void;
  
  // Graph Import / Export
  exportSequenceGraph: () => SequenceGraph;
  loadFromSequenceGraph: (graph: SequenceGraph) => void;
  resetToSample: () => void;
}

// تبدیل SequenceGraph پیش‌فرض به نودها و یال‌های اولیه React Flow
const generateInitialFlow = () => {
  const initialNodes: Node[] = [
    {
      id: 'env-gate',
      type: 'environmentNode',
      position: { x: 80, y: 150 },
      data: {
        title: "The Cypress Portal & Arrival Court",
        category: "Arrival",
        slug: "arrival-court",
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-exterior-of-a-luxurious-hotel-at-night-42790-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-exterior-of-a-luxurious-hotel-at-night-42790-large.mp4",
        duration: 9.5,
      },
    },
    {
      id: 'trans-gate-lobby',
      type: 'transitionNode',
      position: { x: 440, y: 160 },
      data: {
        label: "Bronze Portal Transition Video",
        triggerType: "click",
        duration: 4.8,
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
      },
    },
    {
      id: 'env-lobby',
      type: 'environmentNode',
      position: { x: 780, y: 150 },
      data: {
        title: "Grand Marble Atrium & Lobby",
        category: "Sanctuary",
        slug: "grand-atrium",
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-entering-a-luxurious-hall-with-a-chandelier-42788-large.mp4",
        duration: 12.0,
      },
    },
    {
      id: 'env-pool',
      type: 'environmentNode',
      position: { x: 780, y: 440 },
      data: {
        title: "Azure Coastal Infinity Oasis",
        category: "Wellness",
        slug: "infinity-oasis",
        desktopUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-resort-with-swimming-pools-42794-large.mp4",
        mobileUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-resort-with-swimming-pools-42794-large.mp4",
        duration: 10.2,
      },
    }
  ];

  const initialEdges: Edge[] = [
    {
      id: 'e1',
      source: 'env-gate',
      target: 'trans-gate-lobby',
      animated: true,
      style: { stroke: '#fbbf24', strokeWidth: 2 },
    },
    {
      id: 'e2',
      source: 'trans-gate-lobby',
      target: 'env-lobby',
      animated: true,
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    },
    {
      id: 'e3',
      source: 'env-lobby',
      target: 'env-pool',
      label: 'To Pool Transition',
      animated: true,
      style: { stroke: '#a855f7', strokeWidth: 2 },
    }
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
    set({
      edges: addEdge(
        { 
          ...connection, 
          animated: true, 
          style: { stroke: '#fbbf24', strokeWidth: 2 } 
        }, 
        get().edges
      ),
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHotelTitle: (title) => set({ hotelTitle: title }),

  // افزودن یک نود جدید محیطی
  addEnvironmentNode: (title = 'New Luxury Space') => {
    const newId = `env-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'environmentNode',
      position: { 
        x: 200 + Math.random() * 200, 
        y: 200 + Math.random() * 150 
      },
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

  // افزودن یک نود جدید ترنزیشن ویدیویی
  addTransitionNode: (label = 'Transition Video') => {
    const newId = `trans-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'transitionNode',
      position: { 
        x: 400 + Math.random() * 100, 
        y: 250 + Math.random() * 100 
      },
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

  // به‌روزرسانی اطلاعات یک نود
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

  // استخراج SequenceGraph استاندارد جهت استفاده فرانت‌اند
  exportSequenceGraph: (): SequenceGraph => {
    const state = get();
    const envNodes = state.nodes.filter((n) => n.type === 'environmentNode');
    
    // تبدیل نودها به ساختار EnvironmentNodeData
    const nodes: EnvironmentNodeData[] = envNodes.map((n) => ({
      id: n.id,
      title: String(n.data?.title || 'Untitled Space'),
      slug: String(n.data?.slug || n.id),
      category: String(n.data?.category || 'Luxury'),
      description: String(n.data?.description || 'Editorial space description'),
      ambientLoop: {
        desktopUrl: String(n.data?.desktopUrl || ''),
        mobileUrl: String(n.data?.mobileUrl || ''),
        duration: Number(n.data?.duration) || 10,
        fps: 30,
      },
    }));

    // ساخت ترنزیشن‌ها بر اساس یال‌ها
    const edges: TransitionEdgeData[] = state.edges.map((e, idx) => ({
      id: e.id || `edge-${idx}`,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      label: (e.label as string) || 'Smooth Camera Transition',
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
      version: '1.0.0',
      initialNodeId: envNodes[0]?.id || 'env-gate',
      nodes,
      edges,
    };
  },

  loadFromSequenceGraph: (graph: SequenceGraph) => {
    // بارگذاری گراف از دیتای ورودی
    const newNodes: Node[] = graph.nodes.map((n, index) => ({
      id: n.id,
      type: 'environmentNode',
      position: { x: 100 + (index % 3) * 350, y: 150 + Math.floor(index / 3) * 260 },
      data: {
        title: n.title,
        category: n.category,
        slug: n.slug,
        desktopUrl: n.ambientLoop.desktopUrl,
        mobileUrl: n.ambientLoop.mobileUrl,
        duration: n.ambientLoop.duration,
      },
    }));

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
