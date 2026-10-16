import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Coffee,
  UtensilsCrossed,
  Waves,
  Car,
  Plane,
  X
} from 'lucide-react';

interface LuxuryBookingPageProps {
  onBackToExperience: () => void;
  onPreviewExperience?: (sceneId: string) => void;
}

const SUITES = [
  {
    id: 'imperial-penthouse',
    title: 'پنت‌هاوس امپریال دوبلکس',
    sceneId: 'scene-02-penthouse',
    price: '۱۴۵,۰۰۰,۰۰۰ تومان',
    view: 'چشم‌انداز ابدی ۳۶۰ درجه به اقیانوس',
    capacity: '۴ تا ۶ نفر',
    area: '۴۸۰ متر مربع',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    features: ['استخر اختصاصی معلق', 'پیشخدمت ۲۴ ساعته', 'جکوزی روباز', 'تراس آفتابگیر'],
  },
  {
    id: 'royal-ocean-suite',
    title: 'سوئیت سلطنتی رویال اوشن',
    sceneId: 'scene-05-beach',
    price: '۸۸,۰۰۰,۰۰۰ تومان',
    view: 'خط افق خلیج فارس و ساحل اختصاصی',
    capacity: '۲ تا ۳ نفر',
    area: '۲۲۰ متر مربع',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    features: ['تراس رو به دریا', 'حمام مرمرین با جکوزی', 'مینی‌بار اختصاصی پرمیوم'],
  },
  {
    id: 'crystal-garden-suite',
    title: 'سوئیت پرزیدنتال باغ کریستال',
    sceneId: 'scene-01-entrance',
    price: '۶۵,۰۰۰,۰۰۰ تومان',
    view: 'باغ‌های فرانسوی و آب‌نمای مرمرین',
    capacity: '۲ نفر',
    area: '۱۶۰ متر مربع',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    features: ['حیاط اختصاصی خلوت', 'آروماتراپی ارگانیک', 'صبحانه ویژه در سوئیت'],
  },
];

const VIP_SERVICES = [
  {
    id: 'airport-limo',
    title: 'ترانسفر اختصاصی فرودگاهی با رولزرویس',
    price: '۱۸,۰۰۰,۰۰۰ تومان',
    icon: Car,
  },
  {
    id: 'heli-transfer',
    title: 'ترانسفر هلیکوپتر بر فراز ساحل',
    price: '۳۵,۰۰۰,۰۰۰ تومان',
    icon: Plane,
  },
  {
    id: 'private-chef',
    title: 'سرو شام ۶ دوره‌ای با سرآشپز میشلن در سوئیت',
    price: '۲۲,۰۰۰,۰۰۰ تومان',
    icon: UtensilsCrossed,
  },
  {
    id: 'spa-vip',
    title: 'پکیج ماساژ و آب‌درمانی ۲ نفره طلایی',
    price: '۱۴,۰۰۰,۰۰۰ تومان',
    icon: Waves,
  },
];

