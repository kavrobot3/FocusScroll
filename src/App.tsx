import { useEffect, useState } from 'react';
import { Home, PlayCircle, BarChart3 } from 'lucide-react';
import HomePage from '@/pages/HomePage';
import ShortsFeed from '@/pages/ShortsFeed';
import StatsPage from '@/pages/StatsPage';
import { seedData, initAppTheme } from '@/lib/storage';
import { initCustomTheme } from '@/lib/theme';
import { initNetworkSpeedDetection } from '@/lib/network';
import { loadYouTubeAPI } from '@/lib/useYTPlayer';
import { fetchYouTubeVideos } from '@/lib/youtube';

type Tab = 'home' | 'feed' | 'stats';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [inFeed, setInFeed] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | undefined>(undefined);

  useEffect(() => {
    initCustomTheme();
    initAppTheme();
    seedData();
    initNetworkSpeedDetection();
    loadYouTubeAPI();
    fetchYouTubeVideos().then(({ videos }) => {
      videos.slice(0, 5).forEach((v) => {
        if (v.thumbnail) {
          const img = new Image();
          img.src = v.thumbnail;
        }
      });
    });
  }, []);

  const enterFeed = (topic?: string) => {
    setActiveTopic(topic);
    setInFeed(true);
  };

  const exitFeed = () => {
    setInFeed(false);
    setTab('home');
    setActiveTopic(undefined);
  };

  return (
    <div className="flex h-screen w-full justify-center bg-[#051424] overflow-hidden select-none">
      <div className="relative h-full w-full max-w-md sm:max-w-lg md:max-w-xl bg-surface-container-lowest shadow-2xl overflow-hidden flex flex-col">
        <div className="relative flex-1 w-full h-full overflow-hidden">
          {inFeed ? (
            <ShortsFeed onExit={exitFeed} initialTopic={activeTopic} />
          ) : (
            <div className="h-full w-full overflow-y-auto scrollbar-hide">
              {tab === 'home' && (
                <HomePage
                  onEnterFeed={(topic) => enterFeed(topic)}
                  onOpenStats={() => setTab('stats')}
                />
              )}
              {tab === 'stats' && <StatsPage onEnterFeed={() => enterFeed()} />}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        {!inFeed && (
          <nav className="shrink-0 z-30 flex items-center justify-around border-t border-white/10 bg-surface-container-low/90 backdrop-blur-xl py-3 px-6">
            <NavButton
              icon={<Home size={20} />}
              label="Home"
              active={tab === 'home'}
              onClick={() => setTab('home')}
            />
            <NavButton
              icon={<PlayCircle size={20} />}
              label="Feed"
              active={false}
              onClick={() => enterFeed()}
            />
            <NavButton
              icon={<BarChart3 size={20} />}
              label="Stats"
              active={tab === 'stats'}
              onClick={() => setTab('stats')}
            />
          </nav>
        )}
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
