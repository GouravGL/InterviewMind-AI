"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type ViolationType =
  | "tab_switch"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "devtools_attempt"
  | "inactivity"
  | "right_click";

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: Date;
  penalty: number;
  message: string;
}

export interface IntegrityAnalytics {
  tab_switches: number;
  fullscreen_exits: number;
  copy_attempts: number;
  paste_attempts: number;
  devtools_attempts: number;
  inactivity_warnings: number;
  right_clicks: number;
  integrity_score: number;
  total_violations: number;
}

export interface IntegrityToastData {
  id: string;
  message: string;
  type: "warning" | "danger" | "info";
  timestamp: Date;
}

export interface IntegrityState {
  integrityScore: number;
  violations: Violation[];
  totalViolations: number;
  focusStatus: "focused" | "unfocused";
  isFullscreen: boolean;
  warningMessage: string | null;
  warningLevel: "warning" | "danger" | "critical" | null;
  toasts: IntegrityToastData[];
  analytics: IntegrityAnalytics;
  elapsedSeconds: number;
  shouldAutoSubmit: boolean;
  shouldEndInterview: boolean;
}

/* ─── Penalty Map ──────────────────────────────────────────────────────── */

const PENALTIES: Record<ViolationType, number> = {
  tab_switch: 10,
  fullscreen_exit: 5,
  copy_attempt: 15,
  paste_attempt: 15,
  devtools_attempt: 10,
  inactivity: 5,
  right_click: 3,
};

const VIOLATION_MESSAGES: Record<ViolationType, string> = {
  tab_switch: "Tab switch detected. Please remain on the interview tab.",
  fullscreen_exit: "Fullscreen exited. Please stay in fullscreen mode.",
  copy_attempt: "Copy is disabled during the interview.",
  paste_attempt: "Paste is disabled during the interview.",
  devtools_attempt: "Developer tools are disabled during interviews.",
  inactivity: "Inactivity detected. Please continue your interview.",
  right_click: "Right-click is disabled during the interview.",
};

/* ─── Hook ──────────────────────────────────────────────────────────────── */

