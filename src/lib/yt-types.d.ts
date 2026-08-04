// YouTube IFrame Player API type augmentation
// Minimal type surface for our usage

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onError?: (event: { target: YTPlayer; data: number }) => void;
    onStateChange?: (event: { target: YTPlayer; data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
