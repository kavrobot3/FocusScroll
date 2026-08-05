import { useMemo, useState } from 'react';
import {
  TrendingUp,
  MousePointerClick,
  Clock,
  Eye,
  Play,
  RotateCcw,
  Settings,
  Sun,
  Moon,
  Search,
  Trash2,
  Plus,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  getAverageDwell,
  getFirstDwell,
  getMeta,
  formatScreenTime,
  getPeriodAverages,
  getSessionChartData,
  resetSession,
  getStoredSearches,
  removeStoredSearch,
  addStoredSearch,
  clearSearchHistory,
  getAppTheme,
  setAppTheme,
} from '@/lib/storage';

export default function StatsPage() {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(() => getAppTheme());
  const [version, setVersion] = useState(0);

  const searches = useMemo(() => {
    return getStoredSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, searchHistoryOpen]);

  const data = useMemo(() => {
    const meta = getMeta();
    return {
      avgDwell: getAverageDwell(),
      firstDwell: getFirstDwell(),
      meta,
      screenTime: formatScreenTime(meta.totalScreenTimeMs),
      periods: getPeriodAverages(),
      chart: getSessionChartData(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const [activePeriod, setActivePeriod] = useState(0);
  const growth = Math.round(data.avgDwell - data.firstDwell);

  const handleReset = () => {
    resetSession();
    clearSearchHistory();
    setVersion((v) => v + 1);
    setResetOpen(false);
    setOptionsOpen(false);
  };

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setAppTheme(nextTheme);
    setCurrentTheme(nextTheme);
  };

  const handleRemoveSearch = (query: string) => {
    removeStoredSearch(query);
    setVersion((v) => v + 1);
  };

  const handleAddSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    addStoredSearch(newTopic.trim());
    setNewTopic('');
    setVersion((v) => v + 1);
  };

  const handleClearSearches = () => {
    clearSearchHistory();
    setVersion((v) => v + 1);
  };

  const hasData = data.meta.totalSwipes > 0 || data.avgDwell > 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-5 pt-14 pb-24">
      {/* Hero stat */}
      <div className="animate-fade-up">
        <div className="text-xs font-medium uppercase tracking-widest text-white/40">
          Your average attention span
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tight text-white">
            {Math.round(data.avgDwell)}s
          </span>
          {growth > 0 && (
            <span className="flex items-center gap-1 text-sm font-medium text-cyan-400">
              <TrendingUp size={16} />
              ↑ {growth}s
            </span>
          )}
        </div>
        {hasData ? (
          <div className="mt-1 text-xs text-white/40">
            {data.firstDwell > 0 ? `Started at ${Math.round(data.firstDwell)}s average` : 'Measured from real watch time'}
          </div>
        ) : (
          <div className="mt-1 text-xs text-cyan-400/80 italic">
            No real watch data recorded yet. Watch some shorts in the feed!
          </div>
        )}
        <div className="mt-1 text-[11px] text-white/25">
          real time spent looking at each video
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
          Average watch time per session
        </div>
        {data.chart.length > 0 ? (
          <AreaChart data={data.chart} />
        ) : (
          <div className="flex h-36 flex-col items-center justify-center rounded-2xl bg-ink-800 p-4 text-center border border-white/5">
            <span className="text-xs text-white/40">No watch history yet</span>
            <span className="mt-1 text-[11px] text-white/20">Charts appear automatically as you scroll</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <StatCard
          icon={<MousePointerClick size={18} />}
          label="Total swipes"
          value={data.meta.totalSwipes.toString()}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Screen time"
          value={data.screenTime}
        />
        <StatCard
          icon={<Eye size={18} />}
          label="Longest watch"
          value={`${Math.round(data.meta.longestWatch)}s`}
        />
        <StatCard
          icon={<Play size={18} />}
          label="Watched today"
          value={data.meta.videosWatchedToday.toString()}
        />
      </div>

      {/* Period breakdown */}
      <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
          Attention span breakdown
        </div>
        <div className="flex gap-1 rounded-xl bg-ink-800 p-1">
          {data.periods.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActivePeriod(i)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                activePeriod === i
                  ? 'bg-cyan-400 text-ink-950 shadow-md'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">
            {Math.round(data.periods[activePeriod]?.avg ?? 0)}s
          </span>
          <span className="text-sm text-white/40">avg per video</span>
        </div>
      </div>

      {/* Options Dropdown Menu & Settings */}
      <div className="relative mt-10 mb-8 flex justify-center">
        <button
          onClick={() => setOptionsOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800 px-4 py-2.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-ink-700 transition active:scale-95 shadow-lg"
        >
          <Settings size={15} className="text-cyan-400" />
          <span>Options</span>
          <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${optionsOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {optionsOpen && (
          <div className="absolute bottom-12 z-50 w-64 rounded-2xl border border-white/15 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-1">
            {/* Theme Toggle */}
            <button
              onClick={() => {
                handleToggleTheme();
                setOptionsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <div className="flex items-center gap-2.5">
                {currentTheme === 'dark' ? <Moon size={15} className="text-cyan-400" /> : <Sun size={15} className="text-amber-400" />}
                <span>Appearance</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {currentTheme}
              </span>
            </button>

            {/* Manage Search History */}
            <button
              onClick={() => {
                setSearchHistoryOpen(true);
                setOptionsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <div className="flex items-center gap-2.5">
                <Search size={15} className="text-cyan-400" />
                <span>Search History</span>
              </div>
              <span className="text-[10px] text-white/40">
                {searches.length} {searches.length === 1 ? 'topic' : 'topics'}
              </span>
            </button>

            <div className="my-1 h-[1px] bg-white/10" />

            {/* Reset All Data (Red) */}
            <button
              onClick={() => {
                setResetOpen(true);
                setOptionsOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/15 hover:text-red-300 transition"
            >
              <RotateCcw size={15} />
              <span>Reset All Data</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Reset Confirmation */}
      {resetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setResetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-red-500/30 bg-ink-900 p-5 shadow-2xl flex flex-col items-center text-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <RotateCcw size={22} />
            </div>
            <h3 className="text-sm font-semibold text-white">Reset All App Data?</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              This will permanently clear your attention span statistics, watch history, and saved search topics.
            </p>
            <div className="mt-2 flex w-full gap-2">
              <button
                onClick={() => setResetOpen(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-medium text-white/80 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/30"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Search History */}
      {searchHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSearchHistoryOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-ink-900 p-5 shadow-2xl flex flex-col gap-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Search size={16} className="text-cyan-400" />
                <span>Manage Search History</span>
              </h3>
              <button
                onClick={() => setSearchHistoryOpen(false)}
                className="p-1 text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Add custom search topic */}
            <form onSubmit={handleAddSearch} className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Add new topic (e.g. physics)..."
                className="w-full rounded-xl bg-black/50 px-3 py-2 text-xs text-white border border-white/20 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="flex items-center gap-1 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-cyan-400 shrink-0"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>

            {/* Searches List */}
            <div className="max-h-56 overflow-y-auto scrollbar-hide flex flex-col gap-1.5 pr-1">
              {searches.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/40 italic">
                  No search history saved yet.
                </div>
              ) : (
                searches.map((query) => (
                  <div
                    key={query}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs text-white/90 border border-white/5"
                  >
                    <span className="truncate">{query}</span>
                    <button
                      onClick={() => handleRemoveSearch(query)}
                      className="text-white/40 hover:text-red-400 transition p-1 shrink-0"
                      title="Delete topic"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {searches.length > 0 && (
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <button
                  onClick={handleClearSearches}
                  className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Clear All History</span>
                </button>
                <button
                  onClick={() => setSearchHistoryOpen(false)}
                  className="rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-ink-800 p-4 transition hover:bg-ink-700 border border-white/5">
      <div className="flex items-center gap-2 text-cyan-400">
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-xs text-white/40">{label}</div>
    </div>
  );
}

interface ChartProps {
  data: { label: string; avg: number }[];
}

function AreaChart({ data }: ChartProps) {
  if (data.length === 0) {
    return <div className="h-36 rounded-2xl bg-ink-800" />;
  }

  const w = 300;
  const h = 120;
  const pad = 12;
  const max = Math.max(...data.map((d) => d.avg)) * 1.15 || 10;
  const min = Math.min(...data.map((d) => d.avg)) * 0.85 || 0;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.avg - min) / range) * (h - pad * 2);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h - pad} L ${points[0].x.toFixed(1)} ${h - pad} Z`;

  return (
    <div className="rounded-2xl bg-ink-800 p-3 border border-white/5">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 'auto' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22D3EE" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] text-white/30">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

