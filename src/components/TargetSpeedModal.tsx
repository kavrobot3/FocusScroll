import { useState, useEffect } from 'react';
import { X, Gauge, Check, Sliders, Info } from 'lucide-react';
import {
  TargetSpeedConfig,
  SPEED_PRESETS,
  getTargetSpeedConfig,
  setTargetSpeedConfig,
} from '@/lib/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStartScroll?: () => void;
}

export default function TargetSpeedModal({ isOpen, onClose, onStartScroll }: Props) {
  const [config, setConfig] = useState<TargetSpeedConfig>(getTargetSpeedConfig());
  const [customInput, setCustomInput] = useState<string>('0.500');

  useEffect(() => {
    if (isOpen) {
      const current = getTargetSpeedConfig();
      setConfig(current);
      setCustomInput((current.customSeconds || 0.5).toFixed(3));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectMode = (mode: TargetSpeedConfig['mode']) => {
    const newConfig: TargetSpeedConfig = { ...config, mode };
    if (mode === 'custom') {
      const parsed = parseFloat(customInput) || 0.5;
      newConfig.customSeconds = Math.max(0, Math.round(parsed * 1000) / 1000);
    }
    setConfig(newConfig);
    setTargetSpeedConfig(newConfig);
  };

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const safe = Math.round(parsed * 1000) / 1000;
      const newConfig: TargetSpeedConfig = {
        mode: 'custom',
        customSeconds: safe,
      };
      setConfig(newConfig);
      setTargetSpeedConfig(newConfig);
    }
  };

  const getCurrentIncrement = () => {
    if (config.mode === 'custom') {
      const parsed = parseFloat(customInput);
      return isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed * 1000) / 1000);
    }
    const preset = SPEED_PRESETS.find((p) => p.mode === config.mode);
    return preset ? preset.increment : 0.7;
  };

  const activeIncrement = getCurrentIncrement();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-3xl bg-ink-900 border border-white/15 p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">
              <Gauge size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Target Growth Speed</h2>
              <p className="text-xs text-white/50">Control how fast required watch target increases per short</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Speed Presets Grid */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            <Gauge size={13} className="text-cyan-400" /> Presets Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SPEED_PRESETS.map((preset) => {
              const isSelected = config.mode === preset.mode;
              return (
                <button
                  key={preset.mode}
                  onClick={() => handleSelectMode(preset.mode)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-white/10 ring-1 ring-cyan-400/50 shadow-lg'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{preset.label}</span>
                      {preset.increment > 0 && (
                        <span className="text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.2 rounded">
                          +{preset.increment}s
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">{preset.desc}</div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-ink-950 shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Custom Mode */}
        <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" /> Advanced Exact Rate (up to 1ms)
            </label>
            <button
              onClick={() => handleSelectMode('custom')}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                config.mode === 'custom'
                  ? 'bg-cyan-400 text-ink-950'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {config.mode === 'custom' ? 'Active' : 'Enable Custom'}
            </button>
          </div>

          <p className="text-[11px] text-white/50 leading-relaxed">
            Specify precise target time increment per short down to 1 millisecond (0.001s).
          </p>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.001"
                min="0"
                max="60"
                value={customInput}
                onChange={(e) => handleCustomChange(e.target.value)}
                onFocus={() => handleSelectMode('custom')}
                placeholder="0.500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/40">
                seconds / short
              </span>
            </div>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="rounded-2xl p-4 bg-cyan-400/10 border border-cyan-400/20 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-white">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Info size={14} /> Active Speed Setting
            </span>
            <span className="text-cyan-400 font-mono text-sm">
              +{activeIncrement.toFixed(3)}s / short
            </span>
          </div>
          <div className="text-[11px] text-white/70">
            For every short you scroll past, your required target duration will grow by{' '}
            <strong className="text-white">{activeIncrement.toFixed(3)}s</strong>.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {onStartScroll ? (
            <button
              onClick={() => {
                onClose();
                onStartScroll();
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
            >
              Start Scroll
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-400 text-ink-950 font-bold text-xs hover:bg-cyan-300 transition-all shadow-md"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
