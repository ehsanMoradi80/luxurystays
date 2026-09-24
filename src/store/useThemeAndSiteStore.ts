/**
 * useThemeAndSiteStore.ts
 * 
 * استور جامع مدیریت سیستم تم (تم سایت و تم پنل ادمین)،
 * تقویم شمسی جلالی، اعداد فارسی، مدیریت چند اقامتگاه
 * و نگهداری اتاق‌ها، جدول زمان‌بندی دسترسی (Availability Matrix) و رزروهای ثبت‌شده.
 */

import { create } from 'zustand';
import { toPersianDigits, formatToJalali } from '../utils/jalali';

export type SiteThemeId = 'gold' | 'emerald' | 'sapphire' | 'rose';
export type PanelThemeId = 'obsidian' | 'slate' | 'monochrome';
export type RadiusToken = 'sharp' | 'refined' | 'smooth' | 'ultra';
export type OverlayPreference = 'side-sheet' | 'modal' | 'bottom-sheet';

export interface SiteConfig {
  id: string;
  name: string;
  tagline: string;
  location: string;
  currency: string;
  primaryColor: string;
  themeId: SiteThemeId;
  radius: RadiusToken;
  buttonVariant: 'classic' | 'modern' | 'minimal';
  overlayMode: OverlayPreference;
  checkInHour: string;
  checkOutHour: string;
}

export interface HotelRoom {
  id: string;
  siteId: string;
  title: string;
  type: string;
  sizeM2: number;
  capacity: number;
  pricePerNight: number;
  imageUrl: string;
  viewType: string;
  amenities: string[];
  slots: Record<string, 'available' | 'limited' | 'booked'>; // Jalali date ISO (e.g. "1405/07/04") -> status
}

export interface BookingRecord {
  id: string;
  trackingCode: string;
  siteId: string;
  roomId: string;
  roomTitle: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string; // Jalali (e.g. "1405/07/04")
  checkOutDate: string; // Jalali
  checkInTime: string; // "14:00"
  checkOutTime: string; // "12:00"
  guestCount: number;
  vipServices: string[];
  totalPrice: number;
  paymentStatus: 'paid_fake' | 'pending' | 'verified';
  createdAt: string;
}

interface ThemeAndSiteState {
  // تنظیمات تم
  siteTheme: SiteThemeId;
  panelTheme: PanelThemeId;
  radius: RadiusToken;
  activeSiteId: string;
  
  // سایت‌های اقامتگاهی
  sites: Record<string, SiteConfig>;
  
  // اتاق‌ها و موجودی با تقویم جلالی
  rooms: HotelRoom[];
  
  // سوابق رزرواسیون
  bookings: BookingRecord[];

  // اتاق پیش‌انتخاب شده از تور ویدیویی
  preSelectedRoomId: string | null;
  
  // اکشن‌ها
  setSiteTheme: (theme: SiteThemeId) => void;
  setPanelTheme: (theme: PanelThemeId) => void;
  setRadius: (radius: RadiusToken) => void;
  setActiveSiteId: (siteId: string) => void;
  setPreSelectedRoomId: (roomId: string | null) => void;
  updateSiteConfig: (siteId: string, partial: Partial<SiteConfig>) => void;
  updateRoomAvailability: (roomId: string, date: string, status: 'available' | 'limited' | 'booked') => void;
  updateRoomPrice: (roomId: string, newPrice: number) => void;
  addBooking: (booking: Omit<BookingRecord, 'id' | 'trackingCode' | 'createdAt'>) => BookingRecord;
}

