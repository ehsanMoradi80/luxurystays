/**
 * AtmosphereController.tsx
 * 
 * کامپوننت فرانت‌اند کنترلر اتمسفر و نورپردازی (Atmosphere Controller Client Component)
 * امکان تغییر پویا و بلادرنگ حالت روز/شب، دمای رنگ نوری (۲۴۰۰K تا ۶۵۰۰K) و افکت‌های بصری
 * بر روی تصاویر یا ویدیوهای لایه‌بندی شده هتل لوکس
 */

import React, { useState, useMemo } from 'react';
import { AtmosphereNodeData, AtmosphereLightingPreset } from '../../types/sequenceGraph';
import { Sun, Moon, Sunset, Flame, Sliders, Sparkles, Layers, Eye } from 'lucide-react';
import { toPersianDigits } from '../../utils/JalaliDate';

interface AtmosphereControllerProps {
  nodeData: AtmosphereNodeData;
  onClose?: () => void;
}

export const AtmosphereController: React.FC<AtmosphereControllerProps> = ({
  nodeData,
  onClose,
}) => {
  // پریست‌های پیش‌فرض در صورت عدم وجود در نود
  const presets: AtmosphereLightingPreset[] = useMemo(() => {
    if (nodeData.presets && nodeData.presets.length > 0) {
      return nodeData.presets;
    }
    return [
      {
        id: 'preset-dawn',
        name: 'نسیم پگاه (Dawn)',
        timeOfDay: 'dawn',
        colorTempK: 4800,
        exposure: 0.1,
        overlayGradient: 'linear-gradient(135deg, rgba(254, 215, 170, 0.28) 0%, rgba(191, 219, 254, 0.18) 100%)',
        filterCss: 'brightness(1.05) contrast(1.02) saturate(1.1) sepia(0.08)',
      },
      {
        id: 'preset-zenith',
        name: 'درخشش نیمروز (Zenith)',
        timeOfDay: 'zenith',
        colorTempK: 5800,
        exposure: 0.25,
        overlayGradient: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(224, 242, 254, 0.08) 100%)',
        filterCss: 'brightness(1.15) contrast(1.08) saturate(1.05)',
      },
      {
        id: 'preset-golden',
        name: 'ساعت طلایی سلطنتی (Golden Hour)',
        timeOfDay: 'golden_hour',
        colorTempK: 3000,
        exposure: 0.05,
        overlayGradient: 'linear-gradient(45deg, rgba(245, 158, 11, 0.38) 0%, rgba(217, 119, 6, 0.25) 60%, rgba(180, 83, 9, 0.15) 100%)',
        filterCss: 'brightness(1.02) contrast(1.12) saturate(1.35) sepia(0.28)',
      },
      {
        id: 'preset-midnight',
        name: 'سکوت مخملین شب (Velvet Midnight)',
        timeOfDay: 'midnight',
        colorTempK: 2600,
        exposure: -0.3,
        overlayGradient: 'linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(67, 24, 255, 0.22) 100%)',
        filterCss: 'brightness(0.68) contrast(1.25) saturate(0.85) hue-rotate(215deg)',
      },
    ];
  }, [nodeData.presets]);

  const [activePresetId, setActivePresetId] = useState<string>(nodeData.activePresetId || 'preset-golden');
  const [colorTempK, setColorTempK] = useState<number>(nodeData.colorTemperatureK || 3000);
  const [exposureVal, setExposureVal] = useState<number>(0);
  const [sliderTimeOfDay, setSliderTimeOfDay] = useState<number>(18); // 0 to 24 hours

  // محاسبه استایل فیلتر زنده بر اساس مقادیر دمای رنگ
  const currentPreset = presets.find((p) => p.id === activePresetId) || presets[2];

  // محاسبه فیلتر ترکیبی
  const dynamicFilterStyle = useMemo(() => {
    // تبدیل دمای رنگ به تن گرم یا سرد
    // ۲۴۰۰ (خیلی گرم) -> sepia زیاد
    // ۶۵۰۰ (سرد) -> hue-rotate به سمت آبی
    const warmRatio = Math.max(0, (5000 - colorTempK) / 2600); // 0 to 1
    const coolRatio = Math.max(0, (colorTempK - 5000) / 1500); // 0 to 1
    const brightness = 1 + exposureVal + (currentPreset.exposure || 0);

    return {
      filter: `brightness(${brightness}) contrast(1.08) saturate(${1 + warmRatio * 0.3}) sepia(${warmRatio * 0.35}) hue-rotate(${coolRatio * 15}deg)`,
      transition: 'filter 0.4s ease-out',
    };
  }, [colorTempK, exposureVal, currentPreset]);

  return (
    <div id="atmosphere-controller-view" dir="rtl" className="relative w-full h-full bg-neutral-950 text-neutral-100 overflow-hidden flex flex-col font-sans select-none">
      {/* =========================================================================
          لایه پس‌زمینه: تصویر/ویدیوی پایه با افکت‌های نوری بلادرنگ
          ========================================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={nodeData.baseMediaUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80'}
          alt={nodeData.title}
          className="w-full h-full object-cover scale-105"
          style={dynamicFilterStyle}
        />
        {/* لایه گرادیان نوری شبیه‌سازی اتمسفر */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{ background: currentPreset.overlayGradient }}
        />
        {/* لایه وینیتینگ سینمایی اطراف کادر */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-none" />
      </div>

      {/* =========================================================================
          هدر شناور: عنوان فضا و بازگشت
          ========================================================================= */}
      <div className="relative z-20 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 backdrop-blur-xl flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-mono tracking-widest uppercase">
                Atmosphere Controller
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                پلیس‌هولدر تعاملی نوری
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-white font-bold tracking-wide">
              {nodeData.title}
            </h2>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 text-neutral-200 text-xs font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
          >
            بازگشت به سکانس‌ها &times;
          </button>
        )}
      </div>

      {/* =========================================================================
          پنل کنترل اتمسفر در پایین صفحه (Glassmorphic Luxury Dock)
          ========================================================================= */}
      <div className="relative z-20 mt-auto p-4 sm:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-black/75 backdrop-blur-2xl border border-amber-400/30 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] space-y-6">
          {/* بخش ۱: پریست‌های اتمسفر چهارگانه */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-neutral-300 font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                حالت‌های اتمسفریک چهارگانه شبانه‌روز:
              </span>
              <span className="text-amber-400 font-mono text-[11px] font-bold">
                {currentPreset.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {presets.map((p) => {
                const isActive = p.id === activePresetId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePresetId(p.id);
                      setColorTempK(p.colorTempK);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.25)] scale-[1.02]'
                        : 'bg-neutral-900/60 border-white/10 text-neutral-400 hover:text-neutral-200 hover:border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
                      {p.timeOfDay === 'dawn' && <Flame className="w-4 h-4 text-orange-400" />}
                      {p.timeOfDay === 'zenith' && <Sun className="w-4 h-4 text-yellow-300" />}
                      {p.timeOfDay === 'golden_hour' && <Sunset className="w-4 h-4 text-amber-400" />}
                      {p.timeOfDay === 'midnight' && <Moon className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <span className="text-xs font-semibold text-center">{p.name.split(' (')[0]}</span>
                    <span className="text-[10px] opacity-70">{toPersianDigits(p.colorTempK)} کلوین</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* بخش ۲: اسلایدر زمان روز / شب (Time of Day 00:00 - 24:00) */}
          <div className="bg-neutral-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                چرخه ۲۴ ساعته نور طبیعی خورشید:
              </span>
              <span className="text-amber-300 font-bold text-sm">
                ساعت {toPersianDigits(String(Math.floor(sliderTimeOfDay)).padStart(2, '0'))}:۰۰
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              step={1}
              value={sliderTimeOfDay}
              onChange={(e) => {
                const hour = parseInt(e.target.value, 10);
                setSliderTimeOfDay(hour);
                if (hour >= 5 && hour < 9) {
                  setActivePresetId('preset-dawn');
                  setColorTempK(4800);
                } else if (hour >= 9 && hour < 17) {
                  setActivePresetId('preset-zenith');
                  setColorTempK(5800);
                } else if (hour >= 17 && hour < 20) {
                  setActivePresetId('preset-golden');
                  setColorTempK(3000);
                } else {
                  setActivePresetId('preset-midnight');
                  setColorTempK(2600);
                }
              }}
              className="w-full accent-amber-400 h-2 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>۰۰:۰۰ (نیمه‌شب)</span>
              <span>۰۶:۰۰ (پگاه)</span>
              <span>۱۲:۰۰ (نیمروز)</span>
              <span>۱۸:۰۰ (ساعت طلایی)</span>
              <span>۲۴:۰۰ (شب)</span>
            </div>
          </div>

          {/* بخش ۳: اسلایدرهای جزئی دمای رنگ (Kelvin) و اکسپوژر */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* دمای رنگ کلوین */}
            <div className="bg-neutral-900/60 p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  دمای کلوین (Kelvin):
                </span>
                <span className="text-amber-400 font-bold">{toPersianDigits(colorTempK)} کلوین</span>
              </div>
              <input
                type="range"
                min={2400}
                max={6500}
                step={50}
                value={colorTempK}
                onChange={(e) => setColorTempK(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                <span>{toPersianDigits(2400)}K (گرم/شمع)</span>
                <span>{toPersianDigits(6500)}K (خنک/آسمان)</span>
              </div>
            </div>

            {/* روشنایی و اکسپوژر */}
            <div className="bg-neutral-900/60 p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  نوردهی و شفافیت (Exposure):
                </span>
                <span className="text-sky-400 font-bold">
                  {toPersianDigits(exposureVal > 0 ? `+${exposureVal.toFixed(2)}` : exposureVal.toFixed(2))} EV
                </span>
              </div>
              <input
                type="range"
                min={-0.4}
                max={0.4}
                step={0.05}
                value={exposureVal}
                onChange={(e) => setExposureVal(parseFloat(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                <span>-۰.۴ (سایه‌روشن)</span>
                <span>+۰.۴ (درخشان)</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
