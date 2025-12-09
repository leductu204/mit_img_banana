import time
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.repositories import api_keys_repo

# Primary Auth Scheme
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

# Simple in-memory rate limiter
# Structure: {key_id: [timestamp1, timestamp2, ...]}
# For MVP, not suitable for multi-worker production without Redis, 
# but satisfies requirements for Phase 3.
# Cleanup strategy: on each request, remove timestamps older than 60s.
rate_limits = {} 
RATE_LIMIT_PER_MINUTE = 100

async def verify_api_key_dependency(
    auth_header: str = Security(api_key_header)
) -> dict:
    """
    Dependency to verify API Key from Authorization header.
    Format: "Bearer sk_live_..."
    """
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    
    # Check format
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Use 'Bearer sk_...'"
        )
        
    api_key_str = auth_header.replace("Bearer ", "").strip()
    
    if not api_key_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key"
        )
        
    # Check prefix
    if not (api_key_str.startswith("sk_live_") or api_key_str.startswith("sk_test_")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format"
        )
        
    # Verify against database
    key_record = api_keys_repo.verify_key_hash(api_key_str)
    
    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
        
    if not key_record["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is disabled"
        )

    # --- Rate Limiting Logic ---
    key_id = key_record["key_id"]
    now = time.time()
    
    # Initialize list if new key
    if key_id not in rate_limits:
        rate_limits[key_id] = []
    
    # Filter out timestamps older than 60 seconds
    # (requests within the sliding window)
    window_start = now - 60
    rate_limits[key_id] = [t for t in rate_limits[key_id] if t > window_start]
    
    current_count = len(rate_limits[key_id])
    
    if current_count >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Limit: 100 requests per minute."
        )
    
    # Add current request timestamp
    rate_limits[key_id].append(now)
    # ---------------------------
    
    return dict(key_record)

