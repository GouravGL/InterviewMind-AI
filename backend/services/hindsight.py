"""
InterviewMind AI — Hindsight Memory Service
SQLite implementation of the persistent memory and timeline tracking layer.
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from models.schemas import Memory, UserMemoryProfile, MemoryTimelineEvent
from core.database import get_connection


# ─── RETAIN ───────────────────────────────────────────────────────────────────

def retain(
    user_id: str,
    session_id: str,
    topic: str,
    weak_concepts: List[str],
    score: float,
    role: str,
    difficulty: str,
) -> List[Memory]:
    """Store what the AI learned about the user during a session."""
    conn = get_connection()
    cursor = conn.cursor()

    timestamp = datetime.utcnow().isoformat()
    new_memories = []

    for concept in weak_concepts:
        concept_key = f"{topic}::{concept}"
        
        # Check if this memory already exists
        cursor.execute("""
        SELECT * FROM memories WHERE user_id = ? AND concept = ?;
        """, (user_id, concept_key))
        existing = cursor.fetchone()

        if existing:
            # Reinforce memory
            times_seen = existing["times_seen"] + 1
            times_failed = existing["times_failed"] + 1
            confidence = max(0.1, existing["confidence"] - 0.15)
            
            cursor.execute("""
            UPDATE memories 
            SET times_seen = ?, times_failed = ?, confidence = ?, timestamp = ?, session_id = ?
            WHERE memory_id = ?;
            """, (times_seen, times_failed, confidence, timestamp, session_id, existing["memory_id"]))
            
            mem = Memory(
                memory_id=existing["memory_id"],
                user_id=user_id,
                type=existing["type"],
                topic=existing["topic"],
                concept=existing["concept"],
                detail=existing["detail"],
                session_id=session_id,
                timestamp=datetime.fromisoformat(timestamp),
                confidence=confidence,
                times_seen=times_seen,
                times_failed=times_failed
            )
        else:
            # Create new memory
            mem_id = str(uuid.uuid4())
            detail = f"User struggled with '{concept}' in {topic} at {difficulty} level"
            confidence = 0.3
            times_seen = 1
            times_failed = 1
            
            cursor.execute("""
            INSERT INTO memories (memory_id, user_id, type, topic, concept, detail, session_id, timestamp, confidence, times_seen, times_failed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (mem_id, user_id, "weakness", topic, concept_key, detail, session_id, timestamp, confidence, times_seen, times_failed))
            
            mem = Memory(
                memory_id=mem_id,
                user_id=user_id,
                type="weakness",
                topic=topic,
                concept=concept_key,
                detail=detail,
                session_id=session_id,
                timestamp=datetime.fromisoformat(timestamp),
                confidence=confidence,
                times_seen=times_seen,
                times_failed=times_failed
            )
            
        new_memories.append(mem)

    conn.commit()
    conn.close()

    # Timeline event for completing session
    _add_timeline_event(
        user_id=user_id,
        session_id=session_id,
        event_type="session",
        title=f"{role} Interview — {topic}",
        description=f"Completed session. Score: {score:.1f}/10. Weak areas: {', '.join(weak_concepts) or 'None detected'}",
        topic=topic,
        score=score,
        timestamp=timestamp,
    )

    # Timeline event for weaknesses detected
    if weak_concepts:
        _add_timeline_event(
            user_id=user_id,
            session_id=session_id,
            event_type="weakness_detected",
            title=f"Weakness Detected: {', '.join(weak_concepts[:2])}",
            description=f"AI flagged weak concepts in {topic}. These will be revisited in future sessions.",
            topic=topic,
            score=score,
            timestamp=timestamp,
        )

    return new_memories


# ─── RECALL ───────────────────────────────────────────────────────────────────

def recall(user_id: str, topic: Optional[str] = None) -> Tuple[List[str], List[str]]:
    """Retrieve the most relevant memories for a new session."""
    conn = get_connection()
    cursor = conn.cursor()

    if topic:
        cursor.execute("""
        SELECT * FROM memories WHERE user_id = ? AND topic = ? AND type = 'weakness'
        ORDER BY times_failed DESC, confidence ASC LIMIT 5;
        """, (user_id, topic))
    else:
        cursor.execute("""
        SELECT * FROM memories WHERE user_id = ? AND type = 'weakness'
        ORDER BY times_failed DESC, confidence ASC LIMIT 5;
        """, (user_id,))
        
    rows = cursor.fetchall()
    conn.close()

    recalled_messages = []
    weak_concepts = []

    for r in rows:
        concept_clean = r["concept"].split("::")[-1]
        times = r["times_failed"]
        topic_name = r["topic"]

        msg = (
            f"You have struggled with '{concept_clean}' in {topic_name} "
            f"{'multiple times' if times > 1 else 'previously'} "
            f"(failed {times}x). Let's revisit this."
        )
        recalled_messages.append(msg)
        weak_concepts.append(concept_clean)

    if recalled_messages:
        _add_timeline_event(
            user_id=user_id,
            session_id="recall",
            event_type="recall",
            title="Memory Recalled",
            description=f"AI recalled {len(recalled_messages)} weakness(es): {', '.join(weak_concepts[:3])}",
            topic=topic,
            score=None,
            timestamp=datetime.utcnow().isoformat(),
        )

    return recalled_messages, weak_concepts


# ─── REFLECT ──────────────────────────────────────────────────────────────────

