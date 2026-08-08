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

import { getUserSearches, getWatchedVideoIds, getWatchHistory, removeStoredSearch } from './storage';

async function fetchQueryVideos(apiKey: string | undefined, query: string): Promise<YTVideo[]> {
  // Check 6-hour cache
  const cached = getQueryCache(query);
  if (cached && cached.length > 0) {
    return cached.map((v) => ({ ...v, searchTopic: v.searchTopic || query }));
  }

  if (!apiKey) return [];

  try {
    const ids = await searchVideoIds(apiKey, query);
    if (ids.length === 0) return [];

    const details = await fetchVideoDetails(apiKey, ids);

    let filtered = details.filter(
      (v) => v.embeddable !== false && v.durationSec >= 8 && v.durationSec <= 90
    );

    if (filtered.length === 0) {
      filtered = details.filter(
        (v) => v.embeddable !== false && v.durationSec >= 3 && v.durationSec <= 300
      );
    }

    const tagged = filtered.map((v) => ({ ...v, searchTopic: query }));

    if (tagged.length > 0) {
      setQueryCache(query, tagged);
    }
    return tagged;
  } catch {
    return [];
  }
}

export async function fetchYouTubeVideos(customQuery?: string): Promise<FetchResult> {
  const apiKey = getYouTubeApiKey();
  const watchedIds = getWatchedVideoIds();

  if (customQuery && customQuery.trim()) {
    const cleanQuery = customQuery.trim();
    const queryVideos = await fetchQueryVideos(apiKey, cleanQuery);

    if (queryVideos.length === 0) {
      const err = lastRawError || `No suitable videos found for query "${cleanQuery}"`;
      return { videos: [], error: err };
    }

    // Exclude watched videos if possible
    const unwatched = queryVideos.filter((v) => !watchedIds.has(v.videoId));
    const finalVideos = unwatched.length >= 2 ? unwatched : queryVideos;

    return { videos: finalVideos, error: null };
  }

  // --- DEFAULT FEED DISTRIBUTION FORMULA: N / (N + 1) ---
  // N = number of user search queries.
  // Probability of videos from searched terms = N / (N + 1)
  // Probability of videos from fallback topics = 1 / (N + 1)

  const history = getWatchHistory();
  const topicDwellMap: Record<string, { totalDwell: number; count: number }> = {};
  let totalHistoryDwell = 0;
  let totalHistoryCount = 0;

  history.forEach((item) => {
    if (item.searchTopic) {
      const topic = item.searchTopic.toLowerCase();
      if (!topicDwellMap[topic]) topicDwellMap[topic] = { totalDwell: 0, count: 0 };
      topicDwellMap[topic].totalDwell += item.dwellSeconds;
      topicDwellMap[topic].count += 1;
    }
    totalHistoryDwell += item.dwellSeconds;
    totalHistoryCount += 1;
  });

  const globalAvgDwell = totalHistoryCount > 0 ? totalHistoryDwell / totalHistoryCount : 15;

  let userSearches = getUserSearches();

  // Prune queries that consistently underperform (< 40% of average dwell after 2+ views)
  userSearches = userSearches.filter((s) => {
    const stats = topicDwellMap[s.toLowerCase()];
    if (stats && stats.count >= 2) {
      const topicAvg = stats.totalDwell / stats.count;
      if (topicAvg < globalAvgDwell * 0.4) {
        removeStoredSearch(s);
        return false;
      }
    }
    return true;
  });

  const N = Math.min(userSearches.length, 10);
  const fallbackTopics = ['trending shorts', 'viral shorts', 'popular shorts', 'reels', 'shorts'];

  // User search pools (N pools) + 1 Fallback pool
  const searchQueriesToFetch = [...userSearches.slice(0, N)];
  const fallbackQuery = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];

  const allQueriesToFetch = [...searchQueriesToFetch, fallbackQuery];

  // Fetch / retrieve cached videos for each query in parallel
  const rawVideoLists = await Promise.all(
    allQueriesToFetch.map((q) => fetchQueryVideos(apiKey, q))
  );

  // We have N search video lists and 1 fallback video list.
  // Interleave round-robin across all N+1 pools so each round draws 1 video from each of N search pools
  // and 1 video from the fallback pool.
  // Thus out of every N+1 videos in the feed, N come from user searches (N / (N + 1)) and 1 comes from fallback (1 / (N + 1)).

  const interleaved: YTVideo[] = [];
  const seenIds = new Set<string>();

  let maxLen = 0;
  rawVideoLists.forEach((list) => {
    if (list.length > maxLen) maxLen = list.length;
  });

  for (let round = 0; round < maxLen; round++) {
    // Shuffle pool indices for this round to randomize order
    const poolIndices = Array.from({ length: rawVideoLists.length }, (_, idx) => idx).sort(
      () => Math.random() - 0.5
    );

    for (const poolIdx of poolIndices) {
      const video = rawVideoLists[poolIdx][round];
      if (video && !seenIds.has(video.videoId)) {
        seenIds.add(video.videoId);
        interleaved.push(video);
      }
    }
  }

  if (interleaved.length === 0) {
    const err = lastRawError || 'No videos available. Please check API key or network connection.';
    return { videos: [], error: err };
  }

  // Exclude watched videos if unwatched count is sufficient
  const unwatched = interleaved.filter((v) => !watchedIds.has(v.videoId));
  const resultPool =
    unwatched.length >= 3
      ? unwatched
      : [...unwatched, ...interleaved.filter((v) => watchedIds.has(v.videoId))];

  return { videos: resultPool, error: null };
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
