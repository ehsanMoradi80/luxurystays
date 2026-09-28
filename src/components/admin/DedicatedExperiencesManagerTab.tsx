/**
 * DedicatedExperiencesManagerTab.tsx
 * 
 * استودیوی تخصصی ساخت و مدیریت تجربه‌های اختصاصی هتل در پنل ادمین
 * - جداسازی کامل تجربه‌های اختصاصی (سوئیت‌ها، رستوران‌ها، اسپاها و کلاب‌ها) از سکانس‌های صفحه اصلی
 * - مدیریت سکانس‌های هر تجربه با آپلود مستقیم فیلم‌های لوپ
 * - طراحی ترنزیشن‌های ویدیویی اختصاصی بین سکانس‌های هر تجربه
 * - تست زنده و پیش‌نمایش همزمان گشت ویدیویی تجربه قبل از انتشار
 */

import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Video, 
  Plus, 
  Trash2, 
  Save, 
  Upload, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Layers, 
  ArrowRight, 
  Check, 
  Eye, 
  Compass, 
  Calendar,
  Building,
  Utensils,
  Waves,
  ArrowLeftRight
} from 'lucide-react';
import { 
  useThemeAndSiteStore 
} from '../../store/useThemeAndSiteStore';
import { 
  DedicatedExperience, 
  DedicatedSequence, 
  DedicatedTransition 
} from '../../types/cms';
import { DedicatedExperiencePlayer } from '../DedicatedExperiencePlayer';
import { toPersianDigits, formatPersianPrice } from '../../utils/jalali';

