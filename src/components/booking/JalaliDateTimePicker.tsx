/**
 * JalaliDateTimePicker.tsx
 * 
 * کامپوننت تقویم و زمان‌بندی تمام‌شمسی و مدرن با ارقام اصیل فارسی
 * طراحی تمیز، آرامش‌بخش و متناسب با هتل‌های فوق لوکس ۵ ستاره
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Check
} from 'lucide-react';
import { 
  toPersianDigits, 
  JALALI_MONTH_NAMES, 
  JALALI_WEEKDAY_SHORT 
} from '../../utils/jalali';

export interface JalaliDateTimePickerProps {
  startDate: string; // "1405/07/04"
  endDate: string; // "1405/07/07"
  startTime: string; // "۱۴:۰۰"
  endTime: string; // "۱۲:۰۰"
  onDateChange: (start: string, end: string) => void;
  onTimeChange: (start: string, end: string) => void;
}

// لیست روزهای فعال ماه مهر ۱۴۰۵
interface DayItem {
  iso: string;
  dayNum: number;
  weekdayName: string;
  isToday?: boolean;
}

const MEHR_DAYS: DayItem[] = [
  { iso: '1405/07/01', dayNum: 1, weekdayName: 'سه‌شنبه' },
  { iso: '1405/07/02', dayNum: 2, weekdayName: 'چهارشنبه' },
  { iso: '1405/07/03', dayNum: 3, weekdayName: 'پنج‌شنبه' },
  { iso: '1405/07/04', dayNum: 4, weekdayName: 'جمعه', isToday: true },
  { iso: '1405/07/05', dayNum: 5, weekdayName: 'شنبه' },
  { iso: '1405/07/06', dayNum: 6, weekdayName: 'یکشنبه' },
  { iso: '1405/07/07', dayNum: 7, weekdayName: 'دوشنبه' },
  { iso: '1405/07/08', dayNum: 8, weekdayName: 'سه‌شنبه' },
  { iso: '1405/07/09', dayNum: 9, weekdayName: 'چهارشنبه' },
  { iso: '1405/07/10', dayNum: 10, weekdayName: 'پنج‌شنبه' },
  { iso: '1405/07/11', dayNum: 11, weekdayName: 'جمعه' },
  { iso: '1405/07/12', dayNum: 12, weekdayName: 'شنبه' },
  { iso: '1405/07/13', dayNum: 13, weekdayName: 'یکشنبه' },
  { iso: '1405/07/14', dayNum: 14, weekdayName: 'دوشنبه' },
  { iso: '1405/07/15', dayNum: 15, weekdayName: 'سه‌شنبه' },
  { iso: '1405/07/16', dayNum: 16, weekdayName: 'چهارشنبه' },
  { iso: '1405/07/17', dayNum: 17, weekdayName: 'پنج‌شنبه' },
  { iso: '1405/07/18', dayNum: 18, weekdayName: 'جمعه' },
  { iso: '1405/07/19', dayNum: 19, weekdayName: 'شنبه' },
  { iso: '1405/07/20', dayNum: 20, weekdayName: 'یکشنبه' },
  { iso: '1405/07/21', dayNum: 21, weekdayName: 'دوشنبه' },
];

const TIME_OPTIONS_CHECKIN = [
  '۱۲:۰۰ (تحویل زودهنگام VIP)',
  '۱۴:۰۰ (ساعت استاندارد تحویل)',
  '۱۶:۰۰ (عصرگاه ساحلی)',
  '۱۸:۰۰ (ورود شامگاهی)',
  '۲۰:۰۰ (پرواز شبانه)',
];

const TIME_OPTIONS_CHECKOUT = [
  '۱۱:۰۰ (ترخیص صبحگاهی)',
  '۱۲:۰۰ (ساعت استاندارد ترخیص)',
  '۱۴:۰۰ (ترخیص دیرهنگام VIP)',
  '۱۶:۰۰ (تمدید کامل عصر)',
];

export const JalaliDateTimePicker: React.FC<JalaliDateTimePickerProps> = ({
  startDate,
  endDate,
  startTime,
  endTime,
  onDateChange,
  onTimeChange,
}) => {
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  // محاسبه شب‌های اقامت با تاریخ شمسی
  const calculateNights = () => {
    const sDay = parseInt(startDate.split('/')[2] || '4', 10);
    const eDay = parseInt(endDate.split('/')[2] || '7', 10);
    return Math.max(1, eDay - sDay);
  };

  const nights = calculateNights();

  const handleDaySelect = (isoDate: string) => {
    if (selectionStep === 'start') {
      onDateChange(isoDate, isoDate);
      setSelectionStep('end');
    } else {
      if (isoDate <= startDate) {
        onDateChange(isoDate, isoDate);
      } else {
        onDateChange(startDate, isoDate);
        setSelectionStep('start');
      }
    }
  };

  // پیش‌تنظیمات سریع و لوکس
  const handleQuickPreset = (durationNights: number) => {
    const startIso = '1405/07/04';
    const endDayNum = 4 + durationNights;
    const endIso = `1405/07/${String(endDayNum).padStart(2, '0')}`;
    onDateChange(startIso, endIso);
  };

  return (
    <div className="w-full space-y-6 text-right font-sans">
      {/* کارت خلاصه اقامت و پیش‌تنظیم‌های سریع */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-neutral-400">مدت زمان اقامت رزرو شده:</span>
            <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-amber-300">{toPersianDigits(nights)} شب و {toPersianDigits(nights + 1)} روز</span>
              <span className="text-neutral-600 font-light">&bull;</span>
              <span className="text-xs text-neutral-300 font-normal">از {startDate} تا {endDate}</span>
            </div>
          </div>
        </div>

        {/* دکمه‌های سریع */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => handleQuickPreset(2)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all whitespace-nowrap cursor-pointer"
          >
            آخر هفته (۲ شب)
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(3)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all whitespace-nowrap cursor-pointer"
          >
            ۳ شبانه رویایی
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(7)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all whitespace-nowrap cursor-pointer"
          >
            یک هفته شاهانه
          </button>
        </div>
      </div>

      {/* تقویم ماه مهر ۱۴۰۵ */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            <span className="text-base font-bold text-white">
              تقویم ماه {JALALI_MONTH_NAMES[6]} {toPersianDigits(1405)}
            </span>
          </div>

          <div className="text-xs text-amber-300/90 font-medium">
            {selectionStep === 'start'
              ? '۱. تاریخ ورود را انتخاب فرمایید'
              : '۲. تاریخ خروج را مشخص نمایید'}
          </div>
        </div>

        {/* لیست روزها در قالب گرید تقویمی تمیز */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5">
          {MEHR_DAYS.map((day) => {
            const isStart = day.iso === startDate;
            const isEnd = day.iso === endDate;
            const isInRange = day.iso >= startDate && day.iso <= endDate;

            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => handleDaySelect(day.iso)}
                className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center relative cursor-pointer ${
                  isStart || isEnd
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 font-black shadow-lg shadow-amber-400/25 scale-[1.03]'
                    : isInRange
                    ? 'bg-amber-400/15 border-amber-400/40 text-amber-200 font-semibold'
                    : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <span className={`text-[10px] mb-0.5 ${isStart || isEnd ? 'text-neutral-950 font-bold' : 'text-neutral-500'}`}>
                  {day.weekdayName}
                </span>
                <span className={`text-xl font-bold ${isStart || isEnd ? 'text-neutral-950 font-black' : 'text-white'}`}>
                  {toPersianDigits(day.dayNum)}
                </span>
                <span className={`text-[10px] mt-0.5 ${isStart || isEnd ? 'text-neutral-900 font-semibold' : 'text-neutral-400'}`}>
                  مهر
                </span>

                {isStart && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-neutral-950 text-amber-300 rounded-full mt-1.5 font-bold">
                    ورود
                  </span>
                )}
                {isEnd && !isStart && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-neutral-950 text-amber-300 rounded-full mt-1.5 font-bold">
                    خروج
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* انتخاب دقیق ساعات ورود و خروج با اعداد فارسی */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ساعت ورود */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>ساعت تحویل اقامتگاه (Check-in):</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_OPTIONS_CHECKIN.slice(0, 4).map((tStr) => {
              const hourOnly = tStr.split(' ')[0];
              const isSelected = startTime.includes(hourOnly);

              return (
                <button
                  key={tStr}
                  type="button"
                  onClick={() => onTimeChange(hourOnly, endTime)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {tStr}
                </button>
              );
            })}
          </div>
        </div>

        {/* ساعت خروج */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>ساعت ترخیص اقامتگاه (Check-out):</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_OPTIONS_CHECKOUT.map((tStr) => {
              const hourOnly = tStr.split(' ')[0];
              const isSelected = endTime.includes(hourOnly);

              return (
                <button
                  key={tStr}
                  type="button"
                  onClick={() => onTimeChange(startTime, hourOnly)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {tStr}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
