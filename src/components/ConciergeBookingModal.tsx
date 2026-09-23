/**
 * ConciergeBookingModal.tsx
 * 
 * فرم رزرو و درخواست اقامت تشریفاتی هتل پنج ستاره قصر لورا
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Check, Sparkles, ShieldCheck } from 'lucide-react';

interface ConciergeBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceTitle: string;
}

export const ConciergeBookingModal: React.FC<ConciergeBookingModalProps> = ({
  isOpen,
  onClose,
  spaceTitle,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [suiteType, setSuiteType] = useState('سوئیت پنت‌هاوس سلطنتی رو به دریا (۴۲۰ متر مربع)');
  const [guestCount, setGuestCount] = useState('۲ میهمان');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-neutral-900 border border-amber-400/40 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-neutral-200"
          >
            <button
              onClick={onClose}
              className="absolute top-5 left-5 text-neutral-400 hover:text-white p-1.5 rounded-full bg-neutral-800/80 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 mx-auto flex items-center justify-center">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl text-neutral-100 font-bold">درخواست اقامت اختصاصی ثبت شد</h3>
                <p className="text-sm text-neutral-300 max-w-xs mx-auto leading-relaxed">
                  سرپیشخدمت ارشد هتل قصر لورا درخواست شما برای بخش «{spaceTitle}» را دریافت نمود. تأییدیه اختصاصی به زودی ارسال می‌گردد.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>میز تشریفات و رزرو اقامتگاه اختصاصی</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl text-neutral-100 font-bold mb-2">
                  درخواست اقامت در قصر لورا
                </h2>
                <p className="text-xs text-neutral-400 mb-6">
                  موقعیت فعلی بازدید: <span className="text-amber-300 font-medium">{spaceTitle}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-medium">نوع سوئیت یا ویلا</label>
                    <select
                      value={suiteType}
                      onChange={(e) => setSuiteType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:border-amber-400 focus:outline-none"
                    >
                      <option>سوئیت پنت‌هاوس سلطنتی رو به دریا (۴۲۰ متر مربع)</option>
                      <option>ویلای پرزیدنتال آتریوم با استخر اختصاصی (۳۵۰ متر مربع)</option>
                      <option>اقامتگاه صخره‌ای تالاسو (۲۸۰ متر مربع)</option>
                      <option>پاویون باغ سروهای کهن (۲۱۰ متر مربع)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-300 block mb-1.5 font-medium">بازه ورود</label>
                      <div className="relative">
                        <input
                          type="text"
                          defaultValue="آبان ماه ۱۴۰۵"
                          className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:border-amber-400 focus:outline-none"
                        />
                        <Calendar className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-300 block mb-1.5 font-medium">تعداد میهمانان</label>
                      <div className="relative">
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(e.target.value)}
                          className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:border-amber-400 focus:outline-none"
                        >
                          <option>۱ میهمان</option>
                          <option>۲ میهمان</option>
                          <option>۳ تا ۴ میهمان</option>
                          <option>هیئت همراه و خانوادگی (۵ نفر به بالا)</option>
                        </select>
                        <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-medium">شماره تماس یا ایمیل مستقیم</label>
                    <input
                      type="text"
                      required
                      placeholder="ایمیل یا شماره همراه اختصاصی..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-200 text-sm focus:border-amber-400 focus:outline-none placeholder:text-neutral-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 py-1">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>تضمین محرمانگی کامل اطلاعات میهمانان و پروتکل‌های امنیتی VIP.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-l from-amber-500 via-amber-400 to-amber-300 text-neutral-950 font-bold text-xs sm:text-sm tracking-wide transition-all hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer mt-2"
                  >
                    تأیید و ارسال درخواست به سرپیشخدمت قصر
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
