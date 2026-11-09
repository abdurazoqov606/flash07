import React from 'react';

interface HeaderBrandProps {
  isTracking: boolean;
  handCount: number;
  themePrimary: string;
}

export const HeaderBrand: React.FC<HeaderBrandProps> = ({ isTracking, handCount, themePrimary }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none pt-[calc(env(safe-area-inset-top,0px)+16px)] px-4 sm:px-6 flex items-center justify-between">
      {/* Brand Name */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5">
          <h1 
            className="text-2xl sm:text-3xl font-bold tracking-[0.15em] uppercase font-['Outfit'] select-none transition-all duration-300 drop-shadow-[0_0_16px_var(--glow)]"
            style={{
              color: '#ffffff',
              textShadow: `0 0 10px ${themePrimary}, 0 0 25px ${themePrimary}88, 0 0 45px ${themePrimary}44`,
            }}
          >
            abdurazokhov
          </h1>

          {/* Minimal live pulse dot */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <span 
              className={`inline-block w-2 h-2 rounded-full transition-colors duration-300 ${
                isTracking 
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' 
                  : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              }`}
            />
            <span className="text-[10px] tracking-widest text-slate-400 font-mono uppercase">
              {isTracking ? (handCount > 0 ? `${handCount} HAND` : 'READY') : 'AI LIVE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
