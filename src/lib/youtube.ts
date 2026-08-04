export interface YTVideo {
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  thumbnail: string;
}

interface CacheEntry {
  videos: YTVideo[];
  fetchedAt: number;
}

const CACHE_KEY = 'fs_yt_cache_session_v2';
const QUOTA_KEY = 'fs_yt_quota_error';

const SEARCH_QUERIES = [
  'shorts nature',
  'shorts cooking',
  'shorts animals',
  'shorts sports',
  'shorts diy',
  'shorts science',
  'asmr shorts',
  'travel shorts',
  'shorts fitness',
  'shorts gaming',
  'shorts technology',
  'shorts art',
  'shorts satisfying',
  'shorts music',
];

export function getYouTubeApiKey(): string | undefined {
  return import.meta.env.VITE_YOUTUBE_API_KEY;
}

export function isQuotaExhausted(): boolean {
  try {
    return sessionStorage.getItem(QUOTA_KEY) === '1' || localStorage.getItem(QUOTA_KEY) === '1';
  } catch {
    return false;
  }
}

function setQuotaExhausted(): void {
  try {
    sessionStorage.setItem(QUOTA_KEY, '1');
  } catch {
    // ignore
  }
}

export function clearQuotaFlag(): void {
  try {
    sessionStorage.removeItem(QUOTA_KEY);
    localStorage.removeItem(QUOTA_KEY);
    localStorage.removeItem('fs_yt_cache_v1');
  } catch {
    // ignore
  }
}

function readCache(): CacheEntry | null {
  try {
    // Clean up any legacy localStorage cache
    localStorage.removeItem('fs_yt_cache_v1');

    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry.videos || entry.videos.length === 0) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(videos: YTVideo[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ videos, fetchedAt: Date.now() }));
  } catch {
    // ignore
  }
}

export function getCachedVideos(): YTVideo[] | null {
  const cache = readCache();
  return cache ? cache.videos : null;
}

export function getCacheAge(): number | null {
  const cache = readCache();
  return cache ? Date.now() - cache.fetchedAt : null;
}

function parseISODuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + min * 60 + s;
}

async function searchVideos(apiKey: string, query: string): Promise<string[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=id&type=video&videoDuration=short&videoDimension=2d` +
    `&maxResults=50&q=${encodeURIComponent(query)}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403) setQuotaExhausted();
    throw new Error(`search.list failed: ${res.status}`);
  }
  const data = await res.json();
  const ids: string[] = [];
  for (const item of data.items || []) {
    if (item.id && item.id.videoId) ids.push(item.id.videoId);
  }
  return ids;
}

async function fetchVideoDetails(apiKey: string, ids: string[]): Promise<YTVideo[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }
  const results: YTVideo[] = [];
  for (const chunk of chunks) {
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=contentDetails,snippet,statistics` +
      `&id=${chunk.join(',')}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 403) setQuotaExhausted();
      throw new Error(`videos.list failed: ${res.status}`);
    }
    const data = await res.json();
    for (const item of data.items || []) {
      const dur = parseISODuration(item.contentDetails?.duration || '');
      const thumb =
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '';
      results.push({
        videoId: item.id,
        title: item.snippet?.title || '',
        channel: item.snippet?.channelTitle || '',
        durationSec: dur,
        thumbnail: thumb,
      });
    }
  }
  return results;
}

export interface FetchResult {
  videos: YTVideo[];
  error: string | null;
}

export async function fetchYouTubeVideos(): Promise<FetchResult> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) return { videos: [], error: 'No API key' };
  if (isQuotaExhausted()) return { videos: [], error: 'Quota exhausted' };

  const cached = readCache();
  if (cached) return { videos: cached.videos, error: null };

  try {
    const allIds = new Set<string>();
    // Pick 5 random search queries each session for variety
    const shuffledQueries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5).slice(0, 5);
    for (const q of shuffledQueries) {
      try {
        const ids = await searchVideos(apiKey, q);
        ids.forEach((id) => allIds.add(id));
      } catch {
        // continue with other queries
      }
    }
    if (allIds.size === 0) return { videos: [], error: 'No results from any query' };

    const details = await fetchVideoDetails(apiKey, Array.from(allIds));

    const filtered = details
      .filter((v) => v.durationSec >= 8 && v.durationSec <= 90)
      .sort((a, b) => a.durationSec - b.durationSec);

    if (filtered.length === 0) return { videos: [], error: 'No videos in 8-90s range' };

    writeCache(filtered);
    return { videos: filtered, error: null };
  } catch (err) {
    return { videos: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function buildFeedQueue(videos: YTVideo[], startTarget: number = 18, increment: number = 1.5): YTVideo[] {
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
