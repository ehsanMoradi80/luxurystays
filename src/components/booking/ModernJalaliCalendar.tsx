/**
 * ModernJalaliCalendar.tsx
 * 
 * تقویم جلالی مدرن، کاملاً سفارشی‌سازی شده و لوکس برای صفحه رزرواسیون
 * - ناوبری آسان ماه‌ها (مهر، آبان، آذر ۱۴۰۵...)
 * - بازه انتخاب ورود و خروج با هایلایت طلایی
 * - چیدمان دقیق روزهای هفته (شنبه تا جمعه)
 * - ارقام ۱۰۰٪ فارسی و هماهنگ با تایپوگرافی وزیرمتن
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import {
  toPersianDigits,
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAY_NAMES,
  JALALI_WEEKDAY_SHORT,
  getDaysInJalaliMonth,
  getFirstWeekdayOfJalaliMonth,
  calculateJalaliNights,
} from '../../utils/JalaliDate';

export interface ModernJalaliCalendarProps {
  startDate: string; // e.g. "1405/07/04"
  endDate: string; // e.g. "1405/07/07"
  startTime: string; // e.g. "۱۴:۰۰"
  endTime: string; // e.g. "۱۲:۰۰"
  onDateChange: (start: string, end: string) => void;
  onTimeChange: (start: string, end: string) => void;
}

export const ModernJalaliCalendar: React.FC<ModernJalaliCalendarProps> = ({
  startDate,
  endDate,
  startTime,
  endTime,
  onDateChange,
  onTimeChange,
}) => {
  // استخراج سال و ماه فعلی برای نمایش در تقویم
  const initialYear = parseInt(startDate.split('/')[0] || '1405', 10);
  const initialMonth = parseInt(startDate.split('/')[1] || '7', 10);

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth); // 1 = فروردین ... 7 = مهر
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  // ناوبری ماه‌ها
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // محاسبه شب‌های اقامت
  const nights = useMemo(() => {
    return calculateJalaliNights(startDate, endDate);
  }, [startDate, endDate]);

  // روزهای ماه جاری
  const daysInMonth = useMemo(() => {
    return getDaysInJalaliMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // روز هفته اول ماه (۰ = شنبه ... ۶ = جمعه)
  const firstWeekday = useMemo(() => {
    return getFirstWeekdayOfJalaliMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // انتخاب روز در تقویم
  const handleDayClick = (dayNumber: number) => {
    const iso = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(dayNumber).padStart(2, '0')}`;

    if (selectionStep === 'start') {
      onDateChange(iso, iso);
      setSelectionStep('end');
    } else {
      if (iso <= startDate) {
        onDateChange(iso, iso);
      } else {
        onDateChange(startDate, iso);
        setSelectionStep('start');
      }
    }
  };

  // پیش‌تنظیمات اقامت سریع
  const handlePresetNights = (count: number) => {
    const sYear = 1405;
    const sMonth = 7;
    const sDay = 4;
    const startIso = `${sYear}/${String(sMonth).padStart(2, '0')}/${String(sDay).padStart(2, '0')}`;
    const eDay = sDay + count;
    const endIso = `${sYear}/${String(sMonth).padStart(2, '0')}/${String(eDay).padStart(2, '0')}`;
    onDateChange(startIso, endIso);
    setViewYear(sYear);
    setViewMonth(sMonth);
  };

  const TIME_OPTIONS_CHECKIN = [
    { label: '۱۲:۰۰ (تحویل زودهنگام VIP)', value: '۱۲:۰۰' },
    { label: '۱۴:۰۰ (ساعت استاندارد تحویل)', value: '۱۴:۰۰' },
    { label: '۱۶:۰۰ (عصرگاه ساحلی)', value: '۱۶:۰۰' },
    { label: '۱۸:۰۰ (ورود شامگاهی)', value: '۱۸:۰۰' },
  ];

  const TIME_OPTIONS_CHECKOUT = [
    { label: '۱۱:۰۰ (ترخیص صبحگاهی)', value: '۱۱:۰۰' },
    { label: '۱۲:۰۰ (ساعت استاندارد ترخیص)', value: '۱۲:۰۰' },
    { label: '۱۴:۰۰ (ترخیص دیرهنگام VIP)', value: '۱۴:۰۰' },
    { label: '۱۶:۰۰ (تمدید کامل عصر)', value: '۱۶:۰۰' },
  ];

  return (
    <div className="w-full space-y-6 text-right select-none font-sans">
      {/* بنر باشکوه مدت زمان اقامت */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-neutral-900 border border-amber-400/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)] shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">مدت اقامت انتخابی شما:</div>
            <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mt-0.5">
              <span className="text-amber-300">
                {toPersianDigits(nights)} شب و {toPersianDigits(nights + 1)} روز اقامت شاهانه
              </span>
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              از تاریخ <span className="text-white font-semibold">{toPersianDigits(startDate)}</span> تا{' '}
              <span className="text-white font-semibold">{toPersianDigits(endDate)}</span>
            </div>
          </div>
        </div>

        {/* پیش‌تنظیمات سریع */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handlePresetNights(2)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 hover:border-amber-400/40 transition-all whitespace-nowrap cursor-pointer"
          >
            آخر هفته (۲ شب)
          </button>
          <button
            type="button"
            onClick={() => handlePresetNights(3)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 hover:border-amber-400/40 transition-all whitespace-nowrap cursor-pointer"
          >
            ۳ شبانه رویایی
          </button>
          <button
            type="button"
            onClick={() => handlePresetNights(7)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 hover:border-amber-400/40 transition-all whitespace-nowrap cursor-pointer"
          >
            یک هفته شاهانه
          </button>
        </div>
      </div>

      {/* باکس تقویم جلالی با ناوبری و گرید هفته */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
        {/* هدر تقویم و انتخاب ماه/سال */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-lg font-bold text-white">
                {JALALI_MONTH_NAMES[viewMonth - 1]} {toPersianDigits(viewYear)}
              </span>
              <span className="text-[11px] text-amber-300/80 block mt-0.5">
                {selectionStep === 'start'
                  ? 'لطفاً تاریخ ورود (Check-in) را لمس فرمایید'
                  : 'اکنون تاریخ خروج (Check-out) را تعیین نمایید'}
              </span>
            </div>
          </div>

          {/* دکمه‌های رفتن به ماه قبل و بعد */}
          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {/* در RTL، فلش راست به معنی ماه قبل و فلش چپ به معنی ماه بعد است */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 transition-all cursor-pointer"
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 text-neutral-500 font-medium">ماه</span>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 transition-all cursor-pointer"
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* سرستون روزهای هفته در تقویم ایرانی: شنبه تا جمعه */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {JALALI_WEEKDAY_SHORT.map((dayName, idx) => (
            <div
              key={idx}
              className={`py-2 text-xs font-bold ${
                idx === 6 ? 'text-rose-400/90' : 'text-neutral-400'
              }`}
              title={JALALI_WEEKDAY_NAMES[idx]}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* سلول‌های تقویم */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {/* خانه‌های خالی ابتدای ماه تا روز شنبه تطبیق پیدا کند */}
          {Array.from({ length: firstWeekday }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-2xl opacity-0 pointer-events-none" />
          ))}

          {/* روزهای ماه */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const currentDayIso = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(dayNum).padStart(2, '0')}`;
            const isStart = currentDayIso === startDate;
            const isEnd = currentDayIso === endDate;
            const isInRange = currentDayIso >= startDate && currentDayIso <= endDate;

            // تشخیص روز جمعه (تعطیل)
            const dayWeekdayIndex = (firstWeekday + idx) % 7;
            const isFriday = dayWeekdayIndex === 6;

            return (
              <button
                key={currentDayIso}
                type="button"
                onClick={() => handleDayClick(dayNum)}
                className={`h-14 sm:h-16 rounded-2xl transition-all duration-150 flex flex-col items-center justify-center relative cursor-pointer group border ${
                  isStart || isEnd
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 font-black shadow-xl shadow-amber-400/25 scale-[1.04] z-10'
                    : isInRange
                    ? 'bg-amber-400/15 border-amber-400/40 text-amber-200 font-bold'
                    : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-200 hover:border-amber-400/50 hover:bg-neutral-900'
                }`}
              >
                <span
                  className={`text-base sm:text-lg ${
                    isStart || isEnd
                      ? 'text-neutral-950 font-black'
                      : isFriday
                      ? 'text-rose-400 font-bold'
                      : 'text-neutral-100 font-semibold'
                  }`}
                >
                  {toPersianDigits(dayNum)}
                </span>

                {/* برچسب‌های ورود و خروج */}
                {isStart && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-950 text-amber-300 font-black shadow-md mt-0.5">
                    ورود
                  </span>
                )}
                {isEnd && !isStart && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-950 text-amber-300 font-black shadow-md mt-0.5">
                    خروج
                  </span>
                )}

                {/* نشانگر در دسترس بودن روز */}
                {!isStart && !isEnd && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 group-hover:bg-amber-400 mt-1 transition-colors" />
                )}
              </button>
            );
          })}
        </div>

        {/* راهنمای وضعیت تقویم */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-400 pt-3 border-t border-neutral-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>تاریخ ورود / خروج انتخابی</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/30 inline-block" />
              <span>بازه روزهای اقامت</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>آماده رزرو VIP</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-300/80">
            <Info className="w-3.5 h-3.5" />
            <span>امکان ورود زودهنگام و ترخیص دیرهنگام هماهنگ است</span>
          </div>
        </div>
      </div>

      {/* انتخاب دقیق ساعات ورود و خروج با اعداد فارسی */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ساعت تحویل */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-white">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>ساعت تحویل اقامتگاه (Check-in):</span>
            </label>
            <span className="text-xs font-bold text-amber-300">{startTime}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {TIME_OPTIONS_CHECKIN.map((item) => {
              const isSelected = startTime.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onTimeChange(item.value, endTime)}
                  className={`p-3 rounded-2xl text-xs font-bold transition-all text-center cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-md font-black'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ساعت ترخیص */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-white">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>ساعت ترخیص اقامتگاه (Check-out):</span>
            </label>
            <span className="text-xs font-bold text-amber-300">{endTime}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {TIME_OPTIONS_CHECKOUT.map((item) => {
              const isSelected = endTime.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onTimeChange(startTime, item.value)}
                  className={`p-3 rounded-2xl text-xs font-bold transition-all text-center cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-md font-black'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
