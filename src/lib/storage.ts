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
};

const START_TARGET = 18;
const INCREMENT = 1.5;

export function getTargetDuration(videoIndex: number): number {
  return START_TARGET + videoIndex * INCREMENT;
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

