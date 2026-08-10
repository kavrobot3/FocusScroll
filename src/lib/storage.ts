export interface DwellRecord {
  videoIndex: number;
  targetDuration: number;
  dwellSeconds: number;
  timestamp: number;
  videoId?: string;
  youtubeDurationSec?: number;
}

export interface WatchHistoryItem {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSec: number;
  watchedAt: number;
  dwellSeconds: number;
  searchTopic?: string;
}

export interface SessionMeta {
  totalSwipes: number;
  totalScreenTimeMs: number;
  longestWatch: number;
  videosWatchedToday: number;
  lastWatchDate: string;
}

const KEYS = {
  DWELL: 'fs_dwell_records',
  META: 'fs_session_meta',
  SESSION_START_TARGET: 'fs_session_start_target',
  SEARCH_HISTORY: 'fs_search_history',
  USER_SEARCHES: 'fs_user_searches',
  WATCH_HISTORY: 'fs_watch_history',
  THEME: 'fs_app_theme',
  TARGET_SPEED: 'fs_target_speed_config',
};

const DEFAULT_START_TARGET = 3;

export type TargetSpeedMode = 'stable' | 'slow' | 'medium' | 'fast' | 'very_fast' | 'custom';

export interface TargetSpeedConfig {
  mode: TargetSpeedMode;
  customSeconds: number;
}

export const SPEED_PRESETS: { mode: TargetSpeedMode; label: string; increment: number; desc: string }[] = [
  { mode: 'stable', label: 'Stable', increment: 0, desc: 'No change' },
  { mode: 'slow', label: 'Slow', increment: 0.2, desc: '0.2s / short' },
  { mode: 'medium', label: 'Medium', increment: 0.7, desc: '0.7s / short' },
  { mode: 'fast', label: 'Fast', increment: 1.2, desc: '1.2s / short' },
  { mode: 'very_fast', label: 'Very Fast', increment: 2.7, desc: '2.7s / short' },
];

export function getTargetSpeedConfig(): TargetSpeedConfig {
  return readJSON<TargetSpeedConfig>(KEYS.TARGET_SPEED, {
    mode: 'medium',
    customSeconds: 0.7,
  });
}

export function setTargetSpeedConfig(config: TargetSpeedConfig): void {
  const safeCustom = Math.max(0, Math.round((config.customSeconds || 0) * 1000) / 1000);
  writeJSON(KEYS.TARGET_SPEED, { ...config, customSeconds: safeCustom });
}

export function getTargetIncrement(): number {
  const config = getTargetSpeedConfig();
  if (config.mode === 'custom') {
    return Math.max(0, Math.round((config.customSeconds || 0) * 1000) / 1000);
  }
  const found = SPEED_PRESETS.find((p) => p.mode === config.mode);
  return found ? found.increment : 0.7;
}

export function getAppTheme(): 'dark' | 'light' {
  return 'dark';
}

export function setAppTheme(): void {
  // Legacy theme toggle retained for compatibility
}

export function initAppTheme(): void {
  // Legacy theme initialization
}

export function getSessionStartTarget(): number {
  const val = readJSON<number | null>(KEYS.SESSION_START_TARGET, null);
  if (val === null || typeof val !== 'number' || val < 3) return DEFAULT_START_TARGET;
  return val;
}

export function setSessionStartTarget(target: number): void {
  const safe = Math.max(3, Math.round(target * 1000) / 1000);
  writeJSON(KEYS.SESSION_START_TARGET, safe);
}

export function recordSessionEndTarget(lastVideoIndex: number): void {
  const currentStart = getSessionStartTarget();
  const increment = getTargetIncrement();
  const endingTarget = currentStart + lastVideoIndex * increment;
  const nextStart = Math.max(3, Math.round((endingTarget - 10) * 1000) / 1000);
  setSessionStartTarget(nextStart);
}

