/**
 * LuxuryBookingPage.tsx
 * 
 * کامپوننت ویزارد چند مرحله‌ای رزرواسیون لوکس اقامتگاه پنج ستاره قصر لورا
 * 
 * ویژگی‌های کلیدی منطبق بر نیازمندی‌ها:
 * ۱. حذف هدر سنتی و جایگزینی با دکمه‌های شناور فاخر بازگشت (Back) و انصراف (Skip/Close)
 * ۲. پشتیبانی از سوایپ افقی هوشمند (Swipe Left = مرحله بعد، Swipe Right = مرحله قبل با رعایت کامل RTL)
 * ۳. سیستم ذخیره‌سازی داخلی پایدار (Internal State Persistence via LocalStorage)
 * ۴. تقویم جلالی مدرن و سفارشی‌سازی شده با ارقام ۱۰۰٪ فارسی
 * ۵. تجربه Mobile-First ارگونومیک با نوار اقدام فیکس در Thumb Zone
 * ۶. ترنزیشن‌های سیال جهت‌دار با Motion
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Bed, 
  Users, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  QrCode, 
  Download, 
  Copy, 
  User, 
  Phone, 
  Mail, 
  FileText,
  ArrowLeft,
  FastForward,
  SkipForward
} from 'lucide-react';
import { useThemeAndSiteStore, HotelRoom } from '../../store/useThemeAndSiteStore';
import { 
  toPersianDigits, 
  formatPersianPrice, 
  calculateJalaliNights,
  autoPersianText
} from '../../utils/JalaliDate';
import { ModernJalaliCalendar } from './ModernJalaliCalendar';
import { CustomInput } from '../ui/CustomInput';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomButton } from '../ui/CustomButton';

interface LuxuryBookingPageProps {
  onBackToExperience: () => void;
}

interface VIPService {
  id: string;
  title: string;
  description: string;
  price: number;
}

const VIP_SERVICES: VIPService[] = [
  {
    id: 'heli-transfer',
    title: 'ترانسفر بالگرد تشریفاتی از فرودگاه',
    description: 'فرود مستقیم در هلی‌پد اختصاصی هتل با پذیرایی خاویار بلوگا',
    price: 18000000,
  },
  {
    id: 'private-chef',
    title: 'سرآشپز اختصاصی ستاره‌دار میشلن',
    description: 'طراحی منوی شام اختصاصی در تراس سوئیت با مواد اولیه ارگانیک دریایی',
    price: 12500000,
  },
  {
    id: 'thalasso-spa',
    title: 'پکیج کامل اسپا، تالاسوتراپی و حمام ترکی',
    description: 'ماساژ دونفره با روغن‌های دست‌ساز و ماسک طلای ۲۴ عیار',
    price: 8500000,
  },
  {
    id: 'yacht-cruise',
    title: 'گشت عصرگاهی با یات تفریحی اختصاصی قصر',
    description: 'سفر دریایی ۳ ساعته در هنگام غروب همراه با اجرای موسیقی زنده',
    price: 22000000,
  },
];

const LOCAL_STORAGE_KEY = 'luxury_palace_booking_wizard_draft_v2';

export const LuxuryBookingPage: React.FC<LuxuryBookingPageProps> = ({ onBackToExperience }) => {
  const { 
    rooms, 
    activeSiteId, 
    sites, 
    addBooking, 
    preSelectedRoomId,
  } = useThemeAndSiteStore();

  const currentSite = sites[activeSiteId];

  // بازیابی وضعیت ذخیره‌شده از LocalStorage برای پایداری کامل (Persistence)
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  };

  const initialDraft = loadSavedState();

  // جهت انیمیشن اسلاید (۱: به جلو، -۱: به عقب)
  const [slideDirection, setSlideDirection] = useState<number>(1);

  // مراحل رزرو: ۱: اقامتگاه | ۲: تقویم جلالی | ۳: خدمات و مشخصات | ۴: پیش‌فاکتور و پرداخت | ۵: واچر رسمی
  const [currentStep, setCurrentStep] = useState<number>(initialDraft?.currentStep || 1);

  // سوئیت انتخابی
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom>(() => {
    if (initialDraft?.selectedRoomId) {
      const found = rooms.find((r) => r.id === initialDraft.selectedRoomId);
      if (found) return found;
    }
    if (preSelectedRoomId) {
      const found = rooms.find((r) => r.id === preSelectedRoomId);
      if (found) return found;
    }
    return rooms[0];
  });

  // تاریخ و زمان به تقویم جلالی
  const [startDate, setStartDate] = useState(initialDraft?.startDate || '1405/07/04');
  const [endDate, setEndDate] = useState(initialDraft?.endDate || '1405/07/07');
  const [startTime, setStartTime] = useState(initialDraft?.startTime || currentSite?.checkInHour || '۱۴:۰۰');
  const [endTime, setEndTime] = useState(initialDraft?.endTime || currentSite?.checkOutHour || '۱۲:۰۰');
  const [guestCount, setGuestCount] = useState(initialDraft?.guestCount || '2');
  const [stayPurpose, setStayPurpose] = useState(initialDraft?.stayPurpose || 'تعطیلات و آرامش تشریفاتی');

  // خدمات تشریفاتی و مشخصات میهمان
  const [selectedVipServices, setSelectedVipServices] = useState<string[]>(initialDraft?.selectedVipServices || []);
  const [guestName, setGuestName] = useState(initialDraft?.guestName || '');
  const [guestPhone, setGuestPhone] = useState(initialDraft?.guestPhone || '');
  const [guestEmail, setGuestEmail] = useState(initialDraft?.guestEmail || '');
  const [specialRequests, setSpecialRequests] = useState(initialDraft?.specialRequests || '');

  // پرداخت آزمایشی
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('۰۷');
  const [cardExpYear, setCardExpYear] = useState('۰۸');
  const [cardOtp, setCardOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // واچر رسمی
  const [generatedTrackingCode, setGeneratedTrackingCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // ذخیره در LocalStorage در هر تغییر وضعیت
  useEffect(() => {
    if (currentStep < 5) {
      const draft = {
        currentStep,
        selectedRoomId: selectedRoom?.id,
        startDate,
        endDate,
        startTime,
        endTime,
        guestCount,
        stayPurpose,
        selectedVipServices,
        guestName,
        guestPhone,
        guestEmail,
        specialRequests,
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // ignore
      }
    }
  }, [
    currentStep,
    selectedRoom,
    startDate,
    endDate,
    startTime,
    endTime,
    guestCount,
    stayPurpose,
    selectedVipServices,
    guestName,
    guestPhone,
    guestEmail,
    specialRequests,
  ]);

  // اسکرول به بالای صفحه در هنگام تغییر مرحله
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // جابجایی بین مراحل با انیمیشن جهت‌دار
  const goToNextStep = useCallback(() => {
    if (currentStep < 4) {
      setSlideDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setSlideDirection(-1);
      setCurrentStep((prev) => prev - 1);
    } else {
      onBackToExperience();
    }
  }, [currentStep, onBackToExperience]);

  // عملیات اسکیپ (رد کردن مرحله جاری و رفتن به گام بعد بدون معطلی)
  const handleSkip = useCallback(() => {
    if (currentStep < 4) {
      setSlideDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      onBackToExperience();
    }
  }, [currentStep, onBackToExperience]);

  // =========================================================================
  // پیاده‌سازی فوق‌العاده حساس و پایدار سوایپ افقی (Swipe Left / Swipe Right)
  // پشتیبانی از تاچ لمسی موبایل (با مهار touchcancel)، درگ ماوس/ترک‌پد دسکتاپ و کلیدهای جهت‌نما
  // در زبان فارسی و چیدمان RTL:
  // - سوایپ به چپ (Swipe Left - کشیدن انگشت/ماوس به سمت چپ): انتقال به مرحله بعد
  // - سوایپ به راست (Swipe Right - کشیدن انگشت/ماوس به سمت راست): بازگشت به مرحله قبل
  // =========================================================================
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);
  const touchCurrentYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  const isPointerDownRef = useRef<boolean>(false);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);

  const isInteractiveElement = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, select, option'));
  };

  const executeSwipe = useCallback(
    (deltaX: number) => {
      if (currentStep < 5) {
        if (deltaX < 0) {
          // کشیدن به چپ => مرحله بعد
          goToNextStep();
        } else if (deltaX > 0) {
          // کشیدن به راست => مرحله قبل
          goToPrevStep();
        }
      }
    },
    [currentStep, goToNextStep, goToPrevStep]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isInteractiveElement(e.target)) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchCurrentXRef.current = e.touches[0].clientX;
    touchCurrentYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentXRef.current = e.touches[0].clientX;
    touchCurrentYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = touchCurrentXRef.current ?? (e.changedTouches[0] ? e.changedTouches[0].clientX : touchStartXRef.current);
    const endY = touchCurrentYRef.current ?? (e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartYRef.current);

    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;
    const deltaTime = Date.now() - touchStartTimeRef.current;

    // تشخیص سوایپ افقی با آستانه حساس و سریع (حداقل ۳۵ پیکسل یا حرکت سریع زیر ۴۵۰ میلی‌ثانیه)
    const isHorizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * 0.6;
    const hasEnoughDistance = Math.abs(deltaX) >= 35 || (Math.abs(deltaX) >= 25 && deltaTime < 350);

    if (isHorizontalDominant && hasEnoughDistance) {
      executeSwipe(deltaX);
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchCurrentXRef.current = null;
    touchCurrentYRef.current = null;
  };

  const handleTouchCancel = () => {
    if (touchStartXRef.current !== null && touchCurrentXRef.current !== null) {
      const deltaX = touchCurrentXRef.current - touchStartXRef.current;
      const deltaY = (touchCurrentYRef.current ?? touchStartYRef.current ?? 0) - (touchStartYRef.current ?? 0);
      if (Math.abs(deltaX) >= 25 && Math.abs(deltaX) > Math.abs(deltaY) * 0.5) {
        executeSwipe(deltaX);
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchCurrentXRef.current = null;
    touchCurrentYRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isInteractiveElement(e.target)) return;
    isPointerDownRef.current = true;
    pointerStartXRef.current = e.clientX;
    pointerStartYRef.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || pointerStartXRef.current === null) {
      isPointerDownRef.current = false;
      return;
    }
    const deltaX = e.clientX - pointerStartXRef.current;
    const deltaY = pointerStartYRef.current !== null ? e.clientY - pointerStartYRef.current : 0;

    if (Math.abs(deltaX) >= 25 && Math.abs(deltaX) > Math.abs(deltaY) * 0.5) {
      executeSwipe(deltaX);
    }

    isPointerDownRef.current = false;
    pointerStartXRef.current = null;
    pointerStartYRef.current = null;
  };

  // پشتیبانی سراسری از ماوس/ترک‌پد و کلیدهای کیبورد (چپ = بعد، راست = قبل در RTL)
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (!isPointerDownRef.current || pointerStartXRef.current === null) {
        isPointerDownRef.current = false;
        pointerStartXRef.current = null;
        pointerStartYRef.current = null;
        return;
      }
      const deltaX = e.clientX - pointerStartXRef.current;
      const deltaY = pointerStartYRef.current !== null ? e.clientY - pointerStartYRef.current : 0;

      if (Math.abs(deltaX) >= 25 && Math.abs(deltaX) > Math.abs(deltaY) * 0.5) {
        executeSwipe(deltaX);
      }

      isPointerDownRef.current = false;
      pointerStartXRef.current = null;
      pointerStartYRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInteractiveElement(document.activeElement)) return;
      if (e.key === 'ArrowLeft') {
        goToNextStep();
      } else if (e.key === 'ArrowRight') {
        goToPrevStep();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [executeSwipe, goToNextStep, goToPrevStep]);

  // محاسبه شب‌های اقامت با تقویم جلالی
  const totalNights = calculateJalaliNights(startDate, endDate);

  // محاسبات مالی دقیق
  const roomCostTotal = (selectedRoom?.pricePerNight || 0) * totalNights;
  const vipServicesTotal = selectedVipServices.reduce((sum, sId) => {
    const s = VIP_SERVICES.find((v) => v.id === sId);
    return sum + (s?.price || 0);
  }, 0);
  const taxesAndService = Math.round((roomCostTotal + vipServicesTotal) * 0.09);
  const grandTotal = roomCostTotal + vipServicesTotal + taxesAndService;

  const toggleVipService = (serviceId: string) => {
    setSelectedVipServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  // تکمیل خودکار کارت تست VIP
  const handleAutoFillTestCard = () => {
    setCardNumber('۶۰۳۷ - ۹۹۷۵ - ۸۸۲۲ - ۴۴۱۱');
    setCardCvv('۷۸۲');
    setCardExpMonth('۰۸');
    setCardExpYear('۰۸');
    setCardOtp('۵۲۹۱۴');
    setOtpSent(true);
  };

  const handleRequestOtp = () => {
    setOtpSent(true);
    setCardOtp('۵۲۹۱۴');
  };

  // ثبت نهایی پرداخت فیک و صدور واچر
  const handleExecutePayment = () => {
    setIsProcessingPayment(true);

    setTimeout(() => {
      const newBooking = addBooking({
        siteId: activeSiteId,
        roomId: selectedRoom.id,
        roomTitle: selectedRoom.title,
        guestName: guestName || 'میهمان عالی‌رتبه قصر',
        guestEmail: guestEmail || 'guest@laura-palace.com',
        guestPhone: guestPhone || '۰۹۱۲۰۰۰۰۰۰۰',
        checkInDate: startDate,
        checkOutDate: endDate,
        checkInTime: startTime,
        checkOutTime: endTime,
        guestCount: parseInt(guestCount, 10) || 2,
        vipServices: selectedVipServices.map(
          (id) => VIP_SERVICES.find((v) => v.id === id)?.title || id
        ),
        totalPrice: grandTotal,
        paymentStatus: 'paid_fake',
      });

      // پاک کردن پیش‌نویس موقت
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // ignore
      }

      setGeneratedTrackingCode(newBooking.trackingCode);
      setIsProcessingPayment(false);
      setSlideDirection(1);
      setCurrentStep(5);
    }, 1500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedTrackingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const stepsList = [
    { num: 1, title: 'انتخاب سوئیت', desc: 'بررسی ظرفیت لحظه‌ای' },
    { num: 2, title: 'زمان و مسافران', desc: 'تقویم جلالی و ساعات' },
    { num: 3, title: 'خدمات و مشخصات', desc: 'کانسیرژ و مشخصات' },
    { num: 4, title: 'پیش‌فاکتور و پرداخت', desc: 'تسویه شبیه‌ساز' },
    { num: 5, title: 'واچر رسمی', desc: 'کلید دیجیتال و صدور' },
  ];

  // انیمیشن ترنزیشن مراحل
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
    }),
  };

  return (
    <div
      dir="rtl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="min-h-screen w-full bg-[#070707] text-neutral-100 font-sans flex flex-col relative selection:bg-amber-400 selection:text-neutral-950 pb-24 lg:pb-12 touch-pan-y"
    >
      {/* =========================================================================
          نوار اکشن بالا: فقط دکمه‌های بک و اسکیپ بدون متن و بدون ضربدر
          ========================================================================= */}
      {currentStep < 5 && (
        <div className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/60 flex items-center justify-between">
          {/* دکمه شناور بازگشت (Back) - فقط آیکون لوکس بدون متن */}
          <button
            type="button"
            onClick={goToPrevStep}
            className="group w-10 h-10 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title={currentStep === 1 ? 'بازگشت به تور' : 'مرحله قبل'}
            aria-label="بازگشت"
          >
            <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* دکمه شناور اسکیپ (Skip) - بدون ضربدر و بدون متن */}
          <button
            type="button"
            onClick={handleSkip}
            className="group w-10 h-10 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
            title="اسکیپ به مرحله بعد"
            aria-label="اسکیپ"
          >
            <FastForward className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      )}

      {/* خط راهنمای بصری استپ‌ها در زیر کنترل‌های بالا (فقط پروگرس‌بار بدون هیچ متنی) */}
      {currentStep < 5 && (
        <div className="w-full bg-neutral-950 px-4 sm:px-8 py-2.5 border-b border-neutral-900">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2.5">
            {stepsList.slice(0, 4).map((s) => {
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (isDone) {
                      setSlideDirection(-1);
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex-1 transition-all ${
                    isDone ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : isDone
                        ? 'bg-emerald-500/80'
                        : 'bg-neutral-800'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          محتوای اصلی رزرواسیون: طراحی دو ستونه با قابلیت سوایپ
          ========================================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col lg:flex-row items-start gap-8">
        {/* ستون اصلی: مراحل ویزارد با انیمیشن ورود و خروج */}
        <div className="flex-1 w-full overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={currentStep}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onPanEnd={(_e, info) => {
                const deltaX = info.offset.x;
                const deltaY = info.offset.y;
                if (Math.abs(deltaX) >= 25 && Math.abs(deltaX) > Math.abs(deltaY) * 0.5) {
                  executeSwipe(deltaX);
                }
              }}
              className="space-y-6 touch-pan-y select-none"
            >
              {/* =====================================================================
                  مرحله ۱: انتخاب اقامتگاه و سوئیت مجلل (Room Selection First)
                  ===================================================================== */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 flex items-center gap-2">
                      <Bed className="w-6 h-6 text-amber-400" />
                      <span>انتخاب اقامتگاه مجلل در {currentSite?.name || 'قصر لورا'}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      سوئیت مورد نظر خود را برگزینید. تمامی فضاها دارای دید پانوراما، مبلمان دست‌ساز و دسترسی مستقیم به امکانات کانسیرژ هستند.
                    </p>
                  </div>

                  {/* کارت‌های بزرگ اقامتگاه‌ها */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {rooms.map((room) => {
                      const isSelected = selectedRoom?.id === room.id;
                      const slotStatus = room.slots[startDate] || 'available';
                      const isBooked = slotStatus === 'booked';

                      return (
                        <div
                          key={room.id}
                          onClick={() => !isBooked && setSelectedRoom(room)}
                          className={`rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                            isSelected
                              ? 'bg-neutral-900 border-amber-400 ring-2 ring-amber-400/40 shadow-2xl shadow-amber-400/10 scale-[1.01]'
                              : isBooked
                              ? 'bg-neutral-950 border-neutral-800 opacity-40 cursor-not-allowed'
                              : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 cursor-pointer hover:shadow-xl'
                          }`}
                        >
                          <div>
                            {/* تصویر سوئیت */}
                            <div className="relative h-48 sm:h-52 w-full overflow-hidden">
                              <img
                                src={room.imageUrl}
                                alt={room.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                              {/* وضعیت لحظه‌ای ظرفیت */}
                              <div className="absolute top-3 right-3">
                                {slotStatus === 'available' ? (
                                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md shadow-md">
                                    خالی و آماده تحویل
                                  </span>
                                ) : slotStatus === 'limited' ? (
                                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/90 text-neutral-950 backdrop-blur-md shadow-md">
                                    تنها ۱ اقامتگاه باقیمانده
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-600 text-white backdrop-blur-md shadow-md">
                                    تکمیل ظرفیت
                                  </span>
                                )}
                              </div>

                              <div className="absolute bottom-3 right-3 left-3 text-right">
                                <span className="text-xs text-amber-300 font-semibold block drop-shadow-sm">
                                  {room.viewType}
                                </span>
                                <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-md">
                                  {autoPersianText(room.title)}
                                </h3>
                              </div>
                            </div>

                            {/* مشخصات سوئیت: متراژ و ظرفیت با ارقام فارسی */}
                            <div className="p-4 sm:p-5 space-y-3">
                              <div className="flex items-center justify-between text-xs text-neutral-300 border-b border-neutral-800 pb-2.5">
                                <span className="flex items-center gap-1.5">
                                  <span>متراژ:</span>
                                  <strong className="text-white font-bold">
                                    {toPersianDigits(room.sizeM2)} متر مربع
                                  </strong>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>ظرفیت: تا {toPersianDigits(room.capacity)} میهمان</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {room.amenities.map((amenity, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[11px] px-2.5 py-1 rounded-xl bg-neutral-800/80 text-neutral-300 border border-neutral-700/60"
                                  >
                                    {autoPersianText(amenity)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* قیمت هر شب و انتخاب */}
                          <div className="p-4 sm:p-5 pt-0 flex items-center justify-between border-t border-neutral-800/80 mt-2">
                            <div>
                              <div className="text-[11px] text-neutral-400">نرخ هر شب اقامت:</div>
                              <div className="text-sm sm:text-base font-bold text-amber-300">
                                {formatPersianPrice(room.pricePerNight)}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isBooked}
                              onClick={() => !isBooked && setSelectedRoom(room)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400 text-neutral-950 font-black shadow-lg shadow-amber-400/20'
                                  : isBooked
                                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
                              }`}
                            >
                              {isSelected ? 'انتخاب شده ✓' : isBooked ? 'تکمیل ظرفیت' : 'انتخاب این سوئیت'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  مرحله ۲: تقویم شمسی جلالی مدرن، ساعات ورود و خروج، تعداد مسافران
                  ===================================================================== */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 flex items-center gap-2">
                      <CalendarIcon className="w-6 h-6 text-amber-400" />
                      <span>تقویم جلالی و زمان‌بندی اقامت</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      بازه ورود و خروج خود را روی تقویم شمسی برگزینید. تعداد شب‌ها و قیمت به طور زنده محاسبه می‌شوند.
                    </p>
                  </div>

                  {/* کامپوننت مدرن تقویم جلالی */}
                  <ModernJalaliCalendar
                    startDate={startDate}
                    endDate={endDate}
                    startTime={startTime}
                    endTime={endTime}
                    onDateChange={(s, e) => {
                      setStartDate(s);
                      setEndDate(e);
                    }}
                    onTimeChange={(s, e) => {
                      setStartTime(s);
                      setEndTime(e);
                    }}
                  />

                  {/* تعداد مسافران و مناسبت اقامت */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <CustomSelect
                      label="تعداد میهمانان گرامی:"
                      value={guestCount}
                      onChange={setGuestCount}
                      options={[
                        { value: '1', label: `۱ میهمان (اقامت اختصاصی انفرادی)` },
                        { value: '2', label: `۲ میهمان (اقامت دو نفره لوکس)` },
                        { value: '3', label: `۳ میهمان` },
                        { value: '4', label: `۴ میهمان (سوئیت‌های خانوادگی)` },
                        { value: '6', label: `هیئت همراه و دیپلماتیک (تا ۶ نفر)` },
                      ]}
                    />

                    <CustomSelect
                      label="هدف یا مناسبت اقامت تشریفاتی:"
                      value={stayPurpose}
                      onChange={setStayPurpose}
                      options={[
                        { value: 'تعطیلات و آرامش تشریفاتی', label: 'تعطیلات و آرامش تشریفاتی' },
                        { value: 'ماه عسل و سالگرد ازدواج', label: 'ماه عسل و سالگرد ازدواج' },
                        { value: 'سفر کاری و مذاکرات تجاری VIP', label: 'سفر کاری و مذاکرات تجاری VIP' },
                        { value: 'مراسم خصوصی و جشن خانوادگی', label: 'مراسم خصوصی و جشن خانوادگی' },
                      ]}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={goToPrevStep}
                      className="px-4 py-2.5 rounded-xl text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>مرحله قبل</span>
                    </button>

                    <CustomButton
                      size="lg"
                      variant="primary"
                      rightIcon={<ChevronLeft className="w-5 h-5" />}
                      onClick={goToNextStep}
                    >
                      ادامه و خدمات کانسیرژ
                    </CustomButton>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  مرحله ۳: خدمات VIP کانسیرژ و مشخصات میهمان
                  ===================================================================== */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-amber-400" />
                      <span>خدمات ویژه کانسیرژ و مشخصات سرپرست اقامت</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      می‌توانید خدمات تشریفاتی اختصاصی قصر را برای اقامت خود فعال فرمایید. واچر رسمی الکترونیکی به نام سرپرست صادر خواهد شد.
                    </p>
                  </div>

                  {/* پکیج‌های تشریفاتی */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>خدمات اختیاری تشریفات اختصاصی قصر:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {VIP_SERVICES.map((service) => {
                        const isChecked = selectedVipServices.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => toggleVipService(service.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                              isChecked
                                ? 'bg-amber-400/10 border-amber-400 ring-1 ring-amber-400/30'
                                : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                isChecked
                                  ? 'bg-amber-400 border-amber-400 text-neutral-950 font-black'
                                  : 'border-neutral-600 bg-neutral-950'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-white">{service.title}</span>
                                <span className="text-xs text-amber-300 font-bold">
                                  +{formatPersianPrice(service.price)}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                                {service.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* فرم اطلاعات سرپرست اقامت */}
                  <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-neutral-800 pb-2.5">
                      <User className="w-4 h-4 text-amber-400" />
                      <span>مشخصات سرپرست رزرو و گیرنده واچر رسمی:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CustomInput
                        label="نام و نام خانوادگی میهمان اصلی:"
                        placeholder="مثال: دکتر علیرضا صدری"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        startIcon={<User className="w-4 h-4" />}
                      />

                      <CustomInput
                        label="شماره تلفن همراه (جهت هماهنگی ترانسفر):"
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        startIcon={<Phone className="w-4 h-4" />}
                      />
                    </div>

                    <CustomInput
                      label="پست الکترونیکی (جهت ارسال واچر رسمی):"
                      type="email"
                      placeholder="a.sadri@vip-sanctuary.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      startIcon={<Mail className="w-4 h-4" />}
                    />

                    <CustomInput
                      label="درخواست‌های اختصاصی (رژیم غذایی خاص، ترتیبات گل‌آرایی):"
                      placeholder="هرگونه یادداشت برای سرپیشخدمت ارشد اقامتگاه..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      startIcon={<FileText className="w-4 h-4" />}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={goToPrevStep}
                      className="px-4 py-2.5 rounded-xl text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>مرحله قبل</span>
                    </button>

                    <CustomButton
                      size="lg"
                      variant="primary"
                      rightIcon={<ChevronLeft className="w-5 h-5" />}
                      onClick={goToNextStep}
                    >
                      مشاهده پیش‌فاکتور و تسویه آزمایشی
                    </CustomButton>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  مرحله ۴: پیش‌فاکتور و تسویه شبیه‌سازی‌شده (Verification & Sandbox Payment)
                  ===================================================================== */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 flex items-center gap-2">
                      <CreditCard className="w-6 h-6 text-amber-400" />
                      <span>پیش‌فاکتور نهایی و تسویه شبیه‌ساز امن</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      کلیه جزییات اقامتگاه، مدت زمان و خدمات را بررسی فرمایید. این درگاه یک شبیه‌ساز تست است و نیازی به کارت واقعی نیست.
                    </p>
                  </div>

                  {/* پیش‌فاکتور شفاف */}
                  <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-3.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-300 border-b border-neutral-800 pb-3">
                      <span>{selectedRoom?.title} ({toPersianDigits(totalNights)} شب اقامت)</span>
                      <span className="font-bold text-white">{formatPersianPrice(roomCostTotal)}</span>
                    </div>

                    {selectedVipServices.length > 0 && (
                      <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-300 border-b border-neutral-800 pb-3">
                        <span>خدمات تشریفاتی VIP ({toPersianDigits(selectedVipServices.length)} مورد)</span>
                        <span className="font-bold text-white">{formatPersianPrice(vipServicesTotal)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800 pb-3">
                      <span>مالیات بر ارزش افزوده و حق سرویس تشریفات ({toPersianDigits(9)}٪)</span>
                      <span>{formatPersianPrice(taxesAndService)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm sm:text-base font-bold text-white">مبلغ کل قابل تسویه:</span>
                      <span className="text-lg sm:text-xl font-black text-amber-400">
                        {formatPersianPrice(grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* شبیه‌ساز پرداخت شتاب */}
                  <div className="bg-neutral-900 border border-amber-400/50 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">درگاه شبیه‌ساز پرداخت شتاب (Sandbox)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoFillTestCard}
                        className="text-xs px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 transition-all font-bold cursor-pointer"
                      >
                        تکمیل خودکار کارت تستی VIP
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <CustomInput
                        label="شماره کارت ۱۶ رقمی شتاب (تستی):"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="۶۰۳۷ - ۹۹۷۵ - ۸۸۲۲ - ۴۴۱۱"
                        startIcon={<CreditCard className="w-4 h-4" />}
                      />

                      <div className="grid grid-cols-2 gap-3.5">
                        <CustomInput
                          label="کد امنیتی CVV2:"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="۷۸۲"
                          startIcon={<KeyRound className="w-4 h-4" />}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <CustomInput
                            label="ماه انقضا:"
                            value={cardExpMonth}
                            onChange={(e) => setCardExpMonth(e.target.value)}
                            placeholder="۰۸"
                          />
                          <CustomInput
                            label="سال انقضا:"
                            value={cardExpYear}
                            onChange={(e) => setCardExpYear(e.target.value)}
                            placeholder="۰۸"
                          />
                        </div>
                      </div>

                      {/* رمز پویا */}
                      <div className="flex items-end gap-2.5">
                        <div className="flex-1">
                          <CustomInput
                            label="رمز دوم پویا:"
                            value={cardOtp}
                            onChange={(e) => setCardOtp(e.target.value)}
                            placeholder="۵ رقمی..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          className="h-11 sm:h-12 px-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {otpSent ? 'ارسال شد (۵۲۹۱۴)' : 'دریافت رمز پویای تستی'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>تست شبیه‌ساز: بلافاصله پس از کلیک، واچر رسمی با کلید هوشمند صادر می‌گردد.</span>
                    </div>

                    <CustomButton
                      fullWidth
                      size="lg"
                      variant="primary"
                      isLoading={isProcessingPayment}
                      onClick={handleExecutePayment}
                    >
                      تأیید نهایی و صدور واچر رسمی اقامتگاه
                    </CustomButton>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={goToPrevStep}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>بازگشت به خدمات</span>
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  مرحله ۵: واچر رسمی الکترونیکی با کیوآرکد و کلید دیجیتال
                  ===================================================================== */}
              {currentStep === 5 && (
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      اقامت تشریفاتی شما با موفقیت رزرو گردید
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-lg mx-auto leading-relaxed">
                      واچر رسمی اقامتگاه پنج ستاره قصر لورا صادر شد و کلید هوشمند دیجیتال فعال گردید.
                    </p>
                  </div>

                  {/* برگه واچر رسمی */}
                  <div className="bg-neutral-950 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                      <div>
                        <span className="text-[11px] text-amber-400 tracking-widest uppercase font-bold">
                          Official Luxury Reservation Voucher
                        </span>
                        <h3 className="text-xl font-bold text-white mt-1">
                          واچر رسمی اقامتگاه پنج ستاره قصر لورا
                        </h3>
                      </div>

                      {/* کد رهگیری یکتا با ارقام فارسی */}
                      <div className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-2xl flex items-center gap-2.5">
                        <span className="text-xs text-neutral-400">کد رهگیری:</span>
                        <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                          {toPersianDigits(generatedTrackingCode)}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="p-1.5 text-neutral-400 hover:text-white cursor-pointer"
                          title="کپی کد رهگیری"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* مشخصات واچر */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs sm:text-sm">
                      <div className="space-y-3">
                        <div>
                          <span className="text-neutral-500 block text-xs">نام میهمان عالی‌رتبه:</span>
                          <span className="text-white font-bold text-sm sm:text-base">{guestName || 'میهمان عالی‌رتبه قصر'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-xs">اقامتگاه انتخابی:</span>
                          <span className="text-amber-300 font-bold">{selectedRoom?.title}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-xs">تعداد میهمانان:</span>
                          <span className="text-neutral-200">{toPersianDigits(guestCount)} نفر</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-neutral-500 block text-xs">تاریخ و ساعت تحویل (Check-in):</span>
                          <span className="text-white font-semibold">{toPersianDigits(startDate)} &bull; ساعت {startTime}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-xs">تاریخ و ساعت ترخیص (Check-out):</span>
                          <span className="text-white font-semibold">{toPersianDigits(endDate)} &bull; ساعت {endTime}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-xs">مبلغ کل تسویه شده:</span>
                          <span className="text-emerald-400 font-black text-base">{formatPersianPrice(grandTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* بخش کلید دیجیتال و QR Code */}
                    <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-white rounded-2xl shadow-lg shrink-0">
                          <QrCode className="w-12 h-12 text-neutral-950" />
                        </div>
                        <div className="text-xs text-neutral-400 leading-relaxed">
                          <span>جهت تحویل کلید هوشمند سوئیت و ترانسفر، این کیوآرکد را هنگام ورود به کانسیرژ هتل ارائه فرمایید.</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert('واچر رسمی الکترونیکی هتل قصر لورا با موفقیت ذخیره گردید.')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-neutral-200 cursor-pointer transition-colors border border-neutral-800"
                      >
                        <Download className="w-4 h-4 text-amber-400" />
                        <span>دانلود واچر رسمی PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <CustomButton
                      size="lg"
                      variant="primary"
                      onClick={onBackToExperience}
                    >
                      تکمیل و بازگشت به تور ویدیویی هتل
                    </CustomButton>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* =========================================================================
            ستون چپ (در دسکتاپ): سایدبار خلاصه رزرو چسبان (Sticky Summary Card)
            ========================================================================= */}
        {currentStep < 5 && (
          <aside className="w-full lg:w-80 shrink-0 sticky top-20 space-y-4">
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4 backdrop-blur-xl">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider border-b border-neutral-800 pb-3 flex items-center justify-between">
                <span>خلاصه اقامت شما</span>
                <span className="text-neutral-400 font-normal">{toPersianDigits(totalNights)} شب</span>
              </h3>

              {/* تصویر و عنوان سوئیت */}
              <div className="flex items-center gap-3">
                <img
                  src={selectedRoom?.imageUrl}
                  alt={selectedRoom?.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border border-neutral-700 shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{autoPersianText(selectedRoom?.title)}</h4>
                  <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                    {formatPersianPrice(selectedRoom?.pricePerNight || 0)} / شب
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    ظرفیت: {toPersianDigits(selectedRoom?.capacity)} میهمان
                  </div>
                </div>
              </div>

              {/* تاریخ و ساعت اقامت */}
              <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">ورود:</span>
                  <span className="text-white font-semibold">{toPersianDigits(startDate)} &bull; {startTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">خروج:</span>
                  <span className="text-white font-semibold">{toPersianDigits(endDate)} &bull; {endTime}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                  <span className="text-neutral-400">میهمانان:</span>
                  <span className="text-neutral-200">{toPersianDigits(guestCount)} نفر</span>
                </div>
              </div>

              {/* سرویس‌های انتخابی */}
              {selectedVipServices.length > 0 && (
                <div className="text-xs space-y-1.5 border-t border-neutral-800 pt-3">
                  <span className="text-neutral-400 block mb-1">خدمات تشریفاتی VIP:</span>
                  {selectedVipServices.map((id) => {
                    const s = VIP_SERVICES.find((v) => v.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-[11px] text-neutral-300">
                        <span className="line-clamp-1">{s?.title}</span>
                        <span className="text-amber-300 font-semibold shrink-0">+{formatPersianPrice(s?.price || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* مجموع کل */}
              <div className="border-t border-neutral-800 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block">مبلغ کل قابل پرداخت:</span>
                  <span className="text-base font-black text-amber-400">{formatPersianPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* =========================================================================
          نوار اکشن فیکس موبایل (Fixed Thumb Zone Bar for Mobile)
          دسترسی راحت با شست دست در گوشی‌های هوشمند
          ========================================================================= */}
      {currentStep < 5 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-800/90 px-4 py-3 shadow-[0_-5px_25px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-neutral-400 block">مبلغ قابل پرداخت ({toPersianDigits(totalNights)} شب):</span>
            <span className="text-sm font-black text-amber-300">{formatPersianPrice(grandTotal)}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPrevStep}
                className="px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer active:scale-95"
              >
                قبل
              </button>
            )}

            <button
              type="button"
              onClick={goToNextStep}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black shadow-lg shadow-amber-400/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{currentStep === 4 ? 'پرداخت و صدور واچر' : 'گام بعدی'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
