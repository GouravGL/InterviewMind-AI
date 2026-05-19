"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldX, ShieldOff, X } from "lucide-react";

interface IntegrityWarningModalProps {
  message: string | null;
  level: "warning" | "danger" | "critical" | null;
  integrityScore: number;
  totalViolations: number;
  onDismiss: () => void;
}

const LEVEL_STYLES = {
  warning: {
    border: "rgba(245,158,11,0.4)",
    glow: "rgba(245,158,11,0.15)",
    glowOuter: "rgba(245,158,11,0.08)",
    icon: ShieldAlert,
    iconColor: "#fcd34d",
    title: "Interview Integrity Warning",
    accent: "#f59e0b",
  },
  danger: {
    border: "rgba(244,63,94,0.5)",
    glow: "rgba(244,63,94,0.2)",
    glowOuter: "rgba(244,63,94,0.1)",
    icon: ShieldX,
    iconColor: "#fda4af",
    title: "Integrity Violation Detected",
    accent: "#f43f5e",
  },
  critical: {
    border: "rgba(239,68,68,0.6)",
    glow: "rgba(239,68,68,0.25)",
    glowOuter: "rgba(239,68,68,0.12)",
    icon: ShieldOff,
    iconColor: "#fca5a5",
    title: "Critical Security Alert",
    accent: "#ef4444",
  },
};

export function IntegrityWarningModal({ message, level, integrityScore, totalViolations, onDismiss }: IntegrityWarningModalProps) {
  if (!message || !level) return null;

  const style = LEVEL_STYLES[level];
  const Icon = style.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="integrity-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{
            scale: 1, opacity: 1, y: 0,
            transition: { type: "spring", damping: 15, stiffness: 300 },
          }}
          style={{
            width: "100%", maxWidth: 440,
            background: "rgba(15,15,25,0.95)",
            border: `1px solid ${style.border}`,
            borderRadius: 20,
            padding: "32px 28px 24px",
            boxShadow: `0 0 40px ${style.glow}, 0 0 80px ${style.glowOuter}, 0 24px 48px rgba(0,0,0,0.5)`,
            animation: level === "critical" ? "shake 0.5s ease-in-out" : undefined,
          }}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#64748b", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#f1f5f9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b"; }}
          >
            <X size={14} />
          </button>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 56, height: 56, borderRadius: 16,
                background: `linear-gradient(135deg, ${style.glow}, ${style.glowOuter})`,
                border: `1px solid ${style.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: `0 0 20px ${style.glow}`,
              }}
            >
              <Icon size={26} color={style.iconColor} />
            </motion.div>

            <h2 style={{
              fontSize: 20, fontWeight: 700, color: "#f1f5f9",
              letterSpacing: "-0.3px", marginBottom: 6,
            }}>
              {style.title}
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              {message}
            </p>
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 20,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Integrity Score
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: integrityScore >= 60 ? "#f59e0b" : "#ef4444",
              }}>
                {integrityScore}%
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Violations
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: totalViolations >= 4 ? "#ef4444" : "#fda4af",
              }}>
                {totalViolations}
              </div>
            </div>
          </div>

          {/* Integrity bar */}
          <div style={{
            height: 6, borderRadius: 3,
            background: "rgba(255,255,255,0.06)",
            marginBottom: 20, overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: `${integrityScore}%` }}
              transition={{ duration: 0.6 }}
              style={{
                height: "100%", borderRadius: 3,
                background: `linear-gradient(90deg, ${style.accent}, ${style.iconColor})`,
                boxShadow: `0 0 8px ${style.glow}`,
              }}
            />
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            style={{
              width: "100%", padding: "12px",
              background: `linear-gradient(135deg, ${style.accent}22, ${style.accent}11)`,
              border: `1px solid ${style.border}`,
              borderRadius: 12, color: style.iconColor,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${style.accent}33`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${style.accent}22`; }}
          >
            I understand — Return to interview
          </button>

          {/* Subtext */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 12 }}>
            Your integrity score is recorded and visible to evaluators.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
