"use client";

interface ScoreRingProps {
  score: number; // 0-10
  size?: number;
}

export function ScoreRing({ score, size = 80 }: ScoreRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const offset = circumference - progress;

  const color =
    score >= 8 ? "#34d399" : score >= 6 ? "#60a5fa" : score >= 4 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={6}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-lg leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-slate-500 text-[9px] font-medium">/10</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function MemoryRecallBanner({ memories }: { memories: string[] }) {
  if (!memories.length) return null;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold">
        <span className="text-base">🧠</span>
        Memory Recalled from Previous Sessions
      </div>
      <ul className="space-y-1">
        {memories.map((m, i) => (
          <li key={i} className="text-xs text-violet-200/80 leading-relaxed pl-4 border-l border-violet-500/30">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color = "indigo",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "indigo" | "emerald" | "amber" | "rose" | "cyan";
  icon?: React.ReactNode;
}) {
  const colors = {
    indigo: "from-indigo-500/20 to-transparent border-indigo-500/20 text-indigo-300",
    emerald: "from-emerald-500/20 to-transparent border-emerald-500/20 text-emerald-300",
    amber: "from-amber-500/20 to-transparent border-amber-500/20 text-amber-300",
    rose: "from-rose-500/20 to-transparent border-rose-500/20 text-rose-300",
    cyan: "from-cyan-500/20 to-transparent border-cyan-500/20 text-cyan-300",
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[color]} border p-4 hover-lift`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
