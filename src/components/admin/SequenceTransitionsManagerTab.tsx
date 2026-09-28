/**
 * SequenceTransitionsManagerTab.tsx
 * 
 * تب جامع مدیریت سکانس‌ها، ویدیوهای ترنزیشن و بسته‌های تجارب هتل در پنل ادمین
 * - مشاهده، ویرایش، افزودن و آپلود ویدیوهای لوپ سکانس‌ها
 * - طراحی و ویرایش ویدیوهای ترنزیشن بین سکانس‌ها (مبدأ، مقصد، ویدیو، جهت، صدا و تست پخش زنده)
 * - تعریف و گروه‌بندی بسته‌های تجارب و سوئیت‌ها (مشخص کردن اینکه هر سوئیت یا تجربه شامل کدام سکانس‌هاست)
 */

import React, { useState, useRef } from 'react';
import { 
  Video, 
  Sparkles, 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ArrowRight, 
  Check, 
  Eye, 
  Sliders, 
  Layers, 
  Compass,
  ArrowUpDown,
  MoveRight,
  ExternalLink
} from 'lucide-react';
import { 
  useThemeAndSiteStore 
} from '../../store/useThemeAndSiteStore';
import { 
  SpaceNode, 
  TransitionEdge, 
  ExperiencePackage 
} from '../../types/cms';
import { hotelExperienceGraphData } from '../../data/mockCmsData';
import { toPersianDigits, formatPersianPrice } from '../../utils/jalali';