export function getCalibrationAverage(): number {
  const records = getDwellRecords();
  const sample = records.slice(0, 13);
  if (sample.length === 0) return DEFAULT_START_TARGET;
  const sum = sample.reduce((s, r) => s + r.dwellSeconds, 0);
  const avg = sum / sample.length;
  return Math.max(3, Math.round(avg * 1000) / 1000);
}

export function isCalibrated(): boolean {
  return getDwellRecords().length >= 13;
}

export function getTargetDuration(videoIndex: number): number {
  const totalRecords = getDwellRecords().length;
  const isInitialDone = totalRecords >= 13;
  const calibrationLength = isInitialDone ? 4 : 13;
  const increment = getTargetIncrement();

  if (videoIndex < calibrationLength) {
    return getSessionStartTarget();
  }

  const calAvg = getCalibrationAverage();
  const indexOffset = videoIndex - (calibrationLength - 1);
  const calculated = calAvg + indexOffset * increment;
  return Math.max(3, Math.round(calculated * 1000) / 1000);
}

export const DEFAULT_ASSUMED_SEARCHES = [
  'science facts',
  'mindset tips',
  'tech innovations',
  'nature documentaries',
  'creative arts',
  'space exploration',
  'fitness motivation',
  'history shorts',
];

export function getUserSearches(): string[] {
  const userList = readJSON<string[]>(KEYS.USER_SEARCHES, []);
  if (userList.length > 0) {
    return userList;
  }
  const stored = readJSON<string[]>(KEYS.SEARCH_HISTORY, []);
  const explicit = stored.filter(
    (s) => !DEFAULT_ASSUMED_SEARCHES.some((d) => d.toLowerCase() === s.toLowerCase())
  );
  return explicit;
}

export function getStoredSearches(): string[] {
  const searches = readJSON<string[] | null>(KEYS.SEARCH_HISTORY, null);
  if (searches === null) {
    writeJSON(KEYS.SEARCH_HISTORY, DEFAULT_ASSUMED_SEARCHES);
    return DEFAULT_ASSUMED_SEARCHES;
  }
  return searches;
}

export function addStoredSearch(query: string): void {
  const clean = query.trim();
  if (!clean) return;

  // Track explicit user searches
  let userSearches = getUserSearches();
  userSearches = userSearches.filter((q) => q.toLowerCase() !== clean.toLowerCase());
  userSearches = [clean, ...userSearches].slice(0, 20);
  writeJSON(KEYS.USER_SEARCHES, userSearches);

  let existing = getStoredSearches();
  existing = existing.filter((q) => q.toLowerCase() !== clean.toLowerCase());

  // Delete one random assumed/old search when user performs a new search
  if (existing.length > 0) {
    const randomIndex = Math.floor(Math.random() * existing.length);
    existing.splice(randomIndex, 1);
  }

  const updated = [clean, ...existing].slice(0, 30);
  writeJSON(KEYS.SEARCH_HISTORY, updated);
}

export function removeStoredSearch(query: string): void {
  const clean = query.toLowerCase().trim();
  let userSearches = getUserSearches();
  userSearches = userSearches.filter((q) => q.toLowerCase() !== clean);
  writeJSON(KEYS.USER_SEARCHES, userSearches);

  const existing = getStoredSearches();
  const updated = existing.filter((q) => q.toLowerCase() !== clean);
  writeJSON(KEYS.SEARCH_HISTORY, updated);
}

export function saveStoredSearches(searches: string[]): void {
  const cleaned = searches.map((s) => s.trim()).filter(Boolean);
  const unique = Array.from(new Set(cleaned));
  writeJSON(KEYS.SEARCH_HISTORY, unique);
}

export function clearSearchHistory(): void {
  localStorage.removeItem(KEYS.SEARCH_HISTORY);
}

