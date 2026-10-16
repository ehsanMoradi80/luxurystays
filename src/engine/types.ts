/**
 * Immersive Experience Engine (Data Model & State Machine Schema)
 * Industry-Agnostic, Continuous Interactive Journey Specification
 */

export type MediaType = 'video' | 'image' | 'canvas3d';

export type BlendMode = 'normal' | 'screen' | 'overlay' | 'soft-light' | 'multiply' | 'color-dodge';

export type TriggerSource = 
  | 'scroll_scrub'    // Wheel / Touch vertical scrubbing
  | 'pointer_move'    // Mouse position & velocity
  | 'pointer_tilt'    // Normalized 2D angle (-1 to 1)
  | 'drag_horizontal' // Horizontal swipe / scrub
  | 'spatial_enter';  // Waypoint reached

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  posterUrl?: string;
  aspectRatio?: '16:9' | '9:16' | 'full';
  fps?: number;
}

export interface ParallaxDepthConfig {
  factorX: number; // Multiplier for mouse X tilt (e.g. 15px)
  factorY: number; // Multiplier for mouse Y tilt (e.g. 12px)
  scaleBase: number; // Idle scale (e.g. 1.04)
  invertParallax?: boolean;
}

export interface ExperienceNode {
  id: string;
  type: 'scene' | 'overlay' | 'audio_emitter' | 'waypoint';
  title: string;
  subtitle?: string;
  primaryMedia: MediaAsset;
  secondaryOverlay?: {
    media: MediaAsset;
    blendMode: BlendMode;
    opacity: number;
    depthConfig?: ParallaxDepthConfig;
  };
  lighting?: {
    colorK: number; // 2700K (candle) to 6500K (daylight)
    specularIntensity: number;
    followPointer: boolean;
  };
  audioTrack?: {
    tone: string;
    volume: number;
    spatialPan?: number;
  };
  position: { x: number; y: number }; // Studio Canvas layout coordinate
}

export interface TransitionLogicGate {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  trigger: TriggerSource;
  threshold: number; // Normalized input delta required to trigger transition
  continuousScrub: boolean; // True: real-time scrubbing; False: smooth eased arrival
  easing: 'power2.out' | 'power3.out' | 'expo.out' | 'none';
  blendTechnique: 'crossfade' | 'depth_zoom_blend' | 'optical_dissolve';
  bidirectional: boolean; // Enables reversible scrubbing without reloading
}

export interface ImmersiveExperienceGraph {
  id: string;
  title: string;
  initialNodeId: string;
  nodes: ExperienceNode[];
  edges: TransitionLogicGate[];
  globalConfig: {
    pointerSmoothing: number; // Lerp factor (0.05 to 0.2)
    momentumDecay: number;    // Inertia decay factor
    preloadNeighborhoodDepth: number; // Default: 2 nodes ahead/behind
  };
}

/**
 * Realtime State Machine Runtime Snapshot
 */
export interface RuntimeEngineState {
  activeNodeId: string;
  targetNodeId: string | null;
  transitionProgress: number; // 0.0 (source active) to 1.0 (target active)
  isTransitionActive: boolean;
  scrollVelocity: number;
  pointer: {
    x: number;
    y: number;
    normX: number; // -1 to 1
    normY: number; // -1 to 1
  };
}
