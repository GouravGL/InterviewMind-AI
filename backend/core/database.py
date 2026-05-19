"""
InterviewMind AI — Database Service
Implements a production-ready SQLite database wrapper with parameterized queries,
automatic schema initialization, and a seamless JSON migration runner.
"""

import sqlite3
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_FILE = Path("data/interviewmind.db")
DB_FILE.parent.mkdir(exist_ok=True, parents=True)


def get_connection():
    """Return a standard SQLite connection with row factories for dictionary returns."""
    conn = sqlite3.connect(str(DB_FILE), timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys and WAL mode
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db():
    """Create database tables if they do not exist and trigger JSON migration."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        full_name TEXT NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        topic TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        started_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        total_score REAL NOT NULL DEFAULT 0.0,
        answer_count INTEGER NOT NULL DEFAULT 0,
        questions TEXT NOT NULL DEFAULT '[]',
        evaluations TEXT NOT NULL DEFAULT '[]',
        weak_concepts_accumulated TEXT NOT NULL DEFAULT '[]',
        routing_traces TEXT NOT NULL DEFAULT '[]',
        integrity_score INTEGER,
        integrity_data TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Migrations for existing DB
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN integrity_score INTEGER;")
    except sqlite3.OperationalError:
        pass # Column exists
        
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN integrity_data TEXT;")
    except sqlite3.OperationalError:
        pass # Column exists

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS memories (
        memory_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        topic TEXT NOT NULL,
        concept TEXT NOT NULL,
        detail TEXT NOT NULL,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5,
        times_seen INTEGER NOT NULL DEFAULT 1,
        times_failed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timeline (
        event_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        topic TEXT,
        score REAL,
        timestamp TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()

    # Perform Legacy JSON Migration
    migrate_legacy_json()


def _ensure_user_exists(cursor, user_id: str):
    """Helper to dynamically create a placeholder user for orphan foreign key records."""
    cursor.execute("SELECT id FROM users WHERE id = ?;", (user_id,))
    if not cursor.fetchone():
        now = "2026-05-19T00:00:00.000000"
        cursor.execute("""
        INSERT INTO users (id, email, username, full_name, hashed_password, role, is_verified, created_at, updated_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            user_id,
            f"{user_id}@example.com",
            user_id,
            "Migrated Candidate",
            "",
            "user",
            0,
            now,
            now,
            None
        ))


def migrate_legacy_json():
    """Migrate legacy JSON files into SQLite database if they exist and DB tables are empty."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Migrate Users
    cursor.execute("SELECT COUNT(*) FROM users;")
    user_count = cursor.fetchone()[0]
    users_file = Path("data/users.json")
    if user_count == 0 and users_file.exists():
        print("[DB Migration] Migrating legacy users.json...")
        try:
            users_data = json.loads(users_file.read_text())
            for uid, u in users_data.items():
                cursor.execute("""
                INSERT OR IGNORE INTO users (id, email, username, full_name, hashed_password, role, is_verified, created_at, updated_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    uid,
                    u.get("email"),
                    u.get("username"),
                    u.get("full_name") or "User",
                    u.get("hashed_password"),
                    u.get("role", "user"),
                    1 if u.get("is_verified") else 0,
                    u.get("created_at"),
                    u.get("updated_at"),
                    u.get("last_login")
                ))
            conn.commit()
            print(f"[DB Migration] Migrated {len(users_data)} users successfully.")
        except Exception as e:
            print(f"[DB Migration] Error migrating users: {e}")

    # 2. Migrate Sessions
    cursor.execute("SELECT COUNT(*) FROM sessions;")
    session_count = cursor.fetchone()[0]
    sessions_file = Path("data/sessions.json")
    if session_count == 0 and sessions_file.exists():
        print("[DB Migration] Migrating legacy sessions.json...")
        try:
            sessions_data = json.loads(sessions_file.read_text())
            for sid, s in sessions_data.items():
                user_id = s.get("user_id")
                _ensure_user_exists(cursor, user_id)
                
                cursor.execute("""
                INSERT OR IGNORE INTO sessions (session_id, user_id, role, topic, difficulty, started_at, status, total_score, answer_count, questions, evaluations, weak_concepts_accumulated, routing_traces)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    sid,
                    user_id,
                    s.get("role"),
                    s.get("topic"),
                    s.get("difficulty"),
                    s.get("started_at"),
                    s.get("status", "active"),
                    s.get("total_score", 0.0),
                    s.get("answer_count", 0),
                    json.dumps(s.get("questions", [])),
                    json.dumps(s.get("evaluations", [])),
                    json.dumps(s.get("weak_concepts_accumulated", [])),
                    json.dumps(s.get("routing_traces", []))
                ))
            conn.commit()
            print(f"[DB Migration] Migrated {len(sessions_data)} sessions successfully.")
        except Exception as e:
            print(f"[DB Migration] Error migrating sessions: {e}")

    # 3. Migrate Memories
    cursor.execute("SELECT COUNT(*) FROM memories;")
    memory_count = cursor.fetchone()[0]
    memories_file = Path("data/memories.json")
    if memory_count == 0 and memories_file.exists():
        print("[DB Migration] Migrating legacy memories.json...")
        try:
            memories_data = json.loads(memories_file.read_text())
            all_m = memories_data.get("memories", {})
            migrated_count = 0
            for uid, user_m_list in all_m.items():
                _ensure_user_exists(cursor, uid)
                
                for m in user_m_list:
                    cursor.execute("""
                    INSERT OR IGNORE INTO memories (memory_id, user_id, type, topic, concept, detail, session_id, timestamp, confidence, times_seen, times_failed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """, (
                        m.get("memory_id"),
                        uid,
                        m.get("type", "weakness"),
                        m.get("topic"),
                        m.get("concept"),
                        m.get("detail"),
                        m.get("session_id"),
                        m.get("timestamp"),
                        m.get("confidence", 0.3),
                        m.get("times_seen", 1),
                        m.get("times_failed", 1)
                    ))
                    migrated_count += 1
            conn.commit()
            print(f"[DB Migration] Migrated {migrated_count} memories successfully.")
        except Exception as e:
            print(f"[DB Migration] Error migrating memories: {e}")

    # 4. Migrate Timeline
    cursor.execute("SELECT COUNT(*) FROM timeline;")
    timeline_count = cursor.fetchone()[0]
    timeline_file = Path("data/timeline.json")
    if timeline_count == 0 and timeline_file.exists():
        print("[DB Migration] Migrating legacy timeline.json...")
        try:
            timeline_data = json.loads(timeline_file.read_text())
            migrated_count = 0
            for uid, events in timeline_data.items():
                _ensure_user_exists(cursor, uid)
                
                for e in events:
                    cursor.execute("""
                    INSERT OR IGNORE INTO timeline (event_id, user_id, session_id, type, title, description, topic, score, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """, (
                        e.get("event_id"),
                        uid,
                        e.get("session_id"),
                        e.get("type"),
                        e.get("title"),
                        e.get("description"),
                        e.get("topic"),
                        e.get("score"),
                        e.get("timestamp"),
                        json.dumps(e.get("metadata", {}))
                    ))
                    migrated_count += 1
            conn.commit()
            print(f"[DB Migration] Migrated {migrated_count} timeline events successfully.")
        except Exception as e:
            print(f"[DB Migration] Error migrating timeline: {e}")

    conn.close()


# Trigger initialization automatically on load
init_db()
