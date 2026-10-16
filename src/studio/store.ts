import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import { ImmersiveExperienceGraph, ExperienceNode, TransitionLogicGate } from '../engine/types';

interface StudioState {
  graph: ImmersiveExperienceGraph;
  flowNodes: Node[];
  flowEdges: Edge[];
  selectedNodeId: string | null;
  isPreviewActive: boolean;

  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, partial: Partial<ExperienceNode>) => void;
  addSceneNode: (type?: 'scene' | 'overlay') => void;
  togglePreview: () => void;
  setGraph: (graph: ImmersiveExperienceGraph) => void;
}

const initialGraph: ImmersiveExperienceGraph = {
  id: 'exp-laura-palace',
  title: 'Laura Palace Luxury Journey',
  initialNodeId: 'node-grand-entrance',
  globalConfig: {
    pointerSmoothing: 0.12,
    momentumDecay: 0.88,
    preloadNeighborhoodDepth: 2,
  },
  nodes: [
    {
      id: 'node-grand-entrance',
      type: 'scene',
      title: 'ورودی باشکوه و لابی سلطنتی',
      subtitle: 'معماری نئوکلاسیک با سنگ‌های مرمر ایتالیایی و لوسترهای کریستال باکارا',
      primaryMedia: {
        id: 'med-entrance',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80',
      },
      secondaryOverlay: {
        media: {
          id: 'med-entrance-overlay',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80',
        },
        blendMode: 'overlay',
        opacity: 0.25,
        depthConfig: { factorX: -20, factorY: -16, scaleBase: 1.08 },
      },
      lighting: { colorK: 2900, specularIntensity: 0.8, followPointer: true },
      audioTrack: { tone: 'welcoming_strings', volume: 0.6 },
      position: { x: 80, y: 150 },
    },
    {
      id: 'node-penthouse',
      type: 'scene',
      title: 'پنت‌هاوس امپریال رو به اقیانوس',
      subtitle: 'چشم‌انداز پانوراما ۳۶۰ درجه و استخر شیشه‌ای معلق بر فراز آب‌های لاجوردی',
      primaryMedia: {
        id: 'med-penthouse',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/40608/40608-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=80',
      },
      lighting: { colorK: 4500, specularIntensity: 0.9, followPointer: true },
      audioTrack: { tone: 'distant_waves', volume: 0.5 },
      position: { x: 480, y: 150 },
    },
    {
      id: 'node-restaurant',
      type: 'scene',
      title: 'رستوران ستاره‌دار کریستال',
      subtitle: 'هنر پذیرایی میشلن در تالار شیشه‌ای با موسیقی زنده پیانو و نورپردازی کهربایی',
      primaryMedia: {
        id: 'med-dining',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/44883/44883-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80',
      },
      lighting: { colorK: 2700, specularIntensity: 0.7, followPointer: true },
      audioTrack: { tone: 'gentle_piano', volume: 0.55 },
      position: { x: 880, y: 150 },
    },
  ],
  edges: [
    {
      id: 'gate-entrance-penthouse',
      sourceNodeId: 'node-grand-entrance',
      targetNodeId: 'node-penthouse',
      trigger: 'scroll_scrub',
      threshold: 0.25,
      continuousScrub: true,
      easing: 'power3.out',
      blendTechnique: 'depth_zoom_blend',
      bidirectional: true,
    },
    {
      id: 'gate-penthouse-dining',
      sourceNodeId: 'node-penthouse',
      targetNodeId: 'node-restaurant',
      trigger: 'scroll_scrub',
      threshold: 0.25,
      continuousScrub: true,
      easing: 'power3.out',
      blendTechnique: 'depth_zoom_blend',
      bidirectional: true,
    },
  ],
};

function graphToFlowNodes(nodes: ExperienceNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: 'experienceNode',
    position: n.position,
    data: { ...n },
  }));
}

function graphToFlowEdges(edges: TransitionLogicGate[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    animated: true,
    style: { stroke: '#fbbf24', strokeWidth: 2 },
    data: { ...e },
  }));
}

export const useStudioStore = create<StudioState>((set, get) => ({
  graph: initialGraph,
  flowNodes: graphToFlowNodes(initialGraph.nodes),
  flowEdges: graphToFlowEdges(initialGraph.edges),
  selectedNodeId: null,
  isPreviewActive: false,

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      flowNodes: applyNodeChanges(changes, state.flowNodes),
    }));
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => ({
      flowEdges: applyEdgeChanges(changes, state.flowEdges),
    }));
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const newGate: TransitionLogicGate = {
      id: `gate-${connection.source}-${connection.target}`,
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      trigger: 'scroll_scrub',
      threshold: 0.25,
      continuousScrub: true,
      easing: 'power3.out',
      blendTechnique: 'depth_zoom_blend',
      bidirectional: true,
    };

    set((state) => ({
      flowEdges: addEdge({ ...connection, animated: true, style: { stroke: '#fbbf24', strokeWidth: 2 } }, state.flowEdges),
      graph: {
        ...state.graph,
        edges: [...state.graph.edges, newGate],
      },
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateNodeData: (nodeId, partial) => {
    set((state) => {
      const updatedNodes = state.graph.nodes.map((n) => (n.id === nodeId ? { ...n, ...partial } : n));
      const updatedFlow = state.flowNodes.map((fn) =>
        fn.id === nodeId ? { ...fn, data: { ...(fn.data as any), ...partial } } : fn
      );
      return {
        graph: { ...state.graph, nodes: updatedNodes },
        flowNodes: updatedFlow,
      };
    });
  },

  addSceneNode: (type = 'scene') => {
    const state = get();
    const count = state.graph.nodes.length + 1;
    const newNode: ExperienceNode = {
      id: `node-scene-${Date.now().toString(36)}`,
      type,
      title: `سکانس جدید 0${count}`,
      subtitle: 'توصیف بصری و اتمسفریک فضا',
      primaryMedia: {
        id: `media-${Date.now()}`,
        type: 'video',
        url: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80',
      },
      lighting: { colorK: 3000, specularIntensity: 0.8, followPointer: true },
      position: { x: 100 + count * 80, y: 200 + (count % 2) * 50 },
    };

    set({
      graph: { ...state.graph, nodes: [...state.graph.nodes, newNode] },
      flowNodes: [...state.flowNodes, { id: newNode.id, type: 'experienceNode', position: newNode.position, data: { ...newNode } }],
      selectedNodeId: newNode.id,
    });
  },

  togglePreview: () => set((s) => ({ isPreviewActive: !s.isPreviewActive })),

  setGraph: (graph) => set({
    graph,
    flowNodes: graphToFlowNodes(graph.nodes),
    flowEdges: graphToFlowEdges(graph.edges),
  }),
}));