export function getShuffledStoredSearches(): string[] {
  const searches = getStoredSearches();
  if (searches.length === 0) return [];
  return [...searches].sort(() => Math.random() - 0.5);
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function getDwellRecords(): DwellRecord[] {
  return readJSON<DwellRecord[]>(KEYS.DWELL, []);
}

export function addDwellRecord(rec: DwellRecord): void {
  // Only record valid real dwell time (> 0.2s)
  if (rec.dwellSeconds < 0.2) return;
  const records = getDwellRecords();
  records.push(rec);
  writeJSON(KEYS.DWELL, records);
}

export function getRecentDwellRecords(count: number): DwellRecord[] {
  const records = getDwellRecords();
  return records.slice(-count);
}

function todayStr(): string {
  return new Date().toDateString();
}

export function getMeta(): SessionMeta {
  const meta = readJSON<SessionMeta>(KEYS.META, {
    totalSwipes: 0,
    totalScreenTimeMs: 0,
    longestWatch: 0,
    videosWatchedToday: 0,
    lastWatchDate: todayStr(),
  });
  if (meta.lastWatchDate !== todayStr()) {
    meta.videosWatchedToday = 0;
    meta.lastWatchDate = todayStr();
  }
  return meta;
}

export function recordSwipe(dwellSeconds: number, screenTimeMs: number): void {
  if (dwellSeconds < 0.2) return;
  const meta = getMeta();
  meta.totalSwipes += 1;
  meta.totalScreenTimeMs += screenTimeMs;
  meta.longestWatch = Math.max(meta.longestWatch, dwellSeconds);
  meta.videosWatchedToday += 1;
  meta.lastWatchDate = todayStr();
  writeJSON(KEYS.META, meta);
}

export function formatScreenTime(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const totalSec = Math.floor(ms / 1000);
  if (totalMin === 0) return `${totalSec}s`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function getAverageDwell(): number {
  const records = getDwellRecords();
  if (records.length === 0) return 0;
  const sum = records.reduce((s, r) => s + r.dwellSeconds, 0);
  return sum / records.length;
}

export function getFirstDwell(): number {
  const records = getDwellRecords();
  if (records.length === 0) return 0;
  return records[0].dwellSeconds;
}

export function getWeeklyGrowthSeconds(): number {
  const records = getDwellRecords();
  if (records.length < 2) return 0;
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => r.timestamp >= weekAgo);
  const older = records.filter((r) => r.timestamp < weekAgo);
  if (recent.length === 0) return 0;
  const recentAvg = recent.reduce((s, r) => s + r.dwellSeconds, 0) / recent.length;
  if (older.length === 0) {
    const firstAvg = records[0].dwellSeconds;
    return Math.round((recentAvg - firstAvg) * 10) / 10;
  }
  const olderAvg = older.reduce((s, r) => s + r.dwellSeconds, 0) / older.length;
  return Math.round((recentAvg - olderAvg) * 10) / 10;
}

interface PeriodAvg {
  label: string;
  avg: number;
}

export function getLifetimeAverage(): number {
  return getAverageDwell();
}

export function getYearlyAverage(): number {
  const records = getDwellRecords();
  if (records.length === 0) return 0;
  const now = Date.now();
  const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => r.timestamp >= yearAgo);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((s, r) => s + r.dwellSeconds, 0);
  return sum / recent.length;
}

export function getMonthlyAverage(): number {
  const records = getDwellRecords();
  if (records.length === 0) return 0;
  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => r.timestamp >= monthAgo);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((s, r) => s + r.dwellSeconds, 0);
  return sum / recent.length;
}

export function getWeeklyAverage(): number {
  const records = getDwellRecords();
  if (records.length === 0) return 0;
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => r.timestamp >= weekAgo);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((s, r) => s + r.dwellSeconds, 0);
  return sum / recent.length;
}

export function getDailyAverage(): number {
  const records = getDwellRecords();
  if (records.length === 0) return 0;
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => r.timestamp >= dayAgo);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((s, r) => s + r.dwellSeconds, 0);
  return sum / recent.length;
}

