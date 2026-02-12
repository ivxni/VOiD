"""
VOiD Backend — Security Utilities

Handles JWT creation/validation and Apple Sign In token verification.
"""

from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.core.config import get_settings

settings = get_settings()


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token for a user.

    Args:
        subject: The user's ID (UUID string)
        expires_delta: Custom expiration time
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_access_token(token: str) -> str:
    """
    Verify a JWT access token and return the subject (user ID).

    Raises HTTPException if invalid.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        subject: str | None = payload.get("sub")
        if subject is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        return subject
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def verify_apple_identity_token(identity_token: str) -> dict:
    """
    Verify Apple Sign In identity token.

    In production, this would:
    1. Fetch Apple's public keys from https://appleid.apple.com/auth/keys
    2. Decode the identity_token (JWT) using Apple's public key
    3. Validate issuer, audience, and expiration
    4. Return the decoded claims (sub, email, etc.)

    For now, returns a mock response.
    """
    # TODO: Implement full Apple token verification using httpx
    # to fetch Apple's JWK keys and python-jose to decode
    return {
        "sub": "mock-apple-subject-id",
        "email": None,
        "email_verified": True,
    }