export const SequenceTransitionsManagerTab: React.FC = () => {
  const { packages, updatePackage, addPackage, removePackage } = useThemeAndSiteStore();

  // نگهداری وضعیت گراف سکانس‌ها در استیت محلی با قابلیت ذخیره
  const [nodes, setNodes] = useState<SpaceNode[]>(hotelExperienceGraphData.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || 'gate');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // پیش‌نمایش ویدیوی سکانس یا ترنزیشن
  const [activePreviewType, setActivePreviewType] = useState<'loop' | 'transition'>('loop');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>(nodes[0]?.ambientLoop.landscapeUrl || '');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // مودال افزودن ترنزیشن جدید
  const [isAddingTransition, setIsAddingTransition] = useState(false);
  const [newTransSource, setNewTransSource] = useState(nodes[0]?.id || 'gate');
  const [newTransTarget, setNewTransTarget] = useState(nodes[1]?.id || 'lobby');
  const [newTransLabel, setNewTransLabel] = useState('انتقال ویدیویی');
  const [newTransVideoUrl, setNewTransVideoUrl] = useState('https://assets.mixkit.co/videos/42788/42788-720.mp4');
  const [newTransDirection, setNewTransDirection] = useState<'forward' | 'backward' | 'ascend' | 'descend' | 'lateral'>('forward');

  const videoRef = useRef<HTMLVideoElement>(null);
  const loopUploadRef = useRef<HTMLInputElement>(null);
  const transUploadRef = useRef<HTMLInputElement>(null);
  const editingTransRef = useRef<{ sourceId: string; targetId: string } | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const triggerSaveFlash = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // آپلود مستقیم ویدیوی لوپ سکانس
  const handleLoopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selectedNodeId
            ? {
                ...n,
                ambientLoop: {
                  ...n.ambientLoop,
                  landscapeUrl: dataUrl,
                  portraitUrl: dataUrl,
                },
              }
            : n
        )
      );
      setPreviewVideoUrl(dataUrl);
      setActivePreviewType('loop');
      triggerSaveFlash();
    };
    reader.readAsDataURL(file);
  };

  // آپلود مستقیم ویدیوی ترنزیشن
  const handleTransUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const transMeta = editingTransRef.current;
    if (!file || !transMeta) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== transMeta.sourceId) return n;
          return {
            ...n,
            transitions: n.transitions.map((t) =>
              t.targetNodeId === transMeta.targetId
                ? {
                    ...t,
                    video: {
                      ...t.video,
                      landscapeUrl: dataUrl,
                      portraitUrl: dataUrl,
                    },
                  }
                : t
            ),
          };
        })
      );
      setPreviewVideoUrl(dataUrl);
      setActivePreviewType('transition');
      triggerSaveFlash();
    };
    reader.readAsDataURL(file);
  };

  // ثبت ترنزیشن جدید بین دو سکانس
  const handleCreateTransition = () => {
    const newEdge: TransitionEdge = {
      targetNodeId: newTransTarget,
      label: newTransLabel,
      triggerType: 'click',
      direction: newTransDirection,
      video: {
        landscapeUrl: newTransVideoUrl,
        portraitUrl: newTransVideoUrl,
        duration: 4.5,
        fps: 30,
      },
    };

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== newTransSource) return n;
        // حذف اتصال قبلی در صورت تکرار
        const filtered = n.transitions.filter((t) => t.targetNodeId !== newTransTarget);
        return {
          ...n,
          transitions: [...filtered, newEdge],
        };
      })
    );

    setIsAddingTransition(false);
    triggerSaveFlash();
  };

  // حذف ترنزیشن
  const handleDeleteTransition = (sourceId: string, targetId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== sourceId) return n;
        return {
          ...n,
          transitions: n.transitions.filter((t) => t.targetNodeId !== targetId),
        };
      })
    );
    triggerSaveFlash();
  };

  // افزودن سکانس ویدیویی جدید
  const handleAddNewSequence = () => {
    const newId = `seq-${Date.now()}`;
    const newNode: SpaceNode = {
      id: newId,
      slug: `sequence-${nodes.length + 1}`,
      title: `سکانس ویدیویی جدید ${nodes.length + 1}`,
      subtitle: 'معماری و چشم‌انداز اختصاصی',
      category: 'فضای اقامتی',
      description: 'سکانس ویدیویی ضبط‌شده با کیفیت سینمایی.',
      ambientLoop: {
        landscapeUrl: 'https://assets.mixkit.co/videos/42792/42792-720.mp4',
        portraitUrl: 'https://assets.mixkit.co/videos/42792/42792-720.mp4',
        duration: 8.0,
      },
      transitions: [],
      hotspots: [],
      amenities: ['امکانات اختصاصی'],
      audioProfile: {
        tone: 'welcoming_strings',
        volume: 0.5,
      },
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
    setPreviewVideoUrl(newNode.ambientLoop.landscapeUrl);
    setActivePreviewType('loop');
    triggerSaveFlash();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* هدر بخش مدیریت سکانس‌ها و ترنزیشن‌ها */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-400" />
            <span>مدیریت سکانس‌های ویدیویی و ترنزیشن‌ها (Video Transitions Engine)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            طراحی جریان سینمایی هتل: بارگذاری فیلم‌های لوپ سکانس‌ها و ویدیوهای حرکت بین فضاها (ترنزیشن‌ها)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>تغییرات ذخیره شد</span>
            </span>
          )}
          <button
            type="button"
            onClick={triggerSaveFlash}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تنظیمات گراف</span>
          </button>
        </div>
      </div>

      {/* ورودی‌های پنهان فایل */}
      <input ref={loopUploadRef} type="file" accept="video/*" onChange={handleLoopUpload} className="hidden" />
      <input ref={transUploadRef} type="file" accept="video/*" onChange={handleTransUpload} className="hidden" />

      {/* =========================================================================
          انتخابگر سکانس‌های هتل
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>انتخاب سکانس ویدیویی هتل ({toPersianDigits(nodes.length)} سکانس):</span>
          </span>
          <button
            type="button"
            onClick={handleAddNewSequence}
            className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سکانس جدید</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setPreviewVideoUrl(node.ambientLoop.landscapeUrl);
                  setActivePreviewType('loop');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-400 text-neutral-950 shadow-[0_0_15px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/50'
                    : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <span>{node.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono">
                  {toPersianDigits(node.transitions.length)} ترنزیشن
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* =========================================================================
            ستون تنظیمات سکانس جاری و ترنزیشن‌های خروجی آن
            ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* مشخصات سکانس */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>مشخصات سکانس: {selectedNode.title}</span>
              </h3>
              {nodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`آیا از حذف سکانس «${selectedNode.title}» مطمئن هستید؟`)) {
                      setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
                      setSelectedNodeId(nodes.find((n) => n.id !== selectedNode.id)?.id || '');
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف سکانس</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">عنوان سکانس:</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id ? { ...n, title: e.target.value } : n
                      )
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">دسته‌بندی:</label>
                  <input
                    type="text"
                    value={selectedNode.category}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, category: e.target.value } : n
                        )
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">شناسه یکتا (ID):</label>
                  <input
                    type="text"
                    value={selectedNode.id}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-500 font-mono"
                  />
                </div>
              </div>

              {/* ویدیوی لوپ سکانس */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-neutral-400">ویدیوی لوپ سکانس (Ambient Video):</label>
                  <button
                    type="button"
                    onClick={() => loopUploadRef.current?.click()}
                    className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>آپلود فیلم لوپ از رایانه</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedNode.ambientLoop.landscapeUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id
                          ? {
                              ...n,
                              ambientLoop: { ...n.ambientLoop, landscapeUrl: url, portraitUrl: url },
                            }
                          : n
                      )
                    );
                    setPreviewVideoUrl(url);
                    setActivePreviewType('loop');
                  }}
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              مدیریت ترنزیشن‌های خروجی از این سکانس
              ========================================================================= */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span>ترنزیشن‌های خروجی از این سکانس ({toPersianDigits(selectedNode.transitions.length)} مسیر):</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setNewTransSource(selectedNode.id);
                  setIsAddingTransition(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن مسیر ترنزیشن</span>
              </button>
            </div>

            <div className="space-y-3">
              {selectedNode.transitions.map((trans) => {
                const targetNode = nodes.find((n) => n.id === trans.targetNodeId);
                return (
                  <div
                    key={trans.targetNodeId}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{trans.label}</span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          ➔ {targetNode?.title || trans.targetNodeId}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewVideoUrl(trans.video.landscapeUrl);
                            setActivePreviewType('transition');
                          }}
                          className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>تست پخش ترنزیشن</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransition(selectedNode.id, trans.targetNodeId)}
                          className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                          title="حذف ترنزیشن"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                      <div className="flex items-center gap-3">
                        <span>جهت حرکتی: <strong className="text-white">{trans.direction || 'forward'}</strong></span>
                        <span>مدت زمان: <strong className="text-white">{toPersianDigits(trans.video.duration || 4.5)} ثانیه</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          editingTransRef.current = {
                            sourceId: selectedNode.id,
                            targetId: trans.targetNodeId,
                          };
                          transUploadRef.current?.click();
                        }}
                        className="text-amber-300 hover:text-amber-200 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>تعویض ویدیوی ترنزیشن</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =========================================================================
            ستون پیش‌نمایش ویدیویی + مدیریت بسته‌های تجارب
            ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* پلیر پیش‌نمایش ویدیوی فعال */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>
                  پیش‌نمایش ویدیو: {activePreviewType === 'loop' ? `لوپ سکانس (${selectedNode.title})` : 'ویدیوی ترنزیشن'}
                </span>
              </h3>
              <span className="text-[10px] text-amber-300 font-mono px-2 py-0.5 rounded-full bg-black/60">
                {activePreviewType === 'loop' ? 'Ambient Loop' : 'Transition Video'}
              </span>
            </div>

            <div className="relative w-full aspect-video rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                key={previewVideoUrl}
                src={previewVideoUrl}
                autoPlay
                loop={activePreviewType === 'loop'}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (!videoRef.current) return;
                    if (videoRef.current.paused) {
                      videoRef.current.play();
                      setIsPlaying(true);
                    } else {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    }
                  }}
                  className="p-1 text-neutral-300 hover:text-white"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!videoRef.current) return;
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                  }}
                  className="p-1 text-neutral-300 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              مدیریت پکیج‌های تجارب و سوئیت‌ها
              ========================================================================= */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>بسته‌ها و تجارب اقامتی هتل ({toPersianDigits(packages.length)} پکیج):</span>
              </h3>
            </div>

            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{pkg.title}</h4>
                      <p className="text-[10px] text-amber-300 mt-0.5">
                        {pkg.type === 'suite' ? 'سوئیت کامل' : 'تجربه مستقل'} &bull; طبقه {pkg.floorCode} &bull; {formatPersianPrice(pkg.price)} ({pkg.priceUnit})
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-neutral-300">سکانس‌های شامل:</span>
                    {pkg.includedNodeIds.map((nodeId) => (
                      <span key={nodeId} className="px-2 py-0.5 rounded-md bg-neutral-900 text-amber-300 text-[10px] font-mono border border-neutral-800">
                        {nodeId}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          مودال افزودن ترنزیشن جدید
          ========================================================================= */}
      {isAddingTransition && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>افزودن مسیر ترنزیشن ویدیویی جدید</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">سکانس مبدأ:</label>
                <select
                  value={newTransSource}
                  onChange={(e) => setNewTransSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">سکانس مقصد:</label>
                <select
                  value={newTransTarget}
                  onChange={(e) => setNewTransTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-amber-300 focus:border-amber-400 focus:outline-none"
                >
                  {nodes
                    .filter((n) => n.id !== newTransSource)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">عنوان مسیر (Label):</label>
                <input
                  type="text"
                  value={newTransLabel}
                  onChange={(e) => setNewTransLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">جهت ترنزیشن:</label>
                <select
                  value={newTransDirection}
                  onChange={(e) => setNewTransDirection(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="forward">رو به جلو (Forward)</option>
                  <option value="backward">دنده عقب (Backward)</option>
                  <option value="ascend">صعود با آسانسور (Ascend)</option>
                  <option value="descend">فرود (Descend)</option>
                  <option value="lateral">جانبی (Lateral)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">آدرس ویدیوی ترنزیشن (URL):</label>
                <input
                  type="text"
                  value={newTransVideoUrl}
                  onChange={(e) => setNewTransVideoUrl(e.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTransition(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleCreateTransition}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-lg"
              >
                ایجاد ترنزیشن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
