import { X, Sparkles, Code2, Lightbulb, Video, Eye } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const team = [
    {
      name: 'Kavish Agarwal',
      role: 'Main Developer & Original Idea',
      desc: 'Conceived the concept of reversing doomscrolling and built the core attention-building algorithm.',
      icon: <Code2 size={20} className="text-cyan-400" />,
      bg: 'bg-cyan-400/10 border-cyan-400/30',
    },
    {
      name: 'Maanvi',
      role: 'Idea Refinement',
      desc: 'Helped refine user mechanics, focus scoring logic, and overall product experience.',
      icon: <Lightbulb size={20} className="text-amber-400" />,
      bg: 'bg-amber-400/10 border-amber-400/30',
    },
    {
      name: 'Saanvi',
      role: 'Video Production & Shooting',
      desc: 'Responsible for shooting, filming, and creating engaging video content for testing & media.',
      icon: <Video size={20} className="text-purple-400" />,
      bg: 'bg-purple-400/10 border-purple-400/30',
    },
    {
      name: 'Ritvik',
      role: 'Co-Developer',
      desc: 'Helped visualize and engineer the key feature of blocking users from scrolling before reaching target watch time.',
      icon: <Eye size={20} className="text-emerald-400" />,
      bg: 'bg-emerald-400/10 border-emerald-400/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-3xl bg-ink-900 border border-white/15 p-6 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 shadow-lg">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">The Creators</h2>
                <span className="text-[10px] font-bold bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                  Secret Unlocked!
                </span>
              </div>
              <p className="text-xs text-white/50">The team behind Focus Short Video Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Team Members */}
        <div className="grid grid-cols-1 gap-3">
          {team.map((member) => (
            <div
              key={member.name}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all hover:bg-white/10 ${member.bg}`}
            >
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
                {member.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{member.name}</h3>
                  <span className="text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                    {member.role}
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  {member.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Focus App • Built to reclaim attention</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-ink-950 font-bold hover:bg-cyan-300 transition-all shadow-md text-xs"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
