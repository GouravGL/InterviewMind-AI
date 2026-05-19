"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { interviewApi } from "@/lib/api";
import { Send, RefreshCw, ChevronRight, CheckCircle, XCircle, Cpu, Zap, AlertTriangle, Brain } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useInterviewIntegrity } from "@/hooks/useInterviewIntegrity";
import { IntegrityPanel } from "@/components/IntegrityPanel";
import { IntegrityWarningModal } from "@/components/IntegrityWarningModal";
import { IntegrityToastContainer } from "@/components/IntegrityToast";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Role = "Software Engineer" | "Data Scientist" | "Frontend Developer" | "Backend Developer";
type Topic = "DBMS" | "DSA" | "Operating Systems" | "Networking" | "Machine Learning" | "React" | "Python";
type Difficulty = "Easy" | "Medium" | "Hard";

interface RoutingTrace { model_used: string; tier: string; reason: string; tokens_used: number; cost_usd: number; latency_ms: number; escalated: boolean; }
interface EvalResult { 
  score: number; valid_answer: boolean; technical_accuracy: number; concept_clarity: number; depth: number; communication: number;
  feedback: string; correct_answer: string; weak_concepts: string[]; mistakes: string[]; improvements: string[]; expected_concepts: string[]; is_correct: boolean; 
}
interface Question { 
  question_type?: "OPEN_ENDED" | "MCQ";
  question: string; 
  mcq_options?: string[];
  question_index: number; 
  routing: RoutingTrace; 
}
interface ChatMsg {
  id: string; kind: "ai-question" | "ai-eval" | "user";
  text: string; timestamp: Date;
  question?: Question; eval?: EvalResult; routing?: RoutingTrace;
}
interface SessionSummary { 
  score: number; questions_asked: number; correct_answers: number; weak_concepts: string[]; 
  total_tokens: number; total_cost: number; hiring_recommendation: string; 
}

interface FullSessionData {
  questions: any[];
  evaluations: any[];
}

const ROLES: Role[] = ["Software Engineer", "Data Scientist", "Frontend Developer", "Backend Developer"];
const TOPICS: Topic[] = ["DBMS", "DSA", "Operating Systems", "Networking", "Machine Learning", "React", "Python"];
const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

