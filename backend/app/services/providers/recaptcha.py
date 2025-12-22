"""
reCAPTCHA token generation using Selenium solver.
This module provides captcha tokens for Google Veo API without using third-party APIs.

NOTE: Each reCAPTCHA token can only be used ONCE per API request.
No caching - fresh token generated for every video generation.
"""
from app.services.providers.selenium_solver import solve_recaptcha_v3_enterprise


def get_recaptcha_token(force_refresh: bool = False) -> str:
    """
    Get a fresh reCAPTCHA v3 Enterprise token for Google Veo API.
    
    IMPORTANT: Each token can only be used ONCE. This function always
    generates a new token - no caching is performed.
    
    Args:
        force_refresh: Deprecated (kept for backwards compatibility)
        
    Returns:
        str: Fresh reCAPTCHA token
        
    Raises:
        ValueError: If token generation fails
    """
    # Always generate fresh token (each token is single-use only)
    print("[reCAPTCHA] Generating fresh token using Selenium...")
    
    SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
    SITE_URL = 'https://labs.google'
    ACTION = 'FLOW_GENERATION'
    
    try:
        token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL, ACTION)
        
        if not token or token.startswith('ERROR'):
            raise ValueError(f"Failed to generate reCAPTCHA token: {token}")
        
        print(f"[reCAPTCHA] Fresh token generated (length: {len(token)})")
        return token
        
    except Exception as e:
        print(f"[reCAPTCHA] Error generating token: {e}")
        raise ValueError(f"reCAPTCHA token generation failed: {e}")
