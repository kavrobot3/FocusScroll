import { useState, useEffect } from 'react';
import { Palette, Chrome, Download, Sparkles } from 'lucide-react';
import {
  getYouTubeApiKey,
  isQuotaExhausted,
  getCachedVideos,
  getCacheAge,
  getLastApiError,
} from '@/lib/youtube';
import {
  getRecentDwellRecords,
  getAverageDwell,
  getWeeklyGrowthSeconds,
  getCalibrationAverage,
  isCalibrated,
  getDwellRecords,
} from '@/lib/storage';
import SearchOverlay from '@/components/SearchOverlay';
import CustomizeModal from '@/components/CustomizeModal';
import CreditsModal from '@/components/CreditsModal';
import ExtensionInstallModal from '@/components/ExtensionInstallModal';
import { generateAndDownloadExtensionZip } from '@/lib/extensionZip';

interface Props {
  onEnterFeed: (topic?: string) => void;
  onOpenStats?: () => void;
}

export default function HomePage({ onEnterFeed }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const [, setFocusClickCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  const avgDwell = getAverageDwell();
  const weeklyGrowth = getWeeklyGrowthSeconds();

  // Calculate real focus score dynamically based on real average dwell time
  const focusScore = avgDwell > 0 ? Math.min(99, Math.max(0, Math.round(avgDwell * 2.5))) : 0;

  useEffect(() => {
    if (tapCount >= 5) {
      setShowDebug(true);
      setTapCount(0);
    }
  }, [tapCount]);

  const handleStatTap = () => {
    setTapCount((c) => c + 1);
  };

  const handleFocusClick = () => {
    setFocusClickCount((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setIsCreditsOpen(true);
        return 0;
      }
      return next;
    });
  };

  const handleSelectTopic = (topic: string) => {
    onEnterFeed(topic);
  };

  const handleInstallExtension = async () => {
    setIsExtensionModalOpen(true);
    try {
      await generateAndDownloadExtensionZip();
    } catch (err) {
      console.error('Failed downloading extension zip:', err);
    }
  };

  return (
    <div className="antialiased min-h-full overflow-y-auto scrollbar-hide flex flex-col font-body text-body radial-gradient-bg bg-surface-container-lowest text-on-surface pb-28">
      {/* TopAppBar with Customize Options Button */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-margin-mobile h-16 shrink-0">
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-primary font-bold text-xs">
            FS
          </div>
        </div>
        <div className="font-display-lg text-display-lg tracking-tighter text-primary text-[22px] font-bold leading-none">
          FOCUS
        </div>
        <button
          onClick={() => setIsCustomizeOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high border border-white/10 text-xs text-primary font-semibold hover:bg-white/10 transition-all shadow-sm active:scale-95"
          title="Customize Theme Colors"
        >
          <Palette size={14} />
          <span>Options</span>
        </button>
      </header>

      {/* Main Content Canvas - Fully scrollable */}
      <main className="flex-grow pt-6 pb-12 px-margin-mobile flex flex-col gap-xl max-w-[1440px] mx-auto w-full md:px-margin-desktop">
        {/* Hero Metrics */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-xl md:gap-gutter">
          <div
            onClick={handleStatTap}
            className="flex flex-col items-start w-full md:w-1/2 gap-sm cursor-pointer select-none"
          >
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
              Average Watch-Time
            </span>
            <div className="font-number-xl text-number-xl text-primary text-[52px] md:text-[64px] font-bold leading-tight text-glow">
              {avgDwell > 0
                ? weeklyGrowth > 0
                  ? `+${weeklyGrowth.toFixed(1)}s`
                  : `${avgDwell.toFixed(1)}s`
                : '0.0s'}
            </div>
            <div className="font-body text-body text-on-surface-variant mt-unit text-sm md:text-base">
              {avgDwell > 0
                ? weeklyGrowth > 0
                  ? 'Sustained attention growth this week'
                  : 'Average watch time per video'
                : 'No watch time recorded yet — start scrolling below'}
            </div>
          </div>

          {/* Focus Score Circular Element */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-end">
            <div
              onClick={handleFocusClick}
              className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center rounded-full glass-panel glow-secondary cursor-pointer active:scale-95 transition-transform select-none"
            >
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="2"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke="#c4c0ff"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * focusScore) / 100}
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="font-number-xl text-number-xl text-on-surface text-[34px] md:text-[38px] font-bold leading-none">
                  {focusScore}
                </span>
                <span className="font-label-caps text-label-caps text-secondary mt-unit uppercase tracking-wider text-[11px]">
                  Focus Score
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Quote Area */}
        <section className="py-md px-md md:px-xl border-l-2 border-primary/30 my-2">
          <p className="font-headline text-headline italic text-on-surface-variant max-w-2xl text-base md:text-xl leading-relaxed font-light">
            "What destroyed your attention will now help you{' '}
            <span className="text-primary text-glow font-normal not-italic">rebuild it.</span>"
          </p>
        </section>

        {/* Intent Search */}
        <section className="flex flex-col gap-md">
          <div
            onClick={() => setIsSearchOpen(true)}
            className="relative group cursor-pointer"
          >
            <span className="material-symbols-outlined absolute left-md top-1/2 transform -translate-y-1/2 text-on-surface-variant/50 z-10">
              search
            </span>
            <input
              readOnly
              type="text"
              placeholder="What do you want to watch?"
              className="w-full bg-surface-container-high text-on-surface font-body text-body py-md md:py-lg pl-xl pr-md rounded-full border border-outline-variant/30 group-hover:border-primary/50 transition-all placeholder:text-on-surface-variant/50 glass-panel bg-surface-container-low/70 cursor-pointer text-sm md:text-base pointer-events-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-sm px-sm">
            <span className="font-label-caps text-label-caps text-on-surface-variant/50 mr-sm py-sm text-[11px] uppercase tracking-wider">
              Explore Topics:
            </span>
            {['Science', 'Space', 'Tech', 'Cooking', 'Mindset', 'Fitness'].map((cat) => (
              <button
                key={cat}
                onClick={() => handleSelectTopic(cat)}
                className="px-md py-sm rounded-full border border-outline-variant/40 text-on-surface-variant font-caption text-caption hover:bg-surface-container-highest hover:text-primary transition-colors text-xs"
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Primary Action & Chrome Extension CTA */}
        <section className="mt-4 flex flex-col items-center gap-4 pb-6">
          <button
            onClick={() => onEnterFeed()}
            className="w-full md:w-auto bg-primary text-on-primary font-headline text-headline py-md md:py-lg px-xxl rounded-full glow-primary hover:scale-[1.02] active:scale-95 transition-transform duration-200 font-semibold tracking-wide text-center cursor-pointer shadow-lg"
          >
            Start focused scrolling
          </button>

          {/* Shiny Chrome Extension Install Card / Button */}
          <div className="w-full max-w-md relative group mt-1">
            {/* Animated Glow Halo Background */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse" />
            
            <button
              onClick={handleInstallExtension}
              className="relative w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-ink-950/90 hover:bg-ink-900 border border-cyan-400/40 text-left transition-all duration-200 cursor-pointer shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 group-hover:scale-105 transition-transform shrink-0">
                  <Chrome size={22} className="text-cyan-400" />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-ink-950">
                    <Download size={10} strokeWidth={3} />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                      Install Extension
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={10} /> Chrome
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-snug">
                    Use directly on YouTube Shorts & Instagram Reels
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-cyan-300 bg-cyan-400/10 px-3 py-1.5 rounded-xl border border-cyan-400/20 group-hover:bg-cyan-400 group-hover:text-ink-950 transition-all shrink-0">
                <span>Get ZIP</span>
                <Download size={13} />
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTopic={handleSelectTopic}
      />

      {/* Customize Theme Modal */}
      <CustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        onStartScroll={() => onEnterFeed()}
      />

      {/* Secret Credits Modal */}
      <CreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
      />

      {/* Chrome Extension Step-by-Step Installation Modal */}
      <ExtensionInstallModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />

      {/* Debug Panel */}
      {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
    </div>
  );
}

function DebugPanel({ onClose }: { onClose: () => void }) {
  const apiKey = getYouTubeApiKey();
  const quotaExhausted = isQuotaExhausted();
  const cachedVideos = getCachedVideos();
  const cacheAge = getCacheAge();
  const recentDwell = getRecentDwellRecords(5);
  const lastError = getLastApiError();
  const calibrated = isCalibrated();
  const calAvg = getCalibrationAverage();
  const recordCount = getDwellRecords().length;

  let status: string;
  let statusColor: string;
  if (!apiKey) {
    status = 'No VITE_YOUTUBE_API_KEY';
    statusColor = 'text-amber-400';
  } else if (quotaExhausted) {
    status = 'Quota exhausted / Forbidden';
    statusColor = 'text-red-400';
  } else if (cachedVideos && cachedVideos.length > 0) {
    const ageMin = cacheAge ? Math.round(cacheAge / 60000) : 0;
    status = `Cached ${cachedVideos.length} videos (${ageMin}m ago)`;
    statusColor = 'text-primary';
  } else {
    status = 'Key present, fetching directly...';
    statusColor = 'text-white/60';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="mx-6 w-full max-w-[340px] rounded-2xl border border-white/20 bg-surface-container-high p-5 shadow-2xl text-on-surface">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Judge Mode / Debug</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-white/40">API Status: </span>
            <span className={statusColor}>{status}</span>
          </div>

          <div>
            <span className="text-white/40">Calibration: </span>
            <span className="text-primary font-medium">
              {calibrated
                ? `Completed (${calAvg}s avg)`
                : `In progress (${recordCount}/13 scrolls)`}
            </span>
          </div>

          {lastError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-[11px] text-red-300 break-words font-mono">
              <span className="font-bold text-red-400 block mb-0.5">Last Raw API Error:</span>
              {lastError}
            </div>
          )}

          <div>
            <span className="text-white/40">Cached videos: </span>
            <span className="text-white/70">{cachedVideos?.length ?? 0}</span>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="text-white/40 mb-2">Last 5 Dwell Records:</div>
            {recentDwell.length === 0 ? (
              <div className="text-white/30 italic">No dwell records yet</div>
            ) : (
              <div className="space-y-1 font-mono text-[10px]">
                {recentDwell.map((r, i) => (
                  <div key={i} className="text-white/60">
                    {r.dwellSeconds}s / target {Math.round(r.targetDuration)}s
                    {r.videoId ? ` / ${r.videoId.slice(0, 11)}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
