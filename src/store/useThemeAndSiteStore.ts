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

export interface Tour360Hotspot {
  id: string;
  targetNodeId: string;
  title: string;
  yaw: number; // 0 to 360 degrees
  pitch: number; // -85 to 85 degrees
}

export interface Tour360Node {
  id: string;
  title: string;
  panoramaUrl: string;
  hotspots?: Tour360Hotspot[];
}

export interface MapHotspot {
  id: string;
  nodeId: string; // matches scene ID e.g. 'gate' | 'lobby' | 'suite' | 'dining' | 'pool'
  title: string;
  level: string;
  wing: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  description?: string;
  has360Tour?: boolean;
  tour360Nodes?: Tour360Node[];
}

export interface FloorEnvironment {
  id: string;
  code: string; // e.g. '4', '2', '1', 'G'
  name: string; // e.g. 'پنت‌هاوس', 'رستوران', 'لابی', 'ساحل و ورودی'
  mediaType: 'image' | 'video';
  mediaUrl: string;
  hotspots: MapHotspot[];
}

export interface HotelMapConfig {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  title: string;
  subtitle: string;
  description: string;
  hotspots: MapHotspot[];
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

  // طبقات و محیط‌های مستقل هتل (تصویر یا ویدیوی لوپ مجزا برای هر طبقه)
  floors: FloorEnvironment[];
  activeFloorId: string;

