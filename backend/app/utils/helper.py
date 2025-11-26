# utils/helper.py
"""Utility helper functions used across the backend."""
from typing import Any

def dict_merge(a: dict, b: dict) -> dict:
    """Recursively merge dict b into dict a and return the result."""
    result = a.copy()
    for key, value in b.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = dict_merge(result[key], value)
        else:
            result[key] = value
    return result

def safe_get(d: dict, *keys: str, default: Any = None) -> Any:
    """Safely get a nested value from a dict using a sequence of keys."""
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return default
    return cur
