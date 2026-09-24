/**
 * CustomButton.tsx
 * 
 * کامپوننت دکمه اختصاصی و بر پایه سیستم تم
 * پشتیبانی از ردیوس داینامیک، استایل‌های چندگانه و افکت لمسی لمسی
 */

import React from 'react';
import { useThemeAndSiteStore } from '../../store/useThemeAndSiteStore';
import { SITE_THEMES, RADIUS_CLASSES } from '../../theme/themeConfig';

export interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const { siteTheme, radius, sites, activeSiteId } = useThemeAndSiteStore();
  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;
  const currentSite = sites[activeSiteId];
  const radiusClass = RADIUS_CLASSES[currentSite?.radius || radius].button;

  // سایزبندی بر اساس استاندارد تاچ موبایل (حداقل ۴۴ پیکسل برای سایز استاندارد)
  const sizeClasses = {
    sm: 'text-xs py-2 px-3.5 min-h-[38px] gap-1.5',
    md: 'text-xs sm:text-sm py-2.5 px-4 min-h-[44px] gap-2',
    lg: 'text-sm sm:text-base py-3.5 px-6 min-h-[50px] gap-2.5 font-bold',
  }[size];

  // نگاشت استایل‌ها بر اساس تم فعال
  let variantClass = '';
  switch (variant) {
    case 'primary':
      variantClass = `bg-gradient-to-r ${currentTheme.colors.buttonGradient} font-bold shadow-lg hover:brightness-110 active:scale-[0.98]`;
      break;
    case 'secondary':
      variantClass = 'bg-neutral-800/90 text-neutral-100 hover:bg-neutral-700/90 border border-neutral-700 active:scale-[0.98]';
      break;
    case 'outline':
      variantClass = `bg-transparent border ${currentTheme.colors.borderActive} ${currentTheme.colors.highlightText} hover:bg-white/5 active:scale-[0.98]`;
      break;
    case 'glass':
      variantClass = 'bg-black/40 backdrop-blur-xl border border-white/15 text-white hover:bg-black/60 hover:border-white/30 active:scale-[0.98]';
      break;
    case 'ghost':
      variantClass = 'bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800/50 active:scale-[0.98]';
      break;
  }

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-sans tracking-wide cursor-pointer transition-all duration-200 select-none ${radiusClass} ${sizeClasses} ${variantClass} ${
        fullWidth ? 'w-full' : ''
      } ${disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>لطفاً شکیبا باشید...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
