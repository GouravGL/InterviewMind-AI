from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from datetime import datetime
import uuid
from models.auth import UserCreate, UserLogin, UserResponse, Token, RefreshTokenRequest
from core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, get_current_user, decode_token
from core.database import get_connection

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Check duplicate email
        cursor.execute("SELECT id FROM users WHERE email = ?;", (user_in.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
            
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        cursor.execute("""
        INSERT INTO users (id, email, username, full_name, hashed_password, role, is_verified, created_at, updated_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            user_id,
            user_in.email,
            user_in.username,
            user_in.full_name or user_in.username,
            get_password_hash(user_in.password),
            "user",
            0,
            now,
            now,
            None
        ))
        
        conn.commit()
    finally:
        conn.close()
    
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Find user by email
        cursor.execute("SELECT * FROM users WHERE email = ?;", (user_in.email,))
        user_row = cursor.fetchone()
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user = dict(user_row)
        if not verify_password(user_in.password, user.get("hashed_password")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Update last login
        now = datetime.utcnow().isoformat()
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?;", (now, user["id"]))
        conn.commit()
    finally:
        conn.close()
    
    access_token = create_access_token(subject=user["id"])
    refresh_token = create_refresh_token(subject=user["id"])
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest):
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        user_id = payload.get("sub")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?;", (user_id,))
        exists = cursor.fetchone()
        conn.close()
        
        if not exists:
            raise HTTPException(status_code=401, detail="User not found")
            
        access_token = create_access_token(subject=user_id)
        new_refresh_token = create_refresh_token(subject=user_id)
        
        return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out"}
