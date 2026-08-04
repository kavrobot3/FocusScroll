import { useEffect, useState } from 'react';
import { Home, PlayCircle, BarChart3 } from 'lucide-react';
import HomePage from '@/pages/HomePage';
import ShortsFeed from '@/pages/ShortsFeed';
import StatsPage from '@/pages/StatsPage';
import { seedData } from '@/lib/storage';

type Tab = 'home' | 'feed' | 'stats';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [inFeed, setInFeed] = useState(false);

  useEffect(() => {
    seedData();
  }, []);

  const enterFeed = () => {
    setInFeed(true);
  };

  const exitFeed = () => {
    setInFeed(false);
    setTab('home');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050506] py-0">
      {/* Phone frame */}
      <div className="relative h-screen w-full max-w-[390px] overflow-hidden bg-ink-950 sm:h-[844px] sm:my-4 sm:rounded-[44px] sm:border-[10px] sm:border-[#1a1a1c] sm:shadow-2xl">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-50 hidden h-7 w-32 -translate-x-1/2 rounded-b-2xl bg-[#1a1a1c] sm:block" />

        {/* Status bar spacer */}
        <div className="absolute top-0 left-0 right-0 h-11 z-30 pointer-events-none" />

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
