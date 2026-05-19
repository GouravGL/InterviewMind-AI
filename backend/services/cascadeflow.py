"""
InterviewMind AI — cascadeflow Runtime Intelligence

cascadeflow is the intelligent model routing layer that balances quality and cost.

WHY RUNTIME INTELLIGENCE MATTERS:
  Not every task needs a $0.004/token model. Question generation is simple;
  deep semantic evaluation is complex. Using one model for everything is wasteful.

HOW CASCADEFLOW WORKS:
  1. CLASSIFY the task (simple / complex / evaluation)
  2. ROUTE to the appropriate model tier
  3. ENFORCE budget limits per session
  4. ESCALATE if the cheap model fails or the task complexity spikes
  5. LOG a full runtime trace for auditability

COST IMPACT:
  Without cascadeflow: Every call goes to the strong model → ~$0.004/token
  With cascadeflow:    ~70% of calls go to the fast model → ~$0.001/token
  Estimated 65-75% cost reduction for typical interview sessions.
"""

import time
import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from models.schemas import ModelTier, RoutingTrace, RoutingHistoryEntry

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
ROUTING_LOG_FILE = DATA_DIR / "routing_log.json"

FAST_MODEL = os.getenv("FAST_MODEL", "qwen/qwen3-32b")
STRONG_MODEL = os.getenv("STRONG_MODEL", "openai/gpt-oss-120b")

# Cost per token (in USD)
COST_FAST = float(os.getenv("COST_PER_TOKEN_FAST", "0.000001"))
COST_STRONG = float(os.getenv("COST_PER_TOKEN_STRONG", "0.000004"))

# Budget: max tokens before we stop escalating
MAX_TOKENS_PER_SESSION = int(os.getenv("MAX_TOKENS_PER_SESSION", "4000"))


# ─── Task Types ───────────────────────────────────────────────────────────────

TASK_QUESTION_GEN = "question_generation"
TASK_ANSWER_EVAL = "answer_evaluation"
TASK_FEEDBACK_GEN = "feedback_generation"
TASK_CONTEXT_SUMMARY = "context_summary"

# Which tasks are "simple" (fast model) vs "complex" (strong model)
TASK_ROUTING_TABLE = {
    TASK_QUESTION_GEN: ModelTier.FAST,       # Question generation → cheap
    TASK_FEEDBACK_GEN: ModelTier.FAST,       # Simple feedback → cheap
    TASK_ANSWER_EVAL: ModelTier.STRONG,      # Deep semantic evaluation → strong
    TASK_CONTEXT_SUMMARY: ModelTier.FAST,    # Summarization → cheap
}


# ─── Session Budget Tracker ────────────────────────────────────────────────────

_session_token_counts: Dict[str, int] = {}


def get_session_tokens(session_id: str) -> int:
    return _session_token_counts.get(session_id, 0)


def add_session_tokens(session_id: str, tokens: int):
    _session_token_counts[session_id] = _session_token_counts.get(session_id, 0) + tokens


def is_budget_exhausted(session_id: str) -> bool:
    """
    Budget enforcement: if a session has used too many tokens,
    force all further calls to the fast model to prevent runaway costs.
    """
    return get_session_tokens(session_id) >= MAX_TOKENS_PER_SESSION


# ─── ROUTING ENGINE ───────────────────────────────────────────────────────────

def route(
    task_type: str,
    session_id: str,
    context_complexity: Optional[str] = "normal",
) -> Tuple[str, ModelTier, str]:
    """
    Determine which model to use for a given task.

    Args:
        task_type: One of TASK_* constants above
        session_id: Used for budget tracking
        context_complexity: "normal" | "high" — can trigger escalation

    Returns: (model_name, tier, routing_reason)
    """
    budget_exhausted = is_budget_exhausted(session_id)

    # Budget enforcement: override to fast model if budget is spent
    if budget_exhausted:
        return (
            FAST_MODEL,
            ModelTier.FAST,
            f"Budget limit reached ({MAX_TOKENS_PER_SESSION} tokens). Routing to fast model to control costs.",
        )

    # Look up the default tier for this task
    default_tier = TASK_ROUTING_TABLE.get(task_type, ModelTier.FAST)

    # Escalation: upgrade to strong model if context is highly complex
    if context_complexity == "high" and default_tier == ModelTier.FAST:
        return (
            STRONG_MODEL,
            ModelTier.STRONG,
            f"Task '{task_type}' escalated: high-complexity context detected. Using strong model for accuracy.",
        )

    if default_tier == ModelTier.STRONG:
        model = STRONG_MODEL
        reason = f"Task '{task_type}' requires deep reasoning. Routing to strong model ({STRONG_MODEL})."
    else:
        model = FAST_MODEL
        reason = f"Task '{task_type}' is a lightweight generation task. Using fast model ({FAST_MODEL}) to save cost."

    return model, default_tier, reason


