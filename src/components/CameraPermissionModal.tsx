import React from 'react';
import { Camera, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';

interface CameraPermissionModalProps {
  errorType: 'permission_denied' | 'not_found' | 'in_use' | 'https_required' | 'unknown' | null;
  errorMessage?: string;
  onRetry: () => void;
  onContinueTouchMode: () => void;
  primaryColor: string;
}

export const CameraPermissionModal: React.FC<CameraPermissionModalProps> = ({
  errorType,
  errorMessage,
  onRetry,
  onContinueTouchMode,
  primaryColor,
}) => {
  if (!errorType) return null;

  const getTitle = () => {
    switch (errorType) {
      case 'permission_denied':
        return 'Kameraga ruxsat berilmadi';
      case 'not_found':
        return 'Kamera topilmadi';
      case 'in_use':
        return 'Kamera boshqa ilovada band';
      case 'https_required':
        return 'Xavfsiz ulanish (HTTPS) zarur';
      default:
        return 'Kamerani ishga tushirib bo\'lmadi';
    }
  };

  const getSubtitle = () => {
    switch (errorType) {
      case 'permission_denied':
        return 'Qo\'l harakatlarini aniqlash uchun brauzer sozlamalarida kameraga ruxsat bering va qayta urinib ko\'ring.';
      case 'not_found':
        return 'Qurilmangizda kamera aniqlanmadi. Barmoq bilan ekranga tegib ham effektlarni sinab ko\'rishingiz mumkin.';
      case 'in_use':
        return 'Kamera boshqa ilova yoki tab tomonidan ishlatilmoqda. Uni yopib qayta urinib ko\'ring.';
      case 'https_required':
        return 'Kamera faqat xavfsiz https:// yoki localhost manzillarida ishlaydi.';
      default:
        return errorMessage || 'Kamerani yoqishda xatolik yuz berdi. Qayta urinib ko\'ring yoki teginish rejimidan foydalaning.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div 
        className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/15 text-center shadow-2xl"
        style={{ boxShadow: `0 0 40px ${primaryColor}30` }}
      >
        <div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border border-white/20 animate-bounce"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Camera className="w-8 h-8" style={{ color: primaryColor }} />
        </div>

        <h3 className="text-xl font-bold font-['Outfit'] text-white mb-2">
          {getTitle()}
        </h3>

        <p className="text-xs text-slate-300 font-mono mb-6 leading-relaxed">
          {getSubtitle()}
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRetry}
            className="w-full py-3 rounded-xl font-bold font-['Outfit'] text-slate-950 tracking-wider text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            <RefreshCw className="w-4 h-4" />
            QAYTA URINISH
          </button>

          <button
            onClick={onContinueTouchMode}
            className="w-full py-2.5 rounded-xl font-mono text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Kamerasiz (Teginish rejimi)
          </button>
        </div>
      </div>
    </div>
  );
};
