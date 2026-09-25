/**
 * HotelMapManagerTab.tsx
 * 
 * تب مدیریت تخصصی نقشه، طبقات و محیط‌های مستقل هتل در پنل ادمین
 * - انتخاب یا افزودن طبقه/محیط (پنت‌هاوس، رستوران، لابی، ساحل و استخر و...)
 * - بارگذاری تصویر پلان یا ویدیوی لوپ مجزا برای هر طبقه به صورت مستقل
 * - تنظیم آدرس URL یا آپلود مستقیم فایل از کامپیوتر برای هر طبقه
 * - پالت پیش‌فرض‌های آماده باکیفیت معماری و ویدیوهای هوایی
 * - مدیریت نقاط تعاملی ورود به فضاها برای هر طبقه
 * - مدیریت کامل تورهای ۳۶۰ درجه برای هر اتاق و بخش‌های داخلی
 * - پیش‌نمایش زنده و همزمان طبقه انتخاب‌شده
 */

import React, { useState, useRef } from 'react';
import { 
  Map, 
  Video, 
  Image as ImageIcon, 
  Upload, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Check, 
  Compass, 
  Sliders, 
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { 
  useThemeAndSiteStore, 
  MapHotspot, 
  FloorEnvironment, 
  Tour360Node 
} from '../../store/useThemeAndSiteStore';
import { toPersianDigits } from '../../utils/jalali';

interface PresetItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  desc: string;
  badge: string;
}

const PRESET_MAP_MEDIA: PresetItem[] = [
  {
    id: 'preset-img-1',
    name: 'رندر سه‌بعدی معماری لابی مرمرین',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    desc: 'تصویر واید و بسیار لوکس از پلان و معماری عمارت سلطنتی با نورپردازی گرم',
    badge: 'تصویر 4K',
  },
  {
    id: 'preset-img-2',
    name: 'پلان طبقات و بلوپرینت معماری',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=85',
    desc: 'نمای کامل محوطه بیرونی، بال‌ها و برج‌های اقامتی',
    badge: 'تصویر معماری',
  },
  {
    id: 'preset-img-3',
    name: 'ایزومتریک سوئیت پنت‌هاوس',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=85',
    desc: 'دید پرنده از کرانه دریا و برج آسمانه',
    badge: 'تصویر رندر',
  },
  {
    id: 'preset-vid-1',
    name: 'پرواز پهپاد بر فراز استخر و نخلستان ساحلی',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-resort-with-palm-trees-and-swimming-pool-42562-large.mp4',
    desc: 'ویدیوی سینمایی زنده لوپ از نمای هوایی استخرها و ویلاها',
    badge: 'ویدیو سینمایی',
  },
  {
    id: 'preset-vid-2',
    name: 'نمای هوایی کرانه ساحلی و آب‌های زلال',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-top-aerial-shot-of-seashore-with-rocks-and-clear-water-43306-large.mp4',
    desc: 'حرکت نرم دوربین هوایی بر فراز آب‌های زلال و ساحل آرامش',
    badge: 'ویدیو هوایی',
  },
];

const SCENE_OPTIONS = [
  { value: 'gate', label: 'درگاه ورودی و حیاط سرو' },
  { value: 'lobby', label: 'تالار و لابی مرمرین' },
  { value: 'suite', label: 'سوئیت پنت‌هاوس' },
  { value: 'dining', label: 'رستوران آمبروزیا' },
  { value: 'pool', label: 'استخر و واحه ساحلی' },
];

