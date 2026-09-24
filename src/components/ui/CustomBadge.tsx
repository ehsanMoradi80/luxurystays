/**
 * CustomBadge.tsx
 * 
 * برچسب‌های متنی و استاتوس استاندارد منطبق با قانون Zero-Pill
 */

import React from 'react';

export interface CustomBadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'rose' | 'sky' | 'neutral';
  dot?: boolean;
  className?: string;
}

export const CustomBadge: React.FC<CustomBadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}) => {
  const styles = {
    gold: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    emerald: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    rose: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    sky: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    neutral: 'text-neutral-300 border-neutral-700 bg-neutral-800/60',
  }[variant];

  const dotColors = {
    gold: 'bg-amber-400',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    sky: 'bg-sky-400',
    neutral: 'bg-neutral-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${styles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />}
      <span>{children}</span>
    </span>
  );
};
