"""
InterviewMind AI — Groq API Client
Thin wrapper around the Groq SDK with structured prompting.
"""

import os
import re
import json
import time
from typing import Optional, Tuple
from groq import Groq

client: Optional[Groq] = None


def get_client() -> Optional[Groq]:
    global client
    if client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if api_key and api_key != "your_groq_api_key_here":
            client = Groq(api_key=api_key)
    return client


def chat(
    model: str,
    system_prompt: str,
    user_message: str,
    max_tokens: int = 800,
    temperature: float = 0.7,
) -> Tuple[str, int, int]:
    """
    Send a chat completion request to Groq.
    Returns: (content, prompt_tokens, completion_tokens)
    """
    groq_client = get_client()

    if groq_client is None:
        # Graceful degradation: return mock response when no API key
        return _mock_response(model, user_message), 150, 100

    try:
        response = groq_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        content = response.choices[0].message.content or ""
        usage = response.usage
        return content, usage.prompt_tokens, usage.completion_tokens
    except Exception as e:
        print(f"[Groq] Error: {e}")
        return _mock_response(model, user_message), 150, 100


def _mock_response(model: str, prompt: str) -> str:
    """
    Mock AI responses for demo/development when no API key is configured.
    Returns realistic-looking content so the UI is fully functional.
    """
    if "generate" in prompt.lower() or "question" in prompt.lower() or "context input" in prompt.lower():
        import random
        
        # Extract topic from prompt context if available
        topic = "DBMS"
        match = re.search(r'"topic":\s*"([^"]+)"', prompt)
        if match:
            topic = match.group(1)
            
        is_mcq = random.random() > 0.5
        
        # Domain-specific mock databases
        mock_mcq = {
            "React": {
                "question": "Which React hook should be used to memoize an expensive computation between renders?",
                "options": ["useEffect", "useCallback", "useMemo", "useRef"],
                "correct": 2,
                "concept": "Performance Optimization (Hooks)"
            },
            "Python": {
                "question": "What is the primary function of the Global Interpreter Lock (GIL) in CPython?",
                "options": ["It allows true parallel execution of multiple threads.", "It prevents multiple native threads from executing Python bytecodes at once.", "It manages memory allocation for local variables.", "It optimizes the import of global modules."],
                "correct": 1,
                "concept": "Concurrency (GIL)"
            },
            "Machine Learning": {
                "question": "In the context of the bias-variance tradeoff, what is the typical effect of increasing the complexity of a model?",
                "options": ["Decreases both bias and variance", "Increases both bias and variance", "Decreases bias but increases variance", "Increases bias but decreases variance"],
                "correct": 2,
                "concept": "Bias-Variance Tradeoff"
            }
        }
        
        mock_open = {
            "React": {
                "question": "Explain the concept of 'lifting state up' in React. In what scenarios would you choose the Context API over passing props down multiple levels?",
                "concept": "State Management"
            },
            "Python": {
                "question": "Describe the difference between an iterator and a generator in Python. Provide a code example of a generator function that yields the Fibonacci sequence.",
                "concept": "Generators & Iterators"
            },
            "Machine Learning": {
                "question": "Explain the difference between L1 (Lasso) and L2 (Ridge) regularization. How do they affect the model's coefficients differently?",
                "concept": "Regularization"
            }
        }
        
        # Fallback to DBMS if topic not explicitly mocked
        topic_mcq = mock_mcq.get(topic, {
            "question": f"Which of the following database normal forms strictly requires that every non-prime attribute is fully functionally dependent on the primary key, and no transitive dependencies exist?",
            "options": ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
            "correct": 2,
            "concept": "Database Normalization"
        })
        
        topic_open = mock_open.get(topic, {
            "question": f"Explain the difference between 2NF and 3NF normalization in {topic} relational databases. Provide an example table that violates 3NF and show how to decompose it.",
            "concept": "Transitive Dependencies"
        })

        if is_mcq:
            return json.dumps({
                "question_type": "MCQ",
                "question": topic_mcq["question"],
                "mcq_options": topic_mcq["options"],
                "correct_option_index": topic_mcq["correct"],
                "targeted_concept": topic_mcq["concept"],
                "evaluation_criteria": ["Correctly identifies the core concept"]
            })
        else:
            return json.dumps({
                "question_type": "OPEN_ENDED",
                "question": topic_open["question"],
                "mcq_options": None,
                "correct_option_index": -1,
                "targeted_concept": topic_open["concept"],
                "evaluation_criteria": ["Defines the core concept correctly", "Provides a valid technical example"]
            })
    elif "evaluate" in prompt.lower() or "answer" in prompt.lower():
        return json.dumps({
            "score": 6,
            "valid_answer": True,
            "technical_accuracy": 7,
            "concept_clarity": 5,
            "depth": 6,
            "communication": 6,
            "is_correct": True,
            "feedback": "Good attempt! You correctly identified the key difference between 2NF and 3NF. However, your example could be more precise — 3NF requires eliminating transitive dependencies where a non-key attribute depends on another non-key attribute.",
            "correct_answer": "2NF eliminates partial dependencies (non-key attributes depending on part of a composite key). 3NF eliminates transitive dependencies (non-key attributes depending on other non-key attributes). Example: Employee(EmpID, DeptID, DeptName) — DeptName depends on DeptID (not EmpID), violating 3NF. Decompose into Employee(EmpID, DeptID) and Department(DeptID, DeptName).",
            "weak_concepts": ["transitive dependencies"],
            "mistakes": ["Failed to provide a concrete table example", "Confused partial dependencies with transitive ones"],
            "improvements": ["Always include a simple table schema when explaining DB normal forms", "Clearly differentiate between partial and transitive dependency"],
            "expected_concepts": ["2NF", "3NF", "Partial Dependency", "Transitive Dependency", "Decomposition"]
        })
    else:
        return "I'm analyzing your response and preparing personalized feedback based on your learning history."


