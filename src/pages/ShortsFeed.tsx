import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, Volume2, VolumeX, ExternalLink, Search, X, Lock } from 'lucide-react';
import VIDEOS from '@/lib/videos';
import {
  getTargetDuration,
  addDwellRecord,
  recordSwipe,
  getSessionStartTarget,
  recordSessionEndTarget,
  addStoredSearch,
} from '@/lib/storage';
import {
  fetchYouTubeVideos,
  buildFeedQueue,
  clearQuotaFlag,
  type YTVideo,
} from '@/lib/youtube';
import useYTPlayer from '@/lib/useYTPlayer';
import Celebration from '@/components/Celebration';

interface Props {
  onExit: () => void;
}

type FeedMode = 'loading' | 'youtube' | 'fallback';

export default function ShortsFeed({ onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [feedMode, setFeedMode] = useState<FeedMode>('loading');
  const [ytQueue, setYtQueue] = useState<YTVideo[]>([]);

  // Build the effective feed variables
  const isYouTube = feedMode === 'youtube' && ytQueue.length > 0;
  const listLength = isYouTube ? Math.max(150, ytQueue.length * 5) : VIDEOS.length * 20;

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string | null>(null);

  // Forced timer state & celebration
  const [isLockedState, setIsLockedState] = useState(true);
  const [lockNotice, setLockNotice] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const celebratedMilestonesRef = useRef<Set<number>>(new Set());

  const [activePlayerReady, setActivePlayerReady] = useState(false);
  const activeWatchSecRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const lockNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const screenStartRef = useRef<number>(Date.now());
  const isScrollingRef = useRef(false);
  const hasApiErrorRef = useRef(false);

  // Reset active player ready status whenever active index changes
  useEffect(() => {
    setActivePlayerReady(false);
  }, [activeIndex]);

  const handleActiveReady = useCallback(() => {
    setActivePlayerReady(true);
  }, []);
  const lastTapTimeRef = useRef<number>(0);

  const triggerLockNotice = useCallback(() => {
    setLockNotice(true);
    if (lockNoticeTimerRef.current) clearTimeout(lockNoticeTimerRef.current);
    lockNoticeTimerRef.current = setTimeout(() => setLockNotice(false), 1400);
  }, []);

  const handleIsPlayingChange = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
  }, []);

  // Continuously track active watch time (only when video is playing) and check lock
  useEffect(() => {
    activeWatchSecRef.current = 0;
    isPlayingRef.current = false;
    celebratedMilestonesRef.current = new Set();
    setIsLockedState(true);

    const interval = setInterval(() => {
      if (isPlayingRef.current && document.visibilityState === 'visible') {
        activeWatchSecRef.current += 0.1;
      }

      const currentWatch = activeWatchSecRef.current;
      const target = getTargetDuration(activeIndex);
      let forcedWait = Math.max(0, target - 5);
      if (isYouTube && ytQueue.length > 0 && ytQueue[activeIndex % ytQueue.length]?.durationSec) {
        const dur = ytQueue[activeIndex % ytQueue.length].durationSec!;
        if (dur > 0) {
          forcedWait = Math.min(forcedWait, Math.max(0, dur - 3));
        }
      }
      const locked = currentWatch < forcedWait;
      setIsLockedState(locked);

      // Celebration milestones based on actual active playing time
      // (30s, 1min, 1.5min, 2min, 3min)
      const milestones = [
        { sec: 30, msg: 'Awesome focus! You reached 30 seconds of active watching!' },
        { sec: 60, msg: 'Incredible focus! You reached 1 minute of active watching!' },
        { sec: 90, msg: 'Deep focus state! You reached 1.5 minutes of active watching!' },
        { sec: 120, msg: 'Master level focus! You reached 2 minutes of active watching!' },
        { sec: 180, msg: 'Zen master focus! You reached 3 minutes of active watching!' },
      ];

      for (const m of milestones) {
        if (currentWatch >= m.sec && !celebratedMilestonesRef.current.has(m.sec)) {
          celebratedMilestonesRef.current.add(m.sec);
          setCelebrationMsg(m.msg);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeIndex, isYouTube, ytQueue]);

  // Load YouTube videos on mount using session search or defaults
  const loadFeed = useCallback((customSearch?: string) => {
    setFeedMode('loading');
    clearQuotaFlag();
    let cancelled = false;
    fetchYouTubeVideos(customSearch).then(({ videos, error }) => {
      if (cancelled) return;
      if (videos.length > 0) {
        const startTarget = getSessionStartTarget();
        const queue = buildFeedQueue(videos, startTarget, 1);
        setYtQueue(queue);
        setFeedMode('youtube');
        setActiveIndex(0);
      } else {
        hasApiErrorRef.current = true;
        setFeedMode('fallback');
      }
      void error;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Handle Search Submission
  const handleSearchSubmit = () => {
    const clean = searchQuery.trim();
    if (!clean) return;
    addStoredSearch(clean);
    setActiveSearchTerm(clean);
    setIsSearchOpen(false);
    loadFeed(clean);
  };

  // Record session end target on exit
  const handleExitSession = useCallback(() => {
    recordSessionEndTarget(activeIndex);
    onExit();
  }, [activeIndex, onExit]);

  const recordCurrent = useCallback(
    (fromIndex: number) => {
      const dwell = Math.round(activeWatchSecRef.current * 10) / 10;
      const screenTime = Date.now() - screenStartRef.current;
      if (isYouTube) {
        const video = ytQueue[fromIndex % ytQueue.length];
        addDwellRecord({
          videoIndex: fromIndex,
          targetDuration: getTargetDuration(fromIndex),
          dwellSeconds: dwell,
          timestamp: Date.now(),
          videoId: video?.videoId,
          youtubeDurationSec: video?.durationSec,
        });
      } else {
        addDwellRecord({
          videoIndex: fromIndex,
          targetDuration: getTargetDuration(fromIndex),
          dwellSeconds: dwell,
          timestamp: Date.now(),
        });
      }
      recordSwipe(dwell, screenTime);
      activeWatchSecRef.current = 0;
    },
    [isYouTube, ytQueue]
  );

  const isTimerLocked = useCallback(() => {
    const target = getTargetDuration(activeIndex);
    let forcedWait = Math.max(0, target - 5);
    if (isYouTube && ytQueue.length > 0 && ytQueue[activeIndex % ytQueue.length]?.durationSec) {
      const dur = ytQueue[activeIndex % ytQueue.length].durationSec!;
      if (dur > 0) {
        forcedWait = Math.min(forcedWait, Math.max(0, dur - 3));
      }
    }
    return activeWatchSecRef.current < forcedWait;
  }, [activeIndex, isYouTube, ytQueue]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      // Forced timer check when skipping forward: target minus 5s
      if (index > activeIndex && isTimerLocked()) {
        triggerLockNotice();
        return;
      }

      const targetEl = container.children[index] as HTMLElement;
      if (!targetEl) return;
      isScrollingRef.current = true;
      container.scrollTo({ top: targetEl.offsetTop, behavior: 'smooth' });
      recordCurrent(activeIndex);
      setActiveIndex(index);
      setShowHint(false);
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 400);
    },
    [activeIndex, isTimerLocked, recordCurrent, triggerLockNotice]
  );

  const handleAutoAdvance = useCallback(() => {
    if (activeIndex + 1 < listLength) {
      scrollToIndex(activeIndex + 1);
    }
  }, [activeIndex, listLength, scrollToIndex]);

  // Double tap handler on container
  const handleContainerTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      // Double tap detected
      setIsSearchOpen((prev) => !prev);
    }
    lastTapTimeRef.current = now;
  };

  // Touch + wheel + scroll lock handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedMode === 'loading') return;

    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > 10 && isTimerLocked()) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        triggerLockNotice();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      const dy = touchStartY - e.changedTouches[0].clientY;
      const dx = touchStartX - e.changedTouches[0].clientX;

      if (dx > 80 && Math.abs(dx) > Math.abs(dy)) {
        recordCurrent(activeIndex);
        handleExitSession();
        return;
      }

      if (Math.abs(dy) < 40) return;
      if (dy > 0) {
        if (isTimerLocked()) {
          triggerLockNotice();
          return;
        }
        const next = activeIndex + 1;
        if (next < listLength) scrollToIndex(next);
      } else if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) return;
      if (Math.abs(e.deltaY) < 20) return;
      if (e.deltaY > 0 && isTimerLocked()) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        triggerLockNotice();
        return;
      }
      if (e.deltaY > 0) {
        const next = activeIndex + 1;
        if (next < listLength) scrollToIndex(next);
      } else if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
      }
    };

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      const activeEl = container.children[activeIndex] as HTMLElement;
      if (!activeEl) return;
      const targetTop = activeEl.offsetTop;
      if (container.scrollTop > targetTop + 5 && isTimerLocked()) {
        container.scrollTop = targetTop;
        triggerLockNotice();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeIndex, handleExitSession, isTimerLocked, scrollToIndex, listLength, recordCurrent, feedMode, triggerLockNotice]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Cleanup: record last dwell on unmount
  useEffect(() => {
    return () => {
      recordCurrent(activeIndex);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (feedMode === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
          <span className="text-xs text-white/40 tracking-widest uppercase">
            {activeSearchTerm ? `Searching "${activeSearchTerm}"...` : 'Refreshing feed...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black select-none">
      {/* Floating Search Bar Overlay with Backdrop */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-3 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md flex items-center gap-2 rounded-2xl bg-zinc-900/95 p-2.5 border border-white/20 shadow-2xl backdrop-blur-xl"
          >
            <Search size={18} className="ml-1 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit();
              }}
              placeholder="Search topics (e.g. chess, tech, art)..."
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSearchSubmit();
              }}
              className="rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-cyan-400 active:scale-95 shrink-0"
            >
              Search
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsSearchOpen(false);
              }}
              className="p-1 text-white/60 hover:text-white shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      <Celebration
        show={Boolean(celebrationMsg)}
        message={celebrationMsg || ''}
        onClose={() => setCelebrationMsg(null)}
      />

      {/* Locked Timer Subtle Overlay */}
      {lockNotice && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-semibold text-amber-300 border border-amber-500/30 shadow-2xl backdrop-blur-md animate-bounce">
          <Lock size={14} className="text-amber-400 shrink-0" />
          <span>Hang-on until u are close to the target</span>
        </div>
      )}

      <div
        ref={containerRef}
        onClick={handleContainerTap}
        className={`h-full w-full ${isLockedState ? 'overflow-hidden touch-none select-none' : 'overflow-y-scroll scrollbar-hide'}`}
        style={{ scrollSnapType: isLockedState ? 'none' : 'y mandatory' }}
      >
        {isYouTube
          ? Array.from({ length: listLength }).map((_, i) => {
              const video = ytQueue[i % ytQueue.length];
              const isCurrentActive = i === activeIndex;
              const isNextSlide = i === activeIndex + 1;
              const windowed = isCurrentActive || (isNextSlide && activePlayerReady);
              return (
                <YouTubeSlide
                  key={video.videoId + '-' + i}
                  video={video}
                  index={i}
                  active={isCurrentActive}
                  windowed={windowed}
                  gradientSeed={i % 5}
                  onAutoAdvance={handleAutoAdvance}
                  onIsPlayingChange={handleIsPlayingChange}
                  onActiveReady={handleActiveReady}
                />
              );
            })
          : Array.from({ length: listLength }).map((_, i) => (
              <PexelsSlide
                key={i}
                src={VIDEOS[i % VIDEOS.length]}
                index={i}
                active={i === activeIndex}
                gradientSeed={i % 5}
                onIsPlayingChange={handleIsPlayingChange}
                onActiveReady={handleActiveReady}
              />
            ))
        }
      </div>

      {/* Header controls: Exit & Search toggle */}
      <div className="absolute left-4 top-5 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            recordCurrent(activeIndex);
            handleExitSession();
          }}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/80 transition hover:bg-black/60 active:scale-90 border border-white/10"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => setIsSearchOpen((prev) => !prev)}
          aria-label="Search topics"
          className="flex h-9 items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 text-xs font-medium text-white/80 transition hover:bg-black/60 active:scale-90 border border-white/10"
        >
          <Search size={15} className="text-cyan-400" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>

      {showHint && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="flex flex-col items-center gap-2 text-white/50">
            <span className="text-xs tracking-widest uppercase">Swipe up</span>
            <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/30 p-1">
              <div className="h-2 w-1 rounded-full bg-white/50 animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── YouTube slide ───────────────────────────────────────────────

interface YTSlideProps {
  video: YTVideo;
  index: number;
  active: boolean;
  windowed: boolean;
  gradientSeed: number;
  onAutoAdvance?: () => void;
  onIsPlayingChange?: (playing: boolean) => void;
  onActiveReady?: () => void;
}

function YouTubeSlide({
  video,
  index,
  active,
  windowed,
  gradientSeed,
  onAutoAdvance,
  onIsPlayingChange,
  onActiveReady,
}: YTSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoSkipped, setAutoSkipped] = useState(false);

  const controls = useYTPlayer(containerRef, {
    videoId: video.videoId,
    active: active && !autoSkipped,
    mount: windowed,
    onReady: () => {
      if (active) onActiveReady?.();
    },
    onError: () => {
      if (active) setAutoSkipped(true);
    },
  });

  const {
    ready,
    failed,
    isPlaying,
    isMuted,
    progressPercent,
    togglePlayPause,
    toggleMute,
  } = controls;

  // Report active playing status to parent
  useEffect(() => {
    if (active) {
      onIsPlayingChange?.(isPlaying && !failed && !autoSkipped);
      if (ready || isPlaying) {
        onActiveReady?.();
      }
    } else {
      onIsPlayingChange?.(false);
    }
  }, [active, ready, isPlaying, failed, autoSkipped, onIsPlayingChange, onActiveReady]);

  // Auto-skip on error after 1.5s
  useEffect(() => {
    if ((failed || autoSkipped) && active) {
      const t = setTimeout(() => {
        setAutoSkipped(true);
        if (onAutoAdvance) onAutoAdvance();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [failed, autoSkipped, active, onAutoAdvance]);

  const handleContainerClick = () => {
    togglePlayPause();
  };

  const openYouTube = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.youtube.com/shorts/${video.videoId}`, '_blank');
  };

  const gradients = GRADIENTS[gradientSeed % GRADIENTS.length];
  const targetSec = Math.round(getTargetDuration(index));
  const targetLabel = index < 6 ? `Target: Calibrating (${index + 1}/6)` : `Target: ${targetSec}s`;
  const posterUrl = video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  return (
    <div
      onClick={handleContainerClick}
      className="snap-slide relative h-full w-full flex items-center justify-center bg-black overflow-hidden select-none cursor-pointer"
    >
      {/* Background Poster Thumbnail */}
      <div className="absolute inset-0 z-0 bg-black">
        <img
          src={posterUrl}
          alt={video.title}
          className="h-full w-full object-cover opacity-80 filter brightness-90"
          loading="lazy"
        />
      </div>

      {windowed && !autoSkipped ? (
        <div
          ref={containerRef}
          className={`absolute inset-0 z-10 yt-player-container pointer-events-none transition-opacity duration-200 ${
            active ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}

      {(autoSkipped || failed) && (
        <div
          className="animated-gradient absolute inset-0 z-10"
          style={
            {
              '--c1': gradients[0],
              '--c2': gradients[1],
              '--c3': gradients[2],
            } as React.CSSProperties
          }
        />
      )}

      {/* Loading spinner overlay before video starts playing */}
      {active && !isPlaying && !failed && !autoSkipped && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
        </div>
      )}

      {/* Dark gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Right side controls: Sound, Open in YT */}
      <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-4">
        {/* Sound/Mute Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="flex flex-col items-center gap-1 text-white/90 hover:text-white active:scale-90 transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg">
            {isMuted ? (
              <VolumeX size={20} className="text-red-400" />
            ) : (
              <Volume2 size={20} className="text-cyan-400" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>

        {/* Open in YT Button */}
        <button
          onClick={openYouTube}
          aria-label="Open in YouTube app"
          className="flex flex-col items-center gap-1 text-white/90 hover:text-white active:scale-90 transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600/90 backdrop-blur-md border border-red-400/30 shadow-lg text-white">
            <ExternalLink size={18} />
          </div>
          <span className="text-[10px] font-medium tracking-wide text-red-300">YouTube</span>
        </button>
      </div>

      {/* Video metadata on bottom left */}
      <div className="absolute left-4 bottom-10 z-30 max-w-[240px] text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-400/30 mb-2">
          <span>{targetLabel}</span>
        </div>
        <h3 className="text-sm font-semibold text-white/95 line-clamp-2 leading-snug drop-shadow">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-white/70 font-medium drop-shadow">
          {video.channelTitle}
        </p>
      </div>

      {/* Small red YouTube progress bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[3px] bg-white/20">
        <div
          className="h-full bg-red-600 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(255,0,0,0.9)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Pexels fallback slide ────────────────────────────────────────

interface PexelsSlideProps {
  src: string;
  index: number;
  active: boolean;
  gradientSeed: number;
  onIsPlayingChange?: (playing: boolean) => void;
  onActiveReady?: () => void;
}

function PexelsSlide({
  src,
  index,
  active,
  gradientSeed,
  onIsPlayingChange,
  onActiveReady,
}: PexelsSlideProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const gradients = GRADIENTS[gradientSeed % GRADIENTS.length];
  const targetSec = Math.round(getTargetDuration(index));
  const targetLabel = index < 6 ? `Target: Calibrating (${index + 1}/6)` : `Target: ${targetSec}s`;

  useEffect(() => {
    const v = localRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, [active]);

  useEffect(() => {
    if (active) {
      onIsPlayingChange?.(isPlaying && !failed);
      if (isPlaying) {
        onActiveReady?.();
      }
    } else {
      onIsPlayingChange?.(false);
    }
  }, [active, isPlaying, failed, onIsPlayingChange, onActiveReady]);

  const togglePlayPause = () => {
    const v = localRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = localRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleTimeUpdate = () => {
    const v = localRef.current;
    if (!v || !v.duration) return;
    setProgressPercent((v.currentTime / v.duration) * 100);
  };

  const openYouTube = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open('https://www.youtube.com/hashtag/shorts', '_blank');
  };

  return (
    <div
      onClick={togglePlayPause}
      className="snap-slide relative h-full w-full flex items-center justify-center bg-black cursor-pointer select-none overflow-hidden"
    >
      {failed ? (
        <div
          className="animated-gradient absolute inset-0"
          style={
            {
              '--c1': gradients[0],
              '--c2': gradients[1],
              '--c3': gradients[2],
            } as React.CSSProperties
          }
        />
      ) : (
        <video
          ref={localRef}
          src={src}
          className="h-full w-full object-cover"
          autoPlay
          loop
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onError={() => setFailed(true)}
        />
      )}

      {/* Dark gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

      {/* Right side controls: Sound, YouTube */}
      <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-4">
        {/* Sound/Mute Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="flex flex-col items-center gap-1 text-white/90 hover:text-white active:scale-90 transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg">
            {isMuted ? (
              <VolumeX size={20} className="text-red-400" />
            ) : (
              <Volume2 size={20} className="text-cyan-400" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>

        {/* Open in YT Button */}
        <button
          onClick={openYouTube}
          aria-label="Open in YouTube"
          className="flex flex-col items-center gap-1 text-white/90 hover:text-white active:scale-90 transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600/90 backdrop-blur-md border border-red-400/30 shadow-lg text-white">
            <ExternalLink size={18} />
          </div>
          <span className="text-[10px] font-medium tracking-wide text-red-300">YouTube</span>
        </button>
      </div>

      {/* Target badge on bottom left */}
      <div className="absolute left-4 bottom-10 z-30 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-400/30">
          <span>{targetLabel}</span>
        </div>
      </div>

      {/* Small red progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[3px] bg-white/20">
        <div
          className="h-full bg-red-600 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(255,0,0,0.9)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

const GRADIENTS = [
  ['#0a4d5e', '#06b6d4', '#155e75'],
  ['#1a3a2e', '#10b981', '#064e3b'],
  ['#3b1f4d', '#8b5cf6', '#4c1d6b'],
  ['#4d2a1a', '#f59e0b', '#7c2d12'],
  ['#1a2a4d', '#3b82f6', '#1e3a8a'],
];

