"use client";

import { Shield, Eye, EyeOff, Maximize, AlertTriangle, Clock } from "lucide-react";

interface IntegrityPanelProps {
  integrityScore: number;
  focusStatus: "focused" | "unfocused";
  isFullscreen: boolean;
  totalViolations: number;
  elapsedSeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function IntegrityMeter({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      <svg width={44} height={44} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3.5} />
        <circle
          cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - fill}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

export function IntegrityPanel({ integrityScore, focusStatus, isFullscreen, totalViolations, elapsedSeconds }: IntegrityPanelProps) {
  const isFocused = focusStatus === "focused";
  const scoreColor = integrityScore >= 80 ? "#10b981" : integrityScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="integrity-panel" style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${totalViolations > 0 ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14, padding: "8px 16px",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      transition: "border-color 0.3s ease",
    }}>
      {/* Live Timer */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Clock size={12} color="#475569" />
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#94a3b8", fontWeight: 500 }}>
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

      {/* Integrity Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IntegrityMeter score={integrityScore} />
        <div>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1 }}>Integrity</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor, lineHeight: 1.3 }}>{integrityScore}%</div>
        </div>
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

      {/* Focus Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: isFocused ? "#10b981" : "#ef4444",
          boxShadow: isFocused ? "0 0 6px rgba(16,185,129,0.5)" : "0 0 6px rgba(239,68,68,0.5)",
          animation: isFocused ? undefined : "pulseRed 1.5s infinite",
        }} />
        {isFocused ? <Eye size={13} color="#10b981" /> : <EyeOff size={13} color="#ef4444" />}
        <span style={{ fontSize: 11, fontWeight: 500, color: isFocused ? "#6ee7b7" : "#fda4af" }}>
          {isFocused ? "Focused" : "Unfocused"}
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

      {/* Fullscreen */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Maximize size={12} color={isFullscreen ? "#10b981" : "#475569"} />
        <span style={{ fontSize: 11, color: isFullscreen ? "#6ee7b7" : "#64748b" }}>
          {isFullscreen ? "Fullscreen" : "Windowed"}
        </span>
      </div>

      {/* Violations badge */}
      {totalViolations > 0 && (
        <>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 8,
            background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)",
          }}>
            <AlertTriangle size={11} color="#fda4af" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#fda4af" }}>{totalViolations}</span>
          </div>
        </>
      )}

      {/* Security badge */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Shield size={13} color="#6366f1" />
        <span style={{ fontSize: 10, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Secure
        </span>
      </div>
    </div>
  );
}
