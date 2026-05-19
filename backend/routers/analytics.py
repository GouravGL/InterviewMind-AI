"""InterviewMind AI — Analytics Router"""

from fastapi import APIRouter, Depends
from services import cascadeflow
from core.security import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/cost")
async def get_cost_analytics(current_user: dict = Depends(get_current_user)):
    return cascadeflow.get_cost_analytics()


@router.get("/routing")
async def get_routing_history(limit: int = 100, current_user: dict = Depends(get_current_user)):
    entries = cascadeflow.get_routing_history(limit)
    return {"entries": entries}


@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    cost = cascadeflow.get_cost_analytics()
    routing = cascadeflow.get_routing_history(50)

    # Model distribution
    model_dist = {}
    cost_over_time = []
    cumulative = 0.0

    for e in reversed(routing):
        model = e.get("model_used", "unknown")
        model_dist[model] = model_dist.get(model, 0) + 1
        cumulative += e.get("cost", 0)
        cost_over_time.append({
            "timestamp": e.get("timestamp", ""),
            "cumulative_cost": round(cumulative, 6),
            "session_id": e.get("session_id", ""),
            "tier": e.get("tier", "fast"),
        })

    return {
        "cost": cost,
        "routing_history": routing[:20],
        "cost_over_time": cost_over_time[-30:],
        "model_distribution": model_dist,
    }
