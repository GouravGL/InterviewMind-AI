"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { interviewApi } from "@/lib/api";
import { Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      interviewApi.history(user.id)
        .then((d: any) => setSessions(d.sessions || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

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
      
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "100px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
            <Clock size={16} color="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>Session History</h1>
        </div>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>All past interview sessions and their detailed evaluations.</p>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <Clock size={48} color="#334155" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>No sessions found</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>You haven't completed any interviews yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.4s ease-out" }}>
            {sessions.map((s, i) => {
              const score = s.total_score && s.answer_count ? s.total_score / s.answer_count : 0;
              const isExpanded = expandedId === s.session_id;
              
              return (
                <div key={s.session_id} className="card-elevated hover-lift" style={{ overflow: "hidden" }}>
                  <button onClick={() => setExpanded(isExpanded ? null : s.session_id)} style={{ width: "100%", background: "transparent", border: "none", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${score >= 7 ? "rgba(16,185,129,0.3)" : score >= 5 ? "rgba(99,102,241,0.3)" : "rgba(244,63,94,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: score >= 7 ? "#10b981" : score >= 5 ? "#a5b4fc" : "#fda4af", fontWeight: 700, fontSize: 15 }}>
                      {score.toFixed(1)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>{s.role}</span>
                        <span style={{ color: "#475569" }}>·</span>
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>{s.topic}</span>
                        <span className={`badge ${s.difficulty === 'Hard' ? 'badge-escalated' : s.difficulty === 'Medium' ? 'badge-strong' : 'badge-fast'}`}>{s.difficulty}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "var(--font-mono)" }}>
                        {new Date(s.started_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div style={{ color: "#475569" }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>
                  
                  {isExpanded && s.evaluations && (
                    <div style={{ padding: "0 24px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                      <h4 style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Detailed Evaluation</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {s.evaluations.map((ev: any, j: number) => (
                          <div key={j} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, display: "flex", gap: 12 }}>
                            <div style={{ marginTop: 2 }}>
                              {ev.is_correct ? <CheckCircle size={16} color="#10b981" /> : <XCircle size={16} color="#f43f5e" />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Question {j+1}</span>
                                <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>{ev.score}/10</span>
                              </div>
                              {ev.weak_concepts?.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                                  {ev.weak_concepts.map((c: string) => (
                                    <span key={c} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fda4af", fontSize: 11 }}>{c}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
