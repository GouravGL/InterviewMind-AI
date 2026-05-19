"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Brain, Zap, BarChart3, ChevronRight, Code2 } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-mesh" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{ padding: "140px 24px 80px", textAlign: "center", position: "relative" }}>
        {/* Decorative background glows */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)", zIndex: 0, pointerEvents: "none" }} />
        
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1, animation: "slideUp 0.6s ease-out" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc", fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            <Brain size={14} /> Introducing Hindsight Memory Engine
          </div>
          
          <h1 style={{ fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, color: "#f8fafc", marginBottom: 24 }}>
            The AI interview coach that <br/>
            <span className="text-gradient">never forgets your weaknesses.</span>
          </h1>
          
          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "#94a3b8", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.6 }}>
            Stop taking generic mock interviews. InterviewMind builds a persistent memory profile across sessions, adapting its questions to drill your hardest concepts while optimizing AI inference costs at runtime.
          </p>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Link href="/interview" style={{ textDecoration: "none" }}>
              <div className="btn-primary glow-indigo" style={{ padding: "16px 32px", fontSize: 16, borderRadius: 14 }}>
                Start Interview <ChevronRight size={18} />
              </div>
            </Link>
            <Link href="/memory" style={{ textDecoration: "none" }}>
              <div className="btn-secondary" style={{ padding: "16px 32px", fontSize: 16, borderRadius: 14 }}>
                View Dashboard
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture / Features grid */}
      <section style={{ padding: "40px 24px 100px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          
          {/* Hindsight Feature */}
          <div className="card-elevated hover-lift" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}>
              <Brain size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Hindsight Memory</h3>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              Persistent storage tracks your performance across all sessions. Fail a Database Normalization question today? Expect a harder scenario on it next week.
            </p>
            <div style={{ padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 12, color: "#a5b4fc", fontFamily: "var(--font-mono)", marginBottom: 4 }}>System Prompt Injection</div>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>"User previously failed 3NF concepts. Generate a high-complexity follow-up."</div>
            </div>
          </div>

          {/* cascadeflow Feature */}
          <div className="card-elevated hover-lift" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
              <Zap size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>cascadeflow Runtime</h3>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              Intelligent model routing engine. Uses fast models (Qwen-32B) for question generation and strong models (Llama-3.3-70B) for deep evaluation.
            </p>
            <div style={{ padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#6ee7b7", fontFamily: "var(--font-mono)" }}>Cost Savings</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>~75% ↓</div>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="card-elevated hover-lift" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
              <BarChart3 size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Deep Analytics</h3>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              Full visibility into your performance improvement over time, complete with exact cost traces, model distribution, and timeline events.
            </p>
            <div style={{ padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "center" }}>
              <Code2 size={16} color="#93c5fd" />
              <div style={{ fontSize: 13, color: "#cbd5e1", fontFamily: "var(--font-mono)" }}>Real-time Trace Logging</div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 24px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
        <p>InterviewMind AI Platform • Engineered for production.</p>
      </footer>
    </div>
  );
}
