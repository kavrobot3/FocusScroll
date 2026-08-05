import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import VIDEOS from '@/lib/videos';
import {
  getTargetDuration,
  addDwellRecord,
  recordSwipe,
} from '@/lib/storage';
import {
  fetchYouTubeVideos,
  buildFeedQueue,
  getYouTubeApiKey,
  isQuotaExhausted,
  type YTVideo,
} from '@/lib/youtube';
import useYTPlayer from '@/lib/useYTPlayer';

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

  const dwellStartRef = useRef<number>(Date.now());
  const screenStartRef = useRef<number>(Date.now());
  const isScrollingRef = useRef(false);
  const hasApiErrorRef = useRef(false);

  // Load YouTube videos on mount
  useEffect(() => {
    const apiKey = getYouTubeApiKey();
    if (!apiKey || isQuotaExhausted()) {
      setFeedMode('fallback');
      return;
    }
    let cancelled = false;
    fetchYouTubeVideos().then(({ videos, error }) => {
      if (cancelled) return;
      if (videos.length > 0) {
        const queue = buildFeedQueue(videos, 18, 1.5);
        setYtQueue(queue);
        setFeedMode('youtube');
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

  // Build the effective feed
  const isYouTube = feedMode === 'youtube' && ytQueue.length > 0;
  const listLength = isYouTube ? Math.max(150, ytQueue.length * 5) : VIDEOS.length * 20;

  const recordCurrent = useCallback(
    (fromIndex: number) => {
      const dwell = (Date.now() - dwellStartRef.current) / 1000;
      const screenTime = Date.now() - screenStartRef.current;
      if (isYouTube) {
        const video = ytQueue[fromIndex % ytQueue.length];
        addDwellRecord({
          videoIndex: fromIndex,
          targetDuration: getTargetDuration(fromIndex),
          dwellSeconds: Math.round(dwell * 10) / 10,
          timestamp: Date.now(),
          videoId: video?.videoId,
          youtubeDurationSec: video?.durationSec,
        });
      } else {
        addDwellRecord({
          videoIndex: fromIndex,
          targetDuration: getTargetDuration(fromIndex),
          dwellSeconds: Math.round(dwell * 10) / 10,
          timestamp: Date.now(),
        });
      }
      recordSwipe(dwell, screenTime);
      dwellStartRef.current = Date.now();
    },
    [isYouTube, ytQueue]
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const target = container.children[index] as HTMLElement;
      if (!target) return;
      isScrollingRef.current = true;
      container.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
      recordCurrent(activeIndex);
      setActiveIndex(index);
      setShowHint(false);
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 400);
    },
    [activeIndex, recordCurrent]
  );

  const handleAutoAdvance = useCallback(() => {
    if (activeIndex + 1 < listLength) {
      scrollToIndex(activeIndex + 1);
    }
  }, [activeIndex, listLength, scrollToIndex]);

  // Touch + wheel handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedMode === 'loading') return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      const dy = touchStartY - e.changedTouches[0].clientY;
      const dx = touchStartX - e.changedTouches[0].clientX;
      const dt = Date.now() - touchStartTime;
      if (dt > 600) return;

      if (dx > 80 && Math.abs(dx) > Math.abs(dy)) {
        recordCurrent(activeIndex);
        onExit();
        return;
      }

      if (Math.abs(dy) < 50) return;
      if (dy > 0) {
        const next = activeIndex + 1;
        if (next < listLength) scrollToIndex(next);
      } else if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) return;
      if (Math.abs(e.deltaY) < 30) return;
      if (e.deltaY > 0) {
        const next = activeIndex + 1;
        if (next < listLength) scrollToIndex(next);
      } else if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [activeIndex, onExit, scrollToIndex, listLength, recordCurrent, feedMode]);

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
          <span className="text-xs text-white/40 tracking-widest uppercase">Loading feed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {isYouTube
          ? Array.from({ length: listLength }).map((_, i) => {
              const video = ytQueue[i % ytQueue.length];
              return (
                <YouTubeSlide
                  key={video.videoId + '-' + i}
                  video={video}
                  index={i}
                  active={i === activeIndex}
                  windowed={i >= activeIndex - 1 && i <= activeIndex + 3}
                  gradientSeed={i % 5}
                  onAutoAdvance={handleAutoAdvance}
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
              />
            ))
        }
      </div>

      <button
        onClick={() => {
          recordCurrent(activeIndex);
          onExit();
        }}
        aria-label="Back"
        className="absolute left-4 top-6 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white/80 transition hover:bg-black/60 active:scale-90"
      >
        <ChevronLeft size={20} />
      </button>

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
}

function YouTubeSlide({ video, index, active, windowed, gradientSeed, onAutoAdvance }: YTSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoSkipped, setAutoSkipped] = useState(false);

  const controls = useYTPlayer(containerRef, {
    videoId: video.videoId,
    active: active && !autoSkipped,
    mount: windowed,
    onError: () => {
      if (active) setAutoSkipped(true);
    },
  });

  const {
    failed,
    isMuted,
    progressPercent,
    togglePlayPause,
    toggleMute,
  } = controls;

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
          <span>Target: {targetSec}s</span>
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
}

function PexelsSlide({ src, index, active, gradientSeed }: PexelsSlideProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const gradients = GRADIENTS[gradientSeed % GRADIENTS.length];
  const targetSec = Math.round(getTargetDuration(index));

  useEffect(() => {
    const v = localRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

  const togglePlayPause = () => {
    const v = localRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
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
          <span>Target: {targetSec}s</span>
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

