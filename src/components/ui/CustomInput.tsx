/**
 * CustomInput.tsx
 * 
 * اینپوت اختصاصی موبایل‌فرست با طراحی تشریفاتی
 * مجهز به لیبل شناور یا ثابت، آیکون‌های ابتدا و انتها، پاک‌کن سریع و استیت‌های خطا
 */

import React, { useState, useId } from 'react';
import { useThemeAndSiteStore } from '../../store/useThemeAndSiteStore';
import { RADIUS_CLASSES } from '../../theme/themeConfig';
import { X } from 'lucide-react';

export interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  helperText,
  startIcon,
  endIcon,
  onClear,
  showClearButton = false,
  className = '',
  value,
  onChange,
  disabled,
  ...props
}) => {
  const inputId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const { radius, sites, activeSiteId } = useThemeAndSiteStore();
  const currentSite = sites[activeSiteId];
  const radiusClass = RADIUS_CLASSES[currentSite?.radius || radius].input;

  const hasValue = value !== undefined && value !== '' && value !== null;

  return (
    <div className={`w-full text-right font-sans ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-xs font-medium mb-1.5 transition-colors select-none ${
            error
              ? 'text-rose-400'
              : isFocused
              ? 'text-amber-300 font-semibold'
              : 'text-neutral-300'
          }`}
        >
          {label}
        </label>
      )}

      <div
        className={`relative flex items-center w-full transition-all duration-200 bg-neutral-900/90 border ${radiusClass} ${
          error
            ? 'border-rose-500/80 ring-1 ring-rose-500/30'
            : isFocused
            ? 'border-amber-400/80 ring-2 ring-amber-400/20 bg-neutral-900 shadow-md'
            : 'border-neutral-700/80 hover:border-neutral-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-950' : ''}`}
      >
        {/* آیکون ابتدای فیلد (راست در محیط فارسی) */}
        {startIcon && (
          <div className="flex items-center justify-center pr-3.5 pl-1.5 text-neutral-400 pointer-events-none shrink-0">
            {startIcon}
          </div>
        )}

        {/* فیلد ورودی متن */}
        <input
          id={inputId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full h-11 sm:h-12 px-3.5 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none select-text"
          {...props}
        />

        {/* دکمه پاک‌کن سریع */}
        {showClearButton && hasValue && onClear && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 ml-1.5 text-neutral-400 hover:text-neutral-200 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            title="پاک کردن"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* آیکون انتهای فیلد (چپ در محیط فارسی) */}
        {endIcon && (
          <div className="flex items-center justify-center pl-3.5 pr-1.5 text-neutral-400 shrink-0">
            {endIcon}
          </div>
        )}
      </div>

      {/* پیام خطا یا راهنما */}
      {error ? (
        <p className="mt-1 text-[11px] text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-neutral-400">{helperText}</p>
      ) : null}
    </div>
  );
};