export const HotelMapManagerTab: React.FC = () => {
  const { 
    floors, 
    activeFloorId, 
    setActiveFloorId, 
    updateFloor, 
    addFloor, 
    removeFloor,
    addFloorHotspot,
    updateFloorHotspot,
    removeFloorHotspot
  } = useThemeAndSiteStore();

  const selectedFloor = floors.find((f) => f.id === activeFloorId) || floors[0];

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewMuted, setPreviewMuted] = useState(true);

  // مودال ویرایش تور ۳۶۰ برای یک هات‌اسپات خاص
  const [editing360HotspotId, setEditing360HotspotId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panoUploadRef = useRef<HTMLInputElement>(null);
  const currentPanoEditingNodeRef = useRef<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const triggerSaveFlash = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // بارگذاری فایل مستقیم برای طبقه جاری
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFloor) return;

    const isVid = file.type.startsWith('video');
    const isImg = file.type.startsWith('image');

    if (!isVid && !isImg) {
      alert('لطفاً یک فایل تصویر یا ویدیوی معتبر انتخاب نمایید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const detectedType = isVid ? 'video' : 'image';
      updateFloor(selectedFloor.id, {
        mediaUrl: dataUrl,
        mediaType: detectedType,
      });
      triggerSaveFlash();
    };
    reader.readAsDataURL(file);
  };

  // آپلود مستقیم تصویر ۳۶۰ درجه پانوراما برای نود مشخص
  const handlePanoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetNodeId = currentPanoEditingNodeRef.current;
    if (!file || !selectedFloor || !editing360HotspotId || !targetNodeId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const hs = selectedFloor.hotspots.find((h) => h.id === editing360HotspotId);
      if (!hs || !hs.tour360Nodes) return;

      const updatedNodes = hs.tour360Nodes.map((n) =>
        n.id === targetNodeId ? { ...n, panoramaUrl: dataUrl } : n
      );

      updateFloorHotspot(selectedFloor.id, editing360HotspotId, {
        tour360Nodes: updatedNodes,
      });
      triggerSaveFlash();
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: PresetItem) => {
    if (!selectedFloor) return;
    updateFloor(selectedFloor.id, {
      mediaUrl: preset.url,
      mediaType: preset.type,
    });
    triggerSaveFlash();
  };

  const handleAddNewFloor = () => {
    const newFloorId = `fl-${Date.now()}`;
    const newFloor: FloorEnvironment = {
      id: newFloorId,
      code: `${floors.length + 1}`,
      name: `محیط جدید ${floors.length + 1}`,
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=85',
      hotspots: [
        {
          id: `hs-${Date.now()}`,
          nodeId: 'lobby',
          title: 'نقطه فضایی جدید',
          level: 'طبقه جدید',
          wing: 'بخش اصلی',
          x: 50,
          y: 50,
          has360Tour: true,
          tour360Nodes: [
            {
              id: `node-${Date.now()}`,
              title: 'نمای ۳۶۰ درجه اصلی',
              panoramaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=3000&q=85',
              hotspots: [],
            },
          ],
        },
      ],
    };
    addFloor(newFloor);
    setActiveFloorId(newFloorId);
    triggerSaveFlash();
  };

  const handleAddHotspotToCurrentFloor = () => {
    if (!selectedFloor) return;
    const newHotspot: MapHotspot = {
      id: `hs-${Date.now()}`,
      nodeId: 'lobby',
      title: 'نقطه فضایی',
      level: selectedFloor.name,
      wing: 'بخش اصلی',
      x: 50,
      y: 50,
      has360Tour: true,
      tour360Nodes: [
        {
          id: `node-${Date.now()}`,
          title: 'نمای ۳۶۰ درجه اصلی',
          panoramaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=3000&q=85',
          hotspots: [],
        },
      ],
    };
    addFloorHotspot(selectedFloor.id, newHotspot);
    triggerSaveFlash();
  };

  // افزودن بخش/اتاق داخلی ۳۶۰ جدید به هات‌اسپات انتخابی
  const handleAddSubNode = (hotspotId: string) => {
    if (!selectedFloor) return;
    const hs = selectedFloor.hotspots.find((h) => h.id === hotspotId);
    if (!hs) return;

    const currentNodes = hs.tour360Nodes || [];
    const newNode: Tour360Node = {
      id: `sub-${Date.now()}`,
      title: `بخش جدید ${currentNodes.length + 1}`,
      panoramaUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=3000&q=85',
      hotspots: [],
    };

    updateFloorHotspot(selectedFloor.id, hotspotId, {
      has360Tour: true,
      tour360Nodes: [...currentNodes, newNode],
    });
    triggerSaveFlash();
  };

  const editingHotspot = selectedFloor?.hotspots.find((h) => h.id === editing360HotspotId);

  if (!selectedFloor) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* هدر بخش مدیریت نقشه و طبقات */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Map className="w-5 h-5 text-amber-400" />
            <span>مدیریت نقشه، طبقات و تورهای ۳۶۰ درجه هتل</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            برای هر طبقه می‌توانید تصویر/ویدیو مجزا تنظیم کرده و برای اتاق‌ها و فضاهای آن تور ۳۶۰ درجه چندبخشی ایجاد نمایید.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>ذخیره شد</span>
            </span>
          )}
          <button
            type="button"
            onClick={triggerSaveFlash}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          انتخابگر طبقات و محیط‌ها (Floor / Environment Switcher)
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>انتخاب طبقه یا محیط جهت تنظیم نقشه و تورها:</span>
          </span>
          <button
            type="button"
            onClick={handleAddNewFloor}
            className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن طبقه / محیط جدید</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {floors.map((floor) => {
            const isSelected = floor.id === selectedFloor.id;
            return (
              <div key={floor.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveFloorId(floor.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 shadow-[0_0_15px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/50'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-black ${
                    isSelected ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {floor.code}
                  </span>
                  <span>{floor.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* =========================================================================
            ستون تنظیمات مدیای طبقه جاری (نوع، آدرس، آپلود و پیش‌فرض‌ها)
            ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* مشخصات کلی طبقه */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>مشخصات طبقه انتخاب‌شده:</span>
              </h3>
              {floors.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`آیا از حذف «${selectedFloor.name}» مطمئن هستید؟`)) {
                      removeFloor(selectedFloor.id);
                      setActiveFloorId(floors.find((f) => f.id !== selectedFloor.id)?.id || '');
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف این طبقه</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">کد دکمه (آسانسور):</label>
                <input
                  type="text"
                  value={selectedFloor.code}
                  onChange={(e) => updateFloor(selectedFloor.id, { code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-white text-center focus:border-amber-400 focus:outline-none"
                  placeholder="مثال: ۴ یا G"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-neutral-400 block mb-1">عنوان معرفی در پنل ادمین:</label>
                <input
                  type="text"
                  value={selectedFloor.name}
                  onChange={(e) => updateFloor(selectedFloor.id, { name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* نوع مدیا: تصویر یا ویدیوی لوپ */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>نوع مدیای این طبقه:</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  updateFloor(selectedFloor.id, { mediaType: 'image' });
                  triggerSaveFlash();
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 transition-all cursor-pointer text-xs font-bold ${
                  selectedFloor.mediaType === 'image'
                    ? 'bg-amber-400/15 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>تصویر پلان (Image)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateFloor(selectedFloor.id, { mediaType: 'video' });
                  triggerSaveFlash();
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 transition-all cursor-pointer text-xs font-bold ${
                  selectedFloor.mediaType === 'video'
                    ? 'bg-amber-400/15 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>فیلم لوپ معماری (Video)</span>
              </button>
            </div>
          </div>

          {/* آدرس یا آپلود فایل مستقیم */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>منبع فایل (تصویر یا فیلم لوپ):</span>
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>آپلود از رایانه</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1.5">
                آدرس مستقیم تصویر یا ویدیو (URL):
              </label>
              <input
                type="text"
                value={selectedFloor.mediaUrl}
                onChange={(e) => updateFloor(selectedFloor.id, { mediaUrl: e.target.value })}
                dir="ltr"
                placeholder="https://example.com/floor-media.mp4"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:outline-none text-xs text-white font-mono"
              />
            </div>

            {/* پیش‌فرض‌های آماده */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <span className="text-[11px] text-neutral-400 block font-medium">
                پیش‌فرض‌های آماده برای این طبقه:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_MAP_MEDIA.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      selectedFloor.mediaUrl === preset.url
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {preset.type === 'video' ? (
                        <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium">{preset.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                      {preset.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ستون پیش‌نمایش زنده + مدیریت پین‌ها و تورهای ۳۶۰ این طبقه
            ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* پیش‌نمایش زنده مدیا برای طبقه جاری */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>پیش‌نمایش پلان {selectedFloor.name}:</span>
              </h3>
              <span className="text-[10px] text-amber-300 font-mono">
                {selectedFloor.mediaType === 'video' ? 'ویدیو لوپ' : 'تصویر پلان'}
              </span>
            </div>

            <div className="relative w-full aspect-video rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
              {selectedFloor.mediaType === 'video' ? (
                <video
                  ref={videoPreviewRef}
                  key={selectedFloor.mediaUrl}
                  src={selectedFloor.mediaUrl}
                  autoPlay
                  loop
                  muted={previewMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  key={selectedFloor.mediaUrl}
                  src={selectedFloor.mediaUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}

              {/* پین‌های این طبقه روی پیش‌نمایش */}
              <div className="absolute inset-0 pointer-events-none">
                {selectedFloor.hotspots.map((hs) => (
                  <div
                    key={hs.id}
                    style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 border border-amber-400 text-[10px] text-amber-300 font-bold shadow-lg"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>{hs.title}</span>
                    {hs.has360Tour && <span className="text-[8px] bg-amber-400 text-neutral-950 px-1 rounded font-black">360</span>}
                  </div>
                ))}
              </div>

              {selectedFloor.mediaType === 'video' && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (!videoPreviewRef.current) return;
                      if (videoPreviewRef.current.paused) {
                        videoPreviewRef.current.play();
                        setPreviewPlaying(true);
                      } else {
                        videoPreviewRef.current.pause();
                        setPreviewPlaying(false);
                      }
                    }}
                    className="p-1 rounded-lg text-neutral-300 hover:text-white"
                  >
                    {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!videoPreviewRef.current) return;
                      videoPreviewRef.current.muted = !videoPreviewRef.current.muted;
                      setPreviewMuted(videoPreviewRef.current.muted);
                    }}
                    className="p-1 rounded-lg text-neutral-300 hover:text-white"
                  >
                    {previewMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* پین‌های این طبقه همراه با تنظیمات تور ۳۶۰ */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>فضاهای این طبقه ({toPersianDigits(selectedFloor.hotspots.length)} نقطه):</span>
              </h3>
              <button
                type="button"
                onClick={handleAddHotspotToCurrentFloor}
                className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن فضا</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedFloor.hotspots.map((hs) => (
                <div
                  key={hs.id}
                  className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={hs.title}
                      onChange={(e) =>
                        updateFloorHotspot(selectedFloor.id, hs.id, { title: e.target.value })
                      }
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-bold text-white focus:border-amber-400 focus:outline-none flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={hs.nodeId}
                        onChange={(e) =>
                          updateFloorHotspot(selectedFloor.id, hs.id, { nodeId: e.target.value })
                        }
                        className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-amber-300 focus:border-amber-400 focus:outline-none"
                      >
                        {SCENE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeFloorHotspot(selectedFloor.id, hs.id)}
                        className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* تنظیم موقعیت روی نقشه */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                        <span>افقی (X):</span>
                        <span className="font-mono text-amber-300">{toPersianDigits(hs.x)}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={hs.x}
                        onChange={(e) =>
                          updateFloorHotspot(selectedFloor.id, hs.id, { x: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                        <span>عمودی (Y):</span>
                        <span className="font-mono text-amber-300">{toPersianDigits(hs.y)}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={hs.y}
                        onChange={(e) =>
                          updateFloorHotspot(selectedFloor.id, hs.id, { y: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* دکمه مدیریت تور ۳۶۰ درجه این اتاق */}
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] text-neutral-300 font-medium">
                        تور ۳۶۰ درجه: {hs.tour360Nodes?.length || 0} بخش داخلی
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditing360HotspotId(hs.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-neutral-950 border border-amber-400/40 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ویرایش بخش‌های تور ۳۶۰
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          مودال تخصصی مدیریت بخش‌ها و پانورامای ۳۶۰ درجه اتاق
          ========================================================================= */}
      {editingHotspot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>مدیریت تور ۳۶۰ درجه: {editingHotspot.title}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  بخش‌های مختلف این اتاق یا فضا (مثلاً اتاق خواب، سالن نشیمن، تراس) را تنظیم کنید.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditing360HotspotId(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ورودی مخفی برای آپلود تصویر ۳۶۰ */}
            <input
              ref={panoUploadRef}
              type="file"
              accept="image/*"
              onChange={handlePanoUpload}
              className="hidden"
            />

            {/* لیست نودهای ۳۶۰ این فضا */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  بخش‌های داخلی ({toPersianDigits(editingHotspot.tour360Nodes?.length || 0)} مورد):
                </span>
                <button
                  type="button"
                  onClick={() => handleAddSubNode(editingHotspot.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن بخش داخلی ۳۶۰</span>
                </button>
              </div>

              <div className="space-y-3">
                {editingHotspot.tour360Nodes?.map((node, idx) => (
                  <div
                    key={node.id}
                    className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-neutral-800 text-amber-400 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={node.title}
                          onChange={(e) => {
                            const updated = editingHotspot.tour360Nodes!.map((n) =>
                              n.id === node.id ? { ...n, title: e.target.value } : n
                            );
                            updateFloorHotspot(selectedFloor.id, editingHotspot.id, {
                              tour360Nodes: updated,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-white focus:border-amber-400 focus:outline-none w-60"
                        />
                      </div>

                      {editingHotspot.tour360Nodes!.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingHotspot.tour360Nodes!.filter((n) => n.id !== node.id);
                            updateFloorHotspot(selectedFloor.id, editingHotspot.id, {
                              tour360Nodes: updated,
                            });
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-neutral-400">
                          آدرس تصویر ۳۶۰ درجه پانوراما (Equirectangular):
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            currentPanoEditingNodeRef.current = node.id;
                            panoUploadRef.current?.click();
                          }}
                          className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>آپلود عکس ۳۶۰ از رایانه</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={node.panoramaUrl}
                        onChange={(e) => {
                          const updated = editingHotspot.tour360Nodes!.map((n) =>
                            n.id === node.id ? { ...n, panoramaUrl: e.target.value } : n
                          );
                          updateFloorHotspot(selectedFloor.id, editingHotspot.id, {
                            tour360Nodes: updated,
                          });
                        }}
                        dir="ltr"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditing360HotspotId(null);
                  triggerSaveFlash();
                }}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-lg cursor-pointer"
              >
                تایید و بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
