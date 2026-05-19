"""
InterviewMind AI — FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Ensure data directory exists
Path("data").mkdir(exist_ok=True)

from routers import interview, memory, analytics, auth

app = FastAPI(
    title="InterviewMind AI",
    description="AI interview preparation platform with persistent memory and intelligent model routing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(interview.router)
app.include_router(memory.router)
app.include_router(analytics.router)


@app.get("/")
async def root():
    return {
        "service": "InterviewMind AI",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
