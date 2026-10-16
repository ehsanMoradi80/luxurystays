/**
 * Jalali and Persian formatting utilities
 */

export function toPersianDigits(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}

export function formatPersianPrice(price: number, unit: string = 'تومان'): string {
  if (typeof price !== 'number' || isNaN(price)) return '';
  const formatted = price.toLocaleString('fa-IR');
  return `${formatted} ${unit}`;
}
