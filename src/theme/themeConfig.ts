/**
 * themeConfig.ts
 * 
 * تعریف پالت‌های رنگی تم، کلس‌های داینامیک و توکن‌های طراحی
 * برای فرانت‌اند مهمان (سایت هتل) و پنل ادمین
 */

import { SiteThemeId, PanelThemeId, RadiusToken } from '../store/useThemeAndSiteStore';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accentGlow: string;
  borderActive: string;
  bgGradient: string;
  buttonGradient: string;
  badgeBg: string;
  badgeText: string;
  highlightText: string;
}

export const SITE_THEMES: Record<SiteThemeId, { name: string; description: string; colors: ThemeColors }> = {
  gold: {
    name: 'طلایی و آبنوس سلطنتی (قصر لورا)',
    description: 'تم اشرافی شاهانه با طلای ۱۸ عیار و مشکی مخملی',
    colors: {
      primary: '#f59e0b', // amber-500
      primaryLight: '#fde68a', // amber-200
      primaryDark: '#b45309', // amber-700
      accentGlow: 'rgba(245, 158, 11, 0.35)',
      borderActive: 'border-amber-400/60',
      bgGradient: 'from-neutral-950 via-neutral-900 to-stone-950',
      buttonGradient: 'from-amber-500 via-amber-400 to-amber-300 text-neutral-950',
      badgeBg: 'bg-amber-400/15 border-amber-400/30',
      badgeText: 'text-amber-300',
      highlightText: 'text-amber-400',
    },
  },
  emerald: {
    name: 'زمرد خلیج و الماس (اقامتگاه آلپاین)',
    description: 'الهام‌گرفته از جنگل‌های کهن، چشمه‌های زمردین و آرامش کوهستان',
    colors: {
      primary: '#10b981', // emerald-500
      primaryLight: '#a7f3d0', // emerald-200
      primaryDark: '#047857', // emerald-700
      accentGlow: 'rgba(16, 185, 129, 0.35)',
      borderActive: 'border-emerald-400/60',
      bgGradient: 'from-neutral-950 via-slate-950 to-emerald-950/40',
      buttonGradient: 'from-emerald-500 via-emerald-400 to-teal-300 text-neutral-950',
      badgeBg: 'bg-emerald-400/15 border-emerald-400/30',
      badgeText: 'text-emerald-300',
      highlightText: 'text-emerald-400',
    },
  },
  sapphire: {
    name: 'لاجورد و یاقوت شب (کرانه مدیترانه)',
    description: 'تم رویایی ژرفای اقیانوس شبانه با آبی لاجوردی و نور ستارگان',
    colors: {
      primary: '#38bdf8', // sky-400
      primaryLight: '#bae6fd', // sky-200
      primaryDark: '#0369a1', // sky-700
      accentGlow: 'rgba(56, 189, 248, 0.35)',
      borderActive: 'border-sky-400/60',
      bgGradient: 'from-neutral-950 via-slate-950 to-sky-950/40',
      buttonGradient: 'from-sky-500 via-cyan-400 to-blue-300 text-neutral-950',
      badgeBg: 'bg-sky-400/15 border-sky-400/30',
      badgeText: 'text-sky-300',
      highlightText: 'text-sky-400',
    },
  },
  rose: {
    name: 'رزگلد سلطنتی و کویر طلایی (واحه لورا)',
    description: 'تم رمانتیک و گرم غروب خورشید در شن‌های بیابان با مس و رزگلد',
    colors: {
      primary: '#f43f5e', // rose-500
      primaryLight: '#fecdd3', // rose-200
      primaryDark: '#be123c', // rose-700
      accentGlow: 'rgba(244, 63, 94, 0.35)',
      borderActive: 'border-rose-400/60',
      bgGradient: 'from-neutral-950 via-neutral-900 to-rose-950/40',
      buttonGradient: 'from-rose-500 via-pink-400 to-amber-200 text-neutral-950',
      badgeBg: 'bg-rose-400/15 border-rose-400/30',
      badgeText: 'text-rose-300',
      highlightText: 'text-rose-400',
    },
  },
};

export const PANEL_THEMES: Record<PanelThemeId, { name: string; bg: string; cardBg: string; border: string }> = {
  obsidian: {
    name: 'آبنوس لوکس (Dark Obsidian)',
    bg: 'bg-neutral-950',
    cardBg: 'bg-neutral-900/90',
    border: 'border-neutral-800',
  },
  slate: {
    name: 'اسلیت مهندسی (Deep Slate)',
    bg: 'bg-slate-950',
    cardBg: 'bg-slate-900/90',
    border: 'border-slate-800',
  },
  monochrome: {
    name: 'مینیمال تیره سفید (Pure Minimal)',
    bg: 'bg-black',
    cardBg: 'bg-zinc-950',
    border: 'border-zinc-800',
  },
};

export const RADIUS_CLASSES: Record<RadiusToken, {
  button: string;
  input: string;
  card: string;
  sheetTop: string;
  sheetFull: string;
}> = {
  sharp: {
    button: 'rounded-none',
    input: 'rounded-none',
    card: 'rounded-sm',
    sheetTop: 'rounded-t-none',
    sheetFull: 'rounded-none',
  },
  refined: {
    button: 'rounded-lg',
    input: 'rounded-lg',
    card: 'rounded-xl',
    sheetTop: 'rounded-t-2xl',
    sheetFull: 'rounded-xl',
  },
  smooth: {
    button: 'rounded-xl',
    input: 'rounded-xl',
    card: 'rounded-2xl',
    sheetTop: 'rounded-t-3xl',
    sheetFull: 'rounded-2xl',
  },
  ultra: {
    button: 'rounded-full',
    input: 'rounded-2xl',
    card: 'rounded-3xl',
    sheetTop: 'rounded-t-[32px]',
    sheetFull: 'rounded-3xl',
  },
};
