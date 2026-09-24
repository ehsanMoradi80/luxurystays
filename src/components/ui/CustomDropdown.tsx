/**
 * CustomDropdown.tsx
 * 
 * منوی اکشن دراپ‌داون اختصاصی با پشتیبانی از آیتم‌ها، جداکننده‌ها و کلیک بیرونی
 */

import React, { useState, useRef, useEffect } from 'react';
import { useThemeAndSiteStore } from '../../store/useThemeAndSiteStore';
import { RADIUS_CLASSES } from '../../theme/themeConfig';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface CustomDropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | 'separator')[];
  align?: 'left' | 'right';
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { radius, sites, activeSiteId } = useThemeAndSiteStore();
  const currentSite = sites[activeSiteId];
  const radiusClass = RADIUS_CLASSES[currentSite?.radius || radius].card;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-right font-sans ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-52 p-1.5 bg-neutral-900/95 border border-neutral-700/80 shadow-2xl backdrop-blur-xl ${radiusClass} ${
            align === 'left' ? 'left-0' : 'right-0'
          } animate-in fade-in zoom-in-95 duration-150`}
        >
          {items.map((item, idx) => {
            if (item === 'separator') {
              return <div key={`sep-${idx}`} className="my-1 border-t border-neutral-800" />;
            }

            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-right ${
                  item.danger
                    ? 'text-rose-400 hover:bg-rose-500/10'
                    : 'text-neutral-200 hover:bg-neutral-800'
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
