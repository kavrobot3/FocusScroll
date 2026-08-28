// Real-time Global Extension Download Counter Engine
// Connects to public global counter API, checks every second for worldwide updates,
// and increments globally whenever anyone clicks to install/download the extension.

const API_BASE = 'https://countapi.mileshilliard.com/api/v1';
const COUNTER_KEY = 'focus_shorts_extension_downloads_v1';
const LOCAL_CACHE_KEY = 'fs_global_cached_downloads_v1';
const BASE_MIN_COUNT = 37;

// Internal memory state
let currentGlobalCount = BASE_MIN_COUNT;
let hasInitialized = false;

// Cross-tab synchronization channel
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('fs_extension_downloads_sync')
  : null;

// Initialize cache from local storage if available
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(LOCAL_CACHE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= BASE_MIN_COUNT) {
        currentGlobalCount = parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
}

/**
 * Gets the current synchronized global total downloads
 */
export function getExtensionDownloadCount(): number {
  return Math.max(BASE_MIN_COUNT, currentGlobalCount);
}

/**
 * Fetches the latest global count from the worldwide counter API
 */
async function fetchGlobalCount(): Promise<number> {
  if (typeof window === 'undefined') return currentGlobalCount;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${API_BASE}/get/${COUNTER_KEY}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (typeof data.value === 'number') {
        const remoteValue = Math.max(BASE_MIN_COUNT, data.value);
        if (remoteValue !== currentGlobalCount) {
          const isHigher = remoteValue > currentGlobalCount;
          currentGlobalCount = remoteValue;
          try {
            localStorage.setItem(LOCAL_CACHE_KEY, String(currentGlobalCount));
          } catch {
            // Ignore storage write error
          }
          notifyListeners(currentGlobalCount, isHigher && hasInitialized);
        }
        hasInitialized = true;
        return currentGlobalCount;
      }
    } else if (res.status === 404) {
      // If key doesn't exist yet, initialize to BASE_MIN_COUNT
      await fetch(`${API_BASE}/set/${COUNTER_KEY}?value=${BASE_MIN_COUNT}`).catch(() => {});
    }
  } catch {
    // Silently fall back to cached count if network is intermittent
  }

  return currentGlobalCount;
}

/**
 * Helper to dispatch update events to UI and other tabs
 */
function notifyListeners(count: number, isManualOrNew: boolean) {
  if (typeof window === 'undefined') return;

  // Custom event for same-tab reactive listeners
  window.dispatchEvent(
    new CustomEvent('fs_download_increment', {
      detail: { count, isManualDownload: isManualOrNew, timestamp: Date.now() },
    })
  );

  // Broadcast to other open browser tabs
  if (channel && isManualOrNew) {
    channel.postMessage({ type: 'INCREMENT', count, isManualDownload: true, timestamp: Date.now() });
  }
}

/**
 * Increments the global download counter on user download action and updates worldwide count
 */
export function recordExtensionDownload(): number {
  // 1. Optimistically increment locally right away for instant feedback
  currentGlobalCount = Math.max(BASE_MIN_COUNT, currentGlobalCount + 1);
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, String(currentGlobalCount));
    } catch {
      // Ignore
    }
    notifyListeners(currentGlobalCount, true);
  }

  // 2. Hit the global counter API to permanently increment worldwide
  if (typeof window !== 'undefined') {
    fetch(`${API_BASE}/hit/${COUNTER_KEY}`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.value === 'number') {
          const verified = Math.max(BASE_MIN_COUNT, data.value);
          if (verified > currentGlobalCount) {
            currentGlobalCount = verified;
            try {
              localStorage.setItem(LOCAL_CACHE_KEY, String(currentGlobalCount));
            } catch {
              // Ignore
            }
            notifyListeners(currentGlobalCount, true);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not increment global counter via API:', err);
      });
  }

  return currentGlobalCount;
}

/**
 * Subscribes a callback to live counter updates
 * Checks every 1 second (1000ms) with the global database and updates whenever anyone in the world downloads
 */
export function subscribeToDownloadCount(
  callback: (count: number, isManualDownload: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Immediate callback with current cached count
  callback(getExtensionDownloadCount(), false);

  // Initial fetch from global server
  fetchGlobalCount().then((cnt) => callback(cnt, false));

  // Poll the global counter every 1 second
  const pollInterval = setInterval(() => {
    fetchGlobalCount().then((cnt) => {
      callback(cnt, false);
    });
  }, 1000);

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ count: number; isManualDownload?: boolean }>;
    if (typeof customEvent.detail?.count === 'number') {
      callback(customEvent.detail.count, !!customEvent.detail.isManualDownload);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_CACHE_KEY && e.newValue) {
      const parsed = parseInt(e.newValue, 10);
      if (!isNaN(parsed)) {
        currentGlobalCount = Math.max(currentGlobalCount, parsed);
        callback(currentGlobalCount, true);
      }
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === 'INCREMENT' && typeof event.data.count === 'number') {
      currentGlobalCount = Math.max(currentGlobalCount, event.data.count);
      callback(currentGlobalCount, !!event.data.isManualDownload);
    }
  };

  window.addEventListener('fs_download_increment', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('fs_download_increment', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
  };
}
