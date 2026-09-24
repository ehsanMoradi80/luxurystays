/**
 * CustomTabs.tsx
 * 
 * تب‌های سگمنتد اختصاصی بر پایه دکمه‌های تمیز و استاندارد
 */

import React from 'react';
import { useThemeAndSiteStore } from '../../store/useThemeAndSiteStore';
import { RADIUS_CLASSES, SITE_THEMES } from '../../theme/themeConfig';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface CustomTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'pill' | 'underline' | 'boxed';
}

export const CustomTabs: React.FC<CustomTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'boxed',
}) => {
  const { radius, siteTheme, sites, activeSiteId } = useThemeAndSiteStore();
  const currentSite = sites[activeSiteId];
  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;
  const radiusClass = RADIUS_CLASSES[currentSite?.radius || radius].button;

  if (variant === 'underline') {
    return (
      <div className={`flex items-center gap-6 border-b border-neutral-800 text-xs sm:text-sm font-medium ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                isActive
                  ? `border-amber-400 text-white font-bold`
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`p-1 bg-neutral-900/90 border border-neutral-800 flex items-center gap-1 ${radiusClass} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${radiusClass} ${
              isActive
                ? `bg-neutral-800 text-white shadow-md ${currentTheme.colors.highlightText} font-bold`
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