export function useInterviewIntegrity(active: boolean) {
  const [integrityScore, setIntegrityScore] = useState(100);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [focusStatus, setFocusStatus] = useState<"focused" | "unfocused">("focused");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [warningLevel, setWarningLevel] = useState<"warning" | "danger" | "critical" | null>(null);
  const [toasts, setToasts] = useState<IntegrityToastData[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [shouldEndInterview, setShouldEndInterview] = useState(false);

  const totalViolationsRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Toast helper ─────────────────────────────────────────────────── */
  const addToast = useCallback((message: string, type: "warning" | "danger" | "info" = "warning") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, timestamp: new Date() }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  /* ── Core violation recorder ──────────────────────────────────────── */
  const recordViolation = useCallback((type: ViolationType) => {
    const penalty = PENALTIES[type];
    const message = VIOLATION_MESSAGES[type];

    const violation: Violation = {
      id: Math.random().toString(36).slice(2),
      type,
      timestamp: new Date(),
      penalty,
      message,
    };

    setViolations(prev => [...prev, violation]);
    setIntegrityScore(prev => Math.max(0, prev - penalty));

    totalViolationsRef.current += 1;
    const count = totalViolationsRef.current;

    /* Progressive enforcement */
    if (count === 1) {
      // 1st violation → toast warning
      addToast(message, "warning");
    } else if (count === 2) {
      // 2nd violation → modal warning
      setWarningMessage("Interview integrity warning. You have been flagged for suspicious activity. Further violations will result in penalties.");
      setWarningLevel("warning");
      addToast(`Penalty warning: −${penalty} integrity points`, "danger");
    } else if (count === 3) {
      // 3rd violation → auto-submit current answer
      setWarningMessage("Multiple violations detected. Your current answer has been auto-submitted as a penalty.");
      setWarningLevel("danger");
      setShouldAutoSubmit(true);
    } else if (count === 4) {
      // 4th → critical warning
      setWarningMessage("CRITICAL: One more violation will terminate your interview session. This is your final warning.");
      setWarningLevel("critical");
      addToast("Final warning — next violation ends the interview", "danger");
    } else if (count >= 5) {
      // 5th+ → end interview
      setWarningMessage("Interview terminated due to repeated integrity violations.");
      setWarningLevel("critical");
      setShouldEndInterview(true);
    }
  }, [addToast]);

  /* ── Dismiss warning modal ──────────────────────────────────────── */
  const dismissWarning = useCallback(() => {
    setWarningMessage(null);
    setWarningLevel(null);
  }, []);

  /* ── Reset auto-submit flag (consumed by parent) ─────────────────── */
  const clearAutoSubmit = useCallback(() => {
    setShouldAutoSubmit(false);
  }, []);

  /* ── Request fullscreen ──────────────────────────────────────────── */
  const requestFullscreen = useCallback(() => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
    } catch { /* ignore */ }
  }, []);

  /* ── Get analytics snapshot ──────────────────────────────────────── */
  const getAnalytics = useCallback((): IntegrityAnalytics => {
    const counts = violations.reduce(
      (acc, v) => {
        if (v.type === "tab_switch") acc.tab_switches++;
        else if (v.type === "fullscreen_exit") acc.fullscreen_exits++;
        else if (v.type === "copy_attempt") acc.copy_attempts++;
        else if (v.type === "paste_attempt") acc.paste_attempts++;
        else if (v.type === "devtools_attempt") acc.devtools_attempts++;
        else if (v.type === "inactivity") acc.inactivity_warnings++;
        else if (v.type === "right_click") acc.right_clicks++;
        return acc;
      },
      { tab_switches: 0, fullscreen_exits: 0, copy_attempts: 0, paste_attempts: 0, devtools_attempts: 0, inactivity_warnings: 0, right_clicks: 0 }
    );
    return {
      ...counts,
      integrity_score: integrityScore,
      total_violations: violations.length,
    };
  }, [violations, integrityScore]);

  /* ── Reset state ─────────────────────────────────────────────────── */
  const resetIntegrity = useCallback(() => {
    setIntegrityScore(100);
    setViolations([]);
    setFocusStatus("focused");
    setWarningMessage(null);
    setWarningLevel(null);
    setToasts([]);
    setElapsedSeconds(0);
    setShouldAutoSubmit(false);
    setShouldEndInterview(false);
    totalViolationsRef.current = 0;
    lastActivityRef.current = Date.now();
  }, []);

  /* ═══════════════════════════════════════════════════════════════════
     EVENT LISTENERS (only active when hook is active)
     ═══════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!active) return;

    /* ── Tab visibility ──────────────────────────────────────────── */
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setFocusStatus("unfocused");
        recordViolation("tab_switch");
      } else {
        setFocusStatus("focused");
      }
    };

    /* ── Window blur/focus ───────────────────────────────────────── */
    const onBlur = () => {
      setFocusStatus("unfocused");
    };
    const onFocus = () => {
      setFocusStatus("focused");
      lastActivityRef.current = Date.now();
    };

    /* ── Copy/Paste/Cut/Right-click blocking ─────────────────────── */
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("copy_attempt");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("paste_attempt");
    };
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("copy_attempt");
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation("right_click");
    };

    /* ── DevTools shortcut blocking ──────────────────────────────── */
    const onKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now();

      // F12
      if (e.key === "F12") {
        e.preventDefault();
        recordViolation("devtools_attempt");
        return;
      }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        recordViolation("devtools_attempt");
        return;
      }
      // Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "U") {
        e.preventDefault();
        recordViolation("devtools_attempt");
        return;
      }
    };

    /* ── Mouse/keyboard activity tracking ────────────────────────── */
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    /* ── Fullscreen change ───────────────────────────────────────── */
    const onFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && totalViolationsRef.current > 0) {
        // Only penalize after first fullscreen is established
        recordViolation("fullscreen_exit");
      }
    };

    /* ── Register listeners ──────────────────────────────────────── */
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousemove", onActivity);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    /* ── Inactivity timer (check every 15s) ──────────────────────── */
    inactivityTimerRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle > 120_000) {
        recordViolation("inactivity");
        lastActivityRef.current = Date.now(); // Reset after logging
      } else if (idle > 60_000) {
        addToast("You seem inactive. Please continue your interview.", "info");
        lastActivityRef.current = Date.now();
      }
    }, 15_000);

    /* ── Elapsed timer ───────────────────────────────────────────── */
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    /* ── Check fullscreen state on mount ──────────────────────────── */
    setIsFullscreen(!!document.fullscreenElement);

    /* ── Cleanup ─────────────────────────────────────────────────── */
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousemove", onActivity);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [active, recordViolation, addToast]);

  return {
    integrityScore,
    violations,
    totalViolations: violations.length,
    focusStatus,
    isFullscreen,
    warningMessage,
    warningLevel,
    toasts,
    elapsedSeconds,
    shouldAutoSubmit,
    shouldEndInterview,
    analytics: getAnalytics(),
    dismissWarning,
    clearAutoSubmit,
    requestFullscreen,
    resetIntegrity,
    getAnalytics,
  };
}