const INITIAL_SITES: Record<string, SiteConfig> = {
  'laura-palace': {
    id: 'laura-palace',
    name: 'هتل قصر لورا ساحلی',
    tagline: 'پناهگاهی باشکوه از هنر، معماری و آرامش پنج ستاره در کرانه دریا',
    location: 'کرانه اختصاصی دریای جنوب',
    currency: 'تومان',
    primaryColor: '#f59e0b',
    themeId: 'gold',
    radius: 'smooth',
    buttonVariant: 'modern',
    overlayMode: 'side-sheet',
    checkInHour: '۱۴:۰۰',
    checkOutHour: '۱۲:۰۰',
  },
  'laura-alpine': {
    id: 'laura-alpine',
    name: 'اقامتگاه کوهستانی لورا آلپاین',
    tagline: 'آرامش ناب کلبه‌های لوکس بر فراز قله‌های مه‌آلود با چشمه‌های آب‌گرم',
    location: 'ارتفاعات کوهستان برفی',
    currency: 'تومان',
    primaryColor: '#10b981',
    themeId: 'emerald',
    radius: 'refined',
    buttonVariant: 'classic',
    overlayMode: 'side-sheet',
    checkInHour: '۱۵:۰۰',
    checkOutHour: '۱۱:۰۰',
  },
  'laura-oasis': {
    id: 'laura-oasis',
    name: 'واحه بیابانی رویال لورا',
    tagline: 'ویلاهای مجلل شن‌های طلایی با رصدخانه اختصاصی و استخرهای ستاره‌گون',
    location: 'کویر رویایی مرنجاب / واحه نخلستان',
    currency: 'تومان',
    primaryColor: '#f43f5e',
    themeId: 'rose',
    radius: 'ultra',
    buttonVariant: 'minimal',
    overlayMode: 'modal',
    checkInHour: '۱۶:۰۰',
    checkOutHour: '۱۳:۰۰',
  },
};

// موجودی اتاق‌ها با تاریخ‌های شمسی مهر و آبان ۱۴۰۵
const INITIAL_ROOMS: HotelRoom[] = [
  {
    id: 'suite-penthouse',
    siteId: 'laura-palace',
    title: 'سوئیت پنت‌هاوس سلطنتی رو به دریا',
    type: 'Penthouse Royal Suite',
    sizeM2: 420,
    capacity: 4,
    pricePerNight: 48000000,
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    viewType: 'چشم‌انداز پانورامای ۳۶۰ درجه دریا و غروب ساحلی',
    amenities: ['استخر اینفینیتی اختصاصی بر فراز بام', 'جکوزی روباز رو به افق دریا', 'آسانسور شیشه‌ای مستقیم', 'سرپیشخدمت شخصی ۲۴ ساعته'],
    slots: {
      '1405/07/04': 'available',
      '1405/07/05': 'available',
      '1405/07/06': 'limited',
      '1405/07/07': 'booked',
      '1405/07/08': 'available',
      '1405/07/09': 'available',
      '1405/07/10': 'available',
      '1405/07/11': 'available',
    },
  },
  {
    id: 'suite-presidential',
    siteId: 'laura-palace',
    title: 'ویلای پرزیدنتال آتریوم با باغ اختصاصی',
    type: 'Presidential Atrium Villa',
    sizeM2: 350,
    capacity: 6,
    pricePerNight: 39000000,
    imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    viewType: 'دید اختصاصی به باغ مرکبات و فواره‌های مرمرین',
    amenities: ['استخر آبگرم سرپوشیده اختصاصی', 'سالن سینمای خصوصی ۸ نفره', 'آشپزخانه اختصاصی سرآشپز', 'تراس آفتاب‌گیر با بار VIP'],
    slots: {
      '1405/07/04': 'limited',
      '1405/07/05': 'booked',
      '1405/07/06': 'booked',
      '1405/07/07': 'available',
      '1405/07/08': 'available',
      '1405/07/09': 'available',
      '1405/07/10': 'limited',
      '1405/07/11': 'available',
    },
  },
  {
    id: 'suite-thalasso',
    siteId: 'laura-palace',
    title: 'اقامتگاه صخره‌ای تالاسو و اسپا',
    type: 'Cliffside Thalasso Suite',
    sizeM2: 280,
    capacity: 2,
    pricePerNight: 29500000,
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    viewType: 'پرتگاه صخره‌ای با امواج خروشان و نسیم ساحل',
    amenities: ['حمام ترکی مرمرین با سیستم بخار هوشمند', 'جکوزی آبگرم دریایی', 'تخت ماساژ دونفره داخل سوئیت', 'پکیج آروماتراپی رایگان'],
    slots: {
      '1405/07/04': 'available',
      '1405/07/05': 'available',
      '1405/07/06': 'available',
      '1405/07/07': 'available',
      '1405/07/08': 'limited',
      '1405/07/09': 'booked',
      '1405/07/10': 'available',
      '1405/07/11': 'available',
    },
  },
  {
    id: 'suite-garden-pavilion',
    siteId: 'laura-palace',
    title: 'پاویون باغ سروهای کهن',
    type: 'Heritage Garden Pavilion',
    sizeM2: 210,
    capacity: 3,
    pricePerNight: 21000000,
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    viewType: 'احاطه شده با سروهای کهنسال و حوض نیلوفرهای آبی',
    amenities: ['حیاط خلوت اختصاصی با حوض فیروزه‌ای', 'تراس چوبی مدیتیشن', 'شومینه هیزمی لوکس سنگی', 'منوی دمنوش‌های ارگانیک'],
    slots: {
      '1405/07/04': 'available',
      '1405/07/05': 'available',
      '1405/07/06': 'available',
      '1405/07/07': 'available',
      '1405/07/08': 'available',
      '1405/07/09': 'available',
      '1405/07/10': 'available',
      '1405/07/11': 'available',
    },
  },
];

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: 'b-01',
    trackingCode: 'LRA-۱۴۰۵-VIP-۹۱۰۴',
    siteId: 'laura-palace',
    roomId: 'suite-penthouse',
    roomTitle: 'سوئیت پنت‌هاوس سلطنتی رو به دریا',
    guestName: 'دکتر علیرضا صدری',
    guestEmail: 'a.sadri@vip-sanctuary.com',
    guestPhone: '۰۹۱۲۳۴۵۶۷۸۹',
    checkInDate: '1405/07/04',
    checkOutDate: '1405/07/07',
    checkInTime: '۱۴:۰۰',
    checkOutTime: '۱۲:۰۰',
    guestCount: 2,
    vipServices: ['ترانسفر بالگرد تشریفاتی', 'سرآشپز اختصاصی ستاره‌دار میشلن'],
    totalPrice: 174500000,
    paymentStatus: 'paid_fake',
    createdAt: '۱۴۰۵/۰۷/۰۲ - ۱۸:۴۵',
  },
  {
    id: 'b-02',
    trackingCode: 'LRA-۱۴۰۵-VIP-۸۴۳۱',
    siteId: 'laura-palace',
    roomId: 'suite-thalasso',
    roomTitle: 'اقامتگاه صخره‌ای تالاسو و اسپا',
    guestName: 'مهندس پروانه سپهری',
    guestEmail: 'p.sepehri@luxury-living.ir',
    guestPhone: '۰۹۱۲۹۸۷۶۵۴۳',
    checkInDate: '1405/07/05',
    checkOutDate: '1405/07/08',
    checkInTime: '۱۵:۰۰',
    checkOutTime: '۱۱:۰۰',
    guestCount: 2,
    vipServices: ['پکیج کامل اسپا، تالاسوتراپی و حمام ترکی'],
    totalPrice: 97000000,
    paymentStatus: 'paid_fake',
    createdAt: '۱۴۰۵/۰۷/۰۳ - ۱۰:۱۵',
  },
];

