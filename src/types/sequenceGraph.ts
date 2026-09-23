/**
 * sequenceGraph.ts
 * 
 * معماری داده (Data Structure) برای سیستم سکانس‌های ویدیویی پیوسته هتل‌های لوکس
 * خروجی استاندارد استخراج شده از بوم بصری گره‌محور (Node-based Flow Canvas / Headless CMS)
 */

export type ScreenOrientation = 'landscape' | 'portrait';

/**
 * رسانه‌های ویدیویی ریسپانسیو (تفکیک دقیق بین دسکتاپ 16:9 و موبایل 9:16)
 */
export interface ResponsiveVideoMedia {
  /** آدرس ویدیوی افقی دسکتاپ (Landscape 16:9) */
  desktopUrl: string;
  /** آدرس ویدیوی عمودی موبایل (Portrait 9:16) */
  mobileUrl: string;
  /** تصویر پوستر برای لودینگ اولیه یا دستگاه‌های کم‌سرعت */
  posterUrl?: string;
  /** مدت زمان نامی ویدیو به ثانیه */
  duration: number;
  /** فریم‌ریت ویدیو برای Scrubbing نرم با GSAP روی Canvas */
  fps?: number;
  /** حجم تقریبی ویدیو به بایت برای الگوریتم تخمین شبکه و Preloading */
  sizeBytes?: number;
}

/**
 * داده‌های گره محیط (Environment Node)
 * نمایانگر یک فضای فیزیکی در هتل (مانند گیت ورودی، لابی سلطنتی، استخر ساحلی)
 */
export interface EnvironmentNodeData {
  id: string;
  title: string;
  slug: string;
  category: 'Arrival' | 'Sanctuary' | 'Wellness' | 'Dining' | 'Penthouse' | string;
  description: string;
  /** ویدیوی لوپ پیوسته زمانی که کاربر در این فضا مستقر است */
  ambientLoop: ResponsiveVideoMedia;
  /** پروفایل صدای فضایی */
  audioProfile?: {
    ambienceTone: string;
    volume: number;
  };
}

/**
 * داده‌های یال / ترنزیشن بین دو محیط (Transition Edge / Node)
 * نمایانگر حرکت سینمایی دوربین یا حرکت مسافر بین دو محیط
 */
export interface TransitionEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  /** نوع فعال‌سازی: با اسکرول، کلیک کاربر، هات‌اسپات، یا منوی مستقیم */
  triggerType: 'click' | 'scroll' | 'hotspot' | 'menu';
  /** ویدیوی ترنزیشن سینمایی بین دو محیط (تفکیک شده برای دسکتاپ و موبایل) */
  transitionVideo: ResponsiveVideoMedia;
  /** افکت صوتی هماهنگ شده با ترنزیشن (مثل باز شدن درب برنزی یا صدای آب) */
  soundCue?: string;
  /** جهت حرکت در فضای سه‌بعدی */
  direction?: 'forward' | 'backward' | 'ascend' | 'descend' | 'lateral';
}

/**
 * ساختار کامل گراف سکانس‌ها (SequenceGraph)
 * خروجی یکپارچه بوم React Flow برای فرانت‌اند
 */
export interface SequenceGraph {
  hotelName: string;
  version: string;
  initialNodeId: string;
  /** گره‌های محیطی هتل */
  nodes: EnvironmentNodeData[];
  /** یال‌ها و مسیرهای ارتباطی ترنزیشن */
  edges: TransitionEdgeData[];
}
