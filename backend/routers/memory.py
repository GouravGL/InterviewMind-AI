"""InterviewMind AI — Memory Router"""

from fastapi import APIRouter, Depends, HTTPException
from services import hindsight
from core.security import get_current_user

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("/{user_id}/profile")
async def get_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    profile = hindsight.get_memory_profile(user_id)
    return profile


@router.get("/{user_id}/timeline")
async def get_timeline(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    events = hindsight.get_timeline(user_id)
    return {"events": [e.model_dump() for e in events]}


@router.get("/{user_id}/reflect")
async def reflect(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return hindsight.reflect(user_id)


@router.get("/{user_id}/recall")
async def recall(user_id: str, topic: str = None, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    messages, concepts = hindsight.recall(user_id, topic)
    return {"recalled_messages": messages, "weak_concepts": concepts}
