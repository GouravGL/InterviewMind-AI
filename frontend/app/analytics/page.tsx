"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { analyticsApi } from "@/lib/api";
import type { AnalyticsSummary } from "@/lib/types";
import { BarChart3, Zap, AlertTriangle, RefreshCw, Cpu, CheckCircle } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const summary = await analyticsApi.summary();
      setData(summary);
    } catch (e: any) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const cost = data?.cost;
  const history = data?.routing_history || [];
  const trend = data?.cost_over_time || [];
  const dist = data?.model_distribution || {};

  const pieData = Object.entries(dist).map(([n, v], i) => ({ name: n.split("/").pop(), value: v, color: ["#10b981", "#6366f1", "#f59e0b"][i % 3] }));
  const savingsPercent = cost && cost.total_cost_usd > 0 ? Math.round((cost.cost_saved_usd / (cost.cost_saved_usd + cost.total_cost_usd)) * 100) : 0;

  return (
    <div className="bg-mesh" style={{ minHeight: "100vh" }}>
      <Navbar />
      
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 24px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #2dd4bf)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
                <BarChart3 size={16} color="#fff" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.5px" }}>cascadeflow Analytics</h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 14 }}>Real-time visibility into runtime intelligence and cost optimization.</p>
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

        {loading && !data ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : !cost || cost.sessions_analyzed === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <BarChart3 size={48} color="#334155" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>No analytics data</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Complete an interview session to see model routing analytics.</p>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div className="card hover-lift" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Total Spend</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#f1f5f9" }}>${cost.total_cost_usd.toFixed(4)}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{cost.total_tokens.toLocaleString()} tokens used</div>
              </div>
              <div className="card hover-lift" style={{ padding: 20, border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.03)" }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
                  <Zap size={14} color="#10b981" /> Cost Savings
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#10b981" }}>${cost.cost_saved_usd.toFixed(4)}</div>
                <div style={{ fontSize: 12, color: "#34d399", marginTop: 4 }}>{savingsPercent}% reduction</div>
              </div>
              <div className="card hover-lift" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
                  <Cpu size={14} color="#6366f1" /> Fast Model Usage
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#a5b4fc" }}>{cost.fast_model_tokens.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "#818cf8", marginTop: 4 }}>Tokens offloaded</div>
              </div>
              <div className="card hover-lift" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
                  <AlertTriangle size={14} color="#f59e0b" /> Escalations
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#fcd34d" }}>{cost.escalation_count}</div>
                <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 4 }}>Complexity triggers</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
              {/* Cost over time */}
              <div className="card-elevated" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 20 }}>Cumulative Spend Tracker</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={v => `$${v}`} width={60} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "rgba(15,15,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="cumulative_cost" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Model Pie */}
              <div className="card-elevated" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 20 }}>Model Distribution</h3>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "rgba(15,15,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: 16 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                        <span style={{ color: "#94a3b8" }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Routing Log */}
            <div className="card-elevated" style={{ overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Real-time Routing Log</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)", color: "#64748b" }}>
                      <th style={{ padding: "12px 24px", fontWeight: 500 }}>Task</th>
                      <th style={{ padding: "12px 24px", fontWeight: 500 }}>Model</th>
                      <th style={{ padding: "12px 24px", fontWeight: 500 }}>Tier</th>
                      <th style={{ padding: "12px 24px", fontWeight: 500 }}>Tokens</th>
                      <th style={{ padding: "12px 24px", fontWeight: 500, textAlign: "right" }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 15).map((h, i) => (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "12px 24px", color: "#e2e8f0" }}>{h.task_type.replace(/_/g, " ")}</td>
                        <td style={{ padding: "12px 24px", color: "#94a3b8", fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.model_used.split("/").pop()}</td>
                        <td style={{ padding: "12px 24px" }}>
                          <span className={`badge ${h.escalated ? "badge-escalated" : h.tier === "fast" ? "badge-fast" : "badge-strong"}`}>
                            {h.escalated ? "Escalated" : h.tier}
                          </span>
                        </td>
                        <td style={{ padding: "12px 24px", color: "#e2e8f0", fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.tokens.toLocaleString()}</td>
                        <td style={{ padding: "12px 24px", color: "#10b981", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "right" }}>${h.cost.toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