export const useThemeAndSiteStore = create<ThemeAndSiteState>((set, get) => ({
  siteTheme: 'gold',
  panelTheme: 'obsidian',
  radius: 'smooth',
  activeSiteId: 'laura-palace',
  sites: INITIAL_SITES,
  rooms: INITIAL_ROOMS,
  bookings: INITIAL_BOOKINGS,
  preSelectedRoomId: null,

  setSiteTheme: (theme) => set({ siteTheme: theme }),
  setPanelTheme: (theme) => set({ panelTheme: theme }),
  setRadius: (radius) => set({ radius }),
  setActiveSiteId: (siteId) => set({ activeSiteId: siteId }),
  setPreSelectedRoomId: (roomId) => set({ preSelectedRoomId: roomId }),

  updateSiteConfig: (siteId, partial) =>
    set((state) => ({
      sites: {
        ...state.sites,
        [siteId]: {
          ...state.sites[siteId],
          ...partial,
        },
      },
    })),

  updateRoomAvailability: (roomId, date, status) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              slots: {
                ...room.slots,
                [date]: status,
              },
            }
          : room
      ),
    })),

  updateRoomPrice: (roomId, newPrice) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, pricePerNight: newPrice } : room
      ),
    })),

  addBooking: (bookingData) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `LRA-۱۴۰۵-VIP-${toPersianDigits(randomCode)}`;
    const newRecord: BookingRecord = {
      ...bookingData,
      id: `booking-${Date.now()}`,
      trackingCode,
      createdAt: `۱۴۰۵/۰۷/۰۴ - ${toPersianDigits(new Date().getHours())}:${toPersianDigits(new Date().getMinutes())}`,
    };

    set((state) => ({
      bookings: [newRecord, ...state.bookings],
    }));

    return newRecord;
  },
}));