# ─── Structured Prompt Builders ───────────────────────────────────────────────

INTERVIEW_SYSTEM_PROMPT = """You are InterviewMind, an elite AI technical interview coach.
Your role is to conduct rigorous, realistic technical interviews for software engineering roles.

INTERVIEW PRINCIPLES:
- Ask precise, industry-relevant questions
- Evaluate answers thoroughly and fairly
- Provide actionable, specific feedback
- Adapt difficulty based on candidate performance
- Be encouraging but honest

Always respond with valid JSON only. No markdown, no extra text."""


def build_question_prompt(
    role: str,
    topic: str,
    difficulty: str,
    question_index: int,
    memory_context: str,
    weak_concepts: list,
) -> Tuple[str, str]:
    """Build system and user prompts for question generation."""

    memory_json = []
    if weak_concepts:
        memory_json = weak_concepts
    
    system = """You are a Senior Technical Interviewer conducting a highly realistic, adaptive, and domain-aware technical interview for top-tier tech companies.

Your task is to generate exactly ONE highly relevant interview question matching the user's specific context.

================================================================================
CRITICAL RULE 1: STRICT DOMAIN ISOLATION
================================================================================
You must look explicitly at the "topic" field. The question generated MUST evaluate concepts exclusively inside that specific topic. Do NOT mix up domains or cross-pollinate questions from unrelated fields (e.g., if the topic is Python, do NOT ask about SQL database normalization or React hooks). 

Anchor your questions around these validated domain scopes:
- Python: GIL, memory management, decorators, async/await, generators, dunder methods, type hinting.
- DBMS: Normalization (1NF-3NF/BCNF), indexing (B-Trees/Hash), ACID properties, transactions, isolation levels, sharding.
- React: Virtual DOM, reconciliation, context API, hooks lifecycle, concurrent mode, SSR/Next.js hydration, state co-location.
- Machine Learning: Bias-variance tradeoff, regularization (L1/L2), gradient descent variants, feature engineering, precision/recall metrics.
- Docker/Kubernetes: Container isolation, volumes, network namespaces, Pod lifecycles, K8s controllers, service meshes.

================================================================================
CRITICAL RULE 2: HINDSIGHT MEMORY INTEGRATION
================================================================================
Analyze the "candidate_memory" object. If the user has documented historical weaknesses, failed concepts, or low evaluation scores under the currently selected topic, you MUST dynamically craft the question to re-test that exact vulnerability. Prefix the question seamlessly acknowledging the retry (e.g., "In your last session, you noted some ambiguity regarding X. Let's drill into that concept...").

================================================================================
CRITICAL RULE 3: QUESTION TYPE DIVERSITY (OPEN-ENDED VS MCQ)
================================================================================
To maintain high candidate engagement, randomly or algorithmically rotate between two distinct question types:
1. "OPEN_ENDED": Conceptual, scenario-driven, or architectural questions requiring an articulate written response.
2. "MCQ": Multiple-choice questions testing precise edge cases, execution output of short code snippets, or exact technical trade-offs.

================================================================================
CRITICAL RULE 4: DIFFICULTY LAYERING
================================================================================
- Easy: Extremely basic, beginner-friendly questions. Focus on simple definitions, fundamental concepts, and basic terminology. Do NOT ask complex scenario questions.
- Medium: Practical scenario-based implementations, functional trade-offs, and logical code components.
- Hard: Enterprise high-scale architecture, extreme code optimization, production debugging incidents, and complex distributed systems edge cases.

================================================================================
OUTPUT FORMAT SPECIFICATION
================================================================================
You must respond ONLY with a raw, valid JSON object matching the schema below. 
Do NOT wrap your response in markdown code block markers (e.g., do NOT use ```json ... ```).

OUTPUT JSON SCHEMA:
{
  "question_type": "OPEN_ENDED", 
  "question": "The domain-accurate question text or code snippet goes here",
  "mcq_options": null,
  "correct_option_index": -1,
  "targeted_concept": "The exact engineering sub-concept being tested",
  "evaluation_criteria": [
    "Expected conceptual pivot point 1",
    "Expected architectural keyword or consideration 2"
  ]
}

*SCHEMA RULES FOR MCQ TYPE:*
If you choose to generate an "MCQ" type question, mutate the output schema parameters accordingly:
- Set "question_type" to "MCQ".
- Provide an array of exactly 4 distinct, highly plausible string options in "mcq_options".
- Set "correct_option_index" to the 0-based integer index corresponding to the correct answer (0, 1, 2, or 3)."""

    user = f"""CONTEXT INPUT:
{{
  "role": "{role}",
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "candidate_memory": {json.dumps(memory_json)}
}}"""

    return system, user


