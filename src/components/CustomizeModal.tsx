import { useState, useEffect } from 'react';
import { X, RotateCcw, Check, Sparkles, Sliders, Palette, Gauge } from 'lucide-react';
import {
  CustomTheme,
  PRESET_THEMES,
  getStoredTheme,
  applyCustomTheme,
} from '@/lib/theme';
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

export default function CustomizeModal({ isOpen, onClose, onStartScroll }: Props) {
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(getStoredTheme());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Speed state
  const [speedConfig, setSpeedConfig] = useState<TargetSpeedConfig>(getTargetSpeedConfig());
  const [customSpeedInput, setCustomSpeedInput] = useState<string>('0.500');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredTheme();
      setCurrentTheme(stored);
      const matched = PRESET_THEMES.find(
        (p) =>
          p.primary.toLowerCase() === stored.primary.toLowerCase() &&
          p.secondary.toLowerCase() === stored.secondary.toLowerCase() &&
          p.tertiary.toLowerCase() === stored.tertiary.toLowerCase()
      );
      setActivePresetId(matched ? matched.id : null);

      const sp = getTargetSpeedConfig();
      setSpeedConfig(sp);
      setCustomSpeedInput((sp.customSeconds || 0.5).toFixed(3));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateColor = (key: 'primary' | 'secondary' | 'tertiary', val: string) => {
    const updated = {
      ...currentTheme,
      id: 'custom',
      name: 'Custom Palette',
      [key]: val,
    };
    setCurrentTheme(updated);
    setActivePresetId(null);
    applyCustomTheme(updated);
  };

  const handleSelectPreset = (preset: CustomTheme) => {
    setCurrentTheme(preset);
    setActivePresetId(preset.id);
    applyCustomTheme(preset);
  };

  const handleReset = () => {
    const defaultTheme = PRESET_THEMES[0];
    setCurrentTheme(defaultTheme);
    setActivePresetId(defaultTheme.id);
    applyCustomTheme(defaultTheme);
  };

  const handleSelectSpeedMode = (mode: TargetSpeedConfig['mode']) => {
    const newSp: TargetSpeedConfig = { ...speedConfig, mode };
    if (mode === 'custom') {
      const parsed = parseFloat(customSpeedInput) || 0.5;
      newSp.customSeconds = Math.max(0, Math.round(parsed * 1000) / 1000);
    }
    setSpeedConfig(newSp);
    setTargetSpeedConfig(newSp);
  };

  const handleCustomSpeedChange = (val: string) => {
    setCustomSpeedInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const safe = Math.round(parsed * 1000) / 1000;
      const newSp: TargetSpeedConfig = {
        mode: 'custom',
        customSeconds: safe,
      };
      setSpeedConfig(newSp);
      setTargetSpeedConfig(newSp);
    }
  };

  const getActiveIncrement = () => {
    if (speedConfig.mode === 'custom') {
      const parsed = parseFloat(customSpeedInput);
      return isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed * 1000) / 1000);
    }
    const preset = SPEED_PRESETS.find((p) => p.mode === speedConfig.mode);
    return preset ? preset.increment : 0.7;
  };

  const activeIncrement = getActiveIncrement();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-3xl bg-ink-900 border border-white/15 p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Customization & Options</h2>
              <p className="text-xs text-white/50">Personalize theme colors & target growth speed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Colors */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
            <Sparkles size={13} className="text-cyan-400" /> Color Preset Themes
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESET_THEMES.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col items-start gap-2 p-2.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-cyan-400 bg-white/10 ring-1 ring-cyan-400/50 shadow-lg'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-white/90 truncate">{preset.name}</span>
                    {isSelected && <Check size={14} className="text-cyan-400 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1.5 w-full">
                    <div
                      className="h-4 w-4 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: preset.primary }}
                      title="Primary"
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: preset.secondary }}
                      title="Secondary"
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: preset.tertiary }}
                      title="Tertiary"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Pickers */}
        <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            <Sliders size={13} className="text-cyan-400" /> Fine-Tune Custom Colors
          </label>

          {/* Primary Color */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/20 border border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md"
                style={{ backgroundColor: currentTheme.primary }}
              >
                <input
                  type="color"
                  value={currentTheme.primary}
                  onChange={(e) => updateColor('primary', e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Primary Color</div>
                <div className="text-[11px] text-white/40">Background canvas & dark surfaces</div>
              </div>
            </div>
            <input
              type="text"
              value={currentTheme.primary}
              onChange={(e) => updateColor('primary', e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Secondary Color */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/20 border border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md"
                style={{ backgroundColor: currentTheme.secondary }}
              >
                <input
                  type="color"
                  value={currentTheme.secondary}
                  onChange={(e) => updateColor('secondary', e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Secondary Color</div>
                <div className="text-[11px] text-white/40">Glow, active buttons, charts & highlights</div>
              </div>
            </div>
            <input
              type="text"
              value={currentTheme.secondary}
              onChange={(e) => updateColor('secondary', e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Tertiary Color */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/20 border border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md"
                style={{ backgroundColor: currentTheme.tertiary }}
              >
                <input
                  type="color"
                  value={currentTheme.tertiary}
                  onChange={(e) => updateColor('tertiary', e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tertiary Color</div>
                <div className="text-[11px] text-white/40">Main text typography & card borders</div>
              </div>
            </div>
            <input
              type="text"
              value={currentTheme.tertiary}
              onChange={(e) => updateColor('tertiary', e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Section 2: Target Change Speed */}
        <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            <Gauge size={13} className="text-cyan-400" /> Target Change Speed
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPEED_PRESETS.map((p) => {
              const isSelected = speedConfig.mode === p.mode;
              return (
                <button
                  key={p.mode}
                  onClick={() => handleSelectSpeedMode(p.mode)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-white/10 ring-1 ring-cyan-400/50'
                      : 'border-white/10 bg-black/20 hover:bg-white/5'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{p.label}</span>
                    {isSelected && <Check size={12} className="text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">{p.desc}</div>
                </button>
              );
            })}

            {/* Custom Mode Button */}
            <button
              onClick={() => handleSelectSpeedMode('custom')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                speedConfig.mode === 'custom'
                  ? 'border-cyan-400 bg-white/10 ring-1 ring-cyan-400/50'
                  : 'border-white/10 bg-black/20 hover:bg-white/5'
              }`}
            >
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Advanced</span>
                {speedConfig.mode === 'custom' && <Check size={12} className="text-cyan-400" />}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">Exact _.___s</div>
            </button>
          </div>

          {/* Advanced Exact Seconds Input */}
          {speedConfig.mode === 'custom' && (
            <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-cyan-400/30 space-y-1.5 animate-fade-in">
              <div className="text-[11px] font-bold text-cyan-300">Set Exact Increment (up to 1ms / 0.001s)</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="60"
                  value={customSpeedInput}
                  onChange={(e) => handleCustomSpeedChange(e.target.value)}
                  placeholder="0.500"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-mono text-white font-bold focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-white/50 shrink-0 font-medium">sec / short</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-white/50 pt-1 flex items-center justify-between">
            <span>Target rate per scroll:</span>
            <strong className="text-cyan-300 font-mono font-bold">+{activeIncrement.toFixed(3)}s</strong>
          </div>
        </div>

        {/* Live Preview Card with Start Scroll Button */}
        <div className="rounded-2xl p-4 border border-white/10 space-y-3 transition-colors shadow-inner" style={{ backgroundColor: currentTheme.primary }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: currentTheme.tertiary }}>
              Live Theme Preview
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: currentTheme.secondary, color: currentTheme.primary }}
            >
              Active Accent
            </span>
          </div>

          <div className="text-sm font-bold leading-tight" style={{ color: currentTheme.tertiary }}>
            Focus Attention Tracker
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                if (onStartScroll) {
                  onStartScroll();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: currentTheme.secondary,
                color: currentTheme.primary,
                boxShadow: `0 0 12px ${currentTheme.secondary}55`,
              }}
            >
              Start Scroll
            </button>
            <span className="text-xs font-semibold" style={{ color: currentTheme.secondary }}>
              +{activeIncrement.toFixed(1)}s target speed
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-400 text-ink-950 font-bold text-xs hover:bg-cyan-300 transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
