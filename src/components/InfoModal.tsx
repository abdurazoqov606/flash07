import React from 'react';
import { X, Hand, Zap, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, primaryColor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md p-6 rounded-3xl bg-slate-950/90 border border-white/15 shadow-2xl relative text-left"
        style={{ boxShadow: `0 0 35px ${primaryColor}25` }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/20"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wider uppercase text-white font-['Outfit']">
              ABDURAZOKHOV AI
            </h2>
            <p className="text-xs text-slate-400 font-mono">Qo'l harakatlari qo'llanmasi</p>
          </div>
        </div>

        {/* Gesture Cards */}
        <div className="space-y-3 font-mono text-xs">
          {/* Gesture 1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-cyan-300 text-sm">Chizish (Pinch)</div>
              <div className="text-slate-300 mt-0.5 leading-relaxed">
                Bosh barmoq va ko'rsatkich barmog'ingizni bir-biriga tekkizsangiz, havoda neon chiziqlar chiziladi.
              </div>
            </div>
          </div>

          {/* Gesture 2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-purple-300 text-sm">Yashin yoyi (Lightning)</div>
              <div className="text-slate-300 mt-0.5 leading-relaxed">
                Ikkala qo'lingizni kameraga ko'rsatsangiz, barmoqlar orasida elektr yashin paydo bo'ladi.
              </div>
            </div>
          </div>

          {/* Gesture 3 */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <Hand className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-emerald-300 text-sm">Energiya yadrosi (Energy Core)</div>
              <div className="text-slate-300 mt-0.5 leading-relaxed">
                Kaftingizni keng ochsangiz, qo'lingiz markazida aylanuvchi portal va plazma orblari zaryadlanadi.
              </div>
            </div>
          </div>
        </div>

        {/* Mobile touch tip */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <Smartphone className="w-4 h-4 text-slate-300 shrink-0" />
          <span>Telefonda ekranga barmoq bilan tegsangiz ham effektlar hosil bo'ladi.</span>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl font-bold text-slate-950 font-['Outfit'] tracking-wider text-sm transition-transform active:scale-98"
          style={{ backgroundColor: primaryColor }}
        >
          TUSHUNARLI
        </button>
      </div>
    </div>
  );
};