def reflect(user_id: str) -> Dict:
    """Generate an improvement summary for the user."""
    conn = get_connection()
    cursor = conn.cursor()

    # Load all completed sessions for this user
    cursor.execute("""
    SELECT * FROM sessions WHERE user_id = ? AND status = 'completed'
    ORDER BY started_at ASC;
    """, (user_id,))
    session_rows = cursor.fetchall()
    
    # Load all weakness memories
    cursor.execute("""
    SELECT * FROM memories WHERE user_id = ? AND type = 'weakness';
    """, (user_id,))
    memory_rows = cursor.fetchall()
    conn.close()

    if not session_rows:
        return {"has_data": False, "message": "No sessions yet. Start your first interview!"}

    # Format session objects
    sessions = []
    for r in session_rows:
        ans_count = max(r["answer_count"], 1)
        score = r["total_score"] / ans_count
        sessions.append({
            "session_id": r["session_id"],
            "topic": r["topic"],
            "score": round(score, 2),
            "role": r["role"],
            "difficulty": r["difficulty"],
            "timestamp": r["started_at"]
        })

    # Calculate per-topic scores
    topic_scores: Dict[str, List[float]] = {}
    for s in sessions:
        topic_scores.setdefault(s["topic"], []).append(s["score"])

    topic_avg = {t: sum(scores) / len(scores) for t, scores in topic_scores.items()}
    overall_avg = sum(s["score"] for s in sessions) / len(sessions)

    # Calculate improvement trend (last 3 vs first 3 sessions)
    early = sessions[:3]
    recent = sessions[-3:]
    early_avg = sum(s["score"] for s in early) / len(early)
    recent_avg = sum(s["score"] for s in recent) / len(recent)
    trend = recent_avg - early_avg

    # Identify top weak topics
    topic_failures: Dict[str, int] = {}
    for m in memory_rows:
        t = m["topic"]
        topic_failures[t] = topic_failures.get(t, 0) + m["times_failed"]

    return {
        "has_data": True,
        "total_sessions": len(sessions),
        "overall_average_score": round(overall_avg, 2),
        "improvement_trend": round(trend, 2),
        "is_improving": trend > 0,
        "topic_averages": topic_avg,
        "top_weak_topics": sorted(topic_failures.items(), key=lambda x: -x[1])[:3],
        "sessions": sessions,
    }


# ─── PROFILE ──────────────────────────────────────────────────────────────────

def get_memory_profile(user_id: str) -> UserMemoryProfile:
    """Return full memory profile for a user."""
    reflection = reflect(user_id)
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM memories WHERE user_id = ?;", (user_id,))
    memory_rows = cursor.fetchall()
    conn.close()

    memories = []
    for m in memory_rows:
        try:
            memories.append(Memory(
                memory_id=m["memory_id"],
                user_id=user_id,
                type=m["type"],
                topic=m["topic"],
                concept=m["concept"],
                detail=m["detail"],
                session_id=m["session_id"],
                timestamp=datetime.fromisoformat(m["timestamp"]),
                confidence=m["confidence"],
                times_seen=m["times_seen"],
                times_failed=m["times_failed"]
            ))
        except Exception:
            pass

    topic_averages = reflection.get("topic_averages", {})
    weak_topics = {}
    for topic, avg in topic_averages.items():
        vulnerability = 1.0 - (avg / 10.0)
        weak_topics[topic] = round(vulnerability, 2)

    strong_topics = {
        t: round(1.0 - v, 2)
        for t, v in weak_topics.items()
        if v < 0.4
    }

    common_mistakes = list({
        m["concept"].split("::")[-1]
        for m in memory_rows
        if m["times_failed"] > 1
    })[:8]

    return UserMemoryProfile(
        user_id=user_id,
        weak_topics=weak_topics,
        strong_topics=strong_topics,
        common_mistakes=common_mistakes,
        total_sessions=reflection.get("total_sessions", 0),
        average_score=reflection.get("overall_average_score", 0.0),
        improvement_trend=reflection.get("improvement_trend", 0.0),
        memories=memories,
        last_updated=datetime.utcnow(),
    )


# ─── TIMELINE ─────────────────────────────────────────────────────────────────

def get_timeline(user_id: str) -> List[MemoryTimelineEvent]:
    """Return chronological timeline events for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM timeline WHERE user_id = ?
    ORDER BY timestamp DESC;
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    events = []
    for r in rows:
        try:
            events.append(MemoryTimelineEvent(
                event_id=r["event_id"],
                user_id=user_id,
                session_id=r["session_id"],
                type=r["type"],
                title=r["title"],
                description=r["description"],
                topic=r["topic"],
                score=r["score"],
                timestamp=datetime.fromisoformat(r["timestamp"]),
                metadata=json.loads(r["metadata"])
            ))
        except Exception as e:
            print(f"[DB] Error parsing timeline event: {e}")

    return events


def _add_timeline_event(
    user_id: str,
    session_id: str,
    event_type: str,
    title: str,
    description: str,
    topic: Optional[str],
    score: Optional[float],
    timestamp: str,
):
    conn = get_connection()
    cursor = conn.cursor()
    event_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO timeline (event_id, user_id, session_id, type, title, description, topic, score, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        event_id,
        user_id,
        session_id,
        event_type,
        title,
        description,
        topic,
        score,
        timestamp,
        "{}"
    ))
    conn.commit()
    conn.close()
