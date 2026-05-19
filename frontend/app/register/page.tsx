"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw, Lock, Mail, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await register({ username, email, password });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-mesh" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "slideUp 0.4s ease-out" }}>
          
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px", marginBottom: 8 }}>
              Create an account
            </h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              Start your journey with adaptive AI interviews.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card-elevated" style={{ padding: 32 }}>
            {error && (
              <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fda4af", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 8 }}>Username</label>
              <div style={{ position: "relative" }}>
                <User size={16} color="#64748b" style={{ position: "absolute", left: 14, top: 12 }} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "12px 12px 12px 42px", color: "#f1f5f9", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s"
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 8 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="#64748b" style={{ position: "absolute", left: 14, top: 12 }} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "12px 12px 12px 42px", color: "#f1f5f9", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s"
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 8 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#64748b" style={{ position: "absolute", left: 14, top: 12 }} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "12px 12px 12px 42px", color: "#f1f5f9", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s"
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14 }}>
              {isSubmitting ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <>Sign Up <ArrowRight size={16} /></>}
            </button>

            <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#64748b" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </div>
          </form>

        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
