import { ImmersiveExperienceGraph, ExperienceNode, TransitionLogicGate } from '../engine/types';
import { HotelExperienceGraph, SequenceNode, TransitionEdge } from '../types/sequenceGraph';

/**
 * Adapter converting ImmersiveExperienceGraph (Visual Builder format)
 * to HotelExperienceGraph (Main Experience Engine format)
 */
export function immersiveGraphToHotelGraph(graph: ImmersiveExperienceGraph): HotelExperienceGraph {
  const nodes: SequenceNode[] = (graph.nodes || []).map((node) => {
    // Find outward transitions
    const transitions: TransitionEdge[] = (graph.edges || [])
      .filter((edge) => edge.sourceNodeId === node.id)
      .map((edge) => {
        const targetNode = graph.nodes.find((n) => n.id === edge.targetNodeId);
        return {
          id: edge.id,
          targetNodeId: edge.targetNodeId,
          label: targetNode ? `انتقال به ${targetNode.title}` : 'ترنزیشن پیوسته',
          reverseAllowed: edge.bidirectional,
          triggerType: edge.trigger === 'scroll_scrub' ? 'scroll' : 'click',
          video: {
            mediaType: targetNode?.primaryMedia.type === 'image' ? 'image' : 'video',
            landscapeUrl: targetNode?.primaryMedia.url || '',
            posterUrl: targetNode?.primaryMedia.posterUrl,
          },
        };
      });

    return {
      id: node.id,
      title: node.title,
      persianTitle: node.title,
      subtitle: node.subtitle || '',
      description: node.subtitle || '',
      category: (node.type || 'scene').toUpperCase(),
      ambientLoop: {
        mediaType: node.primaryMedia.type === 'image' ? 'image' : 'video',
        landscapeUrl: node.primaryMedia.url,
        posterUrl: node.primaryMedia.posterUrl,
      },
      secondaryOverlay: node.secondaryOverlay
        ? {
            mediaType: node.secondaryOverlay.media.type === 'image' ? 'image' : 'video',
            url: node.secondaryOverlay.media.url,
            posterUrl: node.secondaryOverlay.media.posterUrl,
            blendMode: node.secondaryOverlay.blendMode,
            opacity: node.secondaryOverlay.opacity,
            depthConfig: node.secondaryOverlay.depthConfig,
          }
        : undefined,
      transitions,
      audioProfile: {
        tone: node.audioTrack?.tone || 'welcoming_strings',
        volume: node.audioTrack?.volume ?? 0.6,
        spatialPan: node.audioTrack?.spatialPan,
      },
    };
  });

  return {
    id: graph.id || 'custom-experience',
    hotelName: graph.title || 'هتل قصر لورا',
    version: '2.0.0',
    initialNodeId: graph.initialNodeId || (nodes[0] ? nodes[0].id : ''),
    nodes,
  };
}
