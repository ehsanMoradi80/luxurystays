/**
 * JalaliDate.ts
 * 
 * ماژول جامع تقویم خورشیدی (جلالی/شمسی) و تبدیل خودکار اعداد و تاریخ‌ها به فارسی
 * طراحی شده ویژه تجربه کاربری لوکس هتل قصر لورا
 */

export const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * تبدیل هر عدد یا رشته شامل ارقام انگلیسی به ارقام فارسی
 */
export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const str = String(n);
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[parseInt(w, 10)]);
}

/**
 * تبدیل خودکار تمامی اعداد درون یک متن به اعداد فارسی
 * برای استفاده در نوار پروگرس، کامپوننت‌های نمایش فضا و لیبل‌های پویا
 */
export function autoPersianText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)]);
}

/**
 * فرمت کردن شاخص سکانس‌ها به صورت شیک با ارقام فارسی (مثلاً ۰۱ / ۰۶)
 */
export function formatSequenceIndex(current: number, total: number): string {
  const c = String(current).padStart(2, '0');
  const t = String(total).padStart(2, '0');
  return `${toPersianDigits(c)} / ${toPersianDigits(t)}`;
}

/**
 * فرمت کردن درصد پیشرفت به فارسی (مثلاً ۶۸٪)
 */
export function formatPersianPercentage(percent: number): string {
  const rounded = Math.round(Math.max(0, Math.min(100, percent)));
  return `${toPersianDigits(rounded)}٪`;
}

/**
 * فرمت کردن مبالغ مالی به تومان با جداکننده سه رقمی و ارقام فارسی
 */
export function formatPersianPrice(amount: number): string {
  const formattedWithCommas = Math.round(amount).toLocaleString('fa-IR');
  return `${formattedWithCommas} تومان`;
}

/**
 * نام ماه‌های تقویم جلالی
 */
export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * نام روزهای هفته در گاه‌شماری ایرانی
 */
export const JALALI_WEEKDAY_NAMES = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const JALALI_WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * تبدیل میلادی به جلالی با الگوریتم دقیق
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

/**
 * تبدیل جلالی به میلادی
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4)
    + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  return [gy, gm, days + 1];
}

/**
 * بررسی سال کبیسه جلالی
 */
export function isJalaliLeapYear(year: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097];
  let bl = breaks.length;
  let jp = breaks[0];
  let jm: number;
  let jump: number;
  let leap: number;
  let n: number;
  let i: number;

  if (year < jp || year >= breaks[bl - 1]) return false;

  for (i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }
  n = year - jp;

  if (jump! - n < 6) n = n - jump! + Math.floor((jump! + 4) / 33) * 33;
  leap = ((((n + 1) % 33) - 1) % 4);
  if (leap === -1) leap = 4;
  return leap === 0;
}

/**
 * تعداد روزهای هر ماه جلالی
 */
export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  if (month === 12) return isJalaliLeapYear(year) ? 30 : 29;
  return 30;
}

/**
 * روز شروع هفته برای اولین روز یک ماه جلالی (۰ = شنبه، ۱ = یکشنبه، ... ۶ = جمعه)
 */
export function getFirstWeekdayOfJalaliMonth(year: number, month: number): number {
  const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
  const gDate = new Date(gy, gm - 1, gd);
  const gDay = gDate.getDay(); // 0 is Sunday
  return (gDay + 1) % 7; // Convert to Saturday = 0
}

/**
 * ساخت آبجکت تاریخ جلالی از روی تاریخ ورودی
 */
export interface JalaliDateObj {
  year: number;
  month: number;
  day: number;
  monthName: string;
  weekdayName: string;
  iso: string; // YYYY/MM/DD
  formattedPersian: string;
}

export function createJalaliDate(year: number, month: number, day: number): JalaliDateObj {
  const [gy, gm, gd] = jalaliToGregorian(year, month, day);
  const gDate = new Date(gy, gm - 1, gd);
  const gDay = gDate.getDay();
  const jDay = (gDay + 1) % 7;

  const monthName = JALALI_MONTH_NAMES[month - 1] || '';
  const weekdayName = JALALI_WEEKDAY_NAMES[jDay] || '';
  const iso = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  const formattedPersian = `${weekdayName} ${toPersianDigits(day)} ${monthName} ${toPersianDigits(year)}`;

  return {
    year,
    month,
    day,
    monthName,
    weekdayName,
    iso,
    formattedPersian,
  };
}

/**
 * فرمت کردن تاریخ رشته‌ای ISO مانند "1405/07/04" یا آبجکت تاریخ به نمایش فاخر فارسی
 */
export function formatToJalali(dateOrIso?: Date | string | null): string {
  if (!dateOrIso) return '';
  if (typeof dateOrIso === 'string') {
    return formatJalaliIsoToPersian(dateOrIso);
  }
  const [jy, jm, jd] = gregorianToJalali(
    dateOrIso.getFullYear(),
    dateOrIso.getMonth() + 1,
    dateOrIso.getDate()
  );
  return formatJalaliIsoToPersian(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`);
}

export function formatJalaliIsoToPersian(iso: string): string {
  try {
    const parts = iso.split('/').map(Number);
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const monthName = JALALI_MONTH_NAMES[m - 1] || '';
      return `${toPersianDigits(d)} ${monthName} ${toPersianDigits(y)}`;
    }
  } catch {
    // fallback
  }
  return toPersianDigits(iso);
}

/**
 * محاسبه اختلاف شب‌های اقامت بین دو تاریخ جلالی
 */
export function calculateJalaliNights(startIso: string, endIso: string): number {
  try {
    const [sy, sm, sd] = startIso.split('/').map(Number);
    const [ey, em, ed] = endIso.split('/').map(Number);
    const [gSy, gSm, gSd] = jalaliToGregorian(sy, sm, sd);
    const [gEy, gEm, gEd] = jalaliToGregorian(ey, em, ed);
    const startDate = new Date(gSy, gSm - 1, gSd);
    const endDate = new Date(gEy, gEm - 1, gEd);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

/**
 * بررسی اینکه آیا تاریخ در بازه زمانی قرار دارد یا خیر
 */
export function isDateInRange(targetIso: string, startIso: string, endIso: string): boolean {
  return targetIso >= startIso && targetIso <= endIso;
}
