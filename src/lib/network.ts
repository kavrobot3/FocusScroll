export type VideoQuality = 'small' | 'medium' | 'large' | 'hd720';

let detectedQuality: VideoQuality = 'medium';

export function getRecommendedQuality(): VideoQuality {
  return detectedQuality;
}

export function setRecommendedQuality(q: VideoQuality) {
  detectedQuality = q;
}

export function initNetworkSpeedDetection(): Promise<VideoQuality> {
  return new Promise((resolve) => {
    try {
      // 1. Check NetworkInformation API
      const nav = navigator as unknown as {
        connection?: {
          effectiveType?: string;
          downlink?: number;
          saveData?: boolean;
          rtt?: number;
        };
      };

      if (nav.connection) {
        const { effectiveType, downlink, saveData } = nav.connection;
        if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
          detectedQuality = 'small'; // 240p for ultra fast zero-buffer playback
          resolve(detectedQuality);
          return;
        }
        if (effectiveType === '3g' || (downlink && downlink < 2.5)) {
          detectedQuality = 'small';
          resolve(detectedQuality);
          return;
        }
        if (downlink && downlink >= 10) {
          detectedQuality = 'medium'; // 360p is fast & crisp for short form vertical feeds
          resolve(detectedQuality);
          return;
        }
      }

      // 2. Fallback micro speed test using a tiny image fetch ping
      const startTime = performance.now();
      const img = new Image();
      const timeout = setTimeout(() => {
        detectedQuality = 'small';
        resolve(detectedQuality);
      }, 1000);

      img.onload = () => {
        clearTimeout(timeout);
        const duration = performance.now() - startTime;
        if (duration > 350) {
          detectedQuality = 'small';
        } else {
          detectedQuality = 'medium';
        }
        resolve(detectedQuality);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        detectedQuality = 'small';
        resolve(detectedQuality);
      };

      img.src = 'https://www.youtube.com/favicon.ico?t=' + Date.now();
    } catch {
      detectedQuality = 'medium';
      resolve(detectedQuality);
    }
  });
}
