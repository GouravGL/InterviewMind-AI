"""
InterviewMind AI — Pydantic Schemas
All shared data models for request/response validation.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class Role(str, Enum):
    SOFTWARE_ENGINEER = "Software Engineer"
    DATA_SCIENTIST = "Data Scientist"
    FRONTEND_DEVELOPER = "Frontend Developer"
    BACKEND_DEVELOPER = "Backend Developer"


class Topic(str, Enum):
    DBMS = "DBMS"
    DSA = "DSA"
    OPERATING_SYSTEMS = "Operating Systems"
    NETWORKING = "Networking"
    MACHINE_LEARNING = "Machine Learning"
    REACT = "React"
    PYTHON = "Python"


class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class ModelTier(str, Enum):
    FAST = "fast"
    STRONG = "strong"


# ─── Interview ─────────────────────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    user_id: str
    role: Role
    topic: Topic
    difficulty: Difficulty


class AnswerRequest(BaseModel):
    session_id: str
    user_id: str
    answer: str
    question: str
    question_index: int


class EvaluationResult(BaseModel):
    score: int = Field(..., ge=0, le=10)
    valid_answer: bool
    technical_accuracy: int = Field(..., ge=0, le=10)
    concept_clarity: int = Field(..., ge=0, le=10)
    depth: int = Field(..., ge=0, le=10)
    communication: int = Field(..., ge=0, le=10)
    feedback: str
    correct_answer: str
    weak_concepts: List[str]
    mistakes: List[str]
    improvements: List[str]
    expected_concepts: List[str]
    is_correct: bool


class RoutingTrace(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_used: str
    tier: ModelTier
    reason: str
    tokens_used: int
    cost_usd: float
    latency_ms: int
    escalated: bool = False


class InterviewQuestion(BaseModel):
    question_type: str = "OPEN_ENDED"
    question: str
    mcq_options: Optional[List[str]] = None
    correct_option_index: int = -1
    targeted_concept: str = ""
    evaluation_criteria: List[str] = []
    topic: Topic
    difficulty: Difficulty
    question_index: int
    routing: RoutingTrace


class AnswerResponse(BaseModel):
    evaluation: EvaluationResult
    next_question: Optional[InterviewQuestion]
    session_complete: bool
    routing: RoutingTrace
    recalled_memories: List[str] = []


class StartInterviewResponse(BaseModel):
    session_id: str
    first_question: InterviewQuestion
    recalled_memories: List[str] = []
    adapted_difficulty: bool = False
    memory_context: str = ""


class CompleteInterviewRequest(BaseModel):
    session_id: str
    user_id: str
    integrity_data: Optional[Dict[str, Any]] = None


class SessionSummary(BaseModel):
    session_id: str
    user_id: str
    role: Role
    topic: Topic
    difficulty: Difficulty
    score: float
    questions_asked: int
    correct_answers: int
    weak_concepts: List[str]
    hiring_recommendation: str
    timestamp: datetime
    routing_traces: List[RoutingTrace]
    total_tokens: int
    total_cost: float


# ─── Memory ────────────────────────────────────────────────────────────────────

class Memory(BaseModel):
    memory_id: str
    user_id: str
    type: str  # "weakness", "strength", "mistake", "preference"
    topic: str
    concept: str
    detail: str
    session_id: str
    timestamp: datetime
    confidence: float = Field(..., ge=0.0, le=1.0)
    times_seen: int = 1
    times_failed: int = 0


class UserMemoryProfile(BaseModel):
    user_id: str
    weak_topics: Dict[str, float]  # topic -> failure_rate
    strong_topics: Dict[str, float]
    common_mistakes: List[str]
    total_sessions: int
    average_score: float
    improvement_trend: float  # positive = improving
    memories: List[Memory]
    last_updated: datetime


class MemoryTimelineEvent(BaseModel):
    event_id: str
    user_id: str
    session_id: str
    type: str  # "session", "weakness_detected", "improvement", "recall"
    title: str
    description: str
    topic: Optional[str]
    score: Optional[float]
    timestamp: datetime
    metadata: Dict[str, Any] = {}


# ─── Analytics ─────────────────────────────────────────────────────────────────

class CostAnalytics(BaseModel):
    user_id: Optional[str]
    total_tokens: int
    total_cost_usd: float
    fast_model_tokens: int
    strong_model_tokens: int
    fast_model_cost: float
    strong_model_cost: float
    cost_saved_usd: float  # vs using strong model for everything
    escalation_count: int
    average_latency_ms: float
    sessions_analyzed: int


class RoutingHistoryEntry(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    timestamp: datetime
    session_id: str
    task_type: str
    model_used: str
    tier: ModelTier
    reason: str
    tokens: int
    cost: float
    latency_ms: int
    escalated: bool


class AnalyticsSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    cost: CostAnalytics
    routing_history: List[RoutingHistoryEntry]
    cost_over_time: List[Dict[str, Any]]
    model_distribution: Dict[str, int]
