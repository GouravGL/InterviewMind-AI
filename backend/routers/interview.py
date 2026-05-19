import re
import uuid
import time
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import (
    StartInterviewRequest,
    StartInterviewResponse,
    AnswerRequest,
    AnswerResponse,
    CompleteInterviewRequest,
    SessionSummary,
    InterviewQuestion,
    EvaluationResult,
    RoutingTrace,
    ModelTier
)
from core.security import get_current_user
from core.database import get_connection
import services.groq_client as groq
import services.cascadeflow as cascadeflow
import services.hindsight as hindsight

router = APIRouter(prefix="/api/interview", tags=["interview"])

TASK_QUESTION_GEN = "question_generation"
TASK_ANSWER_EVAL = "answer_evaluation"


def _parse_ai_json(content: str) -> dict:
    """Robustly parse JSON from AI response."""
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
    content = re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("```").strip()
    try:
        return json.loads(content)
    except Exception:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {}


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(req: StartInterviewRequest, current_user: dict = Depends(get_current_user)):
    """
    Start a new interview session.
    """
    session_id = str(uuid.uuid4())

    # Recall memories from Hindsight
    recalled_messages, weak_concepts = hindsight.recall(
        user_id=current_user["id"],
        topic=req.topic.value,
    )

    memory_context = "\n".join(recalled_messages)
    adapted_difficulty = len(weak_concepts) > 0

    # Route to appropriate model via cascadeflow
    start_ms = time.time() * 1000
    model, tier, reason = cascadeflow.route(
        task_type=TASK_QUESTION_GEN,
        session_id=session_id,
    )

    # Generate first question
    system_prompt, user_prompt = groq.build_question_prompt(
        role=req.role.value,
        topic=req.topic.value,
        difficulty=req.difficulty.value,
        question_index=0,
        memory_context=memory_context,
        weak_concepts=weak_concepts,
    )

    content, prompt_tokens, completion_tokens = groq.chat(
        model=model,
        system_prompt=system_prompt,
        user_message=user_prompt,
        max_tokens=1500,
    )

    parsed = _parse_ai_json(content)
    question_text = parsed.get("question", "Explain the concept of database normalization and its different normal forms.")
    question_type = parsed.get("question_type", "OPEN_ENDED")
    mcq_options = parsed.get("mcq_options")
    correct_option_index = parsed.get("correct_option_index", -1)
    targeted_concept = parsed.get("targeted_concept", "")
    evaluation_criteria = parsed.get("evaluation_criteria", [])

    total_tokens = prompt_tokens + completion_tokens
    trace = cascadeflow.build_trace(
        model=model,
        tier=tier,
        reason=reason,
        tokens_used=total_tokens,
        start_time_ms=start_ms,
        session_id=session_id,
        task_type=TASK_QUESTION_GEN,
    )

    first_question = InterviewQuestion(
        question_type=question_type,
        question=question_text,
        mcq_options=mcq_options,
        correct_option_index=correct_option_index,
        targeted_concept=targeted_concept,
        evaluation_criteria=evaluation_criteria,
        topic=req.topic,
        difficulty=req.difficulty,
        question_index=0,
        routing=trace,
    )

    # Persist session state inside SQLite
    conn = get_connection()
    cursor = conn.cursor()
    
    questions = [{"question": question_text, "index": 0}]
    routing_traces = [trace.model_dump()]
    
    cursor.execute("""
    INSERT INTO sessions (session_id, user_id, role, topic, difficulty, started_at, status, total_score, answer_count, questions, evaluations, weak_concepts_accumulated, routing_traces)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        session_id,
        current_user["id"],
        req.role.value,
        req.topic.value,
        req.difficulty.value,
        datetime.utcnow().isoformat(),
        "active",
        0.0,
        0,
        json.dumps(questions),
        json.dumps([]),
        json.dumps([]),
        json.dumps(routing_traces)
    ))
    
    conn.commit()
    conn.close()

    return StartInterviewResponse(
        session_id=session_id,
        first_question=first_question,
        recalled_memories=recalled_messages,
        adapted_difficulty=adapted_difficulty,
        memory_context=memory_context,
    )


@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(req: AnswerRequest, current_user: dict = Depends(get_current_user)):
    """
    Evaluate a user's answer and generate the next question.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?;", (req.session_id,))
    session_row = cursor.fetchone()
    
    if not session_row or session_row["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    session = dict(session_row)
    session["questions"] = json.loads(session["questions"])
    session["evaluations"] = json.loads(session["evaluations"])
    session["weak_concepts_accumulated"] = json.loads(session["weak_concepts_accumulated"])
    session["routing_traces"] = json.loads(session["routing_traces"])

    question_index = req.question_index
    recalled_messages, _ = hindsight.recall(current_user["id"], session["topic"])

    # Evaluate Answer (Strong Model)
    eval_start_ms = time.time() * 1000
    eval_model, eval_tier, eval_reason = cascadeflow.route(
        task_type=TASK_ANSWER_EVAL,
        session_id=req.session_id,
    )

    eval_system, eval_user = groq.build_evaluation_prompt(
        question=req.question,
        answer=req.answer,
        topic=session["topic"],
        difficulty=session["difficulty"],
        role=session["role"],
    )

    eval_content, ep_tokens, ec_tokens = groq.chat(
        model=eval_model,
        system_prompt=eval_system,
        user_message=eval_user,
        max_tokens=1500,
        temperature=0.3,
    )

    eval_parsed = _parse_ai_json(eval_content)

    valid_answer = bool(eval_parsed.get("valid_answer", True))
    # If the AI flags it as invalid/cheating, zero out the score and penalty
    score = max(0, min(10, int(eval_parsed.get("score", 5)))) if valid_answer else 0
    technical_accuracy = int(eval_parsed.get("technical_accuracy", 5)) if valid_answer else 0
    concept_clarity = int(eval_parsed.get("concept_clarity", 5)) if valid_answer else 0
    depth = int(eval_parsed.get("depth", 5)) if valid_answer else 0
    communication = int(eval_parsed.get("communication", 5)) if valid_answer else 0
    
    is_correct = bool(eval_parsed.get("is_correct", score >= 6)) if valid_answer else False
    feedback = eval_parsed.get("feedback", "Good attempt. Focus on more precise technical definitions.")
    if not valid_answer:
        feedback = "Answer was flagged as irrelevant, overly generic, or potentially copied. Please provide a genuine technical response."
        
    correct_answer = eval_parsed.get("correct_answer", "Please review the official documentation for this topic.")
    weak_concepts = eval_parsed.get("weak_concepts", [])
    mistakes = eval_parsed.get("mistakes", [])
    improvements = eval_parsed.get("improvements", [])
    expected_concepts = eval_parsed.get("expected_concepts", [])

    eval_result = EvaluationResult(
        score=score,
        valid_answer=valid_answer,
        technical_accuracy=technical_accuracy,
        concept_clarity=concept_clarity,
        depth=depth,
        communication=communication,
        feedback=feedback,
        correct_answer=correct_answer,
        weak_concepts=weak_concepts,
        mistakes=mistakes,
        improvements=improvements,
        expected_concepts=expected_concepts,
        is_correct=is_correct,
    )

    eval_tokens = ep_tokens + ec_tokens
    eval_trace = cascadeflow.build_trace(
        model=eval_model,
        tier=eval_tier,
        reason=eval_reason,
        tokens_used=eval_tokens,
        start_time_ms=eval_start_ms,
        session_id=req.session_id,
        task_type=TASK_ANSWER_EVAL,
    )

    # Generate Next Question (Fast Model)
    session_complete = question_index >= 4  # 5 questions per session

    next_question = None
    if not session_complete:
        next_q_start = time.time() * 1000
        next_model, next_tier, next_reason = cascadeflow.route(
            task_type=TASK_QUESTION_GEN,
            session_id=req.session_id,
            context_complexity="high" if weak_concepts else "normal",
        )

        # Escalate to revisit weak concepts in the next question
        escalated = bool(weak_concepts) and next_tier == ModelTier.STRONG

        updated_weak = session.get("weak_concepts_accumulated", []) + weak_concepts
        nq_system, nq_user = groq.build_question_prompt(
            role=session["role"],
            topic=session["topic"],
            difficulty=session["difficulty"],
            question_index=question_index + 1,
            memory_context="\n".join(recalled_messages),
            weak_concepts=list(set(updated_weak))[:5],
        )

        nq_content, nqp_tok, nqc_tok = groq.chat(
            model=next_model,
            system_prompt=nq_system,
            user_message=nq_user,
            max_tokens=1500,
        )

        nq_parsed = _parse_ai_json(nq_content)
        next_q_text = nq_parsed.get("question", "Describe the CAP theorem and give a real-world example.")
        nq_type = nq_parsed.get("question_type", "OPEN_ENDED")
        nq_mcq = nq_parsed.get("mcq_options")
        nq_correct = nq_parsed.get("correct_option_index", -1)
        nq_concept = nq_parsed.get("targeted_concept", "")
        nq_criteria = nq_parsed.get("evaluation_criteria", [])

        nq_tokens = nqp_tok + nqc_tok
        nq_trace = cascadeflow.build_trace(
            model=next_model,
            tier=next_tier,
            reason=next_reason,
            tokens_used=nq_tokens,
            start_time_ms=next_q_start,
            session_id=req.session_id,
            task_type=TASK_QUESTION_GEN,
            escalated=escalated,
        )

        next_question = InterviewQuestion(
            question_type=nq_type,
            question=next_q_text,
            mcq_options=nq_mcq,
            correct_option_index=nq_correct,
            targeted_concept=nq_concept,
            evaluation_criteria=nq_criteria,
            topic=session["topic"],
            difficulty=session["difficulty"],
            question_index=question_index + 1,
            routing=nq_trace,
        )

        # Update lists
        session["questions"].append({"question": next_q_text, "index": question_index + 1})
        session["routing_traces"].append(nq_trace.model_dump())

    # Persist evaluation
    session["evaluations"].append({
        "question_index": question_index,
        "question": req.question,
        "answer": req.answer,
        "score": score,
        "valid_answer": valid_answer,
        "technical_accuracy": technical_accuracy,
        "concept_clarity": concept_clarity,
        "depth": depth,
        "communication": communication,
        "feedback": feedback,
        "correct_answer": correct_answer,
        "weak_concepts": weak_concepts,
        "mistakes": mistakes,
        "improvements": improvements,
        "expected_concepts": expected_concepts,
    })
    session["weak_concepts_accumulated"] = list(
        set(session["weak_concepts_accumulated"] + weak_concepts)
    )
    session["total_score"] = session["total_score"] + score
    session["answer_count"] = session["answer_count"] + 1
    session["routing_traces"].append(eval_trace.model_dump())

    status = "active"
    if session_complete:
        status = "completed"

    cursor.execute("""
    UPDATE sessions
    SET status = ?, total_score = ?, answer_count = ?, questions = ?, evaluations = ?, weak_concepts_accumulated = ?, routing_traces = ?
    WHERE session_id = ?;
    """, (
        status,
        session["total_score"],
        session["answer_count"],
        json.dumps(session["questions"]),
        json.dumps(session["evaluations"]),
        json.dumps(session["weak_concepts_accumulated"]),
        json.dumps(session["routing_traces"]),
        req.session_id
    ))
    
    conn.commit()
    conn.close()

    return AnswerResponse(
        evaluation=eval_result,
        next_question=next_question,
        session_complete=session_complete,
        routing=eval_trace,
        recalled_memories=recalled_messages,
    )


@router.post("/complete", response_model=SessionSummary)
async def complete_interview(req: CompleteInterviewRequest, current_user: dict = Depends(get_current_user)):
    """
    Finalize a session and store all learnings in Hindsight memory.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?;", (req.session_id,))
    session_row = cursor.fetchone()
    
    if not session_row or session_row["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    session = dict(session_row)
    session["evaluations"] = json.loads(session["evaluations"])
    session["weak_concepts_accumulated"] = json.loads(session["weak_concepts_accumulated"])
    session["routing_traces"] = json.loads(session["routing_traces"])

    answer_count = session.get("answer_count", 1)
    total_score = session.get("total_score", 0)
    avg_score = total_score / max(answer_count, 1)

    # Process Integrity Data
    integrity_score = 100
    integrity_data_json = "{}"
    if req.integrity_data:
        integrity_score = req.integrity_data.get("integrity_score", 100)
        integrity_data_json = json.dumps(req.integrity_data)
        
        # Apply score penalty if integrity is low (reduce by 10% if score < 70)
        if integrity_score < 70:
            avg_score = avg_score * 0.9

    weak_concepts = session.get("weak_concepts_accumulated", [])

    # HINDSIGHT RETAIN
    hindsight.retain(
        user_id=current_user["id"],
        session_id=req.session_id,
        topic=session["topic"],
        weak_concepts=weak_concepts,
        score=avg_score,
        role=session["role"],
        difficulty=session["difficulty"],
    )

    # Compile routing summary
    traces = session.get("routing_traces", [])
    total_tokens = sum(t.get("tokens_used", 0) for t in traces)
    total_cost = sum(t.get("cost_usd", 0) for t in traces)

    routing_trace_objects = []
    for t in traces:
        try:
            routing_trace_objects.append(RoutingTrace(**t))
        except Exception:
            pass

    # Calculate hiring recommendation
    hiring_recommendation = "Not Ready"
    if avg_score >= 8.5 and integrity_score >= 90:
        hiring_recommendation = "Strong Hire"
    elif avg_score >= 7.0 and integrity_score >= 80:
        hiring_recommendation = "Hire"
    elif avg_score >= 5.5 and integrity_score >= 70:
        hiring_recommendation = "Borderline"
    elif avg_score >= 4.0:
        hiring_recommendation = "Needs Improvement"

    cursor.execute("""
    UPDATE sessions 
    SET status = 'completed',
        integrity_score = ?,
        integrity_data = ?
    WHERE session_id = ?;
    """, (integrity_score, integrity_data_json, req.session_id))
    
    conn.commit()
    conn.close()

    return SessionSummary(
        session_id=req.session_id,
        user_id=current_user["id"],
        role=session["role"],
        topic=session["topic"],
        difficulty=session["difficulty"],
        score=round(avg_score, 2),
        questions_asked=answer_count,
        correct_answers=sum(1 for e in session["evaluations"] if e.get("score", 0) >= 6),
        weak_concepts=weak_concepts,
        hiring_recommendation=hiring_recommendation,
        timestamp=datetime.fromisoformat(session.get("started_at")),
        routing_traces=routing_trace_objects,
        total_tokens=total_tokens,
        total_cost=total_cost,
    )


@router.get("/session/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve session state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?;", (session_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row or row["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = dict(row)
    session["questions"] = json.loads(session["questions"])
    session["evaluations"] = json.loads(session["evaluations"])
    session["weak_concepts_accumulated"] = json.loads(session["weak_concepts_accumulated"])
    session["routing_traces"] = json.loads(session["routing_traces"])
    
    return session


@router.get("/history/{user_id}")
async def get_history(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get all past interview sessions for a user."""
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this history")
        
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM sessions WHERE user_id = ?
    ORDER BY started_at DESC;
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for r in rows:
        s = dict(r)
        s["questions"] = json.loads(s["questions"])
        s["evaluations"] = json.loads(s["evaluations"])
        s["weak_concepts_accumulated"] = json.loads(s["weak_concepts_accumulated"])
        s["routing_traces"] = json.loads(s["routing_traces"])
        sessions.append(s)
        
    return {"sessions": sessions}
