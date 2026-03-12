"""
VOiD Backend — Auth Endpoints

Handles Apple Sign In authentication flow.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User
from app.core.security import (
    create_access_token,
    verify_apple_identity_token,
)
from app.api.v1.schemas import AppleSignInRequest, AuthResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/apple", response_model=AuthResponse)
async def apple_sign_in(
    body: AppleSignInRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with Apple Sign In.

    Flow:
    1. Verify Apple's identity_token
    2. Find or create user by apple_subject_id
    3. Issue our own JWT access token
    """
    # Verify the Apple identity token
    apple_claims = await verify_apple_identity_token(body.identity_token)
    apple_subject_id = apple_claims["sub"]

    # Find existing user or create new one
    result = await db.execute(
        select(User).where(User.apple_subject_id == apple_subject_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        # New user — create account (starts on free tier)
        user = User(
            apple_subject_id=apple_subject_id,
            email=body.email or apple_claims.get("email"),
            is_premium=False,
            subscription_tier="free",
            subscription_status="none",
            billing_cycle=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Existing user — update last login
        user.last_login = datetime.now(timezone.utc)
        # Update email if newly provided
        if body.email and not user.email:
            user.email = body.email
        await db.commit()
        await db.refresh(user)

    # Create our access token
    access_token = create_access_token(subject=str(user.id))

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )
