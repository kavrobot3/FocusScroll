import { useEffect, useMemo, useState, useRef } from 'react';
import {
  TrendingUp,
  MousePointerClick,
  Clock,
  Eye,
  Play,
  RotateCcw,
  Settings,
  Search,
  Trash2,
  Plus,
  ChevronDown,
  X,
  History,
  ExternalLink,
  Palette,
  Gauge,
} from 'lucide-react';
import {
  getAverageDwell,
  getFirstDwell,
  getMeta,
  formatScreenTime,
  getPeriodAverages,
  getStatsForPeriod,
  getChartDataForPeriod,
  ChartPoint,
  resetSession,
  getStoredSearches,
  removeStoredSearch,
  addStoredSearch,
  clearSearchHistory,
  getWatchHistory,
  clearWatchHistory,
} from '@/lib/storage';
import CustomizeModal from '@/components/CustomizeModal';
import TargetSpeedModal from '@/components/TargetSpeedModal';

interface Props {
  onEnterFeed?: () => void;
}

export default function StatsPage({ onEnterFeed }: Props) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [targetSpeedOpen, setTargetSpeedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const [watchHistoryOpen, setWatchHistoryOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [version, setVersion] = useState(0);
  const [activePeriod, setActivePeriod] = useState(0);

  // Auto-update graph & stats whenever window gains focus or storage changes
  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const searches = useMemo(() => {
    return getStoredSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, searchHistoryOpen]);

  const watchHistory = useMemo(() => {
    return getWatchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, watchHistoryOpen]);

  const data = useMemo(() => {
    const meta = getMeta();
    return {
      avgDwell: getAverageDwell(),
      firstDwell: getFirstDwell(),
      meta,
      screenTime: formatScreenTime(meta.totalScreenTimeMs),
      periods: getPeriodAverages(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const currentPeriodLabel = data.periods[activePeriod]?.label || 'Daily';
  
  const periodStats = useMemo(() => {
    return getStatsForPeriod(currentPeriodLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, currentPeriodLabel]);

  const chartData = useMemo(() => {
    return getChartDataForPeriod(currentPeriodLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, currentPeriodLabel]);

  const growth = Math.round((periodStats.avgDwell || data.avgDwell) - data.firstDwell);

  const handleReset = () => {
    resetSession();
    clearSearchHistory();
    clearWatchHistory();
    setVersion((v) => v + 1);
    setResetOpen(false);
    setOptionsOpen(false);
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
          Average attention span ({currentPeriodLabel})
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tight text-white">
            {Math.round(periodStats.avgDwell)}s
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
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            Attention Span Trend ({currentPeriodLabel})
          </span>
          {chartData.length > 0 && (
            <span className="text-[10px] text-cyan-400/80 bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              Hover graph points for details
            </span>
          )}
        </div>
        <AreaChart data={chartData} periodLabel={currentPeriodLabel} />
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <StatCard
          icon={<MousePointerClick size={18} />}
          label="Total swipes"
          value={periodStats.totalSwipes.toString()}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Screen time"
          value={formatScreenTime(periodStats.screenTimeMs)}
        />
        <StatCard
          icon={<Eye size={18} />}
          label="Longest watch"
          value={`${Math.round(periodStats.longestWatch)}s`}
        />
        <StatCard
          icon={<Play size={18} />}
          label={`Watched (${currentPeriodLabel})`}
          value={periodStats.videosWatched.toString()}
        />
      </div>

      {/* Period breakdown */}
      <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
          Attention span breakdown
        </div>
        <div className="flex gap-1 rounded-xl bg-ink-800 p-1 border border-white/5">
          {data.periods.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActivePeriod(i)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                activePeriod === i
                  ? 'bg-cyan-400 text-ink-950 font-semibold shadow-md'
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
            {/* Customize Theme Colors */}
            <button
              onClick={() => {
                setCustomizeOpen(true);
                setOptionsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <div className="flex items-center gap-2.5">
                <Palette size={15} className="text-cyan-400" />
                <span>Customize Colors</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                Theme
              </span>
            </button>

            {/* Target Growth Speed */}
            <button
              onClick={() => {
                setTargetSpeedOpen(true);
                setOptionsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <div className="flex items-center gap-2.5">
                <Gauge size={15} className="text-cyan-400" />
                <span>Target Growth Speed</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                Speed
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

            {/* Watch History */}
            <button
              onClick={() => {
                setWatchHistoryOpen(true);
                setOptionsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <div className="flex items-center gap-2.5">
                <History size={15} className="text-cyan-400" />
                <span>Watch History</span>
              </div>
              <span className="text-[10px] text-white/40">
                {watchHistory.length} {watchHistory.length === 1 ? 'short' : 'shorts'}
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

      {/* Modal: Watch History */}
      {watchHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setWatchHistoryOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-ink-900 p-5 shadow-2xl flex flex-col gap-4 text-white max-h-[85vh]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History size={16} className="text-cyan-400" />
                <span>Watch History</span>
              </h3>
              <button
                onClick={() => setWatchHistoryOpen(false)}
                className="p-1 text-white/60 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* History List */}
            <div className="max-h-[55vh] overflow-y-auto scrollbar-hide flex flex-col gap-2 pr-1">
              {watchHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/40 italic flex flex-col items-center gap-2">
                  <History size={28} className="opacity-30" />
                  <span>No watched shorts recorded yet. Watch videos in the feed to build your history!</span>
                </div>
              ) : (
                watchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5 text-xs text-white/90 border border-white/5 hover:bg-white/10 transition"
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-14 w-10 shrink-0 rounded-lg object-cover bg-black/40"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-14 w-10 shrink-0 rounded-lg bg-cyan-950/60 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
                        YT
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate text-xs">{item.title}</div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">{item.channelTitle}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-cyan-400 font-medium">
                        <span>Watched {item.dwellSeconds}s</span>
                        {item.durationSec > 0 && <span className="text-white/30">• Total {item.durationSec}s</span>}
                        <span className="text-white/30 ml-auto">{new Date(item.watchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <a
                      href={`https://www.youtube.com/shorts/${item.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-white/40 hover:text-cyan-400 transition shrink-0"
                      title="Open on YouTube"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                ))
              )}
            </div>

            {watchHistory.length > 0 && (
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <button
                  onClick={() => {
                    clearWatchHistory();
                    setVersion((v) => v + 1);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Clear Watch History</span>
                </button>
                <button
                  onClick={() => setWatchHistoryOpen(false)}
                  className="rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Customize Theme */}
      <CustomizeModal
        isOpen={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        onStartScroll={onEnterFeed}
      />

      {/* Modal: Target Speed */}
      <TargetSpeedModal
        isOpen={targetSpeedOpen}
        onClose={() => setTargetSpeedOpen(false)}
        onStartScroll={onEnterFeed}
      />
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
  data: ChartPoint[];
  periodLabel: string;
}

function AreaChart({ data, periodLabel }: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-2xl bg-ink-800 p-4 text-center border border-white/5">
        <span className="text-xs text-white/40">No watch history for {periodLabel}</span>
        <span className="mt-1 text-[11px] text-white/20">Watch shorts in this period to build your chart</span>
      </div>
    );
  }

  const w = 340;
  const h = 140;
  const padX = 18;
  const padY = 20;

  const values = data.map((d) => d.avg);
  const maxVal = Math.max(...values, 1) * 1.1;
  const minVal = Math.min(...values, 0) * 0.9;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : padX + (i / (data.length - 1)) * (w - padX * 2);
    const y = h - padY - ((d.avg - minVal) / range) * (h - padY * 2);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h - padY} L ${points[0].x.toFixed(1)} ${h - padY} Z`;

  const activeIdx = hoveredIdx !== null ? hoveredIdx : points.length - 1;
  const activePoint = points[activeIdx] || points[0];

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * w;

    let closest = 0;
    let minDiff = Math.abs(points[0].x - mouseX);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    setHoveredIdx(closest);
  };

  const handlePointerLeave = () => {
    setHoveredIdx(null);
  };

  return (
    <div className="relative rounded-2xl bg-ink-800 p-3.5 border border-white/10 shadow-xl overflow-hidden select-none">
      {/* Dynamic Hover Tooltip Banner */}
      <div className="mb-2 flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400 font-bold text-xs shrink-0">
            <Clock size={15} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-white/50 flex items-center gap-1.5">
              <span className="font-semibold text-white/80">
                {activePoint.subLabel ? `${activePoint.label} (${activePoint.subLabel})` : activePoint.label}
              </span>
              {hoveredIdx !== null ? (
                <span className="text-[9px] bg-cyan-400/20 text-cyan-300 font-bold px-1.5 py-0.2 rounded">
                  Inspecting
                </span>
              ) : (
                <span className="text-[9px] text-white/30 hidden sm:inline">(Hover to inspect)</span>
              )}
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-2 mt-0.5">
              <span className="text-cyan-400 text-sm font-extrabold">{activePoint.avg}s</span>
              <span className="text-[10px] text-white/40 font-normal">attention span</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] text-white/40 font-medium">
            {activePoint.count} {activePoint.count === 1 ? 'short' : 'shorts'}
          </div>
          <div className="text-xs font-semibold text-white/80">
            {activePoint.totalTime}s total
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full touch-none cursor-crosshair"
        style={{ height: 'auto' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerMove}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="rgba(255,255,255,0.08)" />

        {/* Filled Area */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Chart Line */}
        <path d={pathD} fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Vertical Crosshair Line */}
        {activePoint && (
          <line
            x1={activePoint.x}
            y1={padY}
            x2={activePoint.x}
            y2={h - padY}
            stroke="#22D3EE"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            opacity="0.8"
          />
        )}

        {/* Data Points */}
        {points.map((p, i) => {
          const isActive = i === activeIdx;
          return (
            <g key={i}>
              {isActive && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="7"
                  fill="#22D3EE"
                  fillOpacity="0.3"
                  className="animate-ping"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? 5 : 3.5}
                fill={isActive ? '#FFFFFF' : '#22D3EE'}
                stroke={isActive ? '#22D3EE' : '#0F172A'}
                strokeWidth={isActive ? 2 : 1.5}
                className="transition-all duration-150"
              />
            </g>
          );
        })}
      </svg>

      {/* X Axis Labels */}
      <div className="mt-1 flex justify-between px-1">
        {data.map((d, i) => (
          <span
            key={i}
            className={`text-[9px] transition-colors ${
              i === activeIdx ? 'text-cyan-400 font-bold' : 'text-white/30'
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

