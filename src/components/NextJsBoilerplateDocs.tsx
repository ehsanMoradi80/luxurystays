/**
 * NextJsBoilerplateDocs.tsx
 * 
 * راهنمای جامع معماری و ساختار پوشه‌بندی Next.js (App Router) برای دموی هتل ۵ ستاره
 * شامل دیاگرام پوشه‌ها، نحوه اتصال به Headless CMS و تکنیک‌های Video Scrubbing با GSAP
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FolderTree, 
  Layers, 
  Cpu, 
  Smartphone, 
  Code2, 
  Copy, 
  Check, 
  Sparkles,
  FileCode
} from 'lucide-react';

interface NextJsBoilerplateDocsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NextJsBoilerplateDocs: React.FC<NextJsBoilerplateDocsProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<'folders' | 'gsap' | 'layers' | 'cms_integration'>('folders');
  const [copiedCode, setCopiedCode] = useState(false);

  const folderStructureCode = `my-hotel-seamless-video/
├── app/
│   ├── layout.tsx               # روت لی‌اوت اصلی، فونت‌های لوکس، متادیتا
│   ├── page.tsx                 # صفحه اصلی که VideoExperienceManager را رندر می‌کند
│   ├── experience/
│   │   └── [spaceId]/
│   │       └── page.tsx         # ناوبری مستقیم از طریق URL (Dynamic Routing)
│   ├── api/
│   │   └── cms-graph/
│   │       └── route.ts         # اندپوینت API جهت اتصال به Headless CMS (Sanity, Strapi)
│   └── globals.css              # استایل‌های سراسری، فیلترهای تاریک و گرادیان‌ها
├── components/
│   ├── video/
│   │   ├── VideoExperienceManager.tsx  # هسته توالی‌سنج ویدیو و بافر دوگانه (Client Component)
│   │   ├── VideoCanvasRenderer.tsx     # رندر فریم‌به‌فریم روی Canvas جهت رفع لگ
│   │   └── PreloadPipeline.ts          # موتور پیش‌بارگذاری هوشمند مدیا
│   ├── ui/
│   │   ├── SpaceInfoOverlay.tsx        # لایه Z-30: متن‌ها و دکمه‌های ظاهرشونده
│   │   ├── SpatialHotspotLayer.tsx     # لایه Z-20: هات‌اسپات‌های سه‌بعدی متحرک
│   │   ├── NavigationTimeline.tsx      # لایه Z-40: نوار پیشرفت و کنترل‌ها
│   │   └── ConciergeBookingModal.tsx   # لایه Z-60: فرم رزرو لوکس
│   └── cms/
│       └── CmsGraphInspector.tsx       # دیباگر بصری گراف برای ادمین و تدوین‌گر
├── lib/
│   ├── cms/
│   │   ├── client.ts            # کلاینت واکشی گراف از Headless CMS
│   │   └── schema.ts            # تایپ‌های اعتبارسنجی Zod / TypeScript
│   ├── audio/
│   │   └── AudioAmbienceEngine.ts # موتور سنتز صداهای لوکس با Web Audio API
│   └── video/
│       └── gsapScrubber.ts      # ابزار همگام‌سازی اسکرول با فریم‌های ویدیو
├── public/
│   ├── videos/
│   │   ├── desktop/             # ویدیوهای افقی 16:9
│   │   └── mobile/              # ویدیوهای عمودی 9:16
│   └── sounds/                  # افکت‌های صوتی ورود و خروج
├── types/
│   └── cms.ts                   # تعاریف تایپ اسکریپت گراف، نودها و ترنزیشن‌ها
└── package.json                 # وابستگی‌ها: gsap, motion, lucide-react, react 19`;

  const gsapCodeSnippet = `// lib/video/gsapScrubber.ts
// همگام‌سازی زمان ویدیو با اسکرول کاربر از طریق GSAP ScrollTrigger
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function bindVideoToScroll(
  videoElement: HTMLVideoElement,
  triggerContainer: HTMLElement,
  onProgress?: (progress: number) => void
) {
  return ScrollTrigger.create({
    trigger: triggerContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2, // ایجاد لغزش نرم و سینمایی (Inertia Smoothing)
    onUpdate: (self) => {
      if (videoElement.duration) {
        // جلوگیری از ارور seeking هنگام اسکرول سریع
        videoElement.currentTime = videoElement.duration * self.progress;
      }
      onProgress?.(self.progress);
    },
  });
}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-neutral-900 border border-amber-400/40 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl text-neutral-200 overflow-hidden"
          >
            {/* هدر */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-100 tracking-wide font-serif">
                    Next.js (App Router) Architecture Blueprint
                  </h2>
                  <p className="text-[11px] text-amber-300/80 font-mono">
                    Creative Technologist Engineering Documentation
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* سوییچ بخش‌ها */}
            <div className="flex border-b border-neutral-800 px-5 bg-neutral-950/40 overflow-x-auto">
              <button
                onClick={() => setActiveSection('folders')}
                className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeSection === 'folders'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Folder Structure (Next.js)</span>
              </button>
              <button
                onClick={() => setActiveSection('layers')}
                className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeSection === 'layers'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Z-Index Layer Architecture</span>
              </button>
              <button
                onClick={() => setActiveSection('gsap')}
                className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeSection === 'gsap'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>GSAP Video Scrubbing</span>
              </button>
              <button
                onClick={() => setActiveSection('cms_integration')}
                className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeSection === 'cms_integration'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Headless CMS Setup</span>
              </button>
            </div>

            {/* بدنه محتوا */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeSection === 'folders' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-neutral-300">
                      ساختار استاندارد ماژولار در Next.js 15+ با App Router جهت تولید کدهای تمیز و توسعه‌پذیر:
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(folderStructureCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Tree</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-mono text-emerald-400/90 leading-relaxed overflow-x-auto">
                    {folderStructureCode}
                  </pre>
                </div>
              )}

              {activeSection === 'layers' && (
                <div className="space-y-5 text-sm">
                  <h3 className="font-serif text-lg text-amber-200">
                    معماری لایه‌بندی Z-Index برای وب‌سایت‌های ویدیویی تعاملی
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-amber-400 font-bold">Z-Index 0:</span> Video Sequencer & Canvas Blitter
                      <p className="font-sans text-neutral-400 text-xs mt-1">
                        دو المان ویدیو مخفی بافر و یک عنصر Canvas تمام‌صفحه. وظیفه: رندرینگ فریم‌های ۶۰ هرتز بدون صفحه سیاه.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-amber-400 font-bold">Z-Index 10:</span> Atmospheric Vignette & Cinema Grain
                      <p className="font-sans text-neutral-400 text-xs mt-1">
                        لایه‌های گرادیان نیمه‌شفاف تیره در بالا و پایین تصویر برای خوانایی حداکثری متون تایپوگرافی.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-amber-400 font-bold">Z-Index 20:</span> 3D Spatial Hotspots
                      <p className="font-sans text-neutral-400 text-xs mt-1">
                        نقاط تعاملی شناور روی عناصر فضای هتل. هنگام ترنزیشن‌ها خودکار محو می‌شوند (Fade Out).
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-amber-400 font-bold">Z-Index 30:</span> Space Info & Typography Overlay
                      <p className="font-sans text-neutral-400 text-xs mt-1">
                        عنوان فضا، امکانات و دکمه ترنزیشن اصلی. هنگام حرکت بین فضاها اسلاید به پایین خورده و محو می‌شود.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-amber-400 font-bold">Z-Index 40:</span> Navigation Timeline & Global HUD
                      <p className="font-sans text-neutral-400 text-xs mt-1">
                        لوگو، کلید صدا، نوار پیشرفت درصد ترنزیشن و قرص‌های ناوبری فضایی هتل.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-amber-400 font-bold">Z-Index 50 / 60:</span> Modals, CMS Inspector & Booking
                      <p className="font-sans text-neutral-400 text-xs mt-1">
                        دراور و پنجره‌های پاپ‌آپ رزرو یا ابزار بازرسی گراف برای ادمین هتل.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'gsap' && (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    با اتصال GSAP ScrollTrigger به ویدیوی ترنزیشن، حرکت اسکرول کاربر فریم به فریم به ثانیه‌های ویدیو نگاشت می‌شود. همچنین استفاده از رندر Canvas از لگ زدن مرورگر هنگام Seeking جلوگیری می‌کند:
                  </p>
                  <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                    {gsapCodeSnippet}
                  </pre>
                </div>
              )}

              {activeSection === 'cms_integration' && (
                <div className="space-y-4 text-xs leading-relaxed text-neutral-300">
                  <h4 className="font-serif text-base text-amber-200">
                    اتصال به سیستم‌های مدیریت محتوا (Headless CMS)
                  </h4>
                  <p>
                    ادمین هتل در استودیوی CMS (مانند Strapi یا Sanity) گره‌های فضایی (Spaces) و یال‌های انتقالی (Transitions) را تعریف می‌کند.
                  </p>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="text-amber-400 font-semibold">۱. تفکیک موبایل و دسکتاپ در سطح CDN:</div>
                    <p className="text-neutral-400">
                      فیلدهای <code className="text-amber-300">landscapeUrl</code> (افقی ۱۶:۹) و <code className="text-amber-300">portraitUrl</code> (عمودی ۹:۱۶) در CMS آپلود می‌شوند. کلاینت با تابع <code className="text-amber-300">resolveMediaUrl</code> بر اساس رزولوشن فقط فایل مورد نیاز را استریم می‌کند تا مصرف اینترنت موبایل ۶۰٪ کاهش یابد.
                    </p>
                    <div className="text-amber-400 font-semibold pt-2">۲. کش بافر پیش‌بارگذاری (Zero-Lag Preload):</div>
                    <p className="text-neutral-400">
                      به محض ورود کاربر به هر فضا، تابع <code className="text-amber-300">preloadNodeNeighborhood</code> تمام ویدیوهای متصل به این فضا را در رم پیش‌بارگذاری می‌کند تا انتقال‌ها کاملاً بدون تأخیر (Zero-Delay) اجرا شوند.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