export const LuxuryBookingPage: React.FC<LuxuryBookingPageProps> = ({ onBackToExperience }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedSuite, setSelectedSuite] = useState(SUITES[0]);
  const [stayNights, setStayNights] = useState<number>(3);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedServices, setSelectedServices] = useState<string[]>(['airport-limo']);
  const [guestName, setGuestName] = useState<string>('جناب آقای رادمنش');
  const [guestPhone, setGuestPhone] = useState<string>('۰۹۱۲۱۲۳۴۵۶۷');
  const [guestNotes, setGuestNotes] = useState<string>('سرو چای ارل گری و میوه‌های استوایی هنگام ورود');

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBackToExperience();
    }
  };

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black text-neutral-100 font-sans flex flex-col relative selection:bg-amber-400 selection:text-neutral-950 pb-20">
      {/* Standalone Wizard Header */}
      <header className="sticky top-0 z-40 px-4 sm:px-8 py-3.5 bg-neutral-950/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between gap-3 sm:gap-6 shadow-2xl">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrev}
            className="group px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/60 border border-white/15 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95 text-xs shrink-0"
            title={currentStep === 1 ? 'بازگشت به سایت' : 'مرحله قبل'}
          >
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            <span className="font-medium">{currentStep === 1 ? 'بازگشت به سایت (Esc)' : 'قبلی'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-r border-white/10 pr-3 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-serif text-amber-300/90 font-medium tracking-wide">قصر لورا</span>
            <span className="text-neutral-400">&bull; ویزارد رزرواسیون</span>
          </div>
        </div>

        {/* Minimal Steps Progress */}
        {currentStep < 5 && (
          <div className="flex-1 max-w-xl flex items-center gap-2">
            {[1, 2, 3, 4].map((stepNum) => {
              const isDone = currentStep > stepNum;
              const isActive = currentStep === stepNum;
              return (
                <div key={stepNum} className="flex-1 flex flex-col gap-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isActive ? 'bg-amber-400 shadow-md shadow-amber-400/30' : isDone ? 'bg-amber-400/70' : 'bg-neutral-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Skip or Exit */}
        {currentStep < 5 ? (
          <button
            onClick={handleNext}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-amber-200 text-xs transition-all cursor-pointer shrink-0"
          >
            مرحله بعد &larr;
          </button>
        ) : (
          <button
            onClick={onBackToExperience}
            className="px-4 py-1.5 rounded-xl bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-md shrink-0"
          >
            اتمام و خروج
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Step 1: Suite Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">مرحله نخست</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">انتخاب اقامتگاه رویایی</h2>
              <p className="text-xs sm:text-sm text-neutral-400">سوئیت مورد نظر خود را برای تجربه اقامتی شاهانه انتخاب کنید.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUITES.map((suite) => {
                const isSelected = selectedSuite.id === suite.id;
                return (
                  <div
                    key={suite.id}
                    onClick={() => setSelectedSuite(suite)}
                    className={`group rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col ${
                      isSelected
                        ? 'border-amber-400 bg-neutral-900/90 shadow-2xl shadow-amber-400/10 ring-1 ring-amber-400'
                        : 'border-white/10 bg-neutral-900/50 hover:border-white/20'
                    }`}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={suite.image}
                        alt={suite.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
                      <div className="absolute bottom-3 right-3 left-3 flex justify-between items-end">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-amber-300 border border-white/10">
                          {suite.area}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-amber-400/90 text-neutral-950 text-xs font-bold">
                          {suite.price} / شب
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{suite.title}</h3>
                        <p className="text-xs text-amber-200/80 mb-3">{suite.view}</p>

                        <div className="space-y-1.5 mb-4">
                          {suite.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-neutral-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-neutral-950'
                            : 'bg-white/5 text-neutral-300 group-hover:bg-white/10'
                        }`}
                      >
                        {isSelected ? 'انتخاب شده ✓' : 'انتخاب این سوئیت'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/20 transition-all cursor-pointer"
              >
                ادامه و تعیین تاریخ اقامت &larr;
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Nights */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">مرحله دوم</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">مدت زمان اقامت و تعداد مهمانان</h2>
              <p className="text-xs sm:text-sm text-neutral-400">تاریخ حضور خود را در هتل قصر لورا تعیین فرمایید.</p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">تعداد شب‌های اقامت</label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 5, 7, 10, 14, 21].map((nights) => (
                    <button
                      key={nights}
                      onClick={() => setStayNights(nights)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        stayNights === nights
                          ? 'bg-amber-400 border-amber-400 text-neutral-950 shadow-lg shadow-amber-400/20'
                          : 'bg-neutral-800/40 border-white/5 text-neutral-400 hover:border-white/15'
                      }`}
                    >
                      {nights} شب
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">تعداد مهمانان گرامی</label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((guests) => (
                    <button
                      key={guests}
                      onClick={() => setGuestCount(guests)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        guestCount === guests
                          ? 'bg-amber-400 border-amber-400 text-neutral-950 shadow-lg shadow-amber-400/20'
                          : 'bg-neutral-800/40 border-white/5 text-neutral-400 hover:border-white/15'
                      }`}
                    >
                      {guests} نفر
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={handlePrev}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium"
              >
                مرحله قبل
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/20"
              >
                ادامه به خدمات VIP &larr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: VIP Concierge Add-ons */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">مرحله سوم</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">خدمات اختصاصی تشریفات و کانسیرژ</h2>
              <p className="text-xs sm:text-sm text-neutral-400">اقامت خود را با تشریفات اختصاصی به یادماندنی‌تر سازید.</p>
            </div>

            <div className="space-y-3">
              {VIP_SERVICES.map((serv) => {
                const isSelected = selectedServices.includes(serv.id);
                const Icon = serv.icon;
                return (
                  <div
                    key={serv.id}
                    onClick={() => toggleService(serv.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400/50 text-white shadow-lg'
                        : 'bg-neutral-900/40 border-white/10 text-neutral-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-amber-400 text-neutral-950' : 'bg-white/5 text-amber-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{serv.title}</div>
                        <div className="text-xs text-amber-300/80 font-mono mt-0.5">{serv.price}</div>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${isSelected ? 'bg-amber-400 border-amber-400 text-neutral-950' : 'border-white/20'}`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={handlePrev}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium"
              >
                مرحله قبل
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/20"
              >
                مشخصات مهمان &larr;
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Guest Information */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">مرحله چهارم</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-2">اطلاعات سرپرست اقامت</h2>
              <p className="text-xs sm:text-sm text-neutral-400">جهت صدور واچر رسمی و هماهنگی تیم تشریفات.</p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">نام و نام‌خانوادگی</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 focus:border-amber-400 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">شماره تماس مستقیم</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 focus:border-amber-400 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">درخواست‌های ویژه یا رژیم‌های غذایی</label>
                <textarea
                  rows={3}
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 focus:border-amber-400 text-sm text-white focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={handlePrev}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium"
              >
                مرحله قبل
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/20"
              >
                تایید نهایی و صدور واچر &larr;
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Final Voucher Confirmation */}
        {currentStep === 5 && (
          <div className="max-w-xl mx-auto space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">واچر رزرواسیون با موفقیت صادر شد</h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
              تیم کانسیرژ اختصاصی قصر لورا ظرف حداکثر ۱۵ دقیقه جهت نهایی‌سازی پروتکل ورود با شما تماس خواهند گرفت.
            </p>

            <div className="p-6 rounded-2xl bg-neutral-900/80 border border-amber-400/30 text-right space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs text-neutral-400">کد پیگیری تشریفات:</span>
                <span className="font-mono text-amber-300 text-sm font-bold">LP-9824-ROYAL</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs text-neutral-400">سوئیت انتخابی:</span>
                <span className="text-white text-sm font-bold">{selectedSuite.title}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs text-neutral-400">مدت اقامت:</span>
                <span className="text-white text-sm">{stayNights} شب ({guestCount} مهمان)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">سرپرست اقامت:</span>
                <span className="text-white text-sm">{guestName}</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onBackToExperience}
                className="px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-400/20 transition-all cursor-pointer"
              >
                بازگشت به گشت سینمایی هتل (Esc)
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
