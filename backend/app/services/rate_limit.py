# services/rate_limit.py
"""Simple in‑memory rate‑limit placeholder.

In a real implementation you would store counters per IP/user in a fast store
(e.g., Redis) and enforce limits based on your policy.
"""
from typing import Dict

# In‑memory store: {key: remaining_requests}
_rate_limits: Dict[str, int] = {}

DEFAULT_LIMIT = 100

def get_remaining(key: str) -> int:
    return _rate_limits.get(key, DEFAULT_LIMIT)

def decrement(key: str) -> int:
    remaining = _rate_limits.get(key, DEFAULT_LIMIT)
    remaining = max(remaining - 1, 0)
    _rate_limits[key] = remaining
    return remaining
