"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { memoryApi } from "@/lib/api";
import type { UserMemoryProfile, MemoryTimelineEvent } from "@/lib/types";
import { Brain, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function MemoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserMemoryProfile | null>(null);
  const [timeline, setTimeline] = useState<MemoryTimelineEvent[]>([]);
  const [reflection, setReflection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const uid = user.id;
      const [p, t, r] = await Promise.all([
        memoryApi.profile(uid),
        memoryApi.timeline(uid),
        memoryApi.reflect(uid)
      ]);
      setProfile(p); setTimeline(t.events || []); setReflection(r);
    } catch (e: any) {
      setError(e.message || "Failed to load memory data");
    } finally {
      setLoading(false);
    }
  };

  const hasData = profile && profile.total_sessions > 0;

  if (authLoading || !user) {
    return (
      <div className="bg-mesh" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mesh" style={{ minHeight: "100vh" }}>
      <Navbar />
      
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 24px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #a78bfa, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
                <Brain size={16} color="#fff" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>Memory Core</h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 14 }}>Hindsight tracks your weaknesses across all sessions.</p>
          </div>
          <button onClick={loadData} className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fda4af", marginBottom: 24, fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading && !profile ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : !hasData ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <Brain size={48} color="#334155" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Memory is blank</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Complete your first interview session to initialize the Hindsight memory engine.
            </p>
            <a href="/interview" className="btn-primary" style={{ textDecoration: "none" }}>Start Interview</a>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <div className="card hover-lift" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Total Sessions</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#f1f5f9" }}>{profile.total_sessions}</div>
              </div>
              <div className="card hover-lift" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg Score</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#f1f5f9" }}>{profile.average_score.toFixed(1)}<span style={{ fontSize: 16, color: "#475569" }}>/10</span></div>
              </div>
              <div className="card hover-lift" style={{ padding: 20, border: `1px solid ${profile.improvement_trend >= 0 ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`, background: profile.improvement_trend >= 0 ? "rgba(16,185,129,0.03)" : "rgba(244,63,94,0.03)" }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  {profile.improvement_trend >= 0 ? <TrendingUp size={14} color="#10b981" /> : <TrendingDown size={14} color="#f43f5e" />} Trend
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: profile.improvement_trend >= 0 ? "#10b981" : "#f43f5e" }}>
                  {profile.improvement_trend > 0 ? "+" : ""}{profile.improvement_trend.toFixed(1)}
                </div>
              </div>
              <div className="card hover-lift" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Weak Areas Tracked</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>{Object.keys(profile.weak_topics || {}).length}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Weaknesses */}
              <div className="card-elevated" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <AlertCircle size={18} color="#f59e0b" />
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Topic Vulnerabilities</h3>
                </div>
                {Object.keys(profile.weak_topics || {}).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {Object.entries(profile.weak_topics).sort((a,b) => b[1]-a[1]).map(([t, v]) => (
                      <div key={t}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: "#e2e8f0" }}>{t}</span>
                          <span style={{ color: v > 0.4 ? "#f43f5e" : "#f59e0b", fontFamily: "var(--font-mono)" }}>{Math.round(v*100)}% failure</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${v*100}%`, background: v > 0.4 ? "#f43f5e" : "#f59e0b", borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: 14 }}>No vulnerabilities detected yet.</div>
                )}

                {profile.common_mistakes?.length > 0 && (
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Recurring Concepts</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {profile.common_mistakes.map(m => (
                        <span key={m} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#c4b5fd", fontSize: 12 }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="card-elevated" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Clock size={18} color="#6366f1" />
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Memory Timeline</h3>
                </div>
                
                <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, maxHeight: 400 }}>
                  {timeline.length > 0 ? (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: 15, top: 10, bottom: 10, width: 2, background: "rgba(99,102,241,0.15)", borderRadius: 1 }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {timeline.map(ev => {
                          const isRecall = ev.type === "recall";
                          const isWeak = ev.type === "weakness_detected";
                          return (
                            <div key={ev.event_id} style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: isRecall ? "rgba(139,92,246,0.15)" : isWeak ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.15)", border: `1px solid ${isRecall ? "rgba(139,92,246,0.3)" : isWeak ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isRecall ? "🧠" : isWeak ? "⚠️" : "💬"}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{ev.title}</div>
                                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{ev.description}</div>
                                <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                                  {new Date(ev.timestamp).toLocaleDateString()} {new Date(ev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 14 }}>No timeline events recorded.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
