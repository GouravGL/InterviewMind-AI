"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { interviewApi, memoryApi } from "@/lib/api";
import { Brain, Target, Zap, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      const loadData = async () => {
        try {
          const [prof, hist] = await Promise.all([
            memoryApi.profile(user.id),
            interviewApi.history(user.id)
          ]);
          setProfile(prof);
          setHistory(hist.sessions || []);
        } catch (e) {
          console.error("Failed to load dashboard data", e);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="bg-mesh" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-mesh" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ padding: "40px 24px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        
        <div style={{ marginBottom: 40, animation: "slideUp 0.3s ease-out" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>
            Welcome back, {user.username}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 15, marginTop: 4 }}>
            Here's an overview of your adaptive interview training.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 40 }}>
          
          <div className="card-elevated" style={{ padding: 24, animation: "slideUp 0.4s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={18} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Average Score</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>{profile?.average_score?.toFixed(1) || "0.0"}<span style={{ fontSize: 14, color: "#475569" }}>/10</span></div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: profile?.improvement_trend > 0 ? "#10b981" : "#f43f5e", display: "flex", alignItems: "center", gap: 4 }}>
              {profile?.improvement_trend > 0 ? "↗" : "↘"} {Math.abs(profile?.improvement_trend || 0).toFixed(1)} vs last week
            </div>
          </div>

          <div className="card-elevated" style={{ padding: 24, animation: "slideUp 0.5s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={18} color="#a78bfa" />
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Total Sessions</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>{profile?.total_sessions || 0}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Across {Object.keys(profile?.weak_topics || {}).length} different topics
            </div>
          </div>

          <div className="card-elevated" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", animation: "slideUp 0.6s ease-out" }}>
            <Link href="/interview" className="btn-primary" style={{ justifyContent: "center", padding: "14px", textDecoration: "none" }}>
              <Zap size={16} /> Start New Session
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          
          <div className="card-elevated" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} color="#64748b" /> Recent Sessions
            </h3>
            {history.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#64748b", fontSize: 14 }}>
                No interviews yet. Start one to see your history!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {history.slice(0, 5).map((session, i) => {
                  const score = session.total_score && session.answer_count ? session.total_score / session.answer_count : 0;
                  const dateStr = session.started_at ? new Date(session.started_at).toLocaleDateString() : "Recent";
                  return (
                    <Link key={i} href={`/history`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: 12, textDecoration: "none", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{session.topic}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{dateStr}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: score >= 7 ? "#10b981" : "#f59e0b" }}>{score.toFixed(1)}/10</div>
                        <ChevronRight size={16} color="#64748b" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card-elevated" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 20 }}>Weaknesses (Needs Focus)</h3>
            {Object.keys(profile?.weak_topics || {}).length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                You have a clean slate!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(profile?.weak_topics || {}).slice(0, 5).map(([topic, rate]: any, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "#e2e8f0" }}>{topic}</span>
                    <span style={{ fontSize: 12, color: "#f43f5e", background: "rgba(244,63,94,0.1)", padding: "2px 8px", borderRadius: 6 }}>
                      {Math.round(rate * 100)}% fail rate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
