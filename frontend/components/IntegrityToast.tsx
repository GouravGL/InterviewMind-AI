"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { IntegrityToastData } from "@/hooks/useInterviewIntegrity";

const TOAST_COLORS = {
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", color: "#fcd34d", icon: "⚠" },
  danger: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", color: "#fda4af", icon: "🛡" },
  info: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.35)", color: "#a5b4fc", icon: "ℹ" },
};

export function IntegrityToastContainer({ toasts }: { toasts: IntegrityToastData[] }) {
  return (
    <div style={{
      position: "fixed", top: 72, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8, maxWidth: 360,
      pointerEvents: "none",
    }}>
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const style = TOAST_COLORS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: 12,
                padding: "10px 16px",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                pointerEvents: "auto",
                boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 12px ${style.border}`,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{style.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: style.color, lineHeight: 1.4 }}>
                {toast.message}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
