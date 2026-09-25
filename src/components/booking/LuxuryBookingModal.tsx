/**
 * LuxuryBookingModal.tsx
 * 
 * مودال تطبیقی رزرواسیون هتل پنج ستاره قصر لورا
 * در موبایل: باتم‌شیت درگ‌پذیر اکیداً بدون دکمه ضربدر
 * در دسکتاپ: سایدشیت عریض و جادار برای تجربه راحت چندمرحله‌ای
 */

import React from 'react';
import { AdaptiveOverlay } from '../ui/AdaptiveOverlay';
import { BookingWizard } from './BookingWizard';
import { Sparkles } from 'lucide-react';

interface LuxuryBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceTitle?: string;
}

export const LuxuryBookingModal: React.FC<LuxuryBookingModalProps> = ({
  isOpen,
  onClose,
  spaceTitle,
}) => {
  return (
    <AdaptiveOverlay
      isOpen={isOpen}
      onClose={onClose}
      onSkip={onClose}
      mode="auto"
      maxWidthClass="max-w-2xl lg:max-w-3xl"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>میز رزرو و اقامتگاه اختصاصی قصر لورا</span>
        </div>
      }
      subtitle={
        spaceTitle ? (
          <span>
            سکانس جاری بازدید: <strong className="text-amber-300 font-medium">{spaceTitle}</strong>
          </span>
        ) : undefined
      }
    >
      <BookingWizard
        initialSpaceTitle={spaceTitle}
        onComplete={onClose}
        onSkip={onClose}
        onClose={onClose}
      />
    </AdaptiveOverlay>
  );
};
