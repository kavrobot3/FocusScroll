export interface YTVideo {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  channel: string;
  durationSec: number;
  thumbnail: string;
  embeddable?: boolean;
}

interface CacheEntry {
  videos: YTVideo[];
  timestamp: number;
}

const CACHE_PREFIX = 'yt_cache_';
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours

let lastRawError: string | null = null;

export function getLastApiError(): string | null {
  return lastRawError;
}

export function setLastApiError(err: string | null): void {
  lastRawError = err;
}

export function getYouTubeApiKey(): string | undefined {
  const envKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.YOUTUBE_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  try {
    const localKey = localStorage.getItem('user_yt_api_key');
    if (localKey && localKey.trim()) return localKey.trim();
  } catch {
    // ignore
  }
  return undefined;
}

export function setYouTubeApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem('user_yt_api_key', key.trim());
      lastRawError = null;
    } else {
      localStorage.removeItem('user_yt_api_key');
    }
  } catch {
    // ignore
  }
}

export function isQuotaExhausted(): boolean {
  if (!lastRawError) return false;
  return lastRawError.includes('403') || lastRawError.toLowerCase().includes('quota');
}

export function clearQuotaFlag(): void {
  lastRawError = null;
}

function normalizeQueryKey(query: string): string {
  return CACHE_PREFIX + query.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function getQueryCache(query: string): YTVideo[] | null {
  try {
    const key = normalizeQueryKey(query);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || !entry.videos || !Array.isArray(entry.videos)) return null;
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.videos;
  } catch {
    return null;
  }
}

function setQueryCache(query: string, videos: YTVideo[]): void {
  try {
    const key = normalizeQueryKey(query);
    const entry: CacheEntry = { videos, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore storage error
  }
}

export function getCachedVideos(): YTVideo[] | null {
  return getQueryCache('default_feed') || getQueryCache('shorts');
}

export function getCacheAge(): number | null {
  try {
    const key = normalizeQueryKey('default_feed');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return entry ? Date.now() - entry.timestamp : null;
  } catch {
    return null;
  }
}

function parseISODuration(iso: string): number {
  if (!iso) return 0;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + min * 60 + s;
}

async function searchVideoIds(apiKey: string, query: string): Promise<string[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet` +
    `&type=video` +
    `&videoEmbeddable=true` +
    `&videoSyndicated=true` +
    `&safeSearch=strict` +
    `&maxResults=25` +
    `&q=${encodeURIComponent(query)}` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const statusText = res.statusText || '';
    let bodyText = '';
    try {
      const errData = await res.json();
      bodyText = errData?.error?.message || JSON.stringify(errData);
    } catch {
      // ignore
    }
    const errMsg = `search.list failed: ${res.status} ${statusText} - ${bodyText}`.trim();
    lastRawError = errMsg;
    throw new Error(errMsg);
  }

  const data = await res.json();
  const ids: string[] = [];
  for (const item of data.items || []) {
    if (item.id && item.id.videoId) {
      ids.push(item.id.videoId);
    }
  }
  return ids;
}

async function fetchVideoDetails(apiKey: string, ids: string[]): Promise<YTVideo[]> {
  if (ids.length === 0) return [];
  const url =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=contentDetails,snippet,status` +
    `&id=${ids.join(',')}` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errMsg = `videos.list failed: ${res.status} ${res.statusText}`.trim();
    lastRawError = errMsg;
    throw new Error(errMsg);
  }

  const data = await res.json();
  const results: YTVideo[] = [];

  for (const item of data.items || []) {
    const dur = parseISODuration(item.contentDetails?.duration || '');
    const thumb =
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '';

    const isEmbeddable = item.status?.embeddable !== false;
    const title = item.snippet?.title || 'Short Video';
    const channelName = item.snippet?.channelTitle || 'YouTube Creator';

    results.push({
      id: item.id,
      videoId: item.id,
      title,
      channelTitle: channelName,
      channel: channelName,
      durationSec: dur,
      thumbnail: thumb,
      embeddable: isEmbeddable,
    });
  }

  return results;
}

export interface FetchResult {
  videos: YTVideo[];
  error: string | null;
}

import { getShuffledStoredSearches } from './storage';

export async function fetchYouTubeVideos(customQuery?: string): Promise<FetchResult> {
  const storedSearches = getShuffledStoredSearches();
  const activeQuery =
    customQuery ||
    (storedSearches.length > 0 ? storedSearches[0] : 'shorts');

  // Check 6-hour localStorage cache first
  const cached = getQueryCache(activeQuery);
  if (cached && cached.length > 0) {
    return { videos: cached, error: null };
  }

  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    const err = 'No VITE_YOUTUBE_API_KEY environment variable configured';
    lastRawError = err;
    return { videos: [], error: err };
  }

  try {
    const ids = await searchVideoIds(apiKey, activeQuery);
    if (ids.length === 0) {
      const err = `No video results found for query "${activeQuery}"`;
      lastRawError = err;
      return { videos: [], error: err };
    }

    const details = await fetchVideoDetails(apiKey, ids);

    // Filter embeddable videos between 8 and 90 seconds
    let filtered = details.filter(
      (v) => v.embeddable !== false && v.durationSec >= 8 && v.durationSec <= 90
    );

    // If 8-90s range is empty, relax to 3-300s
    if (filtered.length === 0) {
      filtered = details.filter(
        (v) => v.embeddable !== false && v.durationSec >= 3 && v.durationSec <= 300
      );
    }

    // Sort ascending by duration
    filtered.sort((a, b) => a.durationSec - b.durationSec);

    if (filtered.length === 0) {
      const err = `No suitable videos found for query "${activeQuery}"`;
      lastRawError = err;
      return { videos: [], error: err };
    }

    // Cache valid results in localStorage for 6 hours
    setQueryCache(activeQuery, filtered);
    lastRawError = null;
    return { videos: filtered, error: null };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Failed to fetch YouTube videos';
    lastRawError = errMsg;
    return { videos: [], error: errMsg };
  }
}

export function buildFeedQueue(videos: YTVideo[], startTarget: number = 3, increment: number = 1): YTVideo[] {
  if (videos.length === 0) return [];
  const sorted = [...videos].sort((a, b) => a.durationSec - b.durationSec);
  const queue: YTVideo[] = [];
  let target = startTarget;
  const used = new Set<number>();

  while (queue.length < sorted.length) {
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      const diff = Math.abs(sorted[i].durationSec - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    used.add(bestIdx);
    queue.push(sorted[bestIdx]);
    target += increment;
  }
  return queue;
}
