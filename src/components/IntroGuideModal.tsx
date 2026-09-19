import { useState, useEffect } from 'react';
import {
  X,
  Brain,
  Timer,
  Lock,
  Unlock,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Chrome,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStartScroll: () => void;
}

export default function IntroGuideModal({ isOpen, onClose, onStartScroll }: Props) {
  // Active view tab in modal
  const [activeTab, setActiveTab] = useState<'visual' | 'simulator' | 'faq'>('visual');

  // Interactive mini-simulator state
  const [simSeconds, setSimSeconds] = useState(0);
  const targetSimSeconds = 8;
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simSwipeAttempt, setSimSwipeAttempt] = useState<string | null>(null);

  // Preference: Don't show again on startup
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSimPlaying(false);
      setSimSeconds(0);
      setSimSwipeAttempt(null);
      return;
    }

    // Read stored preference
    try {
      const saved = localStorage.getItem('fs_skip_intro_popup');
      setDontShowAgain(saved === 'true');
    } catch {
      // Ignore
    }
  }, [isOpen]);

  // Simulator timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSimPlaying && simSeconds < targetSimSeconds) {
      interval = setInterval(() => {
        setSimSeconds((s) => {
          if (s + 1 >= targetSimSeconds) {
            setIsSimPlaying(false);
            return targetSimSeconds;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimPlaying, simSeconds, targetSimSeconds]);

  if (!isOpen) return null;

  const isUnlocked = simSeconds >= targetSimSeconds;
  const progressPercent = Math.min(100, Math.round((simSeconds / targetSimSeconds) * 100));

  const handleSimSwipe = () => {
    if (!isUnlocked) {
      const remaining = targetSimSeconds - simSeconds;
      setSimSwipeAttempt(`🔒 Locked! Stay focused for ${remaining}s more before swiping.`);
      setTimeout(() => setSimSwipeAttempt(null), 2500);
    } else {
      setSimSwipeAttempt('🎉 Unlocked! Swiping to next short. Focus Stamina +1!');
      setTimeout(() => {
        setSimSeconds(0);
        setIsSimPlaying(true);
        setSimSwipeAttempt(null);
      }, 1800);
    }
  };

  const handleClose = () => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('fs_skip_intro_popup', 'true');
      } else {
        localStorage.removeItem('fs_skip_intro_popup');
      }
    } catch {
      // Ignore
    }
    onClose();
  };

  const handleStart = () => {
    handleClose();
    onStartScroll();
  };

  const handleToggleDontShow = (checked: boolean) => {
    setDontShowAgain(checked);
    try {
      if (checked) {
        localStorage.setItem('fs_skip_intro_popup', 'true');
      } else {
        localStorage.removeItem('fs_skip_intro_popup');
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto rounded-3xl bg-surface-container-lowest border border-white/15 text-on-surface shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with glowing badge */}
        <div className="relative shrink-0 p-5 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-b from-primary/10 via-surface-container-low to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-md">
                <Brain size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Welcome to FocusScroll
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold uppercase tracking-wider">
                    How it works
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant/80 mt-0.5">
                  The anti-doomscroll gym for your attention span
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1.5 mt-4 p-1 rounded-xl bg-surface-container-high/80 border border-white/10">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'visual'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>The Concept</span>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <Timer size={13} />
              <span>Interactive Demo</span>
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'faq'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Quick Rules</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm">
          
          {/* TAB 1: VISUAL CONCEPT */}
          {activeTab === 'visual' && (
            <div className="space-y-4 animate-fade-in">
              {/* Problem vs Solution comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Standard TikTok/Reels */}
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    <span>Mindless Feeds</span>
                  </div>
                  <div className="mt-2 text-xs text-white/80 space-y-1.5">
                    <p className="font-semibold text-white">⚡ 3-second rapid flicking</p>
                    <p className="text-white/60 leading-relaxed">
                      Algorithms reward instant dopamine, training your brain to abandon content immediately and wrecking concentration.
                    </p>
                  </div>
                  <div className="mt-3 py-1 px-2.5 rounded-lg bg-red-500/20 text-red-300 text-[11px] font-medium text-center">
                    ❌ Fragmented attention
                  </div>
                </div>

                {/* FocusScroll */}
                <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>FocusScroll</span>
                  </div>
                  <div className="mt-2 text-xs text-white/80 space-y-1.5">
                    <p className="font-semibold text-white">🧠 Mindful target lock</p>
                    <p className="text-white/60 leading-relaxed">
                      You must watch for a calibrated target duration before the next short unlocks. It retrains your stamina from 5s to 45s+.
                    </p>
                  </div>
                  <div className="mt-3 py-1 px-2.5 rounded-lg bg-primary/20 text-primary text-[11px] font-medium text-center">
                    ✅ Deep focus recovery
                  </div>
                </div>
              </div>

              {/* 3 Step Visual Path */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest px-1">
                  How a session works in 3 steps:
                </h4>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-high/60 border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="font-semibold text-white text-xs sm:text-sm">
                      Calibration & Target Pacing
                    </h5>
                    <p className="text-xs text-on-surface-variant/80 mt-0.5 leading-relaxed">
                      Your first few videos calibrate your baseline attention. Afterwards, FocusScroll assigns progressive target times.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-high/60 border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-purple-400/20 text-purple-300 border border-purple-400/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="font-semibold text-white text-xs sm:text-sm">
                      Stay With The Video (Lock Notice)
                    </h5>
                    <p className="text-xs text-on-surface-variant/80 mt-0.5 leading-relaxed">
                      If you try to swipe prematurely, a gentle lock notification reminds you to stay engaged until the target completes.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-high/60 border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="font-semibold text-white text-xs sm:text-sm">
                      Unlock, Swipe & Level Up
                    </h5>
                    <p className="text-xs text-on-surface-variant/80 mt-0.5 leading-relaxed">
                      Once unlocked, swipe up smoothly to the next short! Check your Focus Score and watch your average attention span climb.
                    </p>
                  </div>
                </div>
              </div>

              {/* Extension Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent border border-cyan-400/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                    <Chrome size={18} />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white">Also works on real YouTube Shorts!</span>
                    <p className="text-white/60 text-[11px]">
                      Install our free extension to enforce focus locks on desktop.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-on-surface-variant leading-relaxed">
                Experience the core focus mechanic right now! Watch the simulated timer, try swiping early, and see how the lock protects your attention.
              </div>

              {/* Simulated Phone Video Player */}
              <div className="relative rounded-2xl bg-black border border-white/20 p-4 overflow-hidden shadow-xl flex flex-col items-center justify-center min-h-[220px]">
                {/* Background ambient glow */}
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isUnlocked ? 'bg-emerald-500/10' : 'bg-primary/5'
                  }`}
                />

                {/* Status Pill */}
                <div className="relative z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs mb-3">
                  {isUnlocked ? (
                    <>
                      <Unlock size={14} className="text-emerald-400 animate-bounce" />
                      <span className="text-emerald-300 font-bold">Unlocked! Swipe Ready</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} className="text-amber-400" />
                      <span className="text-amber-300 font-semibold">
                        Focus Target: {simSeconds}s / {targetSimSeconds}s
                      </span>
                    </>
                  )}
                </div>

                {/* Circular Progress Display */}
                <div className="relative w-24 h-24 flex items-center justify-center my-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={isUnlocked ? '#34d399' : '#81ffec'}
                      strokeWidth="6"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * progressPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-300 ease-linear"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-lg font-bold text-white">
                      {targetSimSeconds - simSeconds}s
                    </span>
                    <span className="text-[10px] text-white/50 uppercase">
                      {isUnlocked ? 'Ready' : 'Left'}
                    </span>
                  </div>
                </div>

                {/* Swipe attempt feedback message */}
                {simSwipeAttempt && (
                  <div className="relative z-10 mt-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold text-center animate-shake">
                    {simSwipeAttempt}
                  </div>
                )}

                {/* Simulator Controls */}
                <div className="relative z-10 flex items-center gap-2 mt-4 w-full max-w-xs">
                  {!isSimPlaying ? (
                    <button
                      onClick={() => setIsSimPlaying(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:scale-102 active:scale-95 transition-transform"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>{simSeconds === 0 ? 'Start Video' : 'Resume Video'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSimPlaying(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
                    >
                      Pause
                    </button>
                  )}

                  <button
                    onClick={handleSimSwipe}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      isUnlocked
                        ? 'bg-emerald-500 text-black border-emerald-400 hover:scale-105 animate-pulse'
                        : 'bg-white/5 text-white/90 border-white/20 hover:bg-white/15'
                    }`}
                  >
                    {isUnlocked ? 'Swipe Up 👆' : 'Try Swiping Early'}
                  </button>

                  <button
                    onClick={() => {
                      setSimSeconds(0);
                      setIsSimPlaying(false);
                      setSimSwipeAttempt(null);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Reset Simulator"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-high/50 border border-white/10 text-xs text-white/70 space-y-1">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-primary" /> Key Takeaway:
                </p>
                <p>
                  You don't need to force yourself to quit watching videos — FocusScroll simply introduces intentional pacing so your brain regains its natural focus span.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: FAQ & QUICK RULES */}
          {activeTab === 'faq' && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-white/10 space-y-1">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-primary" />
                  "Why is the video locked when I try to swipe?"
                </h5>
                <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                  That lock is the core feature! It enforces a brief mindfulness window so you don't mindlessly flick after 2 seconds. When the target finishes, you can swipe freely.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-white/10 space-y-1">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-400" />
                  "What does the Focus Score mean?"
                </h5>
                <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                  Your Focus Score (0 to 100) measures your sustained attention stamina. As your average dwell time per short rises, your focus score increases!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-white/10 space-y-1">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  "Can I pick what topics I watch?"
                </h5>
                <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                  Yes! Click the search bar or pick any topic like Science, Tech, Cooking, Space, or Mindset to feed your brain high-value educational content.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-white/10 space-y-1">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Chrome size={14} className="text-cyan-400" />
                  "How does the Chrome Extension work?"
                </h5>
                <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                  Click <strong>Install Extension</strong> on the home screen to download the pre-packaged ZIP. Load it in Chrome to get the exact same focus timer on YouTube Shorts and Instagram Reels.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-surface-container-low/95 backdrop-blur-md flex flex-col gap-3">
          {/* Startup Toggle Option */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  Disable guide on startup
                </span>
                <span className="text-[11px] text-white/50">
                  You can re-open this guide anytime using the Guide button on Home
                </span>
              </div>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => handleToggleDontShow(e.target.checked)}
                className="w-5 h-5 rounded-md bg-surface-container-highest border-white/30 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-primary shrink-0"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors text-center cursor-pointer"
            >
              Explore Home
            </button>
            <button
              onClick={handleStart}
              className="flex-2 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-primary text-on-primary font-bold text-xs sm:text-sm tracking-wide glow-primary hover:scale-[1.01] active:scale-98 transition-all shadow-lg cursor-pointer"
            >
              <span>Start Scrolling</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
