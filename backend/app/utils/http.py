# utils/http.py
"""Simple HTTP client wrapper with retry and timeout support."""
import httpx
from typing import Any, Dict, Optional

def request(
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Dict[str, Any]] = None,
    timeout: float = 10.0,
    retries: int = 2,
) -> httpx.Response:
    """Perform an HTTP request with basic retry logic.
    
    Args:
        method: HTTP method ("GET", "POST", ...).
        url: Target URL.
        headers: Optional request headers.
        params: Query parameters.
        json: JSON payload for POST/PUT.
        timeout: Seconds before timeout.
        retries: Number of retry attempts on network errors.
    """
    client = httpx.Client(timeout=timeout)
    attempt = 0
    while True:
        try:
            response = client.request(method, url, headers=headers, params=params, json=json)
            response.raise_for_status()
            return response
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            attempt += 1
            if attempt > retries:
                raise exc
        finally:
            client.close()