  // تنظیمات نقشه معماری هتل
  hotelMap: HotelMapConfig;
  
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
  setActiveFloorId: (floorId: string) => void;
  updateFloor: (floorId: string, partial: Partial<FloorEnvironment>) => void;
  addFloor: (floor: FloorEnvironment) => void;
  removeFloor: (floorId: string) => void;
  updateFloorHotspot: (floorId: string, hotspotId: string, partial: Partial<MapHotspot>) => void;
  addFloorHotspot: (floorId: string, hotspot: MapHotspot) => void;
  removeFloorHotspot: (floorId: string, hotspotId: string) => void;
  updateHotelMap: (partial: Partial<HotelMapConfig>) => void;
  setMapHotspots: (hotspots: MapHotspot[]) => void;
  updateMapHotspot: (id: string, partial: Partial<MapHotspot>) => void;
  addMapHotspot: (hotspot: MapHotspot) => void;
  removeMapHotspot: (id: string) => void;
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

const INITIAL_FLOORS: FloorEnvironment[] = [
  {
    id: 'fl-4',
    code: '۴',
    name: 'طبقه ۴ - سوئیت پنت‌هاوس',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-suite',
        nodeId: 'suite',
        title: 'سوئیت پنت‌هاوس سلطنتی',
        level: 'طبقه ۴',
        wing: 'برج آسمانه سلطنتی',
        x: 50,
        y: 45,
        description: 'اقامتگاه اختصاصی ۳۸۰ متری با دید ۳۶۰ درجه به اقیانوس',
        has360Tour: true,
        tour360Nodes: [
          {
            id: 'suite-living',
            title: 'سالن نشیمن و تالار پذیرایی',
            panoramaUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-to-bed',
                targetNodeId: 'suite-bedroom',
                title: 'ورود به اتاق خواب رویال مستر',
                yaw: 65,
                pitch: -5,
              },
              {
                id: 'spot-to-terrace',
                targetNodeId: 'suite-terrace',
                title: 'خروج به تراس اختصاصی رو به دریا',
                yaw: 220,
                pitch: 0,
              },
            ],
          },
          {
            id: 'suite-bedroom',
            title: 'اتاق خواب رویال مستر',
            panoramaUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-back-living',
                targetNodeId: 'suite-living',
                title: 'بازگشت به سالن نشیمن',
                yaw: 180,
                pitch: -5,
              },
              {
                id: 'spot-bed-terrace',
                targetNodeId: 'suite-terrace',
                title: 'دید به تراس و اقیانوس',
                yaw: 310,
                pitch: 0,
              },
            ],
          },
          {
            id: 'suite-terrace',
            title: 'تراس اختصاصی دید به دریا و آسمانه',
            panoramaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-back-to-suite',
                targetNodeId: 'suite-living',
                title: 'ورود به داخل سوئیت',
                yaw: 90,
                pitch: -5,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'fl-2',
    code: '۲',
    name: 'طبقه ۲ - رستوران و تراس غروب',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-dining',
        nodeId: 'dining',
        title: 'رستوران آمبروزیا',
        level: 'طبقه ۲',
        wing: 'تراس شرقی اقیانوس',
        x: 50,
        y: 50,
        description: 'میزهای روباز مشرف به غروب با منوی سرآشپز بین‌المللی',
        has360Tour: true,
        tour360Nodes: [
          {
            id: 'dining-main',
            title: 'سالن غذاخوری مجلل سرآشپز',
            panoramaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-to-terrace-dining',
                targetNodeId: 'dining-deck',
                title: 'عرشه روباز مشرف به غروب',
                yaw: 145,
                pitch: -3,
              },
            ],
          },
          {
            id: 'dining-deck',
            title: 'عرشه روباز ساحلی و تراس غروب',
            panoramaUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-back-to-dining',
                targetNodeId: 'dining-main',
                title: 'ورود به سالن اصلی رستوران',
                yaw: 320,
                pitch: -5,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'fl-1',
    code: '۱',
    name: 'طبقه ۱ - تالار و لابی مرمرین',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-lobby',
        nodeId: 'lobby',
        title: 'تالار و لابی مرمرین',
        level: 'طبقه ۱',
        wing: 'آتریوم مرکزی',
        x: 50,
        y: 50,
        description: 'آتریوم شیشه‌ای با نوای پیانو و سنگ‌های مرمر کرارا',
        has360Tour: true,
        tour360Nodes: [
          {
            id: 'lobby-atrium',
            title: 'آتریوم مرکزی و پیانوی گرند',
            panoramaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-lobby-lounge',
                targetNodeId: 'lobby-vip',
                title: 'لانژ اختصاصی تشریفات',
                yaw: 80,
                pitch: 0,
              },
            ],
          },
          {
            id: 'lobby-vip',
            title: 'لانژ اختصاصی تشریفات و گالری',
            panoramaUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-back-atrium',
                targetNodeId: 'lobby-atrium',
                title: 'بازگشت به آتریوم مرکزی',
                yaw: 260,
                pitch: -4,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'fl-0',
    code: 'G',
    name: 'همکف - استخر، واحه ساحلی و درگاه ورودی',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-resort-with-palm-trees-and-swimming-pool-42562-large.mp4',
    hotspots: [
      {
        id: 'hs-pool',
        nodeId: 'pool',
        title: 'استخر و واحه ساحلی',
        level: 'همکف',
        wing: 'واحه غربی ساحل',
        x: 35,
        y: 50,
        description: 'استخر اینفینیتی در لبه صخره‌ها و ساحل آرامش',
        has360Tour: true,
        tour360Nodes: [
          {
            id: 'pool-infinity-spot',
            title: 'استخر اینفینیتی لبه صخره',
            panoramaUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-pool-cabanas',
                targetNodeId: 'pool-cabana-spot',
                title: 'آلاچیق‌ها و تخت‌های آفتاب ساحلی',
                yaw: 160,
                pitch: -6,
              },
            ],
          },
          {
            id: 'pool-cabana-spot',
            title: 'آلاچیق‌های اختصاصی ساحل',
            panoramaUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=3000&q=85',
            hotspots: [
              {
                id: 'spot-back-infinity',
                targetNodeId: 'pool-infinity-spot',
                title: 'بازگشت به لبه استخر',
                yaw: 340,
                pitch: -2,
              },
            ],
          },
        ],
      },
      {
        id: 'hs-gate',
        nodeId: 'gate',
        title: 'درگاه ورودی و حیاط سرو',
        level: 'همکف',
        wing: 'محوطه ورودی جنوبی',
        x: 65,
        y: 50,
        description: 'ورودی تشریفاتی و حیاط آب‌نماهای سرو',
        has360Tour: true,
        tour360Nodes: [
          {
            id: 'gate-courtyard',
            title: 'حیاط تشریفاتی آب‌نما و سرو',
            panoramaUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=3000&q=85',
            hotspots: [],
          },
        ],
      },
    ],
  },
];