export function getPeriodAverages(): PeriodAvg[] {
  return [
    { label: 'Daily', avg: getDailyAverage() },
    { label: 'Weekly', avg: getWeeklyAverage() },
    { label: 'Monthly', avg: getMonthlyAverage() },
    { label: 'Yearly', avg: getYearlyAverage() },
    { label: 'Lifetime', avg: getLifetimeAverage() },
  ];
}

export interface PeriodStats {
  avgDwell: number;
  totalSwipes: number;
  screenTimeMs: number;
  longestWatch: number;
  videosWatched: number;
}

export function getStatsForPeriod(periodLabel: string): PeriodStats {
  const records = getDwellRecords();
  const meta = getMeta();
  const now = Date.now();

  let cutoff = 0;
  if (periodLabel === 'Daily') cutoff = now - 24 * 60 * 60 * 1000;
  else if (periodLabel === 'Weekly') cutoff = now - 7 * 24 * 60 * 60 * 1000;
  else if (periodLabel === 'Monthly') cutoff = now - 30 * 24 * 60 * 60 * 1000;
  else if (periodLabel === 'Yearly') cutoff = now - 365 * 24 * 60 * 60 * 1000;

  if (periodLabel === 'Lifetime' || cutoff === 0) {
    return {
      avgDwell: getAverageDwell(),
      totalSwipes: meta.totalSwipes,
      screenTimeMs: meta.totalScreenTimeMs,
      longestWatch: meta.longestWatch,
      videosWatched: meta.totalSwipes,
    };
  }

  const filtered = records.filter((r) => r.timestamp >= cutoff);
  if (filtered.length === 0) {
    return {
      avgDwell: 0,
      totalSwipes: 0,
      screenTimeMs: 0,
      longestWatch: 0,
      videosWatched: 0,
    };
  }

  const avgDwell = filtered.reduce((s, r) => s + r.dwellSeconds, 0) / filtered.length;
  const totalSwipes = filtered.length;
  const screenTimeMs = filtered.reduce((s, r) => s + r.dwellSeconds * 1000, 0);
  const longestWatch = Math.max(...filtered.map((r) => r.dwellSeconds));

  return {
    avgDwell,
    totalSwipes,
    screenTimeMs,
    longestWatch,
    videosWatched: totalSwipes,
  };
}

export interface ChartPoint {
  label: string;
  subLabel?: string;
  avg: number;
  count: number;
  totalTime: number;
  timestamp?: number;
}

export function getChartDataForPeriod(periodLabel: string): ChartPoint[] {
  const records = getDwellRecords();
  if (records.length === 0) return [];

  const now = Date.now();
  let cutoff = 0;
  if (periodLabel === 'Daily') cutoff = now - 24 * 60 * 60 * 1000;
  else if (periodLabel === 'Weekly') cutoff = now - 7 * 24 * 60 * 60 * 1000;
  else if (periodLabel === 'Monthly') cutoff = now - 30 * 24 * 60 * 60 * 1000;
  else if (periodLabel === 'Yearly') cutoff = now - 365 * 24 * 60 * 60 * 1000;

  const filtered = cutoff > 0 ? records.filter((r) => r.timestamp >= cutoff) : records;
  if (filtered.length === 0) return [];

  if (periodLabel === 'Daily') {
    if (filtered.length <= 15) {
      return filtered.map((r, i) => {
        const timeStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const targetValue = Math.round((r.targetDuration || r.dwellSeconds || 3) * 10) / 10;
        return {
          label: `#${i + 1}`,
          subLabel: timeStr,
          avg: targetValue,
          count: 1,
          totalTime: Math.round(r.dwellSeconds),
          timestamp: r.timestamp,
        };
      });
    } else {
      const groups: Record<string, DwellRecord[]> = {};
      filtered.forEach((r) => {
        const d = new Date(r.timestamp);
        const hourKey = `${d.getHours()}:00`;
        if (!groups[hourKey]) groups[hourKey] = [];
        groups[hourKey].push(r);
      });
      return Object.keys(groups).map((h) => {
        const recs = groups[h];
        const sum = recs.reduce((s, r) => s + r.dwellSeconds, 0);
        const maxTarget = Math.max(...recs.map((r) => r.targetDuration || r.dwellSeconds || 3));
        const targetValue = Math.round(maxTarget * 10) / 10;
        return {
          label: h,
          avg: targetValue,
          count: recs.length,
          totalTime: Math.round(sum),
        };
      });
    }
  }

  const groups: Record<string, DwellRecord[]> = {};
  filtered.forEach((r) => {
    const d = new Date(r.timestamp);
    const dateKey = `${d.getMonth() + 1}/${d.getDate()}`;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(r);
  });

  const keys = Object.keys(groups).sort((a, b) => {
    const [ma, da] = a.split('/').map(Number);
    const [mb, db] = b.split('/').map(Number);
    return ma - mb || da - db;
  });

  return keys.map((k) => {
    const recs = groups[k];
    const sum = recs.reduce((s, r) => s + r.dwellSeconds, 0);
    const maxTarget = Math.max(...recs.map((r) => r.targetDuration || r.dwellSeconds || 3));
    const targetValue = Math.round(maxTarget * 10) / 10;
    return {
      label: k,
      avg: targetValue,
      count: recs.length,
      totalTime: Math.round(sum),
    };
  });
}

