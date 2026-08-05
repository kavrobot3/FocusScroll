import { useEffect, useRef } from 'react';

interface Props {
  show: boolean;
  message: string;
  onClose?: () => void;
}

export default function Celebration({ show, message, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!show) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#38bdf8', '#a855f7', '#f43f5e', '#eab308', '#22c55e', '#3b82f6'];
    const particles = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2 - 100,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      opacity: 1,
    }));

    let animationFrame: number;
    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vRot;
        if (elapsed > 2000) {
          p.opacity -= 0.02;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (alive && elapsed < 3500) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    animationFrame = requestAnimationFrame(render);

    const timer = setTimeout(() => {
      onClose?.();
    }, 4000);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timer);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-start pt-16 bg-black/30 backdrop-blur-[2px] transition-all"
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative animate-bounce rounded-2xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-cyan-500/20 px-6 py-4 text-center shadow-2xl backdrop-blur-md">
        <div className="text-3xl">🎉 🏆 ✨</div>
        <div className="mt-1 text-lg font-bold text-yellow-300 drop-shadow-md">Attention Span Milestone!</div>
        <div className="mt-0.5 text-sm font-medium text-white/90">{message}</div>
        <div className="mt-2 text-[10px] text-white/50 uppercase tracking-widest">Tap to dismiss</div>
      </div>
    </div>
  );
}
