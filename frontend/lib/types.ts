// API types matching backend Pydantic schemas

export type Role = "Software Engineer" | "Data Scientist" | "Frontend Developer" | "Backend Developer";
export type Topic = "DBMS" | "DSA" | "Operating Systems" | "Networking" | "Machine Learning" | "React" | "Python";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type ModelTier = "fast" | "strong";

export interface RoutingTrace {
  model_used: string;
  tier: ModelTier;
  reason: string;
  tokens_used: number;
  cost_usd: number;
  latency_ms: number;
  escalated: boolean;
}

export interface InterviewQuestion {
  question: string;
  topic: Topic;
  difficulty: Difficulty;
  question_index: number;
  routing: RoutingTrace;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  correct_answer: string;
  weak_concepts: string[];
  is_correct: boolean;
}

export interface StartInterviewResponse {
  session_id: string;
  first_question: InterviewQuestion;
  recalled_memories: string[];
  adapted_difficulty: boolean;
  memory_context: string;
}

export interface AnswerResponse {
  evaluation: EvaluationResult;
  next_question: InterviewQuestion | null;
  session_complete: boolean;
  routing: RoutingTrace;
  recalled_memories: string[];
}

export interface SessionSummary {
  session_id: string;
  user_id: string;
  role: Role;
  topic: Topic;
  difficulty: Difficulty;
  score: number;
  questions_asked: number;
  correct_answers: number;
  weak_concepts: string[];
  timestamp: string;
  routing_traces: RoutingTrace[];
  total_tokens: number;
  total_cost: number;
}

export interface Memory {
  memory_id: string;
  user_id: string;
  type: string;
  topic: string;
  concept: string;
  detail: string;
  session_id: string;
  timestamp: string;
  confidence: number;
  times_seen: number;
  times_failed: number;
}

export interface UserMemoryProfile {
  user_id: string;
  weak_topics: Record<string, number>;
  strong_topics: Record<string, number>;
  common_mistakes: string[];
  total_sessions: number;
  average_score: number;
  improvement_trend: number;
  memories: Memory[];
  last_updated: string;
}

export interface MemoryTimelineEvent {
  event_id: string;
  user_id: string;
  session_id: string;
  type: "session" | "weakness_detected" | "improvement" | "recall";
  title: string;
  description: string;
  topic: string | null;
  score: number | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface CostAnalytics {
  total_tokens: number;
  total_cost_usd: number;
  fast_model_tokens: number;
  strong_model_tokens: number;
  fast_model_cost: number;
  strong_model_cost: number;
  cost_saved_usd: number;
  escalation_count: number;
  average_latency_ms: number;
  sessions_analyzed: number;
}

export interface RoutingHistoryEntry {
  timestamp: string;
  session_id: string;
  task_type: string;
  model_used: string;
  tier: ModelTier;
  reason: string;
  tokens: number;
  cost: number;
  latency_ms: number;
  escalated: boolean;
}

export interface AnalyticsSummary {
  cost: CostAnalytics;
  routing_history: RoutingHistoryEntry[];
  cost_over_time: { timestamp: string; cumulative_cost: number; tier: string }[];
  model_distribution: Record<string, number>;
}