export function getSessionChartData(): { label: string; avg: number }[] {
  return getChartDataForPeriod('Lifetime');
}

export function seedData(): void {
  // Do not generate artificial seed data — track real data only.
}

export function getWatchHistory(): WatchHistoryItem[] {
  return readJSON<WatchHistoryItem[]>(KEYS.WATCH_HISTORY, []);
}

export function addWatchHistory(item: {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSec: number;
  dwellSeconds: number;
  searchTopic?: string;
}): void {
  if (!item.videoId || item.dwellSeconds < 0.2) return;
  const history = getWatchHistory();
  const existingIdx = history.findIndex((h) => h.videoId === item.videoId);

  let updated: WatchHistoryItem[];
  if (existingIdx !== -1) {
    const existing = history[existingIdx];
    const newEntry: WatchHistoryItem = {
      ...existing,
      title: item.title || existing.title,
      channelTitle: item.channelTitle || existing.channelTitle,
      thumbnail: item.thumbnail || existing.thumbnail,
      durationSec: item.durationSec || existing.durationSec,
      dwellSeconds: Math.round((existing.dwellSeconds + item.dwellSeconds) * 10) / 10,
      watchedAt: Date.now(),
      searchTopic: item.searchTopic || existing.searchTopic,
    };
    // Move to front
    updated = [newEntry, ...history.filter((_, idx) => idx !== existingIdx)].slice(0, 100);
  } else {
    const newEntry: WatchHistoryItem = {
      id: `${item.videoId}_${Date.now()}`,
      videoId: item.videoId,
      title: item.title || 'YouTube Short',
      channelTitle: item.channelTitle || 'YouTube Creator',
      thumbnail: item.thumbnail || '',
      durationSec: item.durationSec || 0,
      watchedAt: Date.now(),
      dwellSeconds: Math.round(item.dwellSeconds * 10) / 10,
      searchTopic: item.searchTopic,
    };
    updated = [newEntry, ...history].slice(0, 100);
  }

  writeJSON(KEYS.WATCH_HISTORY, updated);
}

export function clearWatchHistory(): void {
  localStorage.removeItem(KEYS.WATCH_HISTORY);
}

export function getWatchedVideoIds(): Set<string> {
  const history = getWatchHistory();
  return new Set(history.map((h) => h.videoId));
}

export function resetSession(): void {
  localStorage.removeItem(KEYS.DWELL);
  localStorage.removeItem(KEYS.META);
  localStorage.removeItem(KEYS.WATCH_HISTORY);
  localStorage.removeItem('fs_seeded_v1');
  localStorage.removeItem('fs_seeded_v1_chart');
}

