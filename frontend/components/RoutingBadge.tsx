"use client";

import clsx from "clsx";
import { Zap, Brain, AlertTriangle } from "lucide-react";
import type { RoutingTrace } from "@/lib/types";

interface RoutingBadgeProps {
  trace: RoutingTrace;
  compact?: boolean;
}

export function RoutingBadge({ trace, compact = false }: RoutingBadgeProps) {
  const isFast = trace.tier === "fast";
  const isEscalated = trace.escalated;

  if (compact) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
          isEscalated ? "badge-escalated" : isFast ? "badge-fast" : "badge-strong"
        )}
        title={trace.reason}
      >
        {isEscalated ? (
          <AlertTriangle size={9} />
        ) : isFast ? (
          <Zap size={9} />
        ) : (
          <Brain size={9} />
        )}
        {isEscalated ? "Escalated" : isFast ? "Fast" : "Strong"}
      </span>
    );
  }

  return (
    <div className="glass rounded-xl p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
          cascadeflow Routing
        </span>
        <span
          className={clsx(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium",
            isEscalated ? "badge-escalated" : isFast ? "badge-fast" : "badge-strong"
          )}
        >
          {isEscalated ? (
            <AlertTriangle size={9} />
          ) : isFast ? (
            <Zap size={9} />
          ) : (
            <Brain size={9} />
          )}
          {isEscalated ? "Escalated" : isFast ? "Fast Model" : "Strong Model"}
        </span>
      </div>

      <div className="font-mono text-[10px] text-slate-300 bg-black/30 rounded-lg px-2.5 py-2 leading-relaxed">
        <span className="text-indigo-400">model:</span> {trace.model_used}
      </div>

      <p className="text-slate-400 leading-relaxed">{trace.reason}</p>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
        <div>
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">Tokens</div>
          <div className="text-slate-300 font-mono font-medium">{trace.tokens_used.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">Cost</div>
          <div className="text-slate-300 font-mono font-medium">${trace.cost_usd.toFixed(5)}</div>
        </div>
        <div>
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">Latency</div>
          <div className="text-slate-300 font-mono font-medium">{trace.latency_ms}ms</div>
        </div>
      </div>
    </div>
  );
}