def build_evaluation_prompt(
    question: str,
    answer: str,
    topic: str,
    difficulty: str,
    role: str,
) -> Tuple[str, str]:
    """Build system and user prompts for answer evaluation."""

    system = INTERVIEW_SYSTEM_PROMPT + """

EVALUATION SYSTEM - INTELLECTUAL & HUMAN-STYLE EVALUATION PRINCIPLES:
1. SEMANTIC & CONCEPTUAL UNDERSTANDING OVER TEXTBOOK MATCHING:
   - Do NOT require the candidate to match the exact model answer.
   - Evaluate UNDERSTANDING, intent, technical meaning, and logical correctness, NOT exact wording or textbook definitions.
   - Reward conceptually correct answers even if they use paraphrased explanations, simplified technical wording, practical examples, or concise explanations.
2. DO NOT PENALIZE:
   - Minor grammar mistakes or imperfect English.
   - Missing exact textbook keywords or non-academic phrasing.
   - Short but logically correct explanations.
3. REJECT ONLY GENUINE FAILURES:
   - If the answer is completely unrelated, technically incorrect, nonsense, generic AI fluff (motivational fluff with no concepts), or copied irrelevant content, set valid_answer=false and score=0.
4. SCORING SCALE:
   - 0-2: Wrong, invalid, or unrelated/nonsense answer.
   - 3-5: Partial understanding (understands some aspects, but misses critical components or has core technical misconceptions).
   - 6-8: Good technical understanding (conceptually correct, well-explained in human-style, shows practical reasoning).
   - 9-10: Excellent, deep technical understanding (comprehensive, interview-quality response with rich reasoning or examples).
5. BEHAVE LIKE A REAL SENIOR TECHNICAL INTERVIEWER:
   - Listen to candidate explanations naturally. Maintain a balance between strictness of technical correctness and fairness of recognizing conceptual intelligence.
   - Do NOT act like a rigid exam key matching system. Provide constructive, coaching-oriented feedback."""
    user = f"""Evaluate this candidate's answer to the following {difficulty} {topic} question for a {role} position.

QUESTION: {question}

CANDIDATE ANSWER: {answer}

Evaluate conceptually according to the guidelines. Return JSON with this exact structure:
{{
  "score": <integer 0-10>,
  "valid_answer": <boolean>,
  "technical_accuracy": <integer 0-10>,
  "concept_clarity": <integer 0-10>,
  "depth": <integer 0-10>,
  "communication": <integer 0-10>,
  "feedback": "Actionable, mentoring-style feedback describing candidate's understanding and any missed details, without artificial filler",
  "correct_answer": "A comprehensive conceptual explanation covering expected core concepts",
  "weak_concepts": ["only include actual technical concepts that are fundamentally misunderstood or missing"],
  "mistakes": ["specific conceptual mistake or gap 1", "specific mistake 2"],
  "improvements": ["constructive improvement tip 1", "improvement tip 2"],
  "expected_concepts": ["core conceptual block 1", "core conceptual block 2"],
  "is_correct": <boolean>
}}"""

    return system, user
