/**
 * CustomSelect.tsx
 * 
 * سلکت باکس اختصاصی موبایل‌فرست با لیست غنی گزینه‌ها (آیکون، زیرنویس، برچسب قیمت/وضعیت)
 * بدون استفاده از سلکت خام و زشت مرورگر
 */

import React, { useState, useRef, useEffect } from 'react';
import { useThemeAndSiteStore } from '../../store/useThemeAndSiteStore';
import { RADIUS_CLASSES, SITE_THEMES } from '../../theme/themeConfig';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'انتخاب کنید...',
  searchable = false,
  disabled = false,
  className = '',
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { radius, siteTheme, sites, activeSiteId } = useThemeAndSiteStore();
  const currentSite = sites[activeSiteId];
  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;
  const radiusClass = RADIUS_CLASSES[currentSite?.radius || radius].input;

  const selectedOption = options.find((opt) => opt.value === value);

  // بستن منو هنگام کلیک بیرون
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // فوکوس روی فیلد جستجو در صورت باز شدن
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  return (
    <div ref={containerRef} className={`relative w-full text-right font-sans ${className}`}>
      {label && (
        <label className="block text-xs font-medium mb-1.5 text-neutral-300 select-none">
          {label}
        </label>
      )}

      {/* دکمه ماشه سلکت */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 sm:h-12 px-3.5 flex items-center justify-between bg-neutral-900/90 border transition-all duration-200 cursor-pointer select-none ${radiusClass} ${
          isOpen
            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-neutral-900 shadow-md'
            : 'border-neutral-700/80 hover:border-neutral-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-950' : ''}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption?.icon && (
            <span className="text-amber-400 shrink-0">{selectedOption.icon}</span>
          )}
          <span className={`text-sm truncate ${selectedOption ? 'text-neutral-100 font-medium' : 'text-neutral-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* منوی بازشونده کشویی گزینه‌ها */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1.5 p-1.5 bg-neutral-900/95 border border-neutral-700 shadow-2xl backdrop-blur-xl ${radiusClass} overflow-hidden max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* فیلد جستجو در صورت فعال بودن */}
          {searchable && (
            <div className="p-1 mb-1 border-b border-neutral-800">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="جستجو بین گزینه‌ها..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-1.5 pr-8 pl-3 text-xs bg-neutral-950/80 rounded-lg text-neutral-200 border border-neutral-800 focus:outline-none focus:border-amber-400/60"
                />
              </div>
            </div>
          )}

          {/* لیست گزینه‌ها */}
          <div className="overflow-y-auto space-y-1 flex-1 py-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-neutral-500">
                موردی یافت نشد
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 flex items-center justify-between rounded-lg text-right transition-colors cursor-pointer ${
                      isSelected
                        ? `${currentTheme.colors.badgeBg} text-amber-300 font-bold`
                        : option.disabled
                        ? 'opacity-40 cursor-not-allowed text-neutral-500'
                        : 'hover:bg-neutral-800/80 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {option.icon && (
                        <span className={`shrink-0 ${isSelected ? currentTheme.colors.highlightText : 'text-neutral-400'}`}>
                          {option.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-medium truncate">{option.label}</div>
                        {option.subtitle && (
                          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{option.subtitle}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {option.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {helperText && <p className="mt-1 text-[11px] text-neutral-400">{helperText}</p>}
    </div>
  );
};