const INITIAL_HOTEL_MAP: HotelMapConfig = {
  mediaType: 'image',
  mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
  title: 'پلان معماری و نقشه فضایی قصر لورا',
  subtitle: 'برج سلطنتی، تالارهای مرمرین، واحه استخر بیکران و سواحل اختصاصی',
  description: 'نقشه جامع فضاهای اقامتی و تفریحی قصر لورا. شما می‌توانید با کلیک بر روی هر یک از نشانگرهای فضایی، مستقیماً وارد آن سکانس شوید.',
  hotspots: INITIAL_FLOORS[2].hotspots,
};

export const useThemeAndSiteStore = create<ThemeAndSiteState>((set, get) => ({
  siteTheme: 'gold',
  panelTheme: 'obsidian',
  radius: 'smooth',
  activeSiteId: 'laura-palace',
  sites: INITIAL_SITES,
  rooms: INITIAL_ROOMS,
  bookings: INITIAL_BOOKINGS,
  preSelectedRoomId: null,
  floors: INITIAL_FLOORS,
  activeFloorId: 'fl-1',
  hotelMap: INITIAL_HOTEL_MAP,

  setSiteTheme: (theme) => set({ siteTheme: theme }),
  setPanelTheme: (theme) => set({ panelTheme: theme }),
  setRadius: (radius) => set({ radius }),
  setActiveSiteId: (siteId) => set({ activeSiteId: siteId }),
  setPreSelectedRoomId: (roomId) => set({ preSelectedRoomId: roomId }),

  setActiveFloorId: (floorId) => set({ activeFloorId: floorId }),

  updateFloor: (floorId, partial) =>
    set((state) => ({
      floors: state.floors.map((f) => (f.id === floorId ? { ...f, ...partial } : f)),
    })),

  addFloor: (floor) =>
    set((state) => ({
      floors: [floor, ...state.floors],
    })),

  removeFloor: (floorId) =>
    set((state) => ({
      floors: state.floors.filter((f) => f.id !== floorId),
    })),

  updateFloorHotspot: (floorId, hotspotId, partial) =>
    set((state) => ({
      floors: state.floors.map((f) =>
        f.id === floorId
          ? {
              ...f,
              hotspots: f.hotspots.map((h) =>
                h.id === hotspotId ? { ...h, ...partial } : h
              ),
            }
          : f
      ),
    })),

  addFloorHotspot: (floorId, hotspot) =>
    set((state) => ({
      floors: state.floors.map((f) =>
        f.id === floorId ? { ...f, hotspots: [...f.hotspots, hotspot] } : f
      ),
    })),

  removeFloorHotspot: (floorId, hotspotId) =>
    set((state) => ({
      floors: state.floors.map((f) =>
        f.id === floorId
          ? { ...f, hotspots: f.hotspots.filter((h) => h.id !== hotspotId) }
          : f
      ),
    })),

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

  updateHotelMap: (partial) =>
    set((state) => ({
      hotelMap: {
        ...state.hotelMap,
        ...partial,
      },
    })),

  setMapHotspots: (hotspots) =>
    set((state) => ({
      hotelMap: {
        ...state.hotelMap,
        hotspots,
      },
    })),

  updateMapHotspot: (id, partial) =>
    set((state) => ({
      hotelMap: {
        ...state.hotelMap,
        hotspots: state.hotelMap.hotspots.map((hs) =>
          hs.id === id ? { ...hs, ...partial } : hs
        ),
      },
    })),

  addMapHotspot: (hotspot) =>
    set((state) => ({
      hotelMap: {
        ...state.hotelMap,
        hotspots: [...state.hotelMap.hotspots, hotspot],
      },
    })),

  removeMapHotspot: (id) =>
    set((state) => ({
      hotelMap: {
        ...state.hotelMap,
        hotspots: state.hotelMap.hotspots.filter((hs) => hs.id !== id),
      },
    })),
}));
