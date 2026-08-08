import { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import {
  getYouTubeApiKey,
  isQuotaExhausted,
  getCachedVideos,
  getCacheAge,
  getLastApiError,
} from '@/lib/youtube';
import {
  getRecentDwellRecords,
  getAverageDwell,
  getWeeklyGrowthSeconds,
  getCalibrationAverage,
  isCalibrated,
  getDwellRecords,
} from '@/lib/storage';

interface Props {
  onEnterFeed: () => void;
}

export default function HomePage({ onEnterFeed }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  const avgDwell = getAverageDwell();
  const weeklyGrowth = getWeeklyGrowthSeconds();

  useEffect(() => {
    if (tapCount >= 5) {
      setShowDebug(true);
      setTapCount(0);
    }
  }, [tapCount]);

  const handleStatTap = () => {
    setTapCount((c) => c + 1);
  };

  return (
    <div className="flex h-full flex-col items-center justify-between px-6 pt-20 pb-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-16">
        <div className="text-center animate-fade-up">
          <div
            onClick={handleStatTap}
            className="cursor-default select-none text-7xl font-bold tracking-tight text-white leading-none"
          >
            {avgDwell > 0
              ? weeklyGrowth > 0
                ? `+${Math.round(weeklyGrowth)}s`
                : `${Math.round(avgDwell)}s`
              : '0s'}
          </div>
          <div className="mt-3 text-sm font-medium text-white/40 tracking-wide">
            {avgDwell > 0
              ? weeklyGrowth > 0
                ? 'your attention span grew this week'
                : 'average watch time per video'
              : 'start scrolling to build attention span'}
          </div>
        </div>

        <div className="max-w-[260px] text-center animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <p className="text-lg font-light leading-relaxed text-white/70 italic">
            What destroyed your attention
            <br />
            will now rebuild it.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 pulse-ring" />
          <button
            onClick={onEnterFeed}
            aria-label="Enter feed"
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400 text-ink-950 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-400/20"
          >
            <ArrowRight size={28} strokeWidth={2.5} />
          </button>
        </div>
        <span className="text-xs text-white/30 tracking-widest uppercase font-medium">Scroll Feed</span>
      </div>

      {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
    </div>
  );
}

function DebugPanel({ onClose }: { onClose: () => void }) {
  const apiKey = getYouTubeApiKey();
  const quotaExhausted = isQuotaExhausted();
  const cachedVideos = getCachedVideos();
  const cacheAge = getCacheAge();
  const recentDwell = getRecentDwellRecords(5);
  const lastError = getLastApiError();
  const calibrated = isCalibrated();
  const calAvg = getCalibrationAverage();
  const recordCount = getDwellRecords().length;

  let status: string;
  let statusColor: string;
  if (!apiKey) {
    status = 'No VITE_YOUTUBE_API_KEY';
    statusColor = 'text-amber-400';
  } else if (quotaExhausted) {
    status = 'Quota exhausted / Forbidden';
    statusColor = 'text-red-400';
  } else if (cachedVideos && cachedVideos.length > 0) {
    const ageMin = cacheAge ? Math.round(cacheAge / 60000) : 0;
    status = `Cached ${cachedVideos.length} videos (${ageMin}m ago)`;
    statusColor = 'text-cyan-400';
  } else {
    status = 'Key present, fetching directly...';
    statusColor = 'text-white/60';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="mx-6 w-full max-w-[340px] rounded-2xl border border-white/20 bg-ink-850 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Judge Mode / Debug</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-white/40">API Status: </span>
            <span className={statusColor}>{status}</span>
          </div>

          <div>
            <span className="text-white/40">Calibration: </span>
            <span className="text-cyan-300 font-medium">
              {calibrated
                ? `Completed (${calAvg}s avg)`
                : `In progress (${recordCount}/13 scrolls)`}
            </span>
          </div>

          {lastError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-[11px] text-red-300 break-words font-mono">
              <span className="font-bold text-red-400 block mb-0.5">Last Raw API Error:</span>
              {lastError}
            </div>
          )}

          <div>
            <span className="text-white/40">Cached videos: </span>
            <span className="text-white/70">{cachedVideos?.length ?? 0}</span>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="text-white/40 mb-2">Last 5 Dwell Records:</div>
            {recentDwell.length === 0 ? (
              <div className="text-white/30 italic">No dwell records yet</div>
            ) : (
              <div className="space-y-1 font-mono text-[10px]">
                {recentDwell.map((r, i) => (
                  <div key={i} className="text-white/60">
                    {r.dwellSeconds}s / target {Math.round(r.targetDuration)}s
                    {r.videoId ? ` / ${r.videoId.slice(0, 11)}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


