/**
 * LuxuryDateTimePicker.tsx
 * 
 * کامپوننت تاریخ و زمان تشریفاتی و بسیار مدرن برای رزرو هتل
 * 
 * امکانات:
 * ۱. انتخاب بازه تاریخ ورود و خروج (Check-in / Check-out) با تقویم لمسی و بصری
 * ۲. انتخاب بازه ساعت ورود و ساعت خروج (با ترخیص دیرهنگام یا تحویل زودهنگام VIP)
 * ۳. بازه‌های پیش‌فرض سریع (آخر هفته، اقامت ۳ روزه، یک هفته‌ای)
 * ۴. ماتریس و تایم‌لاین زنده دسترسی اتاق‌ها (Room Availability Timeline):
 *    نمایش وضعیت خالی، ظرفیت محدود یا اشغال تک تک اتاق‌ها در روزها و ساعات منتخب
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Bed,
  Users
} from 'lucide-react';
import { useThemeAndSiteStore, HotelRoom } from '../../store/useThemeAndSiteStore';
import { SITE_THEMES } from '../../theme/themeConfig';

export interface LuxuryDateTimePickerProps {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  onDateChange: (start: string, end: string) => void;
  onTimeChange: (start: string, end: string) => void;
  selectedRoomId?: string;
  onSelectRoom?: (room: HotelRoom) => void;
  showAvailabilityMatrix?: boolean;
}

// روزهای نمونه در بازه فعال (مهر و آبان ۱۴۰۵ / سپتامبر ۲۰۲۶)
const CALENDAR_DAYS = [
  { date: '2026-09-24', dayName: 'پنج‌شنبه', dayNum: '۲۴', month: 'مهر' },
  { date: '2026-09-25', dayName: 'جمعه', dayNum: '۲۵', month: 'مهر' },
  { date: '2026-09-26', dayName: 'شنبه', dayNum: '۲۶', month: 'مهر' },
  { date: '2026-09-27', dayName: 'یک‌شنبه', dayNum: '۲۷', month: 'مهر' },
  { date: '2026-09-28', dayName: 'دوشنبه', dayNum: '۲۸', month: 'مهر' },
  { date: '2026-09-29', dayName: 'سه‌شنبه', dayNum: '۲۹', month: 'مهر' },
  { date: '2026-09-30', dayName: 'چهارشنبه', dayNum: '۳۰', month: 'مهر' },
  { date: '2026-10-01', dayName: 'پنج‌شنبه', dayNum: '۰۱', month: 'آبان' },
  { date: '2026-10-02', dayName: 'جمعه', dayNum: '۰۲', month: 'آبان' },
  { date: '2026-10-03', dayName: 'شنبه', dayNum: '۰۳', month: 'آبان' },
];

const TIME_OPTIONS_CHECKIN = [
  { value: '12:00', label: '۱۲:۰۰ (تحویل زودهنگام VIP)' },
  { value: '14:00', label: '۱۴:۰۰ (ساعت استاندارد ورود هتل)' },
  { value: '16:00', label: '۱۶:۰۰ (عصرگاه و غروب)' },
  { value: '18:00', label: '۱۸:۰۰ (ورود شامگاهی)' },
  { value: '20:00', label: '۲۰:۰۰ (پرواز شبانه)' },
];

const TIME_OPTIONS_CHECKOUT = [
  { value: '11:00', label: '۱۱:۰۰ (ترخیص استاندارد)' },
  { value: '12:00', label: '۱۲:۰۰ (نیمروز)' },
  { value: '14:00', label: '۱۴:۰۰ (ترخیص با تأخیر Late Checkout)' },
  { value: '16:00', label: '۱۶:۰۰ (تمدید عصرگاهی VIP)' },
];

export const LuxuryDateTimePicker: React.FC<LuxuryDateTimePickerProps> = ({
  startDate,
  endDate,
  startTime,
  endTime,
  onDateChange,
  onTimeChange,
  selectedRoomId,
  onSelectRoom,
  showAvailabilityMatrix = true,
}) => {
  const { siteTheme, rooms } = useThemeAndSiteStore();
  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;

  const [dateSelectionMode, setDateSelectionMode] = useState<'start' | 'end'>('start');

  // محاسبه تعداد شب‌های اقامت
  const calculateNights = () => {
    const sIndex = CALENDAR_DAYS.findIndex((d) => d.date === startDate);
    const eIndex = CALENDAR_DAYS.findIndex((d) => d.date === endDate);
    if (sIndex !== -1 && eIndex !== -1 && eIndex > sIndex) {
      return eIndex - sIndex;
    }
    return 1;
  };

  const nights = calculateNights();

  // هندلر کلیک روی روز در تقویم
  const handleDayClick = (clickedDate: string) => {
    if (dateSelectionMode === 'start') {
      onDateChange(clickedDate, clickedDate);
      setDateSelectionMode('end');
    } else {
      // اگر تاریخ کلیک شده قبل از تاریخ شروع باشد، آن را شروع جدید می‌کنیم
      if (clickedDate <= startDate) {
        onDateChange(clickedDate, clickedDate);
      } else {
        onDateChange(startDate, clickedDate);
        setDateSelectionMode('start');
      }
    }
  };

  // اعمال پیش‌فرض‌های سریع
  const applyPreset = (durationDays: number) => {
    const start = CALENDAR_DAYS[0].date;
    const end = CALENDAR_DAYS[Math.min(durationDays, CALENDAR_DAYS.length - 1)].date;
    onDateChange(start, end);
  };

  return (
    <div className="w-full space-y-6 text-right font-sans">
      {/* =========================================================================
          بخش ۱: بازه‌های سریع و خلاصه اقامت
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">طول اقامت انتخابی شما:</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{nights} شب و {nights + 1} روز</span>
              <span className="text-neutral-500 font-normal">|</span>
              <span className="text-amber-300 font-medium">ساعت ورود {startTime} تا خروج {endTime}</span>
            </div>
          </div>
        </div>

        {/* دکمه‌های بازه سریع */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => applyPreset(1)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            ۱ شب VIP
          </button>
          <button
            type="button"
            onClick={() => applyPreset(2)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            آخر هفته (۲ شب)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            ۳ شب رویایی
          </button>
        </div>
      </div>

      {/* =========================================================================
          بخش ۲: تقویم مدرن بصری و لمسی (Date Scroller & Range)
          ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <CalendarIcon className="w-4 h-4 text-amber-400" />
            <span>تقویم انتخاب تاریخ ورود و خروج:</span>
          </div>
          <span className="text-[11px] text-amber-400/90 font-medium">
            {dateSelectionMode === 'start' ? '۱. تاریخ ورود را لمس کنید' : '۲. تاریخ خروج را مشخص نمایید'}
          </span>
        </div>

        {/* لیست روزها در قالب کارت‌های تعاملی لمسی */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CALENDAR_DAYS.map((day) => {
            const isStart = day.date === startDate;
            const isEnd = day.date === endDate;
            const isInRange = day.date >= startDate && day.date <= endDate;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => handleDayClick(day.date)}
                className={`p-2.5 rounded-xl border transition-all text-center cursor-pointer flex flex-col items-center justify-center relative overflow-hidden ${
                  isStart || isEnd
                    ? `bg-amber-400 text-neutral-950 border-amber-300 font-bold shadow-lg shadow-amber-400/20 scale-[1.02]`
                    : isInRange
                    ? `bg-amber-400/15 border-amber-400/40 text-amber-200 font-medium`
                    : `bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850`
                }`}
              >
                <span className={`text-[10px] ${isStart || isEnd ? 'text-neutral-900 font-bold' : 'text-neutral-400'}`}>
                  {day.dayName}
                </span>
                <span className={`text-xl font-bold my-0.5 ${isStart || isEnd ? 'text-neutral-950' : 'text-white'}`}>
                  {day.dayNum}
                </span>
                <span className={`text-[10px] ${isStart || isEnd ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {day.month}
                </span>

                {isStart && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-neutral-950 text-amber-300 rounded-full mt-1">
                    ورود
                  </span>
                )}
                {isEnd && !isStart && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-neutral-950 text-amber-300 rounded-full mt-1">
                    خروج
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          بخش ۳: انتخاب ساعات دقیق ورود و خروج
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="bg-neutral-900/80 border border-neutral-800 p-3.5 rounded-xl">
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>ساعت تحویل اتاق (Check-in):</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TIME_OPTIONS_CHECKIN.slice(0, 4).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onTimeChange(t.value, endTime)}
                className={`py-2 px-2.5 rounded-lg text-xs transition-colors cursor-pointer text-center font-medium ${
                  startTime === t.value
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {t.value}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 p-3.5 rounded-xl">
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>ساعت ترخیص اقامتگاه (Check-out):</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TIME_OPTIONS_CHECKOUT.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onTimeChange(startTime, t.value)}
                className={`py-2 px-2.5 rounded-lg text-xs transition-colors cursor-pointer text-center font-medium ${
                  endTime === t.value
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {t.value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          بخش ۴: ماتریس هوشمند وضعیت پر/خالی بودن اتاق‌ها (Availability Matrix)
          «و اینکه کدام اتاق ها چه زمانی خالی هستن و قابل رزرو هستن کاملا به خوبی فکر شده باید نمایش داده بشه»
          ========================================================================= */}
      {showAvailabilityMatrix && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Bed className="w-4 h-4 text-amber-400" />
                <span>وضعیت زنده دسترسی اتاق‌ها در بازه انتخابی:</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                تایم‌لاین روزهای هفته و وضعیت ظرفیت در هر سوئیت و ویلا
              </p>
            </div>

            {/* راهنمای رنگ‌های استاتوس */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>خالی و آماده</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>ظرفیت محدود</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>تکمیل ظرفیت</span>
              </div>
            </div>
          </div>

          {/* ردیف‌های اتاق‌ها و تایم‌لاین روزها */}
          <div className="space-y-3">
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              // بررسی وضعیت اتاق در بازه شروع انتخاب شده
              const currentSlotStatus = room.slots[startDate] || 'available';

              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom && currentSlotStatus !== 'booked' && onSelectRoom(room)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/10 border-amber-400 shadow-md ring-1 ring-amber-400/30'
                      : currentSlotStatus === 'booked'
                      ? 'bg-neutral-950/60 border-neutral-800/80 opacity-60 cursor-not-allowed'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* اطلاعات سوئیت */}
                    <div className="flex items-center gap-3">
                      <img
                        src={room.imageUrl}
                        alt={room.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg object-cover border border-neutral-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs sm:text-sm font-bold text-white">
                            {room.title}
                          </h5>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400 text-neutral-950 font-bold">
                              انتخاب شما
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-neutral-500" />
                            <span>ظرفیت: {room.capacity} نفر</span>
                          </span>
                          <span>·</span>
                          <span>متراژ: {room.sizeM2} م.م</span>
                          <span>·</span>
                          <span className="text-amber-300 font-semibold">
                            {(room.pricePerNight).toLocaleString('fa-IR')} تومان / شب
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* وضعیت در بازه شروع */}
                    <div className="flex items-center gap-3 shrink-0">
                      {currentSlotStatus === 'available' ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>خالی و قابل رزرو</span>
                        </div>
                      ) : currentSlotStatus === 'limited' ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>تنها ۱ سوئیت مانده</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>در این تاریخ اشغال است</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* نوار تایم‌لاین ریز روزهای هفته برای این اتاق */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-neutral-400 shrink-0 ml-2">جدول وضعیت روزها:</span>
                    <div className="flex items-center gap-1 overflow-x-auto w-full justify-end">
                      {CALENDAR_DAYS.map((d) => {
                        const status = room.slots[d.date] || 'available';
                        const isCurrentActive = d.date >= startDate && d.date <= endDate;

                        return (
                          <div
                            key={d.date}
                            className={`flex flex-col items-center px-1.5 py-1 rounded ${
                              isCurrentActive ? 'ring-1 ring-amber-400/50 bg-neutral-900' : 'bg-neutral-900/50'
                            }`}
                            title={`${d.dayName} ${d.dayNum} ${d.month}: ${
                              status === 'available' ? 'خالی' : status === 'limited' ? 'محدود' : 'اشغال'
                            }`}
                          >
                            <span className="text-[9px] text-neutral-400">{d.dayNum}</span>
                            <span
                              className={`w-2 h-2 rounded-full mt-0.5 ${
                                status === 'available'
                                  ? 'bg-emerald-400'
                                  : status === 'limited'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
