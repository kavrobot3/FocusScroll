import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, ExternalLink } from 'lucide-react';
import VIDEOS from '@/lib/videos';
import {
  getTargetDuration,
  addDwellRecord,
  recordSwipe,
  getSessionStartTarget,
  recordSessionEndTarget,
  addStoredSearch,
  addWatchHistory,
  isCalibrated,
} from '@/lib/storage';
import {
  fetchYouTubeVideos,
  buildFeedQueue,
  clearQuotaFlag,
  type YTVideo,
} from '@/lib/youtube';
import useYTPlayer from '@/lib/useYTPlayer';
import Celebration from '@/components/Celebration';
import SearchOverlay from '@/components/SearchOverlay';

interface Props {
  onExit: () => void;
  initialTopic?: string;
}

type FeedMode = 'loading' | 'youtube' | 'fallback';

export default function ShortsFeed({ onExit, initialTopic }: Props) {
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
  const [activeSearchTerm, setActiveSearchTerm] = useState<string | null>(initialTopic || null);

  // Forced timer state & threshold notice
  const [lockNotice, setLockNotice] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const celebratedMilestonesRef = useRef<Set<number>>(new Set());

  const activeWatchSecRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const lockNoticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const screenStartRef = useRef<number>(Date.now());
  const isScrollingRef = useRef(false);
  const hasApiErrorRef = useRef(false);
  const scrollAttemptRef = useRef<number>(0);

  const ytQueueRef = useRef(ytQueue);
  ytQueueRef.current = ytQueue;
  const isYouTubeRef = useRef(isYouTube);
  isYouTubeRef.current = isYouTube;

  // Reset scroll attempt counter when active short index changes
  useEffect(() => {
    scrollAttemptRef.current = 0;
  }, [activeIndex]);

  const handleActiveReady = useCallback(() => {
    // Player ready handler
  }, []);

  const getForcedWaitTime = useCallback(
    (index: number) => {
      const target = getTargetDuration(index);
      let forcedWait = Math.max(0, target - 3);
      if (isYouTube && ytQueue.length > 0 && ytQueue[index % ytQueue.length]?.durationSec) {
        const dur = ytQueue[index % ytQueue.length].durationSec!;
        if (dur > 0) {
          forcedWait = Math.min(forcedWait, Math.max(0, dur - 3));
        }
      }
      return forcedWait;
    },
    [isYouTube, ytQueue]
  );

  const triggerLockNotice = useCallback(() => {
    const forcedWait = getForcedWaitTime(activeIndex);
    const rem = Math.max(1, Math.ceil(forcedWait - activeWatchSecRef.current));
    setRemainingSecs(rem);
    setLockNotice(true);
    if (lockNoticeTimerRef.current) clearTimeout(lockNoticeTimerRef.current);
    lockNoticeTimerRef.current = setTimeout(() => setLockNotice(false), 2000);
  }, [activeIndex, getForcedWaitTime]);

  const handleIsPlayingChange = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
  }, []);

  const isTimerLocked = useCallback(() => {
    const forcedWait = getForcedWaitTime(activeIndex);
    return activeWatchSecRef.current < forcedWait;
  }, [activeIndex, getForcedWaitTime]);

  // Continuously track active watch time and update lock state
  useEffect(() => {
    activeWatchSecRef.current = 0;
    isPlayingRef.current = false;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const video =
          isYouTubeRef.current && ytQueueRef.current.length > 0
            ? ytQueueRef.current[activeIndex % ytQueueRef.current.length]
            : null;
        const maxDuration = video?.durationSec && video.durationSec > 0 ? video.durationSec : 60;
        if (activeWatchSecRef.current < maxDuration) {
          activeWatchSecRef.current = Math.round((activeWatchSecRef.current + 0.1) * 10) / 10;
        }
      }

      const currentWatch = activeWatchSecRef.current;
      const targetSec = Math.round(getTargetDuration(activeIndex));
      const forcedWait = getForcedWaitTime(activeIndex);

      // Celebration milestones based on target reach & active watch time
      const milestones = [
        { sec: 30, msg: 'Awesome focus! Target reached 30 seconds!' },
        { sec: 60, msg: 'Incredible focus! Target reached 1 minute (60s)!' },
        { sec: 90, msg: 'Deep focus state! Target reached 1.5 minutes (90s)!' },
        { sec: 120, msg: 'Master level focus! Target reached 2 minutes (120s)!' },
        { sec: 180, msg: 'Zen master focus! Target reached 3 minutes (180s)!' },
      ];

      for (const m of milestones) {
        if (
          (targetSec >= m.sec || currentWatch >= m.sec) &&
          currentWatch >= Math.min(m.sec, Math.max(1, forcedWait)) &&
          !celebratedMilestonesRef.current.has(m.sec)
        ) {
          celebratedMilestonesRef.current.add(m.sec);
          setCelebrationMsg(m.msg);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeIndex, getForcedWaitTime]);

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
    loadFeed(initialTopic);
  }, [loadFeed, initialTopic]);

  const handleSelectTopic = (topic: string) => {
    addStoredSearch(topic);
    setActiveSearchTerm(topic);
    setIsSearchOpen(false);
    loadFeed(topic);
  };

  const recordCurrent = useCallback(
    (fromIndex: number) => {
      const dwell = Math.round(activeWatchSecRef.current * 10) / 10;
      const screenTime = Date.now() - screenStartRef.current;
      if (isYouTube) {
        const video = ytQueue[fromIndex % ytQueue.length];
        if (video) {
          addDwellRecord({
            videoIndex: fromIndex,
            targetDuration: getTargetDuration(fromIndex),
            dwellSeconds: dwell,
            timestamp: Date.now(),
            videoId: video.videoId,
            youtubeDurationSec: video.durationSec,
          });
          addWatchHistory({
            videoId: video.videoId,
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnail: video.thumbnail,
            durationSec: video.durationSec,
            dwellSeconds: dwell,
            searchTopic: activeSearchTerm || video.searchTopic || undefined,
          });
        }
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
    [activeSearchTerm, isYouTube, ytQueue]
  );

  // Record session end target on exit
  const handleExitSession = useCallback(() => {
    recordCurrent(activeIndex);
    recordSessionEndTarget(activeIndex);
    onExit();
  }, [activeIndex, onExit, recordCurrent]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (index > activeIndex && isTimerLocked()) {
        triggerLockNotice();
        return;
      }

      if (index < 0 || index >= listLength) return;

      isScrollingRef.current = true;
      recordCurrent(activeIndex);
      setActiveIndex(index);
      setShowHint(false);
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    },
    [activeIndex, isTimerLocked, listLength, recordCurrent, triggerLockNotice]
  );

  const handleAutoAdvance = useCallback(() => {
    if (activeIndex + 1 < listLength) {
      scrollToIndex(activeIndex + 1);
    }
  }, [activeIndex, listLength, scrollToIndex]);

  // Touch, wheel, and keyboard navigation handlers
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

      if (Math.abs(dy) < 30) return;
      if (dy > 0) {
        if (isTimerLocked()) {
          triggerLockNotice();
          return;
        }
        scrollToIndex(activeIndex + 1);
      } else if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) return;
      if (Math.abs(e.deltaY) < 15) return;
      if (e.deltaY > 0) {
        if (isTimerLocked()) {
          if (e.cancelable) e.preventDefault();
          triggerLockNotice();
          return;
        }
        scrollToIndex(activeIndex + 1);
      } else if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSearchOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (isTimerLocked()) {
          triggerLockNotice();
          return;
        }
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (activeIndex > 0) {
          scrollToIndex(activeIndex - 1);
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeIndex,
    feedMode,
    handleExitSession,
    isSearchOpen,
    isTimerLocked,
    recordCurrent,
    scrollToIndex,
    triggerLockNotice,
  ]);

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
      <div className="flex h-screen w-screen items-center justify-center bg-background text-on-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
            {activeSearchTerm ? `Curating "${activeSearchTerm}" feed...` : 'Initializing Focus Feed...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="shorts-feed fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-background select-none font-body text-body text-on-surface">
      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTopic={handleSelectTopic}
      />

      {/* Celebration Modal */}
      <Celebration
        show={Boolean(celebrationMsg)}
        message={celebrationMsg || ''}
        onClose={() => setCelebrationMsg(null)}
      />

      {/* Refined Stitch Threshold Notice ("Stay with it — Xs remaining") */}
      {lockNotice && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-6 py-3 flex items-center gap-3 border border-primary/40 glow-primary animate-fade-in shadow-2xl">
          <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
          <span className="font-headline text-headline text-on-surface text-sm md:text-base font-semibold">
            Stay with it — {remainingSecs}s remaining
          </span>
        </div>
      )}

      {/* Top Header Overlay */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
        <button
          onClick={() => {
            recordCurrent(activeIndex);
            handleExitSession();
          }}
          aria-label="Back to home"
          className="pointer-events-auto p-2 rounded-full glass-panel text-on-surface hover:text-primary transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>

        <div className="pointer-events-auto px-4 py-1.5 rounded-full glass-panel text-xs font-semibold text-primary border border-primary/30 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>{activeSearchTerm ? `${activeSearchTerm} feed` : 'Deep Focus'}</span>
        </div>

        <button
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search"
          className="pointer-events-auto p-2 rounded-full glass-panel text-on-surface hover:text-primary transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[24px]">search</span>
        </button>
      </header>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full w-full select-none transition-transform duration-300 ease-out flex flex-col"
        style={{
          transform: `translate3d(0, -${activeIndex * 100}%, 0)`,
          willChange: 'transform',
        }}
      >
        {isYouTube
          ? Array.from({ length: listLength }).map((_, i) => {
              const video = ytQueue[i % ytQueue.length];
              const isCurrentActive = i === activeIndex;
              return (
                <div key={video.videoId + '-' + i} className="h-full w-full shrink-0">
                  <YouTubeSlide
                    video={video}
                    index={i}
                    active={isCurrentActive}
                    windowed={isCurrentActive}
                    gradientSeed={i % 5}
                    onAutoAdvance={handleAutoAdvance}
                    onIsPlayingChange={handleIsPlayingChange}
                    onActiveReady={handleActiveReady}
                  />
                </div>
              );
            })
          : Array.from({ length: listLength }).map((_, i) => (
              <div key={i} className="h-full w-full shrink-0">
                <PexelsSlide
                  src={VIDEOS[i % VIDEOS.length]}
                  index={i}
                  active={i === activeIndex}
                  gradientSeed={i % 5}
                  onIsPlayingChange={handleIsPlayingChange}
                  onActiveReady={handleActiveReady}
                />
              </div>
            ))}
      </div>

      {showHint && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="flex flex-col items-center gap-1 text-on-surface-variant/70">
            <span className="font-label-caps text-[10px] tracking-widest uppercase">Swipe up</span>
            <span className="material-symbols-outlined text-[20px] animate-bounce">keyboard_arrow_up</span>
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
  const isInitialCalibrated = isCalibrated();
  const calLimit = isInitialCalibrated ? 4 : 13;
  const targetLabel = index < calLimit ? `Calibrating (${index + 1}/${calLimit})` : `Target: ${targetSec}s`;
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
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        </div>
      )}

      {/* Dark gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      {/* Right side controls: Sound, Open in YT */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-5">
        {/* Sound/Mute Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="flex flex-col items-center gap-1.5 text-on-surface hover:text-primary transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full glass-panel border border-white/20 shadow-lg">
            {isMuted ? (
              <VolumeX size={20} className="text-error" />
            ) : (
              <Volume2 size={20} className="text-primary" />
            )}
          </div>
          <span className="font-label-caps text-[11px] text-on-surface font-medium drop-shadow">
            {isMuted ? 'Muted' : 'Sound'}
          </span>
        </button>

        {/* Open in YT Button */}
        <button
          onClick={openYouTube}
          aria-label="Open in YouTube app"
          className="flex flex-col items-center gap-1.5 text-on-surface hover:text-primary transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 border border-red-400/30 shadow-lg text-white">
            <ExternalLink size={18} />
          </div>
          <span className="font-label-caps text-[11px] text-on-surface/90 font-medium drop-shadow">
            YouTube
          </span>
        </button>
      </div>

      {/* Refined video metadata on bottom left */}
      <div className="absolute left-4 bottom-12 z-30 max-w-[280px] md:max-w-md text-on-surface">
        <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1 text-xs font-semibold text-primary border border-primary/30 mb-2 shadow-md backdrop-blur-md">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <span>{targetLabel}</span>
        </div>
        <h3 className="font-headline text-headline text-on-surface line-clamp-2 leading-snug drop-shadow-md">
          {video.title}
        </h3>
        <p className="mt-1 font-caption text-caption text-on-surface-variant font-medium drop-shadow-md">
          {video.channelTitle}
        </p>
      </div>

      {/* Progress bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(129,255,236,0.8)]"
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
  const isInitialCalibrated = isCalibrated();
  const calLimit = isInitialCalibrated ? 4 : 13;
  const targetLabel = index < calLimit ? `Calibrating (${index + 1}/${calLimit})` : `Target: ${targetSec}s`;

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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      {/* Right side controls */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="flex flex-col items-center gap-1.5 text-on-surface hover:text-primary transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full glass-panel border border-white/20 shadow-lg">
            {isMuted ? (
              <VolumeX size={20} className="text-error" />
            ) : (
              <Volume2 size={20} className="text-primary" />
            )}
          </div>
          <span className="font-label-caps text-[11px] text-on-surface font-medium drop-shadow">
            {isMuted ? 'Muted' : 'Sound'}
          </span>
        </button>

        <button
          onClick={openYouTube}
          aria-label="Open in YouTube"
          className="flex flex-col items-center gap-1.5 text-on-surface hover:text-primary transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 border border-red-400/30 shadow-lg text-white">
            <ExternalLink size={18} />
          </div>
          <span className="font-label-caps text-[11px] text-on-surface/90 font-medium drop-shadow">
            YouTube
          </span>
        </button>
      </div>

      {/* Target badge on bottom left */}
      <div className="absolute left-4 bottom-12 z-30 text-on-surface">
        <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1 text-xs font-semibold text-primary border border-primary/30 shadow-md backdrop-blur-md">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <span>{targetLabel}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(129,255,236,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

const GRADIENTS = [
  ['#051424', '#09deca', '#122131'],
  ['#11151D', '#81ffec', '#1c2b3c'],
  ['#122131', '#c4c0ff', '#273647'],
  ['#0d1c2d', '#ffdea9', '#1c2b3c'],
  ['#051424', '#3b27ca', '#273647'],
];