const DIFF_STYLE: Record<Difficulty, { color: string; bg: string; border: string }> = {
  Easy: { color: "#6ee7b7", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.4)" },
  Medium: { color: "#fcd34d", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.4)" },
  Hard: { color: "#fda4af", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.4)" },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 16px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

function RoutingInfo({ trace }: { trace: RoutingTrace }) {
  const isFast = trace.tier === "fast";
  const isEsc = trace.escalated;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
      <span className={`badge ${isEsc ? "badge-escalated" : isFast ? "badge-fast" : "badge-strong"}`}>
        {isEsc ? <AlertTriangle size={9} /> : isFast ? <Zap size={9} /> : <Cpu size={9} />}
        {isEsc ? "Escalated" : isFast ? "Fast" : "Strong"} · {trace.model_used.split("/").pop()}
      </span>
      <span style={{ fontSize: 11, color: "#475569", fontFamily: "var(--font-mono)" }}>
        {trace.tokens_used.toLocaleString()} tok · ${trace.cost_usd.toFixed(5)} · {trace.latency_ms}ms
      </span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 22; const circ = 2 * Math.PI * r;
  const fill = ((score / 10) * circ);
  const col = score >= 8 ? "#10b981" : score >= 6 ? "#6366f1" : score >= 4 ? "#f59e0b" : "#f43f5e";
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={col} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - fill}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "#475569" }}>/10</span>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function InterviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const [phase, setPhase] = useState<"setup" | "chat" | "done">("setup");
  const [role, setRole] = useState<Role>("Software Engineer");
  const [topic, setTopic] = useState<Topic>("DBMS");
  const [diff, setDiff] = useState<Difficulty>("Medium");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [fullSession, setFullSession] = useState<FullSessionData | null>(null);
  const [recalls, setRecalls] = useState<string[]>([]);
  const [showRouting, setShowRouting] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  /* Anti-Cheating Hook */
  const {
    integrityScore,
    violations,
    totalViolations,
    focusStatus,
    isFullscreen,
    warningMessage,
    warningLevel,
    toasts,
    elapsedSeconds,
    shouldAutoSubmit,
    shouldEndInterview,
    analytics,
    dismissWarning,
    clearAutoSubmit,
    requestFullscreen,
    resetIntegrity,
  } = useInterviewIntegrity(phase === "chat");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const addMsg = useCallback((msg: Omit<ChatMsg, "id" | "timestamp">) => {
    setMsgs(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }]);
  }, []);

  /* Anti-Cheating Auto Actions */
  useEffect(() => {
    if (shouldAutoSubmit && phase === "chat" && !loading) {
      submitAnswer("I need more time to think about this.");
      clearAutoSubmit();
    }
  }, [shouldAutoSubmit, phase, loading, clearAutoSubmit]);

  useEffect(() => {
    if (shouldEndInterview && phase === "chat" && !loading) {
      // Force end interview
      if (sessionId && user) {
        interviewApi.complete({ session_id: sessionId, user_id: user.id, integrity_data: analytics })
          .then(async (sum) => {
            setSummary(sum);
            try {
              const res = await fetch(`/api/interview/session/${sessionId}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
              });
              if (res.ok) setFullSession(await res.json());
            } catch (e) {}
            setPhase("done");
          });
      }
    }
  }, [shouldEndInterview, phase, loading, sessionId, user, analytics]);

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

  const startInterview = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const uid = user.id;
      const res = await interviewApi.start({ user_id: uid, role, topic, difficulty: diff });
      setSId(res.session_id);
      setCurrentQ(res.first_question);
      setRecalls(res.recalled_memories || []);
      setPhase("chat");
      resetIntegrity();
      requestFullscreen();
      addMsg({ kind: "ai-question", text: res.first_question.question, question: res.first_question, routing: res.first_question.routing });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start interview. Make sure the backend is running.");
    } finally { setLoading(false); }
  };

  const submitAnswer = async (overrideAnswer?: string) => {
    const finalAnswer = overrideAnswer ?? answer.trim();
    if (!finalAnswer || !sessionId || !currentQ || loading) return;
    setAnswer("");
    setError(null);
    addMsg({ kind: "user", text: finalAnswer });
    setLoading(true);
    try {
      const uid = user?.id || "";
      const res = await interviewApi.answer({ session_id: sessionId, user_id: uid, answer: finalAnswer, question: currentQ.question, question_index: qIndex });
      addMsg({ kind: "ai-eval", text: res.evaluation.feedback, eval: res.evaluation, routing: res.routing });
      if (res.session_complete) {
        const sum = await interviewApi.complete({ session_id: sessionId, user_id: uid, integrity_data: analytics });
        setSummary(sum); 
        try {
          const sRes = await fetch(`/api/interview/session/${sessionId}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (sRes.ok) setFullSession(await sRes.json());
        } catch (e) {}
        setPhase("done");
      } else if (res.next_question) {
        setCurrentQ(res.next_question); setQIndex(i => i + 1);
        addMsg({ kind: "ai-question", text: res.next_question.question, question: res.next_question, routing: res.next_question.routing });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to evaluate answer.");
    } finally { setLoading(false); setTimeout(() => textRef.current?.focus(), 50); }
  };

  const reset = () => { setPhase("setup"); setMsgs([]); setAnswer(""); setSId(null); setCurrentQ(null); setQIndex(0); setSummary(null); setFullSession(null); setRecalls([]); setError(null); };

  /* ── SETUP ───────────────────────────────────────────────────────────── */
  if (phase === "setup") return (
    <div className="bg-mesh" style={{ minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "80px 24px 40px" }}>
        <div style={{ width: "100%", maxWidth: 520, animation: "fadeIn 0.4s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px", marginBottom: 8 }}>
              Configure your session
            </h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              The AI recalls your past performance and adapts accordingly.
            </p>
          </div>

          <div className="card-elevated" style={{ padding: 28 }}>
            {/* Role */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>Role</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {ROLES.map(r => (
                  <button key={r} onClick={() => setRole(r)} className={`select-btn ${role === r ? "active" : ""}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>Topic</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TOPICS.map(t => (
                  <button key={t} onClick={() => setTopic(t)} className={`select-btn ${topic === t ? "active" : ""}`} style={{ width: "auto", padding: "7px 14px" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>Difficulty</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {DIFFS.map(d => (
                  <button key={d} onClick={() => setDiff(d)}
                    style={{
                      padding: "10px", borderRadius: 12, border: `1px solid`,
                      borderColor: diff === d ? DIFF_STYLE[d].border : "rgba(255,255,255,0.07)",
                      background: diff === d ? DIFF_STYLE[d].bg : "rgba(255,255,255,0.03)",
                      color: diff === d ? DIFF_STYLE[d].color : "#64748b",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fda4af", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button onClick={startInterview} disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px" }}>
              {loading ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Preparing session...</> : <>Begin Interview <ChevronRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── DONE ────────────────────────────────────────────────────────────── */
  if (phase === "done" && summary) {
    let hireClass = "hire-border";
    if (summary.hiring_recommendation === "Strong Hire") hireClass = "hire-strong";
    if (summary.hiring_recommendation === "Hire") hireClass = "hire-yes";
    if (summary.hiring_recommendation === "Needs Improvement" || summary.hiring_recommendation === "Not Ready") hireClass = "hire-no";

    return (
      <div className="bg-mesh" style={{ minHeight: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "100vh", padding: "80px 24px 80px" }}>
          <div style={{ width: "100%", maxWidth: 840, animation: "slideUp 0.4s ease-out" }}>
            
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>End Test Report</h2>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Detailed technical evaluation and performance breakdown.</p>
            </div>

            {/* Overall Performance Summary */}
            <div className="card-elevated" style={{ padding: 32, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Final Verdict</div>
                  <div className={hireClass} style={{ display: "inline-block", padding: "6px 16px", borderRadius: 8, fontSize: 16, fontWeight: 700 }}>
                    {summary.hiring_recommendation}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Total Score</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9" }}>{summary.score.toFixed(1)}<span style={{ fontSize: 16, color: "#475569" }}>/10</span></div>
                  </div>
                  <ScoreRing score={Math.round(summary.score)} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Performance Profile</div>
                  {[
                    { label: "Technical Accuracy", score: fullSession?.evaluations?.reduce((a, b) => a + (b.technical_accuracy||0), 0) / (fullSession?.evaluations?.length||1) || summary.score },
                    { label: "Concept Clarity", score: fullSession?.evaluations?.reduce((a, b) => a + (b.concept_clarity||0), 0) / (fullSession?.evaluations?.length||1) || summary.score },
                    { label: "Communication", score: fullSession?.evaluations?.reduce((a, b) => a + (b.communication||0), 0) / (fullSession?.evaluations?.length||1) || summary.score }
                  ].map(metric => (
                    <div key={metric.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#cbd5e1" }}>{metric.label}</span>
                        <span style={{ color: "#94a3b8" }}>{metric.score.toFixed(1)}/10</span>
                      </div>
                      <div className="metric-bar-bg">
                        <div className="metric-bar-fill" style={{ width: `${(metric.score/10)*100}%`, background: metric.score > 7 ? "#10b981" : metric.score > 4 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div>
                  {summary.weak_concepts.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Identified Weaknesses</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {summary.weak_concepts.map(c => (
                          <span key={c} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 12 }}>{c}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Question-by-Question Review */}
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Question Review</h3>
            {fullSession?.evaluations?.map((evalItem, idx) => (
              <div key={idx} className="review-card">
                <div style={{ padding: 20, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, paddingRight: 20 }}>
                    <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Question {idx + 1}</div>
                    <div style={{ fontSize: 15, color: "#f1f5f9", lineHeight: 1.5 }}>{evalItem.question}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: evalItem.score >= 8 ? "#10b981" : evalItem.score >= 5 ? "#f59e0b" : "#ef4444" }}>
                      {evalItem.score}/10
                    </div>
                    {evalItem.valid_answer === false && (
                      <div style={{ fontSize: 10, padding: "2px 6px", background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: 4, marginTop: 4 }}>INVALID</div>
                    )}
                  </div>
                </div>
                
                <div style={{ padding: 20 }}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Your Answer</div>
                    <div style={{ fontSize: 14, color: "#cbd5e1", background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, fontStyle: evalItem.valid_answer === false ? "italic" : "normal" }}>
                      {evalItem.answer}
                    </div>
                  </div>
                  
                  {evalItem.feedback && (
                    <div style={{ marginBottom: 20, padding: 12, background: "rgba(99,102,241,0.1)", borderRadius: 8, borderLeft: "3px solid #6366f1" }}>
                      <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, marginBottom: 4 }}>Interviewer Feedback</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{evalItem.feedback}</div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {evalItem.mistakes?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, color: "#fca5a5", fontWeight: 600, marginBottom: 8 }}>Mistakes</div>
                        <ul style={{ paddingLeft: 16, margin: 0, color: "#cbd5e1", fontSize: 13 }}>
                          {evalItem.mistakes.map((m: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                    {evalItem.improvements?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, color: "#6ee7b7", fontWeight: 600, marginBottom: 8 }}>Improvement Tips</div>
                        <ul style={{ paddingLeft: 16, margin: 0, color: "#cbd5e1", fontSize: 13 }}>
                          {evalItem.improvements.map((m: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Correct Explanation / Expected Concepts</div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>{evalItem.correct_answer}</div>
                    {evalItem.expected_concepts?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {evalItem.expected_concepts.map((c: string) => <span key={c} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, color: "#cbd5e1" }}>{c}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button onClick={reset} className="btn-secondary" style={{ flex: 1, justifyContent: "center", padding: "12px" }}>New Session</button>
              <a href="/memory" className="btn-primary" style={{ flex: 1, justifyContent: "center", textDecoration: "none", padding: "12px" }}>View Adaptive Memory →</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── CHAT ────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-mesh" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <IntegrityWarningModal 
        message={warningMessage} 
        level={warningLevel} 
        integrityScore={integrityScore} 
        totalViolations={totalViolations} 
        onDismiss={dismissWarning} 
      />
      
      <IntegrityToastContainer toasts={toasts} />

      {/* Header bar */}
      <div style={{ position: "sticky", top: 56, zIndex: 40, background: "rgba(8,8,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
          <span style={{ color: "#64748b" }}>Role: <strong style={{ color: "#e2e8f0" }}>{role}</strong></span>
          <span style={{ color: "#334155" }}>·</span>
          <span style={{ color: "#64748b" }}>Topic: <strong style={{ color: "#e2e8f0" }}>{topic}</strong></span>
          <span style={{ color: "#334155" }}>·</span>
          <span style={{ ...DIFF_STYLE[diff], padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid" } as React.CSSProperties}>{diff}</span>
        </div>
        
        <IntegrityPanel 
          integrityScore={integrityScore}
          focusStatus={focusStatus}
          isFullscreen={isFullscreen}
          totalViolations={totalViolations}
          elapsedSeconds={elapsedSeconds}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>Q {qIndex + 1} / 5</span>
          <button onClick={() => setShowRouting(v => !v)} style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}>
            {showRouting ? "Hide" : "Show"} routing
          </button>
          <button onClick={reset} style={{ fontSize: 12, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>Exit</button>
        </div>
      </div>

      {/* Memory recall banner */}
      {recalls.length > 0 && (
        <div style={{ padding: "10px 24px", background: "rgba(139,92,246,0.08)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Brain size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", marginRight: 8 }}>Memory recalled from past sessions</span>
              {recalls.map((m, i) => <div key={i} style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>{m}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="no-select" style={{ flex: 1, overflowY: "auto", padding: "24px 24px 120px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {msgs.map(msg => (
            <div key={msg.id} style={{ marginBottom: 20, animation: "slideUp 0.3s ease-out", display: "flex", flexDirection: "column", alignItems: msg.kind === "user" ? "flex-end" : "flex-start" }}>
              {msg.kind !== "user" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Brain size={11} color="#fff" />
                  </div>
                  <span style={{ fontSize: 12, color: "#475569" }}>InterviewMind</span>
                  <span style={{ fontSize: 11, color: "#334155" }}>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}

              <div style={{ maxWidth: "85%" }}>
                <div className={msg.kind === "user" ? "chat-user" : "chat-ai"}>
                  {msg.text}
                  {msg.question?.question_type === "MCQ" && msg.question.mcq_options && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                      {msg.question.mcq_options.map((opt, i) => {
                        const isAnswered = msgs.some(m => m.timestamp > msg.timestamp);
                        return (
                          <button 
                            key={i} 
                            onClick={() => !isAnswered && !loading && submitAnswer(opt)}
                            disabled={isAnswered || loading}
                            style={{ 
                              textAlign: "left", padding: "10px 14px", borderRadius: 8,
                              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                              color: "#e2e8f0", fontSize: 13, cursor: (isAnswered || loading) ? "default" : "pointer",
                              opacity: isAnswered ? 0.6 : 1, transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { if(!isAnswered && !loading) { e.currentTarget.style.background="rgba(99,102,241,0.15)"; e.currentTarget.style.borderColor="rgba(99,102,241,0.3)"; } }}
                            onMouseLeave={e => { if(!isAnswered && !loading) { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; } }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Routing info */}
                {showRouting && msg.routing && <RoutingInfo trace={msg.routing} />}

                {/* Evaluation card */}
                {msg.eval && (
                  <div className="card" style={{ marginTop: 10, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {msg.eval.is_correct ? <CheckCircle size={15} color="#10b981" /> : <XCircle size={15} color="#f43f5e" />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: msg.eval.is_correct ? "#10b981" : "#f43f5e" }}>
                          {msg.eval.is_correct ? "Correct" : "Needs improvement"}
                        </span>
                      </div>
                      <ScoreRing score={msg.eval.score} />
                    </div>

                    {msg.eval.weak_concepts.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Review these concepts</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {msg.eval.weak_concepts.map(c => (
                            <span key={c} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fda4af", fontSize: 12 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <details style={{ cursor: "pointer" }}>
                      <summary style={{ fontSize: 12, color: "#6366f1", userSelect: "none" }}>View model answer</summary>
                      <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.65 }}>
                        {msg.eval.correct_answer}
                      </div>
                    </details>
                  </div>
                )}

                {msg.kind === "user" && (
                  <div style={{ textAlign: "right", fontSize: 11, color: "#334155", marginTop: 4 }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 20, animation: "fadeIn 0.2s" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Brain size={11} color="#fff" />
              </div>
              <div className="chat-ai" style={{ width: "auto" }}><TypingDots /></div>
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fda4af", fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,8,15,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="card-elevated" style={{ padding: "10px 12px 10px 16px", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={textRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitAnswer(); }}
              placeholder="Type your answer… (Ctrl+Enter to submit)"
              rows={2}
              disabled={loading || phase !== "chat" || currentQ?.question_type === "MCQ"}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#e2e8f0", fontSize: 14, resize: "none", lineHeight: 1.65,
                fontFamily: "var(--font-inter)",
              }}
            />
            <button onClick={() => submitAnswer()} disabled={loading || !answer.trim() || currentQ?.question_type === "MCQ"} className="btn-primary" style={{ padding: "8px 14px", borderRadius: 10, flexShrink: 0, fontSize: 13 }}>
              {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#334155", marginTop: 8 }}>
            Ctrl+Enter to submit · Real AI evaluation powered by Groq
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
