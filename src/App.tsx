import { useEffect, useState } from 'react';
import { Home, PlayCircle, BarChart3 } from 'lucide-react';
import HomePage from '@/pages/HomePage';
import ShortsFeed from '@/pages/ShortsFeed';
import StatsPage from '@/pages/StatsPage';
import { seedData, initAppTheme } from '@/lib/storage';
import { initNetworkSpeedDetection } from '@/lib/network';
import { loadYouTubeAPI } from '@/lib/useYTPlayer';
import { fetchYouTubeVideos } from '@/lib/youtube';

type Tab = 'home' | 'feed' | 'stats';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [inFeed, setInFeed] = useState(false);

  useEffect(() => {
    initAppTheme();
    seedData();
    // Warm up network detection, YouTube API script & fetch initial video batch on app startup
    initNetworkSpeedDetection();
    loadYouTubeAPI();
    fetchYouTubeVideos().then(({ videos }) => {
      // Pre-fetch poster thumbnails for first 5 videos
      videos.slice(0, 5).forEach((v) => {
        if (v.thumbnail) {
          const img = new Image();
          img.src = v.thumbnail;
        }
      });
    });
  }, []);

  const enterFeed = () => {
    setInFeed(true);
  };

  const exitFeed = () => {
    setInFeed(false);
    setTab('home');
  };

  return (
    <div className="flex h-screen w-full justify-center bg-[#050506] overflow-hidden">
      {/* Responsive screen container */}
      <div className="relative h-full w-full max-w-md sm:max-w-lg md:max-w-xl overflow-hidden bg-ink-950 shadow-2xl">
        {/* Content */}
        <div className="relative h-full w-full">
          {inFeed ? (
            <ShortsFeed onExit={exitFeed} />
          ) : (
            <>
              {tab === 'home' && <HomePage onEnterFeed={enterFeed} />}
              {tab === 'feed' && <HomePage onEnterFeed={enterFeed} />}
              {tab === 'stats' && <StatsPage />}

              {/* Bottom nav */}
              <nav className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/5 bg-ink-900/80 backdrop-blur-xl pb-5 pt-3">
                <NavButton
                  icon={<Home size={22} />}
                  label="Home"
                  active={tab === 'home'}
                  onClick={() => setTab('home')}
                />
                <NavButton
                  icon={<PlayCircle size={22} />}
                  label="Feed"
                  active={tab === 'feed'}
                  onClick={enterFeed}
                />
                <NavButton
                  icon={<BarChart3 size={22} />}
                  label="Stats"
                  active={tab === 'stats'}
                  onClick={() => setTab('stats')}
                />
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-200 ${
        active ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