# ─── TRACE BUILDER ────────────────────────────────────────────────────────────

def build_trace(
    model: str,
    tier: ModelTier,
    reason: str,
    tokens_used: int,
    start_time_ms: float,
    session_id: str,
    task_type: str,
    escalated: bool = False,
) -> RoutingTrace:
    """
    Build a complete routing trace record.
    This is the audit trail that powers the analytics dashboard.
    """
    latency_ms = int(time.time() * 1000 - start_time_ms)
    cost = tokens_used * (COST_STRONG if tier == ModelTier.STRONG else COST_FAST)

    trace = RoutingTrace(
        model_used=model,
        tier=tier,
        reason=reason,
        tokens_used=tokens_used,
        cost_usd=round(cost, 6),
        latency_ms=latency_ms,
        escalated=escalated,
    )

    # Log to persistent routing log for analytics
    _log_routing_event(trace, session_id, task_type)

    # Update session budget
    add_session_tokens(session_id, tokens_used)

    return trace


def _log_routing_event(trace: RoutingTrace, session_id: str, task_type: str):
    log_data = _load_log()
    entries = log_data.get("entries", [])

    entries.append({
        "timestamp": datetime.utcnow().isoformat(),
        "session_id": session_id,
        "task_type": task_type,
        "model_used": trace.model_used,
        "tier": trace.tier,
        "reason": trace.reason,
        "tokens": trace.tokens_used,
        "cost": trace.cost_usd,
        "latency_ms": trace.latency_ms,
        "escalated": trace.escalated,
    })

    log_data["entries"] = entries
    _save_log(log_data)


def _load_log() -> dict:
    if not ROUTING_LOG_FILE.exists():
        return {}
    try:
        return json.loads(ROUTING_LOG_FILE.read_text())
    except Exception:
        return {}


def _save_log(data: dict):
    ROUTING_LOG_FILE.write_text(json.dumps(data, indent=2, default=str))


# ─── ANALYTICS ────────────────────────────────────────────────────────────────

def get_routing_history(limit: int = 100) -> list:
    """Return recent routing decisions for the analytics dashboard."""
    log_data = _load_log()
    entries = log_data.get("entries", [])
    return list(reversed(entries[-limit:]))


def get_cost_analytics() -> Dict[str, Any]:
    """
    Aggregate all routing data into cost analytics.

    Shows the key insight: how much money cascadeflow saved
    by routing simple tasks to the fast model.
    """
    log_data = _load_log()
    entries = log_data.get("entries", [])

    if not entries:
        return {
            "total_tokens": 0,
            "total_cost_usd": 0,
            "fast_model_tokens": 0,
            "strong_model_tokens": 0,
            "fast_model_cost": 0,
            "strong_model_cost": 0,
            "cost_saved_usd": 0,
            "escalation_count": 0,
            "average_latency_ms": 0,
            "sessions_analyzed": 0,
        }

    total_tokens = sum(e.get("tokens", 0) for e in entries)
    fast_tokens = sum(e.get("tokens", 0) for e in entries if e.get("tier") == "fast")
    strong_tokens = sum(e.get("tokens", 0) for e in entries if e.get("tier") == "strong")
    total_cost = sum(e.get("cost", 0) for e in entries)
    fast_cost = sum(e.get("cost", 0) for e in entries if e.get("tier") == "fast")
    strong_cost = sum(e.get("cost", 0) for e in entries if e.get("tier") == "strong")
    escalations = sum(1 for e in entries if e.get("escalated", False))

    # Cost if ALL tokens were routed to strong model (the "baseline" scenario)
    cost_without_routing = total_tokens * COST_STRONG
    cost_saved = cost_without_routing - total_cost

    latencies = [e.get("latency_ms", 0) for e in entries if e.get("latency_ms")]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0

    session_ids = {e.get("session_id") for e in entries}

    return {
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost, 6),
        "fast_model_tokens": fast_tokens,
        "strong_model_tokens": strong_tokens,
        "fast_model_cost": round(fast_cost, 6),
        "strong_model_cost": round(strong_cost, 6),
        "cost_saved_usd": round(cost_saved, 6),
        "escalation_count": escalations,
        "average_latency_ms": round(avg_latency, 1),
        "sessions_analyzed": len(session_ids),
    }
