/**
 * AdminDashboard.tsx
 * 
 * پنل مدیریت ارشد هتل و سیستم طراحی و تمینگ
 * 
 * بخش‌ها:
 * ۱. سیستم تم و ظاهر (Site & Panel Theme System)
 * ۲. شخصی‌سازی اختصاصی کامپوننت‌ها برای هر سایت (Multi-Site Component Customizer)
 * ۳. مدیریت اتاق‌ها و جدول زمان‌بندی دسترسی (Room Inventory & Availability Matrix)
 * ۴. کارگاه کامپوننت‌های اختصاصی (Base Components Playground - موبایل و دسکتاپ)
 * ۵. سوابق رزروهای ثبت‌شده (Bookings Log)
 * ۶. سازنده گراف سکانس‌های هتل (Sequence Flow Canvas)
 */

import React, { useState } from 'react';
import { 
  Palette, 
  Layers, 
  CalendarDays, 
  Sliders, 
  ClipboardList, 
  GitFork, 
  ExternalLink, 
  Check, 
  RotateCcw, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  Building2, 
  Clock, 
  Plus, 
  Edit3, 
  DollarSign, 
  Save, 
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { 
  useThemeAndSiteStore, 
  SiteThemeId, 
  PanelThemeId, 
  RadiusToken, 
  OverlayPreference 
} from '../../store/useThemeAndSiteStore';
import { SITE_THEMES, PANEL_THEMES, RADIUS_CLASSES } from '../../theme/themeConfig';
import { CustomButton } from '../ui/CustomButton';
import { CustomInput } from '../ui/CustomInput';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomDropdown } from '../ui/CustomDropdown';
import { CustomTabs } from '../ui/CustomTabs';
import { CustomBadge } from '../ui/CustomBadge';
import { AdaptiveOverlay } from '../ui/AdaptiveOverlay';
import { FlowCanvas } from '../FlowCanvas';
import { toPersianDigits, formatPersianPrice } from '../../utils/jalali';

