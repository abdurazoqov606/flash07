import React, { useState } from 'react';
import { 
  Camera, 
  FlipHorizontal, 
  Eye, 
  EyeOff, 
  Palette, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  HelpCircle, 
  Maximize2, 
  Minimize2,
  Share2
} from 'lucide-react';
import { ColorTheme, THEMES } from '../utils/themes';

interface ControlHUDProps {
  facingMode: 'user' | 'environment';
  onToggleCamera: () => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  showCameraFeed: boolean;
  onToggleCameraFeed: () => void;
  currentTheme: ColorTheme;
  onSelectTheme: (theme: ColorTheme) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onClearDrawing: () => void;
  onTakeSnapshot: () => void;
  onOpenInfo: () => void;
}

export const ControlHUD: React.FC<ControlHUDProps> = ({
  facingMode,
  onToggleCamera,
  isMirrored,
  onToggleMirror,
  showCameraFeed,
  onToggleCameraFeed,
  currentTheme,
  onSelectTheme,
  isMuted,
  onToggleMute,
  onClearDrawing,
  onTakeSnapshot,
  onOpenInfo,
}) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <>
      {/* Bottom Floating Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] px-3 sm:px-6 pointer-events-none flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 rounded-2xl bg-slate-950/75 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          
          {/* Flip Camera (Front / Back) */}
          <button
            onClick={onToggleCamera}
            className="hud-glass-btn p-2.5 sm:p-3 rounded-xl text-slate-200 hover:text-cyan-400 active:scale-95 transition-all group relative"
            title="Kamerani almashtirish (Old/Orqa)"
            aria-label="Switch camera"
          >
            <Camera className="w-5 h-5 sm:w-5 sm:h-5 transition-transform group-hover:rotate-180 duration-300" />
            <span className="sr-only">Kamera</span>
          </button>

          {/* Mirror Toggle */}
          <button
            onClick={onToggleMirror}
            className={`hud-glass-btn p-2.5 sm:p-3 rounded-xl transition-all ${
              isMirrored ? 'text-cyan-400 border-cyan-500/40' : 'text-slate-400'
            }`}
            title="Ko'zgu rejimi (Akslantirish)"
            aria-label="Toggle mirror"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>

          {/* Camera AR Feed vs Black Matrix */}
          <button
            onClick={onToggleCameraFeed}
            className={`hud-glass-btn p-2.5 sm:p-3 rounded-xl transition-all ${
              showCameraFeed ? 'text-emerald-400 border-emerald-500/40' : 'text-slate-400'
            }`}
            title={showCameraFeed ? "Kamera ko'rinishi: AR (Haqiqiy)" : "Kamera ko'rinishi: Qora (Kiber fazo)"}
            aria-label="Toggle AR mode"
          >
            {showCameraFeed ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          {/* Theme Color Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="hud-glass-btn p-2.5 sm:p-3 rounded-xl text-slate-200 active:scale-95 transition-all flex items-center justify-center"
              title="Ranglar"
              aria-label="Select theme"
            >
              <div 
                className="w-5 h-5 rounded-full border-2 border-white/50 shadow-sm"
                style={{ backgroundColor: currentTheme.primary }}
              />
            </button>

            {/* Popup Theme Picker Menu */}
            {showThemePicker && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-2xl flex gap-2 animate-in fade-in zoom-in-95 duration-150 z-50"
              >
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTheme(t);
                      setShowThemePicker(false);
                    }}
                    className={`w-7 h-7 rounded-full transition-transform active:scale-90 hover:scale-110 flex items-center justify-center border ${
                      currentTheme.id === t.id ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: t.primary }}
                    title={t.name}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-6 bg-white/15 my-auto mx-0.5" />

          {/* Snapshot Photo Button */}
          <button
            onClick={onTakeSnapshot}
            className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold active:scale-90 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            title="Rasmga olish (Skrinshot)"
            aria-label="Take snapshot"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Clear drawings */}
          <button
            onClick={onClearDrawing}
            className="hud-glass-btn p-2.5 sm:p-3 rounded-xl text-slate-300 hover:text-amber-400 active:scale-95 transition-all"
            title="Chizmalarni tozalash"
            aria-label="Clear canvas"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleMute}
            className={`hud-glass-btn p-2.5 sm:p-3 rounded-xl transition-all ${
              !isMuted ? 'text-cyan-400' : 'text-slate-500'
            }`}
            title={!isMuted ? "Ovoz: Yoqilgan" : "Ovoz: O'chirilgan"}
            aria-label="Toggle sound"
          >
            {!isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Info Modal Button */}
          <button
            onClick={onOpenInfo}
            className="hud-glass-btn p-2.5 sm:p-3 rounded-xl text-slate-400 hover:text-cyan-300 active:scale-95 transition-all"
            title="Qo'llanma"
            aria-label="Instructions"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="hud-glass-btn hidden sm:flex p-2.5 sm:p-3 rounded-xl text-slate-400 hover:text-white active:scale-95 transition-all"
            title={isFullscreen ? "Kichik ekran" : "To'liq ekran"}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  );
};
