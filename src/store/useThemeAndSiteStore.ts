/**
 * useThemeAndSiteStore.ts
 * 
 * استور جامع مدیریت سیستم تم (تم سایت و تم پنل ادمین)،
 * تقویم شمسی جلالی، اعداد فارسی، مدیریت چند اقامتگاه
 * و نگهداری اتاق‌ها، جدول زمان‌بندی دسترسی (Availability Matrix) و رزروهای ثبت‌شده.
 */

import { create } from 'zustand';
import { toPersianDigits, formatToJalali } from '../utils/jalali';
import { 
  ExperiencePackage, 
  DedicatedExperience, 
  DedicatedSequence, 
  DedicatedTransition 
} from '../types/cms';
export type { ExperiencePackage, DedicatedExperience, DedicatedSequence, DedicatedTransition };

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

export interface SubSequenceOption {
  id: string; // sequence nodeId e.g. 'suite', 'suite-bedroom', 'suite-terrace'
  title: string; // 'سالن نشیمن', 'اتاق خواب مستر', 'تراس جکوزی'
  description?: string;
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
  experiencePackageId?: string;
  subSequences?: SubSequenceOption[];
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
  
  // پکیج‌های تجارب و سوئیت‌های هتل
  packages: ExperiencePackage[];

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

  // تجارب اختصاصی هتل (مستقل از سکانس‌های صفحه اصلی سایت)
  dedicatedExperiences: DedicatedExperience[];
  activeExperienceId: string | null;
  
