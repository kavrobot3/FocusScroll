import { useEffect, useRef, useState, useCallback } from 'react';
import { getRecommendedQuality } from '@/lib/network';

let apiPromise: Promise<typeof window.YT> | null = null;
let globalIsMuted = false; // default to false so sound plays as soon as unmuted / active

export function loadYouTubeAPI(): Promise<typeof window.YT> {
  if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<typeof window.YT>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('No window'));
      return;
    }
    const existing = document.getElementById('yt-iframe-api');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const prevCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCb) prevCb();
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('YT API failed to load'));
      }
    };
    setTimeout(() => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      }
    }, 3000);
  });
  return apiPromise;
}

interface UseYTPlayerOptions {
  videoId: string;
  active: boolean;
  mount: boolean;
  onReady?: () => void;
  onError?: () => void;
}

export interface YTPlayerControls {
  ready: boolean;
  failed: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  progressPercent: number;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  mute: () => void;
  unMute: () => void;
  toggleMute: () => void;
}

export function useYTPlayer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseYTPlayerOptions
): YTPlayerControls {
  const playerRef = useRef<YTPlayer | null>(null);
  const userPausedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(globalIsMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  const onErrorRef = useRef(options.onError);
  const onReadyRef = useRef(options.onReady);
  onErrorRef.current = options.onError;
  onReadyRef.current = options.onReady;

  // Create / destroy player when mount or videoId changes
  useEffect(() => {
    let cancelled = false;
    let createdPlayer: YTPlayer | null = null;
    const containerEl = containerRef.current;

    setReady(false);
    setFailed(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setProgressPercent(0);

    if (!options.mount || !containerEl) return;

    // Watchdog timer: if player fails to get ready within 10s, trigger error recovery
    const watchdog = setTimeout(() => {
      if (!cancelled && !ready) {
        setFailed(true);
        onErrorRef.current?.();
      }
    }, 10000);

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !containerEl) return;

        const el = document.createElement('div');
        el.style.width = '100%';
        el.style.height = '100%';
        containerEl.innerHTML = '';
        containerEl.appendChild(el);

        const quality = getRecommendedQuality();
        createdPlayer = new YT.Player(el, {
          videoId: options.videoId,
          playerVars: {
            autoplay: options.active ? 1 : 0,
            mute: globalIsMuted || !options.active ? 1 : 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
            loop: 1,
            suggestedQuality: quality,
            playlist: options.videoId,
          },
          events: {
            onReady: (e) => {
              clearTimeout(watchdog);
              if (cancelled) {
                try {
                  e.target.stopVideo();
                  e.target.destroy();
                } catch {
                  // ignore
                }
                return;
              }
              if (!options.active) {
                try {
                  e.target.pauseVideo();
                  e.target.mute();
                } catch {
                  // ignore
                }
              } else {
                try {
                  e.target.playVideo();
                  if (!globalIsMuted) {
                    e.target.unMute();
                    e.target.setVolume(100);
                  }
                } catch {
                  // ignore
                }
              }
              setReady(true);
              onReadyRef.current?.();
            },
            onError: () => {
              clearTimeout(watchdog);
              if (cancelled) return;
              setFailed(true);
              onErrorRef.current?.();
            },
            onStateChange: (e) => {
              if (cancelled) return;
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
              if (e.data === 1) {
                setReady(true);
                setIsPlaying(true);
              } else if (e.data === 2 || e.data === 0) {
                setIsPlaying(false);
              }
            },
          },
        });

        playerRef.current = createdPlayer;

        // If cancelled while constructor was executing synchronously
        if (cancelled && createdPlayer) {
          try {
            createdPlayer.stopVideo();
            createdPlayer.destroy();
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        clearTimeout(watchdog);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      if (createdPlayer) {
        try {
          createdPlayer.stopVideo();
          createdPlayer.destroy();
        } catch {
          // ignore
        }
      }
      if (containerEl) {
        containerEl.innerHTML = '';
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.videoId, options.mount]);

  // Sync active state, play/pause, sound with playback watchdog & pre-buffering
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    let playWatchdog: NodeJS.Timeout | null = null;

    try {
      if (options.active) {
        userPausedRef.current = false;
        p.playVideo();
        setIsPlaying(true);
        if (!globalIsMuted) {
          p.unMute();
          p.setVolume(100);
          setIsMuted(false);
        } else {
          p.mute();
          setIsMuted(true);
        }

        // Watchdog for unstarted state on active video
        playWatchdog = setTimeout(() => {
          try {
            const state = p.getPlayerState?.();
            if (state === -1) {
              setFailed(true);
              onErrorRef.current?.();
            }
          } catch {
            setFailed(true);
            onErrorRef.current?.();
          }
        }, 8000);
      } else {
        // Non-active videos remain paused to save network and CPU for the active short
        p.pauseVideo();
        p.mute();
        setIsPlaying(false);
      }
    } catch {
      // ignore
    }

    return () => {
      if (playWatchdog) clearTimeout(playWatchdog);
    };
  }, [options.active, ready]);

  // Repeating enforcement loop: continuously verify active vs non-active player state
  useEffect(() => {
    if (!ready) return;

    const syncState = () => {
      const p = playerRef.current;
      if (!p || typeof p.getPlayerState !== 'function') return;

      try {
        const state = p.getPlayerState();
        if (options.active) {
          if (userPausedRef.current) {
            // User explicitly paused: keep it paused
            if (state === 1 /* PLAYING */) {
              p.pauseVideo();
            }
            setIsPlaying(false);
          } else {
            // User wants it playing: force play if paused/cued/unstarted
            if (state === 2 /* PAUSED */ || state === 5 /* CUED */ || state === -1 /* UNSTARTED */) {
              p.playVideo();
              setIsPlaying(true);
              if (!globalIsMuted) {
                p.unMute();
                p.setVolume(100);
                setIsMuted(false);
              }
            } else if (state === 1 /* PLAYING */) {
              setIsPlaying(true);
            }
          }
        } else {
          // If NOT active video, MUST BE PAUSED and MUTED
          if (state === 1 /* PLAYING */ || state === 3 /* BUFFERING */) {
            p.pauseVideo();
            p.mute();
          }
          setIsPlaying(false);
        }
      } catch {
        // ignore
      }
    };

    syncState();
    const interval = setInterval(syncState, 200);
    return () => clearInterval(interval);
  }, [options.active, ready]);

  // Track playback time & progress percent
  useEffect(() => {
    if (!options.active || !ready) return;
    const interval = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const cur = p.getCurrentTime() || 0;
        const dur = p.getDuration() || 0;
        setCurrentTime(cur);
        setDuration(dur);
        if (dur > 0) {
          const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
          setProgressPercent(pct);
        }
      } catch {
        // ignore
      }
    }, 100);

    return () => clearInterval(interval);
  }, [options.active, ready]);

  const play = useCallback(() => {
    userPausedRef.current = false;
    const p = playerRef.current;
    if (!p) return;
    try {
      p.playVideo();
      setIsPlaying(true);
      if (!globalIsMuted) {
        p.unMute();
        p.setVolume(100);
        setIsMuted(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const pause = useCallback(() => {
    userPausedRef.current = true;
    const p = playerRef.current;
    if (!p) return;
    try {
      p.pauseVideo();
      setIsPlaying(false);
    } catch {
      // ignore
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (userPausedRef.current || !isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, play, pause]);

  const unMute = useCallback(() => {
    globalIsMuted = false;
    setIsMuted(false);
    const p = playerRef.current;
    if (p) {
      try {
        p.unMute();
        p.setVolume(100);
      } catch {
        // ignore
      }
    }
  }, []);

  const mute = useCallback(() => {
    globalIsMuted = true;
    setIsMuted(true);
    const p = playerRef.current;
    if (p) {
      try {
        p.mute();
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unMute();
    } else {
      mute();
    }
  }, [isMuted, unMute, mute]);

  return {
    ready,
    failed,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    progressPercent,
    play,
    pause,
    togglePlayPause,
    mute,
    unMute,
    toggleMute,
  };
}

export default useYTPlayer;

