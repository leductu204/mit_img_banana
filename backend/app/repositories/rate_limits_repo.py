# repositories/rate_limits_repo.py
"""Placeholder repository for rate limiting per IP/user."""

def get_rate_limit(key: str):
    # Return dummy limit info
    return {"key": key, "remaining": 100, "reset": 3600}

def decrement_rate_limit(key: str):
    # Placeholder decrement
    return {"key": key, "remaining": 99}
