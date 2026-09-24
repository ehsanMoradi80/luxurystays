/**
 * BookingWizard.tsx
 * 
 * ویزارد رزرو اقامتگاه تشریفاتی چند مرحله‌ای بسیار نرم و کاربرپسند
 * ۱. تاریخ، زمان و تعداد میهمانان (با تقویم مدرن LuxuryDateTimePicker)
 * ۲. انتخاب سوئیت و مشاهده دسترسی لحظه‌ای
 * ۳. خدمات ویژه تشریفاتی (VIP Concierge) و اطلاعات تماس
 * ۴. پیش‌فاکتور شفاف و درگاه شبیه‌ساز پرداخت فیک (Fake Payment Simulator)
 * ۵. صدور واچر دیجیتال با کد پیگیری و QR Code
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Bed, 
  Sparkles, 
  CreditCard, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Lock, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  User, 
  Phone, 
  Mail, 
  FileText,
  Clock,
  KeyRound
} from 'lucide-react';
import { useThemeAndSiteStore, HotelRoom } from '../../store/useThemeAndSiteStore';
import { SITE_THEMES } from '../../theme/themeConfig';
import { LuxuryDateTimePicker } from './LuxuryDateTimePicker';
import { CustomInput } from '../ui/CustomInput';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomButton } from '../ui/CustomButton';

interface BookingWizardProps {
  initialSpaceTitle?: string;
  onComplete?: () => void;
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
    description: 'فرود مستقیم در هلی‌پد اختصاصی هتل با پذیرایی خاویار',
    price: 18000000,
  },
  {
    id: 'private-chef',
    title: 'سرآشپز اختصاصی ستاره‌دار میشلن',
    description: 'طراحی منوی شام اختصاصی در تراس سوئیت با مواد اولیه ارگانیک',
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
    description: 'سفر ۳ ساعته در آب‌های زلال همراه با نوای موسیقی زنده',
    price: 22000000,
  },
];

export const BookingWizard: React.FC<BookingWizardProps> = ({
  initialSpaceTitle,
  onComplete,
}) => {
  const { siteTheme, rooms, activeSiteId, sites, addBooking } = useThemeAndSiteStore();
  const currentTheme = SITE_THEMES[siteTheme] || SITE_THEMES.gold;
  const currentSite = sites[activeSiteId];

  // مراحل ویزارد: ۱: تقویم | ۲: اقامتگاه | ۳: مشخصات و VIP | ۴: پرداخت فیک | ۵: واچر نهایی
  const [currentStep, setCurrentStep] = useState<number>(1);

  // وضعیت‌های مرحله ۱: تاریخ و ساعت
  const [startDate, setStartDate] = useState('2026-09-24');
  const [endDate, setEndDate] = useState('2026-09-27');
  const [startTime, setStartTime] = useState(currentSite?.checkInHour || '14:00');
  const [endTime, setEndTime] = useState(currentSite?.checkOutHour || '12:00');
  const [guestCount, setGuestCount] = useState('2');
  const [stayPurpose, setStayPurpose] = useState('تعطیلات و آرامش تشریفاتی');

  // وضعیت‌های مرحله ۲: اتاق انتخابی
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom>(rooms[0]);

  // وضعیت‌های مرحله ۳: خدمات VIP و اطلاعات مهمان
  const [selectedVipServices, setSelectedVipServices] = useState<string[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // وضعیت‌های مرحله ۴: درگاه فیک
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('۰۷');
  const [cardExpYear, setCardExpYear] = useState('۰۶');
  const [cardOtp, setCardOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // وضعیت‌های مرحله ۵: واچر و رسید نهایی
  const [generatedTrackingCode, setGeneratedTrackingCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // محاسبه شب‌ها
  const calculateDays = () => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return diff || 1;
  };
  const totalNights = calculateDays();

  // محاسبه قیمت کل
  const roomCostTotal = (selectedRoom?.pricePerNight || 0) * totalNights;
  const vipServicesTotal = selectedVipServices.reduce((sum, sId) => {
    const s = VIP_SERVICES.find((v) => v.id === sId);
    return sum + (s?.price || 0);
  }, 0);
  const taxesAndService = Math.round((roomCostTotal + vipServicesTotal) * 0.09);
  const grandTotal = roomCostTotal + vipServicesTotal + taxesAndService;

  // تاگل سرویس VIP
  const toggleVipService = (serviceId: string) => {
    setSelectedVipServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  // تکمیل خودکار کارت تست جهت سهولت پرداخت فیک
  const handleAutoFillTestCard = () => {
    setCardNumber('۶۰۳۷ - ۹۹۷۵ - ۸۸۲۲ - ۴۴۱۱');
    setCardCvv('۷۸۲');
    setCardExpMonth('۰۸');
    setCardExpYear('۰۸');
    setCardOtp('۵۲۹۱۴');
    setOtpSent(true);
  };

  // ارسال رمز پویا فیک
  const handleRequestOtp = () => {
    setOtpSent(true);
    setCardOtp('۵۲۹۱۴');
  };

  // پردازش پرداخت فیک
  const handleExecuteFakePayment = () => {
    setIsProcessingPayment(true);

    setTimeout(() => {
      // ثبت در استور برای نمایش در پنل ادمین
      const newBooking = addBooking({
        siteId: activeSiteId,
        roomId: selectedRoom.id,
        roomTitle: selectedRoom.title,
        guestName: guestName || 'میهمان عالی‌رتبه قصر',
        guestEmail: guestEmail || 'guest@vip-palace.com',
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

      setGeneratedTrackingCode(newBooking.trackingCode);
      setIsProcessingPayment(false);
      setCurrentStep(5);
    }, 1800);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedTrackingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full text-right font-sans space-y-6">
      {/* =========================================================================
          نوار پیشرفت مراحل ویزارد (Wizard Stepper)
          ========================================================================= */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'زمان و میهمانان' },
              { num: 2, label: 'انتخاب اقامتگاه' },
              { num: 3, label: 'خدمات و مشخصات' },
              { num: 4, label: 'پرداخت فیک' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPassed = currentStep > step.num;

              return (
                <div key={step.num} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-amber-400 text-neutral-950 shadow-md ring-2 ring-amber-400/30'
                        : isPassed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <span
                    className={`text-xs hidden md:inline ${
                      isActive
                        ? 'text-white font-bold'
                        : isPassed
                        ? 'text-neutral-300'
                        : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.num < 4 && (
                    <span className="text-neutral-700 mx-1 hidden sm:inline">&mdash;</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-neutral-400">
            مرحله <span className="font-bold text-amber-300">{currentStep}</span> از ۴
          </div>
        </div>
      )}

      {/* =========================================================================
          مرحله ۱: تقویم هوشمند، ساعت‌ها و مسافران
          ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              تعیین تاریخ، ساعت ورود و خروج
            </h3>
            <p className="text-xs text-neutral-400">
              بازه زمانی مدنظر خود را مشخص کنید. وضعیت ظرفیت اقامتگاه‌ها به صورت خودکار بهینه‌سازی می‌شود.
            </p>
          </div>

          <LuxuryDateTimePicker
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
            selectedRoomId={selectedRoom?.id}
            onSelectRoom={(room) => setSelectedRoom(room)}
            showAvailabilityMatrix={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <CustomSelect
              label="تعداد میهمانان گرامی:"
              value={guestCount}
              onChange={setGuestCount}
              options={[
                { value: '1', label: '۱ میهمان (اقامت انفرادی VIP)' },
                { value: '2', label: '۲ میهمان (اقامت دونفره / ریلکسیشن)' },
                { value: '3', label: '۳ میهمان' },
                { value: '4', label: '۴ میهمان (سوئیت‌های خانوادگی)' },
                { value: '6', label: 'هیئت همراه و دیپلماتیک (تا ۶ نفر)' },
              ]}
            />

            <CustomSelect
              label="هدف یا مناسبت اقامت:"
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

          <div className="flex justify-end pt-4">
            <CustomButton
              size="lg"
              variant="primary"
              rightIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(2)}
            >
              مشاهده اقامتگاه‌ها و بررسی ظرفیت
            </CustomButton>
          </div>
        </div>
      )}

      {/* =========================================================================
          مرحله ۲: انتخاب اقامتگاه و مشاهده ظرفیت زنده
          ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                انتخاب اقامتگاه مجلل ({totalNights} شب اقامت)
              </h3>
              <p className="text-xs text-neutral-400">
                از تاریخ <span className="text-amber-300 font-semibold">{startDate}</span> تا{' '}
                <span className="text-amber-300 font-semibold">{endDate}</span>
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تغییر تاریخ و ساعت</span>
            </button>
          </div>

          {/* کارت‌های اقامتگاه */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id;
              const slotStatus = room.slots[startDate] || 'available';
              const isBooked = slotStatus === 'booked';

              return (
                <div
                  key={room.id}
                  onClick={() => !isBooked && setSelectedRoom(room)}
                  className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-neutral-900 border-amber-400 ring-2 ring-amber-400/30 shadow-xl'
                      : isBooked
                      ? 'bg-neutral-950 border-neutral-800 opacity-50 cursor-not-allowed'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 cursor-pointer'
                  }`}
                >
                  <div>
                    {/* تصویر سوئیت */}
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={room.imageUrl}
                        alt={room.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 right-3">
                        {slotStatus === 'available' ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md">
                            خالی و آماده تحویل
                          </span>
                        ) : slotStatus === 'limited' ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/90 text-neutral-950 backdrop-blur-md">
                            ظرفیت محدود (۱ عدد)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-600 text-white backdrop-blur-md">
                            تکمیل ظرفیت در این تاریخ
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 right-3 text-right">
                        <span className="text-[11px] text-amber-300 font-semibold block">
                          {room.viewType}
                        </span>
                        <h4 className="text-base font-bold text-white drop-shadow-md">
                          {room.title}
                        </h4>
                      </div>
                    </div>

                    {/* جزئیات و امکانات */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-neutral-300 border-b border-neutral-800 pb-2">
                        <span>متراژ: {room.sizeM2} متر مربع</span>
                        <span>ظرفیت: تا {room.capacity} میهمان</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {room.amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-300"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* قیمت و انتخاب */}
                  <div className="p-4 pt-0 flex items-center justify-between border-t border-neutral-800/60 mt-2">
                    <div>
                      <div className="text-[11px] text-neutral-400">قیمت هر شب:</div>
                      <div className="text-sm font-bold text-amber-300">
                        {room.pricePerNight.toLocaleString('fa-IR')} تومان
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isBooked}
                      onClick={() => !isBooked && setSelectedRoom(room)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-neutral-950'
                          : isBooked
                          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      }`}
                    >
                      {isSelected ? 'انتخاب شده ✓' : isBooked ? 'غیرقابل رزرو' : 'انتخاب این سوئیت'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>

            <CustomButton
              size="lg"
              variant="primary"
              rightIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
            >
              ادامه و ثبت مشخصات
            </CustomButton>
          </div>
        </div>
      )}

      {/* =========================================================================
          مرحله ۳: خدمات ویژه کانسیرژ و اطلاعات مهمان
          ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              خدمات تشریفاتی VIP و مشخصات سرپرست اقامت
            </h3>
            <p className="text-xs text-neutral-400">
              جهت هماهنگی تشریفات اختصاصی و صدور واچر الکترونیکی، اطلاعات زیر را وارد نمایید.
            </p>
          </div>

          {/* سرویس‌های VIP */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>امکانات و خدمات اختیاری کانسیرژ قصر:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIP_SERVICES.map((service) => {
                const isChecked = selectedVipServices.includes(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleVipService(service.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? 'bg-amber-400/10 border-amber-400 ring-1 ring-amber-400/30'
                        : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                        isChecked
                          ? 'bg-amber-400 border-amber-400 text-neutral-950 font-bold'
                          : 'border-neutral-600 bg-neutral-950'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{service.title}</span>
                        <span className="text-[11px] text-amber-300 font-semibold">
                          +{service.price.toLocaleString('fa-IR')} ت
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">{service.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* فیلدهای مشخصات میهمان */}
          <div className="space-y-4 pt-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-400" />
              <span>مشخصات سرپرست رزرو:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomInput
                label="نام و نام خانوادگی میهمان اصلی:"
                placeholder="مثال: دکتر علیرضا صدری"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                startIcon={<User className="w-4 h-4" />}
                required
              />

              <CustomInput
                label="شماره تلفن همراه (جهت هماهنگی ترانسفر):"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                startIcon={<Phone className="w-4 h-4" />}
                required
              />
            </div>

            <CustomInput
              label="پست الکترونیکی (جهت ارسال واچر رسمی):"
              type="email"
              placeholder="vip.guest@palace.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              startIcon={<Mail className="w-4 h-4" />}
              required
            />

            <CustomInput
              label="درخواست‌های اختصاصی (رژیم غذایی، ترتیبات گل‌آرایی، ساعت ورود دقیق و ...):"
              placeholder="هرگونه یادداشت برای سرپیشخدمت ارشد..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              startIcon={<FileText className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>

            <CustomButton
              size="lg"
              variant="primary"
              rightIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(4)}
            >
              مشاهده پیش‌فاکتور و پرداخت فیک
            </CustomButton>
          </div>
        </div>
      )}

      {/* =========================================================================
          مرحله ۴: پیش‌فاکتور و درگاه شبیه‌ساز پرداخت فیک
          «و در نهایت پرداخت رو هم به صورت فیک بذار چون فعلا نمیخوام درگاه پرداخت رو وصل کنم»
          ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              پیش‌فاکتور رسمی و تسویه حساب شبیه‌سازی‌شده (Fake Sandbox)
            </h3>
            <p className="text-xs text-neutral-400">
              این مرحله یک درگاه پرداخت تستی امن است و هیچ مبلغ واقعی از حساب شما کسر نخواهد شد.
            </p>
          </div>

          {/* پیش‌فاکتور خلاصه حساب */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-300 border-b border-neutral-800 pb-2.5">
              <span>{selectedRoom?.title} ({totalNights} شب)</span>
              <span className="font-semibold text-white">{roomCostTotal.toLocaleString('fa-IR')} تومان</span>
            </div>

            {selectedVipServices.length > 0 && (
              <div className="flex items-center justify-between text-xs text-neutral-300 border-b border-neutral-800 pb-2.5">
                <span>سرویس‌های تشریفاتی انتخابی ({selectedVipServices.length} مورد)</span>
                <span className="font-semibold text-white">{vipServicesTotal.toLocaleString('fa-IR')} تومان</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800 pb-2.5">
              <span>مالیات بر ارزش افزوده و حق سرویس تشریفات (۹٪)</span>
              <span>{taxesAndService.toLocaleString('fa-IR')} تومان</span>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm font-bold">
              <span className="text-white">مبلغ قابل پرداخت:</span>
              <span className="text-amber-400 text-base">{grandTotal.toLocaleString('fa-IR')} تومان</span>
            </div>
          </div>

          {/* شبیه‌ساز درگاه پرداخت شاپرک / کارت اعتباری */}
          <div className="bg-neutral-900 border border-amber-400/40 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">سامانه شبیه‌ساز پرداخت الکترونیک شتاب (Sandbox)</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillTestCard}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 transition-all font-bold cursor-pointer"
              >
                تکمیل خودکار کارت تستی VIP
              </button>
            </div>

            <div className="space-y-3">
              <CustomInput
                label="شماره کارت ۱۶ رقمی (تستی):"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="۶۰۳۷ - ۹۹۷۵ - ۸۸۲۲ - ۴۴۱۱"
                startIcon={<CreditCard className="w-4 h-4" />}
              />

              <div className="grid grid-cols-2 gap-3">
                <CustomInput
                  label="کد CVV2:"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="۷۸۲"
                  startIcon={<KeyRound className="w-4 h-4" />}
                />

                <div className="grid grid-cols-2 gap-1.5">
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
              <div className="flex items-end gap-2">
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
                  className="h-11 sm:h-12 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
                >
                  {otpSent ? 'ارسال شد (۵۲۹۱۴)' : 'دریافت رمز پویا تستی'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-400 bg-neutral-950/60 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>محیط شبیه‌ساز تستی. با فشردن دکمه زیر بلافاصله واچر رسمی اقامتگاه صادر می‌گردد.</span>
            </div>

            <CustomButton
              fullWidth
              size="lg"
              variant="primary"
              isLoading={isProcessingPayment}
              onClick={handleExecuteFakePayment}
            >
              تأیید پرداخت فیک و صدور واچر نهایی اقامتگاه
            </CustomButton>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>بازگشت به اطلاعات</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          مرحله ۵: واچر رسمی و تأیید نهایی رزرو
          ========================================================================= */}
      {currentStep === 5 && (
        <div className="space-y-6 py-2">
          {/* کارت موفقیت */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              رزرو اقامت تشریفاتی شما با موفقیت ثبت شد
            </h3>
            <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
              پرداخت شبیه‌سازی شده با موفقیت به پایان رسید. واچر رسمی اقامتگاه پنج ستاره قصر لورا صادر گردید.
            </p>
          </div>

          {/* برگه واچر لوکس */}
          <div className="bg-neutral-950 border-2 border-amber-400/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] text-amber-400 tracking-widest uppercase font-semibold">
                  Official Luxury Voucher
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">
                  واچر رسمی اقامتگاه قصر لورا
                </h4>
              </div>

              {/* کد پیگیری */}
              <div className="bg-neutral-900 border border-neutral-700 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-xs text-neutral-400">کد رهگیری:</span>
                <span className="font-mono text-sm font-bold text-amber-300">
                  {generatedTrackingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                  title="کپی کد رهگیری"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* مشخصات واچر */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-neutral-500 block">نام میهمان:</span>
                  <span className="text-white font-bold">{guestName || 'میهمان عالی‌رتبه قصر'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">اقامتگاه انتخابی:</span>
                  <span className="text-amber-300 font-semibold">{selectedRoom?.title}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">تعداد میهمانان:</span>
                  <span className="text-neutral-200">{guestCount} نفر</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-neutral-500 block">تاریخ و ساعت ورود:</span>
                  <span className="text-white font-semibold">{startDate} &bull; ساعت {startTime}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">تاریخ و ساعت خروج:</span>
                  <span className="text-white font-semibold">{endDate} &bull; ساعت {endTime}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">مبلغ کل تسویه شده:</span>
                  <span className="text-emerald-400 font-bold">{grandTotal.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            </div>

            {/* بخش QR Code */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <QrCode className="w-10 h-10 text-neutral-950" />
                </div>
                <div className="text-[11px] text-neutral-400">
                  <span>جهت تحویل کلید هوشمند، این کیوآرکد را هنگام ورود ارائه فرمایید.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('دانلود فایل PDF واچر شبیه‌سازی شد و رسید صادر گردید.')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>دانلود واچر</span>
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <CustomButton
              size="lg"
              variant="primary"
              onClick={onComplete}
            >
              تکمیل و بازگشت به گشت و گذار در هتل
            </CustomButton>
          </div>
        </div>
      )}
    </div>
  );
};
