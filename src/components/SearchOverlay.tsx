import { useState, useEffect } from 'react';
import {
  getStoredSearches,
  addStoredSearch,
  removeStoredSearch,
} from '@/lib/storage';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topic: string) => void;
  initialQuery?: string;
}

const EXPLORE_CATEGORIES = [
  { name: 'Science', icon: 'science', color: 'primary' },
  { name: 'Space', icon: 'rocket_launch', color: 'secondary' },
  { name: 'Cooking', icon: 'local_dining', color: 'primary' },
  { name: 'Design', icon: 'architecture', color: 'secondary' },
  { name: 'Tech', icon: 'code', color: 'primary' },
  { name: 'Fitness', icon: 'fitness_center', color: 'secondary' },
  { name: 'Mind', icon: 'psychology', color: 'primary' },
  { name: 'Travel', icon: 'map', color: 'secondary' },
];

export default function SearchOverlay({
  isOpen,
  onClose,
  onSelectTopic,
  initialQuery = '',
}: SearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getStoredSearches().slice(0, 5));
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (clean) {
      addStoredSearch(clean);
      onSelectTopic(clean);
      onClose();
    }
  };

  const handleSelectRecent = (topic: string) => {
    addStoredSearch(topic);
    onSelectTopic(topic);
    onClose();
  };

  const handleRemoveRecent = (e: React.MouseEvent, topic: string) => {
    e.stopPropagation();
    removeStoredSearch(topic);
    setRecentSearches(getStoredSearches().slice(0, 5));
  };

  return (
    <main className="fixed inset-0 z-50 glass-overlay flex flex-col md:px-margin-desktop px-margin-mobile py-8 md:py-xxl overflow-y-auto animate-fade-in text-on-surface">
      {/* Search Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center gap-sm mb-xl">
        <button
          onClick={onClose}
          aria-label="Go back"
          className="p-sm text-on-surface-variant hover:text-primary transition-colors rounded-full"
        >
          <span className="material-symbols-outlined text-[32px]">arrow_back</span>
        </button>
        <form onSubmit={handleSearchSubmit} className="relative flex-1 group">
          <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[24px]">
            search
          </span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to focus on?"
            className="w-full bg-surface-container-high border border-white/10 rounded-full py-md pl-[56px] pr-lg font-headline text-headline text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary glow-active transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-md top-1/2 -translate-y-1/2 p-xs text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </form>
      </header>

      {/* Content Area */}
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-xl md:gap-xxl pb-xxl">
        {/* Quick Filters / Recent Searches */}
        {recentSearches.length > 0 && (
          <section>
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-md">
              Recent Searches
            </h2>
            <div className="flex flex-wrap gap-sm">
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectRecent(item)}
                  className="px-md py-sm rounded-full border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors font-caption text-caption flex items-center gap-xs group"
                >
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">
                    history
                  </span>
                  <span>{item}</span>
                  <span
                    onClick={(e) => handleRemoveRecent(e, item)}
                    className="ml-1 text-on-surface-variant/40 hover:text-error text-[14px]"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Explore Categories Grid */}
        <section>
          <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-lg">
            Explore Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {EXPLORE_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleSelectRecent(cat.name)}
                className="group relative flex flex-col items-center justify-center p-6 md:p-xl rounded-[24px] bg-surface-container-high border border-white/5 hover:border-primary/50 transition-all overflow-hidden text-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-colors" />
                <span
                  className={`material-symbols-outlined text-[40px] md:text-[48px] text-on-surface-variant group-hover:${
                    cat.color === 'primary' ? 'text-primary' : 'text-secondary'
                  } transition-colors mb-sm`}
                >
                  {cat.icon}
                </span>
                <span className="font-headline text-headline text-on-surface">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Result Snippet (Bento style based on real watch data) */}
        <section className="mt-auto hidden md:block">
          <div className="bg-surface-container-highest rounded-[24px] p-lg border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">trending_up</span>
              </div>
              <div>
                <h3 className="font-headline text-headline text-on-surface">
                  Curated Focus Feed
                </h3>
                <p className="font-caption text-caption text-on-surface-variant mt-xs">
                  {recentSearches.length > 0
                    ? `Active topics: ${recentSearches.slice(0, 3).join(', ')}`
                    : 'Search any topic to filter YouTube shorts with attention timers.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectRecent(recentSearches[0] || 'Science')}
              className="px-lg py-sm rounded-full bg-primary text-on-primary font-headline text-headline glow-active hover:bg-primary-fixed transition-colors"
            >
              Explore
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
