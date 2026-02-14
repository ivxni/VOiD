"""
VOiD Backend — Security Utilities

Handles JWT creation/validation and Apple Sign In token verification.
"""

import logging
from datetime import datetime, timedelta, timezone

import httpx
from jose import JWTError, jwt, jwk
from jose.utils import base64url_decode
from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger("void.security")
settings = get_settings()

# Cache Apple's public keys
_apple_keys_cache: list[dict] | None = None


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token for a user."""
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
    """Verify a JWT access token and return the subject (user ID)."""
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


async def _fetch_apple_public_keys() -> list[dict]:
    """Fetch Apple's public JWK keys for token verification."""
    global _apple_keys_cache
    if _apple_keys_cache is not None:
        return _apple_keys_cache

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://appleid.apple.com/auth/keys", timeout=10)
            resp.raise_for_status()
            _apple_keys_cache = resp.json()["keys"]
            logger.info(f"Fetched {len(_apple_keys_cache)} Apple public keys")
            return _apple_keys_cache
    except Exception as e:
        logger.warning(f"Failed to fetch Apple keys: {e}")
        return []


async def verify_apple_identity_token(identity_token: str) -> dict:
    """
    Verify an Apple Sign In identity token.

    In DEBUG mode:
      - Decodes the JWT WITHOUT signature verification
      - Extracts sub, email, email_verified from claims
      - This allows testing on real devices without full Apple verification

    In production:
      - Fetches Apple's public keys
      - Verifies the JWT signature, issuer, audience, and expiration
    """
    if settings.DEBUG:
        # ── Debug mode: decode without verification ──
        try:
            # Decode the JWT payload without verifying signature
            claims = jwt.get_unverified_claims(identity_token)
            logger.info(
                f"[DEBUG] Apple token decoded — sub={claims.get('sub', '?')}, "
                f"email={claims.get('email', 'hidden')}"
            )
            return {
                "sub": claims["sub"],
                "email": claims.get("email"),
                "email_verified": claims.get("email_verified", True),
            }
        except Exception as e:
            logger.error(f"[DEBUG] Failed to decode Apple token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Apple identity token: {e}",
            )

    # ── Production mode: full verification ──
    try:
        # 1. Get the key ID from the token header
        headers = jwt.get_unverified_header(identity_token)
        kid = headers.get("kid")
        if not kid:
            raise ValueError("Token header missing 'kid'")

        # 2. Fetch Apple's public keys and find the matching one
        apple_keys = await _fetch_apple_public_keys()
        matching_key = next((k for k in apple_keys if k["kid"] == kid), None)
        if not matching_key:
            # Invalidate cache and retry once
            global _apple_keys_cache
            _apple_keys_cache = None
            apple_keys = await _fetch_apple_public_keys()
            matching_key = next((k for k in apple_keys if k["kid"] == kid), None)
            if not matching_key:
                raise ValueError(f"No matching Apple public key for kid={kid}")

        # 3. Construct the public key and verify the token
        public_key = jwk.construct(matching_key)
        claims = jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
        )

        logger.info(
            f"Apple token verified — sub={claims.get('sub', '?')}, "
            f"email={claims.get('email', 'hidden')}"
        )
        return {
            "sub": claims["sub"],
            "email": claims.get("email"),
            "email_verified": claims.get("email_verified", True),
        }

    except JWTError as e:
        logger.error(f"Apple token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apple identity token verification failed",
        )
    except Exception as e:
        logger.error(f"Apple auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {e}",
        )
