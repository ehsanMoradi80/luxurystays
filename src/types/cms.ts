/**
 * TypeScript Schema for 5-Star Luxury Hotel Interactive Video Experience
 * Defines the Headless CMS Graph Structure (Nodes, Transitions, Media Variants, Hotspots)
 */

export type ScreenOrientation = 'landscape' | 'portrait';

export interface VideoMediaVariant {
  /** 16:9 Landscape URL for Desktop & Wide Screens */
  landscapeUrl: string;
  /** 9:16 Portrait URL for Mobile Devices */
  portraitUrl: string;
  /** Fallback poster image for initial paint or low-bandwidth states */
  posterUrl?: string;
  /** Nominal duration in seconds */
  duration: number;
  /** Frame rate for precise canvas scrubbing */
  fps?: number;
  /** Optional file size in bytes for network-aware preloading */
  sizeBytes?: number;
}

export interface TransitionEdge {
  /** Target Node ID to navigate to (e.g. 'lobby') */
  targetNodeId: string;
  /** Human-readable transition label (e.g. 'Enter Grand Lobby') */
  label: string;
  /** How this transition is typically initiated */
  triggerType: 'scroll' | 'click' | 'hotspot' | 'menu';
  /** Transition video sequence connecting current node to target */
  video: VideoMediaVariant;
  /** Reverse transition video if return sequence is different (optional) */
  reverseVideo?: VideoMediaVariant;
  /** Sound design cue triggered during transition (e.g. 'door_glide_chime') */
  soundCue?: string;
  /** Direction in 3D space: forward, backward, left, right, elevate */
  direction?: 'forward' | 'backward' | 'ascend' | 'descend' | 'lateral';
}

export interface Hotspot {
  id: string;
  /** Normalized X position in percentage (0 - 100) */
  x: number;
  /** Normalized Y position in percentage (0 - 100) */
  y: number;
  title: string;
  tagline: string;
  description: string;
  /** Optional icon descriptor from lucide-react */
  icon?: string;
  /** Action triggered upon clicking: either navigate to another node or open info dialog */
  action: {
    type: 'navigate' | 'modal' | 'audio_story';
    targetNodeId?: string;
    details?: {
      specs?: { label: string; value: string }[];
      badge?: string;
    };
  };
}

export interface SpaceNode {
  /** Unique identifier of the hotel area (e.g. 'gate', 'lobby', 'penthouse') */
  id: string;
  /** URL slug */
  slug: string;
  /** Luxury space display name */
  title: string;
  /** Elegant subtitle or architectural callout */
  subtitle: string;
  /** Space category (e.g. 'Arrival', 'Sanctuary', 'Wellness', 'Dining') */
  category: string;
  /** Curated editorial description */
  description: string;
  /** Ambient looping video played while user is exploring the space */
  ambientLoop: VideoMediaVariant;
  /** Directed edges/transitions leaving this space */
  transitions: TransitionEdge[];
  /** Interactive spatial hotspots rendered over the video */
  hotspots: Hotspot[];
  /** Architectural specifications & amenities */
  amenities: string[];
  /** Audio ambiance profile for this space */
  audioProfile: {
    tone: 'welcoming_strings' | 'marble_hall_reverb' | 'ocean_breeze' | 'crystal_water' | 'jazz_lounge';
    volume: number;
  };
}

export interface HotelExperienceGraph {
  hotelName: string;
  tagline: string;
  version: string;
  /** Initial starting space node */
  initialNodeId: string;
  /** All space nodes in the hotel experience */
  nodes: SpaceNode[];
}

export type SequencerStatus = 
  | 'IDLE_LOOP'            // Playing ambient loop video of current space
  | 'PREPARING_TRANSITION' // Pre-buffering target video frames
  | 'TRANSITIONING'        // Actively playing transition video (or scrubbing)
  | 'ARRIVING';            // Blending into target ambient loop
