/**
 * sequenceGraph.ts
 * 
 * معماری داده (Data Structure & JSON Schema) برای سیستم سکانس‌های پیوسته و بلوک‌های تجربه پیشرفته
 * هتل‌های ۵ ستاره فوق لوکس (Ultra-Luxury Digital Experience Engine)
 * 
 * انواع گره‌ها (Node Types):
 * ۱. EnvironmentNode: سکانس‌های ویدیویی پیوسته با لوپ محیطی و ترنزیشن
 * ۲. SpatialNode: کاوشگر سه‌بعدی و تصاویر ۳۶۰ درجه با هات‌اسپات‌های تعاملی
 * ۳. AtmosphereNode: کنترلر اتمسفر و نورپردازی (اسلایدر روز/شب، دمای رنگ و فیلترهای نوری)
 * ۴. AudioNode: منظره صوتی مستقل با اجرای موازی (Parallel) در کنار سکانس‌های تصویری
 * ۵. StoryTimelineNode: روایت تعاملی داستان هتل با نقاط عطف اسکرولی (Waypoints)
 * ۶. ComparisonNode: مقایسه داینامیک دو فضا یا اتاق با اسلایدر قبل/بعد (Split Slider)
 */

export type ScreenOrientation = 'landscape' | 'portrait';

/**
 * رسانه‌های ویدیویی و تصویری ریسپانسیو
 */
export interface ResponsiveVideoMedia {
  desktopUrl: string;
  mobileUrl: string;
  posterUrl?: string;
  duration: number;
  fps?: number;
  sizeBytes?: number;
}

// =========================================================================
// ۱. گره محیط و ویدیو (Environment / Video Sequence Node)
// =========================================================================
export interface EnvironmentNodeData {
  id: string;
  type: 'environmentNode';
  title: string;
  slug: string;
  category: 'Arrival' | 'Sanctuary' | 'Wellness' | 'Dining' | 'Penthouse' | string;
  description: string;
  ambientLoop: ResponsiveVideoMedia;
  audioProfile?: {
    ambienceTone: string;
    volume: number;
  };
}

// =========================================================================
// ۲. گره کاوشگر سه‌بعدی و ۳۶۰ درجه (Spatial 360 Node)
// =========================================================================
export interface SpatialHotspotConfig {
  id: string;
  yaw: number;       // زاویه افقی (درجه ۰ تا ۳۶۰)
  pitch: number;     // زاویه عمودی (درجه -۹۰ تا ۹۰)
  title: string;
  tagline?: string;
  targetNodeId?: string; // انتقال به گره دیگر یا باز کردن مدیا
  mediaType: 'modal' | 'audio_story' | 'video_popup' | 'navigate';
  details?: {
    description?: string;
    specs?: { label: string; value: string }[];
    badge?: string;
    imageUrl?: string;
  };
}

export interface SpatialNodeData {
  id: string;
  type: 'spatialNode';
  title: string;
  slug: string;
  category: string;
  description: string;
  panoramaUrl: string;           // تصویر ۳۶۰ درجه یا Equirectangular
  previewThumbnailUrl?: string;
  initialFov?: number;           // زاویه دید پیش‌فرض (Field of View)
  initialYaw?: number;
  initialPitch?: number;
  hotspots: SpatialHotspotConfig[];
}

// =========================================================================
// ۳. گره کنترلر اتمسفر (Atmosphere Controller Node)
// =========================================================================
export interface AtmosphereLightingPreset {
  id: string;
  name: string;
  timeOfDay: 'dawn' | 'zenith' | 'golden_hour' | 'midnight';
  colorTempK: number;            // ۲۷۰۰ کلوین (شمع و مخمل) تا ۶۵۰۰ کلوین (نور روز)
  exposure: number;              // -۱ تا +۱
  overlayGradient: string;       // گرادیان نوری شبیه‌سازی شده
  filterCss: string;             // فیلترهای CSS برای رندر بلادرنگ
}

