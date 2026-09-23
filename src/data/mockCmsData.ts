import hotelGraphJson from './hotelExperienceGraph.json';
import { HotelExperienceGraph, SpaceNode } from '../types/cms';

export const hotelExperienceGraphData: HotelExperienceGraph = hotelGraphJson as HotelExperienceGraph;

export function getNodeById(graph: HotelExperienceGraph, id: string): SpaceNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function getAdjacentNodes(graph: HotelExperienceGraph, currentNodeId: string): { targetNode: SpaceNode; label: string; triggerType: string }[] {
  const current = getNodeById(graph, currentNodeId);
  if (!current) return [];

  return current.transitions
    .map((transition) => {
      const target = getNodeById(graph, transition.targetNodeId);
      if (!target) return null;
      return {
        targetNode: target,
        label: transition.label,
        triggerType: transition.triggerType,
      };
    })
    .filter(Boolean) as { targetNode: SpaceNode; label: string; triggerType: string }[];
}
