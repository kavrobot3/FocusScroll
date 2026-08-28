// Real-time Global Extension Download Counter Engine
// Anchored base of 37, incrementing every 1 second globally and synchronized across the world

const STORAGE_EXTRA_KEY = 'fs_user_extra_downloads';
const BASE_COUNT = 37;

// Fixed global epoch anchor so every client in the world computes the exact same global second ticks
const GLOBAL_ANCHOR_EPOCH = 1787883566000;

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('fs_extension_downloads_sync')
  : null;

function getLocalExtraDownloads(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(STORAGE_EXTRA_KEY);
    if (!saved) return 0;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch {
    return 0;
  }
}

/**
 * Gets the current synchronized global total downloads
 * Starts at 37 and increments by 1 every second for everyone globally, plus local user downloads
 */
export function getExtensionDownloadCount(): number {
  if (typeof window === 'undefined') return BASE_COUNT;
  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((now - GLOBAL_ANCHOR_EPOCH) / 1000));
  const extra = getLocalExtraDownloads();
  return BASE_COUNT + elapsedSeconds + extra;
}

/**
 * Increments the live download counter on direct user download action and broadcasts across tabs
 */
export function recordExtensionDownload(): number {
  const currentExtra = getLocalExtraDownloads();
  const nextExtra = currentExtra + 1;
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_EXTRA_KEY, String(nextExtra));
      
      const total = getExtensionDownloadCount();
      
      // Dispatch custom window event for in-tab reactivity
      window.dispatchEvent(
        new CustomEvent('fs_download_increment', {
          detail: { count: total, isManualDownload: true, timestamp: Date.now() },
        })
      );

      // Broadcast across multiple browser tabs
      if (channel) {
        channel.postMessage({ type: 'INCREMENT', count: total, isManualDownload: true, timestamp: Date.now() });
      }
    } catch (e) {
      console.warn('Could not persist extra download count:', e);
    }
  }

  return getExtensionDownloadCount();
}

/**
 * Subscribes a callback to live counter updates (triggers every second for global tick, and instantly on downloads)
 */
export function subscribeToDownloadCount(
  callback: (count: number, isManualDownload: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Global 1-second synchronized world tick interval
  const tickInterval = setInterval(() => {
    callback(getExtensionDownloadCount(), false);
  }, 1000);

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ count: number; isManualDownload?: boolean }>;
    if (customEvent.detail?.count) {
      callback(customEvent.detail.count, !!customEvent.detail.isManualDownload);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_EXTRA_KEY) {
      callback(getExtensionDownloadCount(), true);
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === 'INCREMENT' && typeof event.data.count === 'number') {
      callback(event.data.count, !!event.data.isManualDownload);
    }
  };

  window.addEventListener('fs_download_increment', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  return () => {
    clearInterval(tickInterval);
    window.removeEventListener('fs_download_increment', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
  };
}

