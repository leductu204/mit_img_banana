# utils/jwt_utils.py
"""JWT token encoding and decoding utilities."""

import jwt
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings


class JWTError(Exception):
    """Exception raised for JWT-related errors."""
    pass


def create_access_token(user_id: str, email: str) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: User's internal ID
        email: User's email address
        
    Returns:
        Encoded JWT token string
    """
    now = datetime.utcnow()
    expires = now + timedelta(days=settings.JWT_EXPIRY_DAYS)
    
    payload = {
        "user_id": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp())
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload as dictionary
        
    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise JWTError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise JWTError(f"Invalid token: {str(e)}")


def get_token_expiry_seconds() -> int:
    """Get token expiry duration in seconds."""
    return settings.JWT_EXPIRY_DAYS * 24 * 60 * 60


def verify_token(token: str) -> Optional[dict]:
    """
    Verify a token without raising exceptions.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload if valid, None otherwise
    """
    try:
        return decode_access_token(token)
    except JWTError:
        return None
