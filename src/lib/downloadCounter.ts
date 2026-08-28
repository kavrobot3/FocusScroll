// Real-time Extension Download Counter Engine
// Tracks real extension downloads, persists in localStorage, and synchronizes across open tabs

const STORAGE_KEY = 'fs_extension_downloads_count';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('fs_extension_downloads_sync')
  : null;

/**
 * Gets the current persisted total downloads (starts at 0, strictly increments on actual downloads)
 */
export function getExtensionDownloadCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return 0;
    }
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch (e) {
    console.warn('Could not read download count from localStorage:', e);
    return 0;
  }
}

/**
 * Increments the live download counter by 1 and broadcasts to all tabs & UI listeners
 */
export function recordExtensionDownload(): number {
  const current = getExtensionDownloadCount();
  const next = current + 1;
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      
      // Dispatch custom window event for in-tab reactivity
      window.dispatchEvent(
        new CustomEvent('fs_download_increment', {
          detail: { count: next, timestamp: Date.now() },
        })
      );

      // Broadcast across multiple browser tabs
      if (channel) {
        channel.postMessage({ type: 'INCREMENT', count: next, timestamp: Date.now() });
      }
    } catch (e) {
      console.warn('Could not persist download count:', e);
    }
  }

  return next;
}

/**
 * Subscribes a callback to live counter updates
 */
export function subscribeToDownloadCount(callback: (count: number, justIncremented: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ count: number }>;
    if (customEvent.detail?.count) {
      callback(customEvent.detail.count, true);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      const newCount = parseInt(e.newValue, 10);
      if (!isNaN(newCount)) {
        callback(newCount, true);
      }
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === 'INCREMENT' && typeof event.data.count === 'number') {
      callback(event.data.count, true);
    }
  };

  window.addEventListener('fs_download_increment', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  return () => {
    window.removeEventListener('fs_download_increment', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
  };
}
