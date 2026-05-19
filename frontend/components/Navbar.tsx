"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, BarChart3, Clock, MessageSquare, Home, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/interview", label: "Interview", icon: MessageSquare },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/history", label: "History", icon: Clock },
];

export function Navbar() {
  const path = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(8,8,15,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", letterSpacing: "-0.3px" }}>
            InterviewMind <span style={{ color: "#6366f1" }}>AI</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 9,
                  fontSize: 13, fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s",
                  background: active ? "rgba(99,102,241,0.15)" : "transparent",
                  color: active ? "#a5b4fc" : "#64748b",
                  border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "#64748b"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Auth Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", textDecoration: "none" }}>
                {user.username}
              </Link>
              <button 
                onClick={logout}
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/login" style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1", textDecoration: "none", padding: "6px 12px" }}>
                Sign In
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: "6px 14px", fontSize: 13, textDecoration: "none", borderRadius: 8 }}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
