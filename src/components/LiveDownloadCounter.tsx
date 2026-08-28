import { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, Sparkles } from 'lucide-react';
import { getExtensionDownloadCount, subscribeToDownloadCount } from '@/lib/downloadCounter';

interface Props {
  variant?: 'banner' | 'pill' | 'minimal' | 'card';
  className?: string;
  showIcon?: boolean;
}

export default function LiveDownloadCounter({ variant = 'pill', className = '', showIcon = true }: Props) {
  const [count, setCount] = useState<number>(() => getExtensionDownloadCount());
  const [hasIncremented, setHasIncremented] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // Initial sync
    setCount(getExtensionDownloadCount());

    // Subscribe to cross-tab / local increments triggered by actual downloads
    const unsubscribe = subscribeToDownloadCount((newCount) => {
      setCount(newCount);
      setHasIncremented(true);
      setPulse(true);

      const t1 = setTimeout(() => setHasIncremented(false), 2400);
      const t2 = setTimeout(() => setPulse(false), 1200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const formatted = count.toLocaleString();

  if (variant === 'minimal') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono font-bold tracking-tight text-white/90">
          {formatted}
        </span>
        <span className="text-[10px] text-white/50">downloads</span>

        {/* Floating +1 Bubble */}
        {hasIncremented && (
          <span className="absolute -top-3.5 right-0 animate-bounce text-[10px] font-extrabold text-emerald-400 bg-emerald-950/90 border border-emerald-500/50 px-1.5 py-0.2 rounded-full shadow-lg pointer-events-none">
            +1 Live
          </span>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/50 via-purple-950/30 to-emerald-950/40 border border-cyan-500/20 p-3.5 flex items-center justify-between text-white ${className}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 shrink-0">
            <Users size={18} className="text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                <TrendingUp size={12} /> Community Focus
              </span>
              <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <div className="text-xs text-white/70 mt-0.5">
              <strong className="text-white font-mono font-bold text-sm tracking-tight mr-1 text-glow">
                {formatted}
              </strong>
              people installed FocusScroll
            </div>
          </div>
        </div>

        {/* Floating +1 Pop */}
        {hasIncremented && (
          <div className="absolute right-4 top-2 animate-bounce bg-emerald-400 text-ink-950 font-black text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
            <Sparkles size={11} /> +1 Download!
          </div>
        )}
      </div>
    );
  }

  // Default: 'pill' variant
  return (
    <div
      className={`relative inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-high/80 border border-cyan-400/30 backdrop-blur-md text-xs transition-all duration-300 ${
        pulse ? 'ring-2 ring-emerald-400/50 bg-emerald-950/40 border-emerald-400/60' : ''
      } ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>

      {showIcon && <Download size={12} className="text-cyan-400 shrink-0" />}

      <span className="text-white/80 text-[11px] font-medium">
        <strong className="text-white font-mono font-bold text-xs tracking-tight text-cyan-300">
          {formatted}
        </strong>{' '}
        <span className="text-white/60 text-[10px] uppercase font-semibold tracking-wider">Downloads</span>
      </span>

      {/* Floating Animated +1 */}
      {hasIncremented && (
        <span className="absolute -top-3 right-1 animate-bounce text-[10px] font-extrabold text-emerald-300 bg-emerald-950 border border-emerald-400/60 px-1.5 py-0.5 rounded-full shadow-lg shadow-emerald-900/50 flex items-center gap-0.5">
          <Sparkles size={9} /> +1 Live
        </span>
      )}
    </div>
  );
}
