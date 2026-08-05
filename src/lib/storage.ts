export interface DwellRecord {
  videoIndex: number;
  targetDuration: number;
  dwellSeconds: number;
  timestamp: number;
  videoId?: string;
  youtubeDurationSec?: number;
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
  THEME: 'fs_app_theme',
};

const DEFAULT_START_TARGET = 3;
const INCREMENT = 1;

export function getAppTheme(): 'dark' | 'light' {
  return readJSON<'dark' | 'light'>(KEYS.THEME, 'dark');
}

export function setAppTheme(theme: 'dark' | 'light'): void {
  writeJSON(KEYS.THEME, theme);
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

export function initAppTheme(): void {
  const theme = getAppTheme();
  setAppTheme(theme);
}

export function getSessionStartTarget(): number {
  const val = readJSON<number | null>(KEYS.SESSION_START_TARGET, null);
  if (val === null || typeof val !== 'number' || val < 3) return DEFAULT_START_TARGET;
  return val;
}

export function setSessionStartTarget(target: number): void {
  const safe = Math.max(3, Math.round(target));
  writeJSON(KEYS.SESSION_START_TARGET, safe);
}

export function recordSessionEndTarget(lastVideoIndex: number): void {
  const currentStart = getSessionStartTarget();
  const endingTarget = currentStart + lastVideoIndex * INCREMENT;
  // Decrease by 10 for the next session continuation, minimum 3s
  const nextStart = Math.max(3, Math.round(endingTarget - 10));
  setSessionStartTarget(nextStart);
}

export function getCalibrationAverage(): number {
  const records = getDwellRecords();
  // Examine the first six scrolls for the user's average attention span
  const firstSix = records.slice(0, 6);
  if (firstSix.length === 0) return DEFAULT_START_TARGET;
  const sum = firstSix.reduce((s, r) => s + r.dwellSeconds, 0);
  const avg = sum / firstSix.length;
  return Math.max(3, Math.round(avg * 10) / 10);
}

export function isCalibrated(): boolean {
  return getDwellRecords().length >= 6;
}

export function getTargetDuration(videoIndex: number): number {
  if (videoIndex < 6) {
    // 6-video calibration phase (videos 1-6)
    return getSessionStartTarget();
  }
  // Forced minimum-watch gate from video 7 onwards:
  // Starts at the calibrated average attention span from the first six scrolls
  const calAvg = getCalibrationAverage();
  return Math.round(calAvg + (videoIndex - 5) * INCREMENT);
}

export function getStoredSearches(): string[] {
  return readJSON<string[]>(KEYS.SEARCH_HISTORY, []);
}

export function addStoredSearch(query: string): void {
  const clean = query.trim();
  if (!clean) return;
  const existing = getStoredSearches();
  const filtered = existing.filter((q) => q.toLowerCase() !== clean.toLowerCase());
  const updated = [clean, ...filtered].slice(0, 30);
  writeJSON(KEYS.SEARCH_HISTORY, updated);
}

export function removeStoredSearch(query: string): void {
  const existing = getStoredSearches();
  const updated = existing.filter((q) => q.toLowerCase() !== query.toLowerCase().trim());
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

export function getPeriodAverages(): PeriodAvg[] {
  return [
    { label: 'Lifetime', avg: getLifetimeAverage() },
    { label: 'Yearly', avg: getYearlyAverage() },
    { label: 'Monthly', avg: getMonthlyAverage() },
    { label: 'Weekly', avg: getWeeklyAverage() },
  ];
}

export function getSessionChartData(): { label: string; avg: number }[] {
  const records = getDwellRecords();
  if (records.length === 0) return [];
  const groups: Record<string, number[]> = {};
  records.forEach((r) => {
    const d = new Date(r.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.dwellSeconds);
  });
  const keys = Object.keys(groups).sort((a, b) => {
    const [ma, da] = a.split('/').map(Number);
    const [mb, db] = b.split('/').map(Number);
    return ma - mb || da - db;
  });
  return keys.map((k) => ({
    label: k,
    avg: Math.round((groups[k].reduce((s, v) => s + v, 0) / groups[k].length) * 10) / 10,
  }));
}

export function seedData(): void {
  // Do not generate artificial seed data — track real data only.
}

export function resetSession(): void {
  localStorage.removeItem(KEYS.DWELL);
  localStorage.removeItem(KEYS.META);
  localStorage.removeItem('fs_seeded_v1');
  localStorage.removeItem('fs_seeded_v1_chart');
}