interface AdminDashboardProps {
  onReturnToExperience: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onReturnToExperience }) => {
  const {
    siteTheme,
    panelTheme,
    radius,
    activeSiteId,
    sites,
    rooms,
    bookings,
    setSiteTheme,
    setPanelTheme,
    setRadius,
    setActiveSiteId,
    updateSiteConfig,
    updateRoomAvailability,
    updateRoomPrice,
  } = useThemeAndSiteStore();

  const [activeTab, setActiveTab] = useState<string>('themes');

  // وضعیت‌های مربوط به کارگاه تست کامپوننت‌ها (Playground)
  const [testInputVal, setTestInputVal] = useState('سوئیت پنت‌هاوس لوکس');
  const [testSelectVal, setTestSelectVal] = useState('suite-1');
  const [isTestOverlayOpen, setIsTestOverlayOpen] = useState(false);
  const [testOverlayMode, setTestOverlayMode] = useState<'auto' | 'bottom-sheet' | 'side-sheet' | 'modal'>('auto');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // تاریخ‌های آزمایشی کامپوننت تقویم
  const [testStartDate, setTestStartDate] = useState('2026-09-24');
  const [testEndDate, setTestEndDate] = useState('2026-09-27');
  const [testStartTime, setTestStartTime] = useState('14:00');
  const [testEndTime, setTestEndTime] = useState('12:00');

  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;
  const currentPanel = PANEL_THEMES[panelTheme] || PANEL_THEMES.obsidian;
  const currentSite = sites[activeSiteId];

  const adminTabs = [
    { id: 'themes', label: 'سیستم تم و ظاهر', icon: <Palette className="w-4 h-4" /> },
    { id: 'sites', label: 'شخصی‌سازی سایت‌ها', icon: <Building2 className="w-4 h-4" /> },
    { id: 'inventory', label: 'اتاق‌ها و ماتریس دسترسی', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'playground', label: 'کارگاه کامپوننت‌ها', icon: <Sliders className="w-4 h-4" /> },
    { id: 'bookings', label: 'سوابق رزرواسیون', icon: <ClipboardList className="w-4 h-4" />, badge: toPersianDigits(bookings.length) },
    { id: 'flow', label: 'گراف سکانس‌ها', icon: <GitFork className="w-4 h-4" /> },
  ];

  return (
    <div dir="rtl" className={`min-h-screen w-full ${currentPanel.bg} text-neutral-100 font-sans flex flex-col`}>
      {/* =========================================================================
          هدر اصلی پنل ادمین
          ========================================================================= */}
      <header className={`px-4 sm:px-8 py-3.5 ${currentPanel.cardBg} border-b ${currentPanel.border} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-xl`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-black shadow-lg">
            VIP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white">
                سامانه مدیریت تم، کامپوننت‌های اختصاصی و رزرواسیون
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                Admin Panel v3.0
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              سایت در حال مدیریت: <strong className="text-amber-300 font-semibold">{currentSite?.name}</strong>
            </p>
          </div>
        </div>

        {/* سوییچر سایت + دکمه بازگشت به نمای مهمان */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* انتخاب سایت فعال */}
          <div className="w-52">
            <CustomSelect
              value={activeSiteId}
              onChange={(val) => setActiveSiteId(val)}
              options={Object.values(sites).map((s) => ({
                value: s.id,
                label: s.name,
                subtitle: s.location,
              }))}
            />
          </div>

          <button
            onClick={onReturnToExperience}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs shadow-lg transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>مشاهده فرانت‌اند مهمان</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          نوار تب‌های ناوبری پنل ادمین
          ========================================================================= */}
      <div className={`px-4 sm:px-8 py-2.5 border-b ${currentPanel.border} bg-neutral-950/60 overflow-x-auto`}>
        <div className="max-w-7xl mx-auto">
          <CustomTabs
            tabs={adminTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="boxed"
          />
        </div>
      </div>

      {/* =========================================================================
          بدنه تب فعال
          ========================================================================= */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {/* ---------------------------------------------------------------------
            تب ۱: سیستم تم و ظاهر (Site & Panel Themes + Tokens)
            --------------------------------------------------------------------- */}
        {activeTab === 'themes' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <span>تنظیمات سیستم تم برای سایت و پنل ادمین</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                تغییر پالت‌های رنگی، انحنای المان‌ها (Border Radius) و رفتار لایه‌های تطبیقی
              </p>
            </div>

            {/* تم‌های فرانت‌اند سایت هتل */}
            <div className={`p-6 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-4`}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>۱. تم بصری سایت فرانت‌اند مهمان:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.keys(SITE_THEMES) as SiteThemeId[]).map((themeKey) => {
                  const t = SITE_THEMES[themeKey];
                  const isSelected = siteTheme === themeKey;

                  return (
                    <div
                      key={themeKey}
                      onClick={() => setSiteTheme(themeKey)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/30 shadow-lg`
                          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{t.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-[11px] text-neutral-400 mb-4">{t.description}</p>
                      </div>

                      {/* سواچ رنگی تم */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                        <span
                          className="w-5 h-5 rounded-full shadow-md"
                          style={{ backgroundColor: t.colors.primary }}
                        />
                        <span
                          className="w-5 h-5 rounded-full shadow-md"
                          style={{ backgroundColor: t.colors.primaryDark }}
                        />
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {t.colors.primary}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* تم پنل مدیریت ادمین */}
            <div className={`p-6 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-4`}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>۲. تم اختصاصی پنل ادمین (Admin Panel Theme):</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.keys(PANEL_THEMES) as PanelThemeId[]).map((panelKey) => {
                  const p = PANEL_THEMES[panelKey];
                  const isSelected = panelTheme === panelKey;

                  return (
                    <div
                      key={panelKey}
                      onClick={() => setPanelTheme(panelKey)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? `border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/30 shadow-lg`
                          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="h-8 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[11px] text-neutral-400">
                        پیش‌نمایش سطح پنل
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* توکن‌های انحنای گوشه‌ها (Border Radius Tokens) */}
            <div className={`p-6 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-4`}>
              <h3 className="text-sm font-bold text-white">
                ۳. مقیاس انحنای گوشه‌های کامپوننت‌ها (Radius Tokens):
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: 'sharp', label: 'تیز (Sharp - 0px)', desc: 'کلاسیک و مینیمال' },
                  { id: 'refined', label: 'ظریف (Refined - 8px)', desc: 'مدرن استاندارد' },
                  { id: 'smooth', label: 'روان (Smooth - 16px)', desc: 'تشریفاتی لوکس' },
                  { id: 'ultra', label: 'گرد کامل (Ultra - 24px+)', desc: 'فلوید و نرم' },
                ].map((item) => {
                  const isSelected = radius === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRadius(item.id as RadiusToken)}
                      className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 font-bold text-white shadow-md'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-xs font-bold mb-1">{item.label}</div>
                      <div className="text-[10px] text-neutral-400">{item.desc}</div>
                      <div
                        className={`mt-3 h-7 bg-amber-400/20 border border-amber-400/40 ${
                          RADIUS_CLASSES[item.id as RadiusToken].button
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            تب ۲: شخصی‌سازی سایت‌ها و کامپوننت‌های اختصاصی هر سایت
            «و اینکه میشه هم برای هر سایتی جداگانه component های شخصی سازی شده ای استفاده کرد»
            --------------------------------------------------------------------- */}
        {activeTab === 'sites' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>مدیریت سایت‌ها و پیکربندی اختصاصی کامپوننت‌ها</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                برای هر اقامتگاه یا وب‌سایت مجزا، می‌توانید رفتار مودال/شیت، استایل دکمه‌ها و ساعات تحویل را سفارشی‌سازی کنید.
              </p>
            </div>

            {/* کارت ویرایش مشخصات سایت فعال */}
            <div className={`p-6 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{currentSite?.name}</h3>
                  <p className="text-xs text-neutral-400">{currentSite?.tagline}</p>
                </div>
                <CustomBadge variant="gold">سایت فعال فعلی</CustomBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  label="نام رسمی هتل / وب‌سایت:"
                  value={currentSite?.name || ''}
                  onChange={(e) => updateSiteConfig(activeSiteId, { name: e.target.value })}
                />
                <CustomInput
                  label="موقعیت جغرافیایی:"
                  value={currentSite?.location || ''}
                  onChange={(e) => updateSiteConfig(activeSiteId, { location: e.target.value })}
                />
              </div>

              <CustomInput
                label="شعار و معرفی کوتاه:"
                value={currentSite?.tagline || ''}
                onChange={(e) => updateSiteConfig(activeSiteId, { tagline: e.target.value })}
              />

              {/* تنظیمات کامپوننت‌های اختصاصی این سایت */}
              <div className="pt-4 border-t border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-300">
                  تنظیمات کامپوننت‌های اختصاصی این سایت:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* رفتار اورلی در دسکتاپ */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      حالت پیش‌فرض پنجره در دسکتاپ:
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'side-sheet', label: 'ساید شیت کشویی (Side Sheet)' },
                        { id: 'modal', label: 'مودال سنترال (Center Modal)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            updateSiteConfig(activeSiteId, {
                              overlayMode: item.id as OverlayPreference,
                            })
                          }
                          className={`w-full p-2.5 rounded-xl border text-right text-xs transition-colors cursor-pointer ${
                            currentSite?.overlayMode === item.id
                              ? 'bg-amber-400/20 border-amber-400 text-white font-bold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ساعت ورود */}
                  <div>
                    <CustomInput
                      label="ساعت استاندارد ورود (Check-in):"
                      value={currentSite?.checkInHour || '14:00'}
                      onChange={(e) =>
                        updateSiteConfig(activeSiteId, { checkInHour: e.target.value })
                      }
                      startIcon={<Clock className="w-4 h-4" />}
                    />
                  </div>

                  {/* ساعت خروج */}
                  <div>
                    <CustomInput
                      label="ساعت استاندارد خروج (Check-out):"
                      value={currentSite?.checkOutHour || '12:00'}
                      onChange={(e) =>
                        updateSiteConfig(activeSiteId, { checkOutHour: e.target.value })
                      }
                      startIcon={<Clock className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* لیست کل سایت‌ها جهت سوییچ سریع */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {Object.values(sites).map((s) => {
                const isActive = s.id === activeSiteId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveSiteId(s.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-amber-400 bg-amber-400/10 shadow-lg ring-1 ring-amber-400/30'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{s.name}</span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-neutral-950 font-bold rounded-full">
                          فعال
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400">{s.location}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            تب ۳: مدیریت اتاق‌ها و جدول دسترسی (Inventory & Availability Matrix)
            --------------------------------------------------------------------- */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-400" />
                <span>مدیریت اقامتگاه‌ها و ماتریس دسترسی لحظه‌ای (Availability Matrix)</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                برای تغییر وضعیت ظرفیت هر اتاق در روزهای مشخص، روی دایره وضعیت آن روز کلیک کنید.
              </p>
            </div>

            {/* راهنمای وضعیت‌ها */}
            <div className="flex items-center gap-4 text-xs bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
              <span className="text-neutral-400">راهنما: با هر کلیک وضعیت تغییر می‌کند:</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>خالی (Available)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>محدود (Limited)</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>اشغال (Booked)</span>
              </div>
            </div>

            {/* لیست اتاق‌ها */}
            <div className="space-y-4">
              {rooms.map((room) => {
                const dates = Object.keys(room.slots);

                const cycleStatus = (current: 'available' | 'limited' | 'booked') => {
                  if (current === 'available') return 'limited';
                  if (current === 'limited') return 'booked';
                  return 'available';
                };

                return (
                  <div
                    key={room.id}
                    className={`p-5 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-4`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={room.imageUrl}
                          alt={room.title}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border border-neutral-700"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{room.title}</h4>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            {room.viewType} &bull; متراژ {toPersianDigits(room.sizeM2)} متر مربع &bull; ظرفیت {toPersianDigits(room.capacity)} نفر
                          </div>
                        </div>
                      </div>

                      {/* ویرایش قیمت */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">قیمت هر شب:</span>
                        <input
                          type="number"
                          value={room.pricePerNight}
                          onChange={(e) =>
                            updateRoomPrice(room.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-36 py-1.5 px-3 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono text-amber-300 font-bold focus:border-amber-400 outline-none"
                        />
                        <span className="text-xs text-amber-300/80 font-bold">
                          ({formatPersianPrice(room.pricePerNight)})
                        </span>
                      </div>
                    </div>

                    {/* جدول روزهای هفته با امکان تاگل */}
                    <div className="pt-3 border-t border-neutral-800">
                      <div className="text-xs font-medium text-neutral-300 mb-2">
                        وضعیت روزهای هفته (برای تغییر لمس کنید):
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                        {dates.map((dateKey) => {
                          const status = room.slots[dateKey];
                          return (
                            <button
                              key={dateKey}
                              type="button"
                              onClick={() =>
                                updateRoomAvailability(room.id, dateKey, cycleStatus(status))
                              }
                              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                status === 'available'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                  : status === 'limited'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              }`}
                            >
                              <div className="text-[10px] text-neutral-400 mb-1">{dateKey}</div>
                              <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    status === 'available'
                                      ? 'bg-emerald-400'
                                      : status === 'limited'
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500'
                                  }`}
                                />
                                <span>
                                  {status === 'available'
                                    ? 'خالی'
                                    : status === 'limited'
                                    ? 'محدود'
                                    : 'اشغال'}
                                </span>
                              </div>
                            </button>
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

        {/* ---------------------------------------------------------------------
            تب ۴: کارگاه کامپوننت‌های اختصاصی (Base Components Playground)
            «از کامپوننت های based اختصاصی باید استفاده کنی. طراحی کن کامپوننت های اختصاصی رو...
            و اینکه کامپوننت دراپ داون، سلکت، اینپوت، و همینطور مودال باید موبایل فرست باشن»
            --------------------------------------------------------------------- */}
        {activeTab === 'playground' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>کارگاه آزمایشی کامپوننت‌های Base اختصاصی</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  تست تعاملی کامپوننت‌های اینپوت، سلکت، دراپ‌داون، باتم شیت موبایل (درگ‌پذیر بدون ضربدر) و سایدشیت دسکتاپ
                </p>
              </div>

              {/* پیش‌نمایش در فریم موبایل یا دسکتاپ */}
              <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-neutral-800 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>نمای دسکتاپ</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-neutral-800 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>شبیه‌ساز موبایل</span>
                </button>
              </div>
            </div>

            {/* کانتینر اصلی یا فریم موبایل */}
            <div className={previewDevice === 'mobile' ? 'max-w-sm mx-auto border-4 border-neutral-700 rounded-[36px] p-4 bg-neutral-950 shadow-2xl overflow-hidden' : 'space-y-6'}>
              {previewDevice === 'mobile' && (
                <div className="w-20 h-4 bg-neutral-800 rounded-full mx-auto mb-4" />
              )}

              {/* ۱. تست CustomInput */}
              <div className={`p-5 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-3`}>
                <h3 className="text-xs font-bold text-amber-300">۱. کامپوننت اینپوت اختصاصی (CustomInput):</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomInput
                    label="ورودی متن با دکمه پاک‌کن:"
                    value={testInputVal}
                    onChange={(e) => setTestInputVal(e.target.value)}
                    showClearButton
                    onClear={() => setTestInputVal('')}
                  />
                  <CustomInput
                    label="ورودی با وضعیت خطا:"
                    defaultValue="شماره تماس نامعتبر است"
                    error="فرمت شماره تلفن صحیح نمی‌باشد"
                  />
                </div>
              </div>

              {/* ۲. تست CustomSelect & CustomDropdown */}
              <div className={`p-5 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-3`}>
                <h3 className="text-xs font-bold text-amber-300">۲. کامپوننت‌های سلکت و دراپ‌داون (CustomSelect & Dropdown):</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    label="سلکت اختصاصی با جستجو و متادیتا:"
                    value={testSelectVal}
                    onChange={setTestSelectVal}
                    searchable
                    options={[
                      { value: 'suite-1', label: 'سوئیت پنت‌هاوس', subtitle: '۴۲۰ متر مربع / دید دریا', badge: 'VIP' },
                      { value: 'suite-2', label: 'ویلای پرزیدنتال', subtitle: '۳۵۰ متر مربع / استخر اختصاصی' },
                      { value: 'suite-3', label: 'پاویون باغ سرو', subtitle: '۲۱۰ متر مربع / آرامش باغ' },
                    ]}
                  />

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      دراپ‌داون اکشن‌های سریع:
                    </label>
                    <CustomDropdown
                      trigger={
                        <CustomButton variant="secondary" size="md">
                          عملیات و تنظیمات هتل ▾
                        </CustomButton>
                      }
                      items={[
                        { id: '1', label: 'صدور واچر الکترونیکی', onClick: () => alert('صدور واچر') },
                        { id: '2', label: 'تماس با سرپیشخدمت ارشد', onClick: () => alert('تماس با کانسیرژ') },
                        'separator',
                        { id: '3', label: 'لغو اقامت', danger: true, onClick: () => alert('لغو رزرو') },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* ۳. تست AdaptiveOverlay (Bottom-Sheet در موبایل بدون ضربدر با درگ و Side-Sheet در دسکتاپ) */}
              <div className={`p-5 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-3`}>
                <h3 className="text-xs font-bold text-amber-300">
                  ۳. تست اورلی تطبیقی (AdaptiveOverlay):
                </h3>
                <p className="text-xs text-neutral-400">
                  طبق دستور: در حالت موبایل به «باتم شیت» بدون ضربدر و با قابلیت درگ برای بستن تبدیل می‌شود؛ و در دسکتاپ به سایدشیت یا مودال تبدیل می‌شود.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <CustomButton
                    variant="primary"
                    onClick={() => {
                      setTestOverlayMode('auto');
                      setIsTestOverlayOpen(true);
                    }}
                  >
                    اجرای تطبیقی هوشمند (Auto)
                  </CustomButton>

                  <CustomButton
                    variant="secondary"
                    onClick={() => {
                      setTestOverlayMode('bottom-sheet');
                      setIsTestOverlayOpen(true);
                    }}
                  >
                    تست اجباری باتم‌شیت موبایل (درگ‌پذیر بدون X)
                  </CustomButton>

                  <CustomButton
                    variant="outline"
                    onClick={() => {
                      setTestOverlayMode('side-sheet');
                      setIsTestOverlayOpen(true);
                    }}
                  >
                    تست ساید‌شیت دسکتاپ
                  </CustomButton>
                </div>
              </div>

              {/* ۴. تست دکمه‌ها */}
              <div className={`p-5 rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} space-y-3`}>
                <h3 className="text-xs font-bold text-amber-300">۴. استایل‌های دکمه اختصاصی (CustomButton):</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <CustomButton variant="primary">دکمه Primary لوکس</CustomButton>
                  <CustomButton variant="secondary">دکمه Secondary</CustomButton>
                  <CustomButton variant="outline">دکمه Outline</CustomButton>
                  <CustomButton variant="glass">دکمه شیشه‌ای (Glass)</CustomButton>
                  <CustomButton variant="primary" isLoading>در حال بارگذاری</CustomButton>
                </div>
              </div>
            </div>

            {/* مودال/شیت تستی کارگاه */}
            <AdaptiveOverlay
              isOpen={isTestOverlayOpen}
              onClose={() => setIsTestOverlayOpen(false)}
              mode={testOverlayMode}
              title="پیش‌نمایش اورلی تطبیقی هتل"
              subtitle="در موبایل: باتم‌شیت درگ‌پذیر بدون دکمه ضربدر | در دسکتاپ: سایدشیت یا مودال"
            >
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                  این پنجره برای تست رفتار تطبیقی طراحی شده است.
                  {testOverlayMode === 'bottom-sheet' && (
                    <div className="mt-2 text-amber-300 font-bold">
                      ✓ توجه فرمایید: هیچ دکمه ضربدری در باتم شیت وجود ندارد! برای بستن، کافیست دستگیره بالا را به سمت پایین درگ کنید یا روی پس‌زمینه ضربه بزنید.
                    </div>
                  )}
                </div>

                <CustomInput label="تست اینپوت درون شیت:" placeholder="متن آزمایشی..." />

                <div className="pt-4 flex justify-end">
                  <CustomButton variant="primary" onClick={() => setIsTestOverlayOpen(false)}>
                    تأیید و بستن پنجره
                  </CustomButton>
                </div>
              </div>
            </AdaptiveOverlay>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            تب ۵: سوابق رزرواسیون (Bookings Log)
            --------------------------------------------------------------------- */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                  <span>دفتر ثبت رزرواسیون‌ها و پرداخت‌های شبیه‌سازی‌شده</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  تمام رزروهایی که از فرانت‌اند مهمان یا ویزارد ثبت می‌شوند، بلافاصله در این جدول قابل رؤیت هستند.
                </p>
              </div>

              <div className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
                مجموع رزروها: <span className="font-bold text-amber-300">{toPersianDigits(bookings.length)}</span> مورد
              </div>
            </div>

            {/* جدول رزرواسیون */}
            <div className={`rounded-2xl ${currentPanel.cardBg} border ${currentPanel.border} overflow-hidden shadow-2xl`}>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="p-3.5">کد رهگیری</th>
                      <th className="p-3.5">نام میهمان</th>
                      <th className="p-3.5">اقامتگاه</th>
                      <th className="p-3.5">تاریخ ورود و خروج</th>
                      <th className="p-3.5">مبلغ کل</th>
                      <th className="p-3.5">وضعیت پرداخت</th>
                      <th className="p-3.5">زمان ثبت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-neutral-850/60 transition-colors">
                        <td className="p-3.5 font-bold text-amber-300">
                          {toPersianDigits(booking.trackingCode)}
                        </td>
                        <td className="p-3.5 font-medium text-white">
                          <div>{booking.guestName}</div>
                          <div className="text-[10px] text-neutral-400">{toPersianDigits(booking.guestPhone)}</div>
                        </td>
                        <td className="p-3.5 text-neutral-200">
                          {booking.roomTitle}
                        </td>
                        <td className="p-3.5 text-neutral-300">
                          <div>{toPersianDigits(booking.checkInDate)} &bull; {booking.checkInTime}</div>
                          <div className="text-[10px] text-neutral-500">تا {toPersianDigits(booking.checkOutDate)} &bull; {booking.checkOutTime}</div>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-400">
                          {formatPersianPrice(booking.totalPrice)}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <CreditCard className="w-3 h-3" />
                            <span>تسویه فیک شاپرک</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-400 text-[11px]">
                          {toPersianDigits(booking.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            تب ۶: بوم گراف سکانس‌های هتل (Sequence Flow Canvas)
            --------------------------------------------------------------------- */}
        {activeTab === 'flow' && (
          <div className="h-[78vh] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl relative">
            <FlowCanvas onSwitchToExperience={onReturnToExperience} />
          </div>
        )}
      </main>
    </div>
  );
};