export interface AtmosphereNodeData {
  id: string;
  type: 'atmosphereNode';
  title: string;
  targetSceneId?: string;        // شناسه سکانس ویدیویی متصل برای اعمال اتمسفر
  baseMediaUrl: string;          // تصویر یا ویدیوی زمینه اصلی
  timeOfDay: 'dawn' | 'zenith' | 'golden_hour' | 'midnight' | number;
  colorTemperatureK: number;     // ۲۷۰۰ تا ۶۵۰۰
  activePresetId: string;
  presets: AtmosphereLightingPreset[];
  interactiveControls: boolean;  // فعال بودن اسلایدر تعاملی برای مهمان
}

// =========================================================================
// ۴. گره منظره صوتی (Audio Soundscape Node) - اجرای موازی با سکانس‌ها
// =========================================================================
export interface AudioNodeData {
  id: string;
  type: 'audioNode';
  title: string;
  ambientTone: 'warm_chords' | 'marble_hall_reverb' | 'ocean_breeze' | 'crystal_water' | 'jazz_lounge' | string;
  audioUrl?: string;             // فایل صوتی باکیفیت یا شبیه‌ساز وب‌آودیو
  volume: number;                // ۰ تا ۱
  fadeInDuration: number;        // مدت فید ورودی (ثانیه)
  fadeOutDuration: number;       // مدت فید خروجی (ثانیه)
  loop: boolean;
  isParallelAttachment: boolean; // آیا به صورت موازی با یک سکانس تصویری اجرا می‌شود
  parallelTargetSequenceId?: string; // شناسه گره تصویری که این صدا با آن موازی است
}

// =========================================================================
// ۵. گره روایت داستان (Story Timeline Node)
// =========================================================================
export interface StoryWaypointConfig {
  id: string;
  stepNumber: number;
  timeLabel: string;             // برچسب زمان (مثلا: "۱۹۲۴ میلادی" یا "گام اول: ورود")
  title: string;
  narrative: string;
  mediaUrl?: string;
  quote?: string;
  architecturalNote?: string;
}

export interface StoryTimelineNodeData {
  id: string;
  type: 'storyTimelineNode';
  title: string;
  chapterTitle: string;
  era: string;
  description: string;
  waypoints: StoryWaypointConfig[];
}

// =========================================================================
// ۶. گره مقایسه داینامیک (Comparison Node)
// =========================================================================
export interface ComparisonEntityConfig {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  mediaUrl: string;
  description: string;
  specs: { label: string; value: string }[];
}

export interface ComparisonNodeData {
  id: string;
  type: 'comparisonNode';
  title: string;
  category: string;
  comparisonMode: 'split_slider' | 'toggle_fade' | 'side_by_side';
  entityA: ComparisonEntityConfig;
  entityB: ComparisonEntityConfig;
  initialSplitRatio: number;     // موقعیت اسلایدر تقسیم (۰ تا ۱۰۰ درصد)
}

// =========================================================================
// اتحادیه کلیه نودهای تجربه (Union of Experience Nodes)
// =========================================================================
export type ExperienceNodeData =
  | EnvironmentNodeData
  | SpatialNodeData
  | AtmosphereNodeData
  | AudioNodeData
  | StoryTimelineNodeData
  | ComparisonNodeData;

// =========================================================================
// داده‌های یال‌ها (Edges) و انواع پیوند در گراف
// =========================================================================
export type ExperienceEdgeType =
  | 'sequential'           // ترنزیشن ویدیویی خطی استاندارد
  | 'parallel_audio'       // اتصال منظره صوتی به صورت موازی به سکانس
  | 'interactive_branch'   // انشعاب به کاوشگر ۳۶۰ یا تایم‌لاین داستان
  | 'atmosphere_layer'     // لایه کنترل اتمسفر متصل به سکانس
  | 'comparison_fork';     // انشعاب دو سکانس به پنل مقایسه

export interface TransitionEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  edgeType?: ExperienceEdgeType;
  triggerType: 'click' | 'scroll' | 'hotspot' | 'menu' | 'parallel_auto';
  transitionVideo?: ResponsiveVideoMedia;
  soundCue?: string;
  direction?: 'forward' | 'backward' | 'ascend' | 'descend' | 'lateral';
}

// =========================================================================
// ساختار کامل گراف جامع تجربه (Experience Graph / SequenceGraph)
// =========================================================================
export interface SequenceGraph {
  hotelName: string;
  version: string;
  initialNodeId: string;
  nodes: ExperienceNodeData[];
  edges: TransitionEdgeData[];
}
