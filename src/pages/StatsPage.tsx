import { useMemo, useState } from 'react';
import { TrendingUp, MousePointerClick, Clock, Eye, Play, RotateCcw } from 'lucide-react';
import {
  getAverageDwell,
  getFirstDwell,
  getMeta,
  formatScreenTime,
  getPeriodAverages,
  getSessionChartData,
  resetSession,
} from '@/lib/storage';

export default function StatsPage() {
  const [resetOpen, setResetOpen] = useState(false);
  const [version, setVersion] = useState(0);

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
    setVersion((v) => v + 1);
    setResetOpen(false);
  };

  const hasData = data.meta.totalSwipes > 0 || data.avgDwell > 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-5 pt-14 pb-20">
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

      {/* Reset Data */}
      <div className="mt-10 mb-4 flex justify-center">
        {!resetOpen ? (
          <button
            onClick={() => setResetOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-800 px-3.5 py-2 text-xs font-medium text-white/40 hover:text-white/80 hover:bg-ink-700 transition"
          >
            <RotateCcw size={14} />
            <span>Reset All Data</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-red-500/20 bg-ink-850 p-4">
            <span className="text-xs text-white/70 font-medium">Clear all recorded watch history & stats?</span>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition shadow-lg shadow-red-600/30"
              >
                Yes, Reset Data
              </button>
              <button
                onClick={() => setResetOpen(false)}
                className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-medium text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
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