  // اکشن‌ها
  setSiteTheme: (theme: SiteThemeId) => void;
  setPanelTheme: (theme: PanelThemeId) => void;
  setRadius: (radius: RadiusToken) => void;
  setActiveSiteId: (siteId: string) => void;
  setPreSelectedRoomId: (roomId: string | null) => void;
  setActiveExperienceId: (id: string | null) => void;
  addDedicatedExperience: (exp: DedicatedExperience) => void;
  updateDedicatedExperience: (id: string, partial: Partial<DedicatedExperience>) => void;
  removeDedicatedExperience: (id: string) => void;
  addSequenceToExperience: (expId: string, seq: DedicatedSequence) => void;
  updateExperienceSequence: (expId: string, seqId: string, partial: Partial<DedicatedSequence>) => void;
  removeExperienceSequence: (expId: string, seqId: string) => void;
  addTransitionToExperience: (expId: string, trans: DedicatedTransition) => void;
  removeExperienceTransition: (expId: string, transId: string) => void;
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
  updatePackage: (id: string, partial: Partial<ExperiencePackage>) => void;
  addPackage: (pkg: ExperiencePackage) => void;
  removePackage: (id: string) => void;
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

const INITIAL_PACKAGES: ExperiencePackage[] = [
  {
    id: 'pkg-suite-penthouse',
    title: 'سوئیت پنت‌هاوس سلطنتی',
    type: 'suite',
    tagline: 'اقامتگاه اختصاصی ۴۲۰ متری بر فراز آسمانه و اقیانوس',
    floorCode: '۴',
    price: 48000000,
    priceUnit: 'هر شب',
    includedNodeIds: ['suite', 'suite-bedroom', 'suite-terrace'],
    description: 'پکیج کامل اقامت سلطنتی شامل سالن پذیرایی اشرافی، اتاق خواب رویال مستر و تراس معلق ۲۲۰ متری همراه با جکوزی اختصاصی.',
    coverImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    amenities: ['استخر اینفینیتی اختصاصی بر فراز بام', 'جکوزی روباز رو به افق دریا', 'آسانسور شیشه‌ای مستقیم', 'سرپیشخدمت شخصی ۲۴ ساعته'],
  },
  {
    id: 'pkg-dining-ambrosia',
    title: 'ضیافت شام در رستوران میشلن آمبروزیا',
    type: 'standalone_experience',
    tagline: 'تجربه آشپزی سطح بالای بین‌المللی با منوی سرآشپز برنده ستاره میشلن',
    floorCode: '۲',
    price: 3500000,
    priceUnit: 'هر نفر',
    includedNodeIds: ['dining', 'dining-deck'],
    description: 'رزرو میز اختصاصی در سالن اصلی یا عرشه روباز با چشم‌انداز غروب مستقیم خورشید در دریا و نوای زنده ویولن.',
    coverImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    amenities: ['منوی فصلی سرآشپز میشلن', 'رزرو لژ اختصاصی', 'پذیرایی نوشیدنی خوشامدگویی خاویار'],
  },
  {
    id: 'pkg-infinity-oasis',
    title: 'واحه ساحلی و کابانای اختصاصی VIP',
    type: 'standalone_experience',
    tagline: 'یک روز آرامش مطلق در آلاچیق‌های لوکس صخره‌ای و استخر آب‌شور',
    floorCode: 'G',
    price: 6500000,
    priceUnit: 'هر سانس',
    includedNodeIds: ['pool', 'pool-cabanas'],
    description: 'بهره‌مندی از کابانای مجهز با تخت‌های مخملین آفتاب، ماساژ در آب، سرویس حوله گرم و میوه‌های تازه استوایی.',
    coverImageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    amenities: ['کابانای اختصاصی روزانه', 'ماساژور خصوصی کنار آب', 'سرو نوشیدنی‌های ارگانیک'],
  },
  {
    id: 'pkg-grand-atrium',
    title: 'تالار تشریفات و لابی مرمرین',
    type: 'facility',
    tagline: 'دیدار در آتریوم باشکوه با نوای پیانوی استین‌وی',
    floorCode: '۱',
    price: 0,
    priceUnit: 'هر شب',
    includedNodeIds: ['gate', 'lobby'],
    description: 'فضای عمومی و اختصاصی تشریفات، چای‌بار سلطنتی و دیدار با سرپیشخدمت قصر.',
    coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    amenities: ['پیانوی زنده گرند', 'سرویس چای اصیل', 'تشریفات استقبال لیموزین'],
  },
];

const INITIAL_DEDICATED_EXPERIENCES: DedicatedExperience[] = [
  {
    id: 'exp-suite-penthouse',
    title: 'سوئیت سلطنتی پنت‌هاوس ۴۲۰ متری',
    tagline: 'اقامتگاه اختصاصی بر فراز اقیانوس با دید ۳۶۰ درجه',
    category: 'suite',
    floorCode: '۴',
    coverImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    price: 48000000,
    priceUnit: 'هر شب',
    amenities: ['استخر اینفینیتی اختصاصی بام', 'جکوزی روباز رو به دریا', 'آسانسور شیشه‌ای مستقیم', 'سرپیشخدمت شخصی ۲۴ ساعته'],
    description: 'پکیج کامل اقامت سلطنتی در پنت‌هاوس شامل سالن پذیرایی اشرافی، اتاق خواب رویال مستر و تراس معلق ۲۲۰ متری همراه با جکوزی اختصاصی.',
    sequences: [
      {
        id: 'seq-penthouse-living',
        title: 'سالن پذیرایی پنت‌هاوس و آتریوم شیشه‌ای',
        subtitle: 'مبلمان دست‌ساز و دید ۳۶۰ درجه به اقیانوس',
        description: 'سالن اصلی با سقف شیشه‌ای و ارتفاع دوبلکس، بار اختصاصی و پیانوی دیجیتال.',
        videoUrl: 'https://assets.mixkit.co/videos/42792/42792-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        duration: 11.2,
      },
      {
        id: 'seq-penthouse-bedroom',
        title: 'اتاق خواب رویال مستر و بالکن اختصاصی',
        subtitle: 'تخت خواب کینگ‌سایز با ملافه‌های ابریشمین',
        description: 'فضای آرامش‌بخش با حمام مرمرین بازالت، دید مستقیم به طلوع و غروب خورشید.',
        videoUrl: 'https://assets.mixkit.co/videos/42791/42791-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
        duration: 8.5,
      },
      {
        id: 'seq-penthouse-terrace',
        title: 'تراس معلق با جکوزی روباز رو به افق دریا',
        subtitle: 'جکوزی آبگرم مشرف به بی‌کران دریا',
        description: 'تراس خصوصی ۲۲۰ متری با تخت‌های آفتاب‌گیر و منوی اختصاصی کوکتل بار.',
        videoUrl: 'https://assets.mixkit.co/videos/42790/42790-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
        duration: 9.5,
      },
    ],
    transitions: [
      {
        id: 'trans-living-to-bedroom',
        fromSequenceId: 'seq-penthouse-living',
        toSequenceId: 'seq-penthouse-bedroom',
        label: 'گذر از راهروی مرمرین به اتاق خواب مستر',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.8,
        direction: 'forward',
      },
      {
        id: 'trans-bedroom-to-terrace',
        fromSequenceId: 'seq-penthouse-bedroom',
        toSequenceId: 'seq-penthouse-terrace',
        label: 'گشودن درب‌های شیشه‌ای به تراس و جکوزی معلق',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        duration: 4.5,
        direction: 'forward',
      },
      {
        id: 'trans-terrace-to-living',
        fromSequenceId: 'seq-penthouse-terrace',
        toSequenceId: 'seq-penthouse-living',
        label: 'بازگشت به سالن پذیرایی اشرافی',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.2,
        direction: 'backward',
      },
    ],
  },
  {
    id: 'exp-michelin-dining',
    title: 'ضیافت شام در رستوران میشلن آمبروزیا',
    tagline: 'تجربه آشپزی سطح بالای بین‌المللی با منوی سرآشپز میشلن',
    category: 'dining',
    floorCode: '۲',
    coverImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    price: 3500000,
    priceUnit: 'هر نفر',
    amenities: ['منوی فصلی سرآشپز میشلن', 'رزرو لژ اختصاصی', 'پذیرایی خوشامدگویی خاویار'],
    description: 'رزرو میز اختصاصی در سالن اصلی یا عرشه روباز با چشم‌انداز غروب مستقیم خورشید در دریا و نوای زنده ویولن.',
    sequences: [
      {
        id: 'seq-dining-main',
        title: 'سالن اصلی رستوران با چلچراغ‌های مورانو',
        subtitle: 'لژهای مخملین با معماری رنسانس',
        description: 'سالن ضیافت مجلل با نوای زنده پیانو و ویولن، و سرو غذاهای منتخب بین‌المللی.',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
        duration: 7.5,
      },
      {
        id: 'seq-dining-deck',
        title: 'عرشه روباز دریا و بار کوکتل غروب',
        subtitle: 'شام رمانتیک زیر سقف آسمان شب',
        description: 'میزهای روباز بر فراز صخره‌های ساحلی با تماشای غروب خورشید در آب‌های نیلگون.',
        videoUrl: 'https://assets.mixkit.co/videos/42794/42794-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        duration: 8.2,
      },
    ],
    transitions: [
      {
        id: 'trans-dining-main-to-deck',
        fromSequenceId: 'seq-dining-main',
        toSequenceId: 'seq-dining-deck',
        label: 'گذر به عرشه روباز و بالکن ساحلی',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.5,
        direction: 'forward',
      },
      {
        id: 'trans-dining-deck-to-main',
        fromSequenceId: 'seq-dining-deck',
        toSequenceId: 'seq-dining-main',
        label: 'بازگشت به لژ مرکزی رستوران',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        duration: 4.2,
        direction: 'backward',
      },
    ],
  },
  {
    id: 'exp-thalasso-spa',
    title: 'پکیج رویال اسپا، تالاسوتراپی و حمام ترکی',
    tagline: 'تجربه آرامش مطلق با ماسک طلای ۲۴ عیار و روغن‌های ارگانیک',
    category: 'spa',
    floorCode: '۱',
    coverImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    price: 4800000,
    priceUnit: 'هر سانس',
    amenities: ['ماساژ دونفره اختصاصی', 'حمام ترکی با سنگ بازالت داغ', 'حوضچه آب‌نمک کوهستان'],
    description: 'پناهگاهی از رایحه اکالیپتوس، اسطوخودوس و آب‌های معدنی شفابخش در صخره‌های هتل.',
    sequences: [
      {
        id: 'seq-spa-lounge',
        title: 'سالن ریلکسیشن و چای‌بار ارگانیک گیاهی',
        subtitle: 'آرامش مقدماتی با نوای فرکانس ۴۳۲ هرتز',
        description: 'تخت‌های مخملین استراحت با سرو دمنوش‌های دست‌چین و حوله‌های گرم معطر.',
        videoUrl: 'https://assets.mixkit.co/videos/42791/42791-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        duration: 8.0,
      },
      {
        id: 'seq-spa-pools',
        title: 'حوضچه‌های آبگرم معدنی و سونای نمک هیمالیا',
        subtitle: 'آب‌درمانی با املاح غنی معدنی و ماساژ طلا',
        description: 'حوضچه‌های آرامش‌بخش سنگی با دمای کنترل‌شده و جریان ملایم آبشار گرم.',
        videoUrl: 'https://assets.mixkit.co/videos/42794/42794-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
        duration: 9.0,
      },
    ],
    transitions: [
      {
        id: 'trans-spa-lounge-to-pools',
        fromSequenceId: 'seq-spa-lounge',
        toSequenceId: 'seq-spa-pools',
        label: 'ورود به دالان آب‌درمانی و حوضچه‌های نمک',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.5,
        direction: 'forward',
      },
      {
        id: 'trans-spa-pools-to-lounge',
        fromSequenceId: 'seq-spa-pools',
        toSequenceId: 'seq-spa-lounge',
        label: 'بازگشت به سالن چای‌بار و آرامش',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        duration: 4.0,
        direction: 'backward',
      },
    ],
  },
  {
    id: 'exp-beach-cabanas',
    title: 'واحه ساحلی و کابانای اختصاصی VIP',
    tagline: 'یک روز آرامش مطلق در آلاچیق‌های صخره‌ای و استخر آب‌شور',
    category: 'club',
    floorCode: 'G',
    coverImageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    price: 6500000,
    priceUnit: 'هر سانس',
    amenities: ['کابانای مجهز VIP', 'ماساژور کنار آب', 'سرویس حوله گرم و میوه استوایی'],
    description: 'بهره‌مندی از کابانای مجهز با تخت‌های مخملین آفتاب، ماساژ در آب، سرویس حوله گرم و میوه‌های تازه استوایی.',
    sequences: [
      {
        id: 'seq-beach-pool',
        title: 'استخر اینفینیتی ساحلی رو به بی‌کران دریا',
        subtitle: 'شنا در آب گرم فیلترشده با املاح دریا',
        description: 'استخر معلق صخره‌ای با لبه‌های نامرئی پیوند خورده با افق خلیج.',
        videoUrl: 'https://assets.mixkit.co/videos/42794/42794-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
        duration: 8.5,
      },
      {
        id: 'seq-beach-cabana-lounge',
        title: 'کاباناهای VIP با تخت‌های حریر و بار ساحلی',
        subtitle: 'حریم خصوصی لوکس در ساحل شنی اختصاصی',
        description: 'کابانای چوبی مجهز به سیستم تهویه مطبوع، حمام اختصاصی و پیشخدمت ساحلی.',
        videoUrl: 'https://assets.mixkit.co/videos/42790/42790-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        duration: 9.0,
      },
    ],
    transitions: [
      {
        id: 'trans-pool-to-cabana',
        fromSequenceId: 'seq-beach-pool',
        toSequenceId: 'seq-beach-cabana-lounge',
        label: 'گذر از گذرگاه چوبی نخلستان به کابانای VIP',
        videoUrl: 'https://assets.mixkit.co/videos/42792/42792-720.mp4',
        duration: 4.8,
        direction: 'forward',
      },
      {
        id: 'trans-cabana-to-pool',
        fromSequenceId: 'seq-beach-cabana-lounge',
        toSequenceId: 'seq-beach-pool',
        label: 'بازگشت به لبه استخر اینفینیتی',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.5,
        direction: 'backward',
      },
    ],
  },
  {
    id: 'exp-cafe-lounge',
    title: 'کافه روف‌تاپ و لانژ شیشه‌ای غروب',
    tagline: 'دید ۳۶۰ درجه به افق دریا با منوی قهوه‌های تخصصی و عصرانه فرانسوی',
    category: 'cafe',
    floorCode: '۴',
    coverImageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    price: 950000,
    priceUnit: 'هر نفر',
    amenities: ['منوی باریستای بین‌المللی', 'تراس شیشه‌ای معلق', 'پیانو و موسیقی زنده جز'],
    description: 'کافه روف‌تاپ با دکوراسیون اسکاندیناوی و سقف تمام‌شیشه‌ای رو به دریای بی‌کران.',
    sequences: [
      {
        id: 'seq-cafe-bar',
        title: 'سالن اصلی کافه و بار قهوه تخصصی',
        subtitle: 'رایحه قهوه‌های اصیل کلمبیا و شیرینی‌های تازه',
        description: 'بار مرمرین با طراحی مدرن و چشم‌انداز افق ساحلی.',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
        duration: 8.0,
      },
      {
        id: 'seq-cafe-terrace',
        title: 'عرشه روباز روف‌تاپ و تماشای غروب',
        subtitle: 'مبلمان راحتی مخملین زیر سقف آسمان',
        description: 'تراس روباز مرتفع‌ترین نقطه قصر مشرف به خورشید در حال غروب.',
        videoUrl: 'https://assets.mixkit.co/videos/42790/42790-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        duration: 9.0,
      },
    ],
    transitions: [
      {
        id: 'trans-bar-to-terrace',
        fromSequenceId: 'seq-cafe-bar',
        toSequenceId: 'seq-cafe-terrace',
        label: 'ورود به تراس روباز روف‌تاپ',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.2,
        direction: 'forward',
      },
      {
        id: 'trans-terrace-to-bar',
        fromSequenceId: 'seq-cafe-terrace',
        toSequenceId: 'seq-cafe-bar',
        label: 'بازگشت به بار کافه',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        duration: 4.0,
        direction: 'backward',
      },
    ],
  },
  {
    id: 'exp-game-room',
    title: 'کلاب تفریحی و گیم‌روم اختصاصی VIP',
    tagline: 'سالن بیلیارد سلطنتی، شبیه‌سازهای حرفه‌ای و استودیوی کنسول‌های مدرن',
    category: 'gameroom',
    floorCode: '۲',
    coverImageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    price: 1800000,
    priceUnit: 'هر سانس',
    amenities: ['میز بیلیارد اسنوکر استاندارد جهانی', 'شبیه‌ساز مسابقات فرمول یک', 'کنسول‌های نسل نهم با مانیتورهای اولد'],
    description: 'فضایی هیجان‌انگیز و کاملاً آکوستیک با نورپردازی نئون و پذیرایی اختصاصی نوشیدنی.',
    sequences: [
      {
        id: 'seq-gameroom-billiard',
        title: 'سالن اصلی بیلیارد و لژ استراحت',
        subtitle: 'میزهای چوب گردوی ماهوگانی و لوسترهای برنجی',
        description: 'میز اسنوکر سفارشی و مبلمان چرم چسترفیلد برای مسابقات دوستانه.',
        videoUrl: 'https://assets.mixkit.co/videos/42792/42792-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        duration: 8.5,
      },
      {
        id: 'seq-gameroom-arcade',
        title: 'بخش شبیه‌سازها و کنسول‌های اختصاصی',
        subtitle: 'شبیه‌ساز مسابقه‌ای با سیستم لرزش و هدست‌های واقعیت مجازی',
        description: 'اتاق گیمینگ مدرن با بالاترین استانداردهای صوتی و تصویری.',
        videoUrl: 'https://assets.mixkit.co/videos/42794/42794-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        duration: 9.0,
      },
    ],
    transitions: [
      {
        id: 'trans-billiard-to-arcade',
        fromSequenceId: 'seq-gameroom-billiard',
        toSequenceId: 'seq-gameroom-arcade',
        label: 'ورود به بخش گیمینگ و واقعیت مجازی',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.0,
        direction: 'forward',
      },
      {
        id: 'trans-arcade-to-billiard',
        fromSequenceId: 'seq-gameroom-arcade',
        toSequenceId: 'seq-gameroom-billiard',
        label: 'بازگشت به سالن بیلیارد',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        duration: 4.0,
        direction: 'backward',
      },
    ],
  },
  {
    id: 'exp-deluxe-room',
    title: 'اتاق رویال دلوکس کینگ با چشم‌انداز اقیانوس',
    tagline: 'اقامتگاه اشرافی ۷۵ متری با بالکن شیشه‌ای رو به طلوع آفتاب',
    category: 'room',
    floorCode: '۳',
    coverImageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    price: 18500000,
    priceUnit: 'هر شب',
    amenities: ['تخت کینگ‌سایز با تشک طبی کتان', 'بالکن اختصاصی دید دریا', 'حمام تمام‌مرمرین با وان مستقل'],
    description: 'اتاق دلوکس طراحی‌شده با رنگ‌های گرم مدیترانه‌ای و سیستم خانه هوشمند.',
    sequences: [
      {
        id: 'seq-room-master',
        title: 'فضای اصلی اتاق خواب و نشیمن اختصاصی',
        subtitle: 'نور طبیعی اقیانوس با پرده‌های هوشمند حریر',
        description: 'فضای استراحت لوکس با میز کار ماهوگانی و سرویس چای ژاپنی.',
        videoUrl: 'https://assets.mixkit.co/videos/42791/42791-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
        duration: 8.5,
      },
      {
        id: 'seq-room-balcony',
        title: 'تراس خصوصی با چشم‌انداز مستقیم ساحل',
        subtitle: 'صندلی‌های راحتی حصیری برای تماشای امواج',
        description: 'بالکن دنج رو به آب‌های لاجوردی خلیج برای صرف صبحانه.',
        videoUrl: 'https://assets.mixkit.co/videos/42790/42790-720.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        duration: 8.0,
      },
    ],
    transitions: [
      {
        id: 'trans-room-to-balcony',
        fromSequenceId: 'seq-room-master',
        toSequenceId: 'seq-room-balcony',
        label: 'گشودن درب شیشه‌ای به تراس اقیانوس',
        videoUrl: 'https://assets.mixkit.co/videos/42788/42788-720.mp4',
        duration: 4.2,
        direction: 'forward',
      },
      {
        id: 'trans-balcony-to-room',
        fromSequenceId: 'seq-room-balcony',
        toSequenceId: 'seq-room-master',
        label: 'بازگشت به اتاق مستر',
        videoUrl: 'https://assets.mixkit.co/videos/42789/42789-720.mp4',
        duration: 4.0,
        direction: 'backward',
      },
    ],
  },
];

const INITIAL_FLOORS: FloorEnvironment[] = [
  {
    id: 'fl-4',
    code: '۴',
    name: 'طبقه ۴ - پنت‌هاوس سلطنتی و کافه روف‌تاپ',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-suite',
        nodeId: 'suite',
        title: 'سوئیت سلطنتی پنت‌هاوس',
        level: 'طبقه ۴',
        wing: 'برج آسمانه سلطنتی',
        x: 42,
        y: 45,
        description: 'اقامتگاه اختصاصی ۴۲۰ متری با دید ۳۶۰ درجه به اقیانوس',
        experiencePackageId: 'exp-suite-penthouse',
      },
      {
        id: 'hs-cafe',
        nodeId: 'cafe',
        title: 'کافه روف‌تاپ و لانژ غروب',
        level: 'طبقه ۴',
        wing: 'عرشه شیشه‌ای شرقی',
        x: 68,
        y: 50,
        description: 'قهوه‌های تخصصی با چشم‌انداز افق دریا',
        experiencePackageId: 'exp-cafe-lounge',
      },
    ],
  },
  {
    id: 'fl-3',
    code: '۳',
    name: 'طبقه ۳ - اتاق‌های رویال دلوکس',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-room-deluxe',
        nodeId: 'room',
        title: 'اتاق رویال دلوکس کینگ',
        level: 'طبقه ۳',
        wing: 'بال شرقی ساحلی',
        x: 50,
        y: 48,
        description: 'اقامتگاه اشرافی ۷۵ متری با بالکن شیشه‌ای رو به دریا',
        experiencePackageId: 'exp-deluxe-room',
      },
    ],
  },
  {
    id: 'fl-2',
    code: '۲',
    name: 'طبقه ۲ - رستوران میشلن و گیم‌روم VIP',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-dining',
        nodeId: 'dining',
        title: 'رستوران میشلن آمبروزیا',
        level: 'طبقه ۲',
        wing: 'عرشه روباز اقیانوس',
        x: 38,
        y: 45,
        description: 'شام رمانتیک با منوی ستاره‌دار سرآشپز',
        experiencePackageId: 'exp-michelin-dining',
      },
      {
        id: 'hs-gameroom',
        nodeId: 'gameroom',
        title: 'گیم‌روم و کلاب تفریحی VIP',
        level: 'طبقه ۲',
        wing: 'سالن سرگرمی غربی',
        x: 68,
        y: 55,
        description: 'سالن بیلیارد، شبیه‌ساز مسابقه و کنسول‌های نسل جدید',
        experiencePackageId: 'exp-game-room',
      },
    ],
  },
  {
    id: 'fl-1',
    code: '۱',
    name: 'طبقه ۱ - لابی مرمرین و رویال اسپا',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    hotspots: [
      {
        id: 'hs-lobby',
        nodeId: 'lobby',
        title: 'تالار تشریفات و لابی مرمرین',
        level: 'طبقه ۱',
        wing: 'آتریوم مرکزی',
        x: 42,
        y: 55,
        description: 'آتریوم باشکوه با نوای پیانوی زنده',
        experiencePackageId: 'pkg-grand-atrium',
      },
      {
        id: 'hs-spa',
        nodeId: 'pool',
        title: 'رویال اسپا و حمام ترکی',
        level: 'طبقه ۱',
        wing: 'دالان تندرستی صخره‌ای',
        x: 72,
        y: 45,
        description: 'تالاسوتراپی، ماساژ طلا و حوضچه‌های آبگرم',
        experiencePackageId: 'exp-thalasso-spa',
      },
    ],
  },
  {
    id: 'fl-0',
    code: 'G',
    name: 'همکف - استخر اینفینیتی و کاباناهای ساحلی',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-resort-with-palm-trees-and-swimming-pool-42562-large.mp4',
    hotspots: [
      {
        id: 'hs-pool',
        nodeId: 'pool',
        title: 'استخر اینفینیتی صخره‌ای',
        level: 'همکف',
        wing: 'کرانه ساحل صخره‌ای',
        x: 35,
        y: 48,
        description: 'استخر آبگرم متصل به افق دریا',
        experiencePackageId: 'exp-beach-cabanas',
      },
      {
        id: 'hs-cabanas',
        nodeId: 'pool',
        title: 'کاباناهای اختصاصی VIP ساحل',
        level: 'همکف',
        wing: 'نخلستان ساحلی غربی',
        x: 65,
        y: 52,
        description: 'آلاچیق‌های لوکس با تخت‌های حریر و پیشخدمت ساحلی',
        experiencePackageId: 'exp-beach-cabanas',
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
  packages: INITIAL_PACKAGES,
  rooms: INITIAL_ROOMS,
  bookings: INITIAL_BOOKINGS,
  preSelectedRoomId: null,
  floors: INITIAL_FLOORS,
  activeFloorId: 'fl-1',
  hotelMap: INITIAL_HOTEL_MAP,
  dedicatedExperiences: INITIAL_DEDICATED_EXPERIENCES,
  activeExperienceId: null,

  setSiteTheme: (theme) => set({ siteTheme: theme }),
  setPanelTheme: (theme) => set({ panelTheme: theme }),
  setRadius: (radius) => set({ radius }),
  setActiveSiteId: (siteId) => set({ activeSiteId: siteId }),
  setPreSelectedRoomId: (roomId) => set({ preSelectedRoomId: roomId }),
  setActiveExperienceId: (id) => set({ activeExperienceId: id }),

  addDedicatedExperience: (exp) =>
    set((state) => ({
      dedicatedExperiences: [...state.dedicatedExperiences, exp],
    })),

  updateDedicatedExperience: (id, partial) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.map((exp) =>
        exp.id === id ? { ...exp, ...partial } : exp
      ),
    })),

  removeDedicatedExperience: (id) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.filter((exp) => exp.id !== id),
    })),

  addSequenceToExperience: (expId, seq) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.map((exp) =>
        exp.id === expId ? { ...exp, sequences: [...exp.sequences, seq] } : exp
      ),
    })),

  updateExperienceSequence: (expId, seqId, partial) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              sequences: exp.sequences.map((s) =>
                s.id === seqId ? { ...s, ...partial } : s
              ),
            }
          : exp
      ),
    })),

  removeExperienceSequence: (expId, seqId) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              sequences: exp.sequences.filter((s) => s.id !== seqId),
              transitions: exp.transitions.filter(
                (t) => t.fromSequenceId !== seqId && t.toSequenceId !== seqId
              ),
            }
          : exp
      ),
    })),

  addTransitionToExperience: (expId, trans) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.map((exp) =>
        exp.id === expId ? { ...exp, transitions: [...exp.transitions, trans] } : exp
      ),
    })),

  removeExperienceTransition: (expId, transId) =>
    set((state) => ({
      dedicatedExperiences: state.dedicatedExperiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              transitions: exp.transitions.filter((t) => t.id !== transId),
            }
          : exp
      ),
    })),

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

  updatePackage: (id, partial) =>
    set((state) => ({
      packages: state.packages.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    })),

  addPackage: (pkg) =>
    set((state) => ({
      packages: [pkg, ...state.packages],
    })),

  removePackage: (id) =>
    set((state) => ({
      packages: state.packages.filter((p) => p.id !== id),
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