export const DedicatedExperiencesManagerTab: React.FC = () => {
  const {
    dedicatedExperiences,
    addDedicatedExperience,
    updateDedicatedExperience,
    removeDedicatedExperience,
    addSequenceToExperience,
    updateExperienceSequence,
    removeExperienceSequence,
    addTransitionToExperience,
    removeExperienceTransition,
  } = useThemeAndSiteStore();

  const [selectedExpId, setSelectedExpId] = useState<string>(
    dedicatedExperiences[0]?.id || ''
  );

  // زیرتب‌های ویرایشگر تجربه: مشخصات، سکانس‌ها، ترنزیشن‌ها، تست زنده
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'sequences' | 'transitions' | 'preview'>('sequences');

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // وضعیت‌های مدیا در پنل
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(true);
  const [previewMuted, setPreviewMuted] = useState<boolean>(true);

  // مودال افزودن تجربه اختصاصی جدید
  const [isAddingExperience, setIsAddingExperience] = useState<boolean>(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpTagline, setNewExpTagline] = useState('');
  const [newExpCategory, setNewExpCategory] = useState<'suite' | 'dining' | 'spa' | 'club' | 'villa' | 'lounge'>('suite');
  const [newExpFloor, setNewExpFloor] = useState('۴');
  const [newExpPrice, setNewExpPrice] = useState(35000000);
  const [newExpPriceUnit, setNewExpPriceUnit] = useState<'هر شب' | 'هر سانس' | 'هر نفر'>('هر شب');

  // مودال افزودن ترنزیشن جدید برای تجربه
  const [isAddingTransition, setIsAddingTransition] = useState(false);
  const [transFromSeq, setTransFromSeq] = useState('');
  const [transToSeq, setTransToSeq] = useState('');
  const [transLabel, setTransLabel] = useState('گذر سینمایی');
  const [transVideoUrl, setTransVideoUrl] = useState('https://assets.mixkit.co/videos/42788/42788-720.mp4');
  const [transDirection, setTransDirection] = useState<'forward' | 'backward' | 'ascend' | 'descend' | 'lateral'>('forward');

  // رفرنس‌های آپلود مستقیم فایل
  const seqVideoUploadRef = useRef<HTMLInputElement>(null);
  const transVideoUploadRef = useRef<HTMLInputElement>(null);
  const editingSeqIdRef = useRef<string | null>(null);

  const selectedExp = dedicatedExperiences.find((e) => e.id === selectedExpId) || dedicatedExperiences[0];

  const triggerSaveFlash = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // ایجاد تجربه جدید
  const handleCreateExperience = () => {
    if (!newExpTitle.trim()) return;

    const newId = `exp-${Date.now()}`;
    const initialSeq: DedicatedSequence = {
      id: `seq-${Date.now()}-1`,
      title: `${newExpTitle} - سالن اصلی`,
      subtitle: 'ورودی و چشم‌انداز اختصاصی',
      description: 'سکانس شروع تجربه اختصاصی',
      videoUrl: 'https://assets.mixkit.co/videos/42792/42792-720.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      duration: 10,
    };

    const newExp: DedicatedExperience = {
      id: newId,
      title: newExpTitle,
      tagline: newExpTagline || 'اقامتگاه و تجربه اختصاصی قصر لورا',
      category: newExpCategory,
      floorCode: newExpFloor,
      price: newExpPrice,
      priceUnit: newExpPriceUnit,
      coverImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      amenities: ['امکانات تشریفاتی VIP', 'سرپیشخدمت اختصاصی'],
      description: 'تجربه کاملاً اختصاصی با معماری اشرافی و خدمات شخصی‌سازی شده.',
      sequences: [initialSeq],
      transitions: [],
    };

    addDedicatedExperience(newExp);
    setSelectedExpId(newId);
    setIsAddingExperience(false);
    setNewExpTitle('');
    triggerSaveFlash();
  };

  // آپلود مستقیم فیلم لوپ برای سکانس تجربه
  const handleSeqVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const seqId = editingSeqIdRef.current;
    if (!file || !selectedExp || !seqId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateExperienceSequence(selectedExp.id, seqId, {
        videoUrl: dataUrl,
      });
      triggerSaveFlash();
    };
    reader.readAsDataURL(file);
  };

  // افزودن سکانس جدید به تجربه جاری
  const handleAddNewSequence = () => {
    if (!selectedExp) return;
    const newSeqId = `seq-${Date.now()}`;
    const newSeq: DedicatedSequence = {
      id: newSeqId,
      title: `بخش جدید ${toPersianDigits(selectedExp.sequences.length + 1)}`,
      subtitle: 'چشم‌انداز پانورامیک اختصاصی',
      description: 'معماری و دکوراسیون مجلل دست‌ساز',
      videoUrl: 'https://assets.mixkit.co/videos/42790/42790-720.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      duration: 8.5,
    };

    addSequenceToExperience(selectedExp.id, newSeq);
    triggerSaveFlash();
  };

  // ثبت ترنزیشن جدید برای تجربه جاری
  const handleCreateTransition = () => {
    if (!selectedExp || !transFromSeq || !transToSeq) return;

    const newTrans: DedicatedTransition = {
      id: `trans-${Date.now()}`,
      fromSequenceId: transFromSeq,
      toSequenceId: transToSeq,
      label: transLabel,
      videoUrl: transVideoUrl,
      duration: 4.5,
      direction: transDirection,
    };

    addTransitionToExperience(selectedExp.id, newTrans);
    setIsAddingTransition(false);
    triggerSaveFlash();
  };

  const categoryBadgeMap: Record<string, { label: string; color: string }> = {
    suite: { label: 'سوئیت اقامتی', color: 'bg-amber-400/20 text-amber-300 border-amber-400/40' },
    room: { label: 'اتاق دلوکس', color: 'bg-blue-400/20 text-blue-300 border-blue-400/40' },
    cafe: { label: 'کافه و روف‌تاپ', color: 'bg-orange-400/20 text-orange-300 border-orange-400/40' },
    gameroom: { label: 'گیم‌روم VIP', color: 'bg-violet-400/20 text-violet-300 border-violet-400/40' },
    dining: { label: 'رستوران و غذا', color: 'bg-rose-400/20 text-rose-300 border-rose-400/40' },
    spa: { label: 'اسپا و تندرستی', color: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40' },
    club: { label: 'کلاب ساحلی VIP', color: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40' },
    villa: { label: 'ویلای اختصاصی', color: 'bg-purple-400/20 text-purple-300 border-purple-400/40' },
    lounge: { label: 'لانژ و بار', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* هدر بخش استودیوی تجربه‌های اختصاصی */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>استودیوی ساخت و مدیریت تجربه‌های اختصاصی هتل (Bespoke Experiences Studio)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            ایجاد سوئیت‌ها، رستوران‌ها، اسپا و تجارب منحصربه‌فرد؛ همراه با تعریف سکانس‌های چندگانه، ترنزیشن‌های ویدیویی اختصاصی و قیمت‌گذاری
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
            onClick={() => setIsAddingExperience(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن تجربه جدید</span>
          </button>
        </div>
      </div>

      {/* اینپوت‌های مخفی آپلود فایل */}
      <input ref={seqVideoUploadRef} type="file" accept="video/*" onChange={handleSeqVideoUpload} className="hidden" />

      {/* =========================================================================
          انتخابگر نواری تجربه‌های اختصاصی موجود
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
        <span className="text-xs font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>تجربه‌های اختصاصی فعال هتل ({toPersianDigits(dedicatedExperiences.length)} تجربه):</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {dedicatedExperiences.map((exp) => {
            const isSelected = exp.id === selectedExpId;
            const badge = categoryBadgeMap[exp.category] || categoryBadgeMap.suite;

            return (
              <div
                key={exp.id}
                onClick={() => setSelectedExpId(exp.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-amber-400/15 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                    : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      طبقه {exp.floorCode}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white line-clamp-1">
                    {exp.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                    {exp.tagline}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2 text-[10px]">
                  <span className="text-amber-300 font-bold font-mono">
                    {toPersianDigits(exp.sequences.length)} سکانس &bull; {toPersianDigits(exp.transitions.length)} ترنزیشن
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {formatPersianPrice(exp.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          بخش کارگاه ویرایش تجربه انتخاب‌شده
          ========================================================================= */}
      {selectedExp && (
        <div className="p-6 rounded-3xl bg-neutral-900/70 border border-neutral-800 space-y-6">
          {/* هدر تجربه و سوئیچ زیرتب‌ها */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  ویرایشگر اختصاصی &bull; طبقه {selectedExp.floorCode}
                </span>
                <span className="text-xs text-neutral-400">{selectedExp.tagline}</span>
              </div>
              <h3 className="text-lg font-black text-white">{selectedExp.title}</h3>
            </div>

            {/* نوار زیرتب‌های ادیتور تجربه */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-950 border border-neutral-800">
              {[
                { id: 'sequences', label: `سکانس‌های ویدیویی (${toPersianDigits(selectedExp.sequences.length)})`, icon: <Video className="w-3.5 h-3.5" /> },
                { id: 'transitions', label: `ترنزیشن‌های بین سکانس (${toPersianDigits(selectedExp.transitions.length)})`, icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
                { id: 'info', label: 'اطلاعات و تعرفه', icon: <Sparkles className="w-3.5 h-3.5" /> },
                { id: 'preview', label: 'تست زنده گشت ویدیویی', icon: <Eye className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === tab.id
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              زیرتب ۱: سکانس‌های ویدیویی این تجربه (Experience Sequences)
              ------------------------------------------------------------------- */}
          {activeSubTab === 'sequences' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-400" />
                    <span>توالی سکانس‌های ویدیویی این تجربه (Ambient Loops):</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    کاربر با ورود به این تجربه، این سکانس‌ها را به ترتیب مشاهده خواهد کرد. برای هر سکانس می‌توانید ویدیو آپلود کنید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewSequence}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold shadow-lg hover:bg-amber-300 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن سکانس جدید</span>
                </button>
              </div>

              {/* لیست کارت‌های سکانس‌ها */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedExp.sequences.map((seq, idx) => (
                  <div
                    key={seq.id}
                    className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* سرتیتر سکانس و شماره توالی */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-mono">
                          سکانس {toPersianDigits(idx + 1)}
                        </span>
                        {selectedExp.sequences.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExperienceSequence(selectedExp.id, seq.id)}
                            className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="حذف سکانس"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* پیش‌نمایش ویدیوی سکانس */}
                      <div className="relative aspect-video rounded-xl bg-black border border-neutral-800 overflow-hidden mb-3">
                        <video
                          src={seq.videoUrl}
                          poster={seq.posterUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] text-neutral-300 font-mono">
                          {toPersianDigits(seq.duration || 10)}s
                        </div>
                      </div>

                      {/* عنوان و زیرعنوان سکانس */}
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">عنوان سکانس:</label>
                          <input
                            type="text"
                            value={seq.title}
                            onChange={(e) =>
                              updateExperienceSequence(selectedExp.id, seq.id, { title: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">توضیح کوتاه:</label>
                          <input
                            type="text"
                            value={seq.subtitle || ''}
                            onChange={(e) =>
                              updateExperienceSequence(selectedExp.id, seq.id, { subtitle: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:border-amber-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">آدرس مستقیم ویدیو (URL):</label>
                          <input
                            type="text"
                            dir="ltr"
                            value={seq.videoUrl}
                            onChange={(e) =>
                              updateExperienceSequence(selectedExp.id, seq.id, { videoUrl: e.target.value })
                            }
                            className="w-full px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* دکمه آپلود مستقیم ویدیو از سیستم */}
                    <div className="pt-2 border-t border-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          editingSeqIdRef.current = seq.id;
                          seqVideoUploadRef.current?.click();
                        }}
                        className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>آپلود فایل ویدیو از کامپیوتر</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              زیرتب ۲: ترنزیشن‌های بین سکانس‌های این تجربه (Sequence Transitions)
              ------------------------------------------------------------------- */}
          {activeSubTab === 'transitions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                    <span>طراحی و اتصال ترنزیشن‌های ویدیویی بین سکانس‌های این تجربه:</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    هنگامی که مهمان از یک سکانس به سکانس دیگر می‌رود (مثلاً از سالن پذیرایی به اتاق خواب یا تراس)، این فیلم‌های ترنزیشن پخش می‌شوند.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTransFromSeq(selectedExp.sequences[0]?.id || '');
                    setTransToSeq(selectedExp.sequences[1]?.id || selectedExp.sequences[0]?.id || '');
                    setIsAddingTransition(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold shadow-lg hover:bg-amber-300 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن ترنزیشن جدید</span>
                </button>
              </div>

              {/* فرم افزودن ترنزیشن جدید */}
              {isAddingTransition && (
                <div className="p-5 rounded-2xl bg-neutral-950 border border-amber-400/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-amber-300">پیکربندی ترنزیشن ویدیویی جدید:</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingTransition(false)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      انصراف
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-neutral-400 mb-1">از سکانس مبدأ:</label>
                      <select
                        value={transFromSeq}
                        onChange={(e) => setTransFromSeq(e.target.value)}
                        className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                      >
                        {selectedExp.sequences.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">به سکانس مقصد:</label>
                      <select
                        value={transToSeq}
                        onChange={(e) => setTransToSeq(e.target.value)}
                        className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                      >
                        {selectedExp.sequences.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">عنوان انتقال:</label>
                      <input
                        type="text"
                        value={transLabel}
                        onChange={(e) => setTransLabel(e.target.value)}
                        placeholder="مثلاً گذر از راهرو به اتاق مستر"
                        className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">جهت حرکت در فضا:</label>
                      <select
                        value={transDirection}
                        onChange={(e) => setTransDirection(e.target.value as any)}
                        className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                      >
                        <option value="forward">رو به جلو (Forward)</option>
                        <option value="backward">بازگشت به عقب (Backward)</option>
                        <option value="ascend">صعودی / آسانسور (Ascend)</option>
                        <option value="descend">نزولی (Descend)</option>
                        <option value="lateral">افقی و جانبی (Lateral)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-400 text-xs mb-1">آدرس ویدیوی ترنزیشن (URL):</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={transVideoUrl}
                      onChange={(e) => setTransVideoUrl(e.target.value)}
                      className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateTransition}
                      className="px-5 py-2 rounded-xl bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg hover:bg-amber-300 transition-all cursor-pointer active:scale-95"
                    >
                      ذخیره ترنزیشن
                    </button>
                  </div>
                </div>
              )}

              {/* لیست ترنزیشن‌های ثبت‌شده این تجربه */}
              <div className="space-y-3">
                {selectedExp.transitions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center text-xs text-neutral-400">
                    هنوز ترنزیشنی بین سکانس‌های این تجربه تعریف نشده است. با دکمه بالا اولین ترنزیشن را اضافه فرمایید.
                  </div>
                ) : (
                  selectedExp.transitions.map((trans) => {
                    const fromSeq = selectedExp.sequences.find((s) => s.id === trans.fromSequenceId);
                    const toSeq = selectedExp.sequences.find((s) => s.id === trans.toSequenceId);

                    return (
                      <div
                        key={trans.id}
                        className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                            <ArrowLeftRight className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{fromSeq?.title || 'سکانس مبدأ'}</span>
                              <span className="text-amber-400 text-xs font-bold">➔</span>
                              <span className="text-xs font-bold text-white">{toSeq?.title || 'سکانس مقصد'}</span>
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {trans.label} &bull; جهت: {trans.direction} &bull; مدت: {toPersianDigits(trans.duration || 4.5)} ثانیه
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => removeExperienceTransition(selectedExp.id, trans.id)}
                            className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              زیرتب ۳: مشخصات، قیمت و امکانات (Info & Pricing)
              ------------------------------------------------------------------- */}
          {activeSubTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">عنوان رسمی تجربه / سوئیت:</label>
                  <input
                    type="text"
                    value={selectedExp.title}
                    onChange={(e) => updateDedicatedExperience(selectedExp.id, { title: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">شعار یا توصیف کوتاه:</label>
                  <input
                    type="text"
                    value={selectedExp.tagline}
                    onChange={(e) => updateDedicatedExperience(selectedExp.id, { tagline: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">دسته‌بندی:</label>
                  <select
                    value={selectedExp.category}
                    onChange={(e) => updateDedicatedExperience(selectedExp.id, { category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="suite">سوئیت اقامتی لوکس</option>
                    <option value="room">اتاق رویال دلوکس</option>
                    <option value="cafe">کافه و روف‌تاپ لانژ</option>
                    <option value="gameroom">گیم‌روم و کلوپ تفریحی</option>
                    <option value="dining">رستوران و غذا</option>
                    <option value="spa">اسپا و تندرستی</option>
                    <option value="club">کلاب ساحلی VIP</option>
                    <option value="villa">ویلای اختصاصی</option>
                    <option value="lounge">لانژ و بار</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">کد طبقه هتل:</label>
                  <input
                    type="text"
                    value={selectedExp.floorCode}
                    onChange={(e) => updateDedicatedExperience(selectedExp.id, { floorCode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">قیمت پایه (تومان):</label>
                  <input
                    type="number"
                    value={selectedExp.price}
                    onChange={(e) => updateDedicatedExperience(selectedExp.id, { price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-300 font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">واحد محاسبه قیمت:</label>
                  <select
                    value={selectedExp.priceUnit}
                    onChange={(e) => updateDedicatedExperience(selectedExp.id, { priceUnit: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="هر شب">هر شب (اقامت سوئیت)</option>
                    <option value="هر سانس">هر سانس (اسپا، کابانا، استخر)</option>
                    <option value="هر نفر">هر نفر (ضیافت شام رستوران)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 text-xs mb-1">شرح مفصل معماری و خدمات:</label>
                <textarea
                  rows={3}
                  value={selectedExp.description}
                  onChange={(e) => updateDedicatedExperience(selectedExp.id, { description: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-neutral-400 text-xs mb-1">آدرس تصویر کاور (Cover Image URL):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={selectedExp.coverImageUrl}
                  onChange={(e) => updateDedicatedExperience(selectedExp.id, { coverImageUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              زیرتب ۴: تست و پیش‌نمایش زنده گشت ویدیویی (Live Tour Sandbox)
              ------------------------------------------------------------------- */}
          {activeSubTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">
                  پیش‌نمایش تعاملی دقیقاً همانند تجربه‌ای است که مهمان در سایت مشاهده می‌کند:
                </span>
                <span className="text-amber-400 font-bold">
                  {toPersianDigits(selectedExp.sequences.length)} سکانس متصل
                </span>
              </div>

              <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl bg-black">
                <DedicatedExperiencePlayer
                  experience={selectedExp}
                  onClose={() => setActiveSubTab('sequences')}
                  onBookNow={() => alert(`تست رزرو تجربه: ${selectedExp.title}`)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* مودال افزودن تجربه اختصاصی جدید */}
      {isAddingExperience && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-neutral-950 border border-amber-400/50 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>تعریف تجربه یا سوئیت اختصاصی جدید</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingExperience(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">عنوان تجربه:</label>
                <input
                  type="text"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder="مثلاً: سوئیت امپریال دوخوابه دریا"
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">دسته‌بندی:</label>
                <select
                  value={newExpCategory}
                  onChange={(e) => setNewExpCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="suite">سوئیت اقامتی</option>
                  <option value="room">اتاق رویال دلوکس</option>
                  <option value="cafe">کافه و روف‌تاپ</option>
                  <option value="gameroom">گیم‌روم و کلوپ تفریحی</option>
                  <option value="dining">رستوران و هنر آشپزی</option>
                  <option value="spa">اسپا و تندرستی</option>
                  <option value="club">کلاب ساحلی VIP</option>
                  <option value="villa">ویلای ساحلی</option>
                  <option value="lounge">لانژ و بار</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">طبقه:</label>
                  <input
                    type="text"
                    value={newExpFloor}
                    onChange={(e) => setNewExpFloor(e.target.value)}
                    className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">واحد نرخ:</label>
                  <select
                    value={newExpPriceUnit}
                    onChange={(e) => setNewExpPriceUnit(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="هر شب">هر شب</option>
                    <option value="هر سانس">هر سانس</option>
                    <option value="هر نفر">هر نفر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">قیمت پایه (تومان):</label>
                <input
                  type="number"
                  value={newExpPrice}
                  onChange={(e) => setNewExpPrice(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-300 font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingExperience(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleCreateExperience}
                className="px-5 py-2 rounded-xl bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg hover:bg-amber-300 transition-all cursor-pointer active:scale-95"
              >
                ایجاد تجربه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
