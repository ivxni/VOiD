"""
VOiD Backend — User Endpoints

Profile management and usage tracking.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, UsageLog
from app.core.security import verify_access_token
from app.api.v1.schemas import (
    UserResponse,
    LogUsageRequest,
    UsageStatsResponse,
)

router = APIRouter(prefix="/users", tags=["Users"])

# Tier limits (monthly cloaks)
TIER_LIMITS = {
    'none': 3,       # Free tier
    'free': 3,
    'pro': -1,       # Unlimited
    'proplus': -1,   # Unlimited
    'active': -1,    # Unlimited (legacy)
    'premium': -1,   # Unlimited (legacy)
    'lifetime': -1,  # Unlimited
}


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: Extract and validate user from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    token = authorization[7:]
    user_id = verify_access_token(token)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("/me", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return UserResponse.model_validate(user)


@router.post("/me/usage")
async def log_usage(
    body: LogUsageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Log a usage event.

    Enforces free-tier limits (3 cloaks/month for non-premium users).
    """
    if body.action_type == "cloak_photo":
        # Check tier limit
        tier_limit = TIER_LIMITS.get(user.subscription_status, 3)

        if tier_limit != -1:
            now = datetime.now(timezone.utc)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            result = await db.execute(
                select(func.count(UsageLog.id)).where(
                    UsageLog.user_id == user.id,
                    UsageLog.action_type == "cloak_photo",
                    UsageLog.timestamp >= month_start,
                )
            )
            count = result.scalar() or 0

            if count >= tier_limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Free tier limit reached ({tier_limit} cloaks/month). Upgrade to Premium or Pro for unlimited.",
                )

    log = UsageLog(
        user_id=user.id,
        action_type=body.action_type,
    )
    db.add(log)
    await db.commit()

    return {"status": "logged"}


@router.get("/me/stats", response_model=UsageStatsResponse)
async def get_usage_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get usage statistics for the current user."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total cloaked
    result = await db.execute(
        select(func.count(UsageLog.id)).where(
            UsageLog.user_id == user.id,
            UsageLog.action_type == "cloak_photo",
        )
    )
    total_cloaked = result.scalar() or 0

    # Total saved
    result = await db.execute(
        select(func.count(UsageLog.id)).where(
            UsageLog.user_id == user.id,
            UsageLog.action_type == "save_gallery",
        )
    )
    total_saved = result.scalar() or 0

    # This month cloaked
    result = await db.execute(
        select(func.count(UsageLog.id)).where(
            UsageLog.user_id == user.id,
            UsageLog.action_type == "cloak_photo",
            UsageLog.timestamp >= month_start,
        )
    )
    this_month = result.scalar() or 0

    tier_limit = TIER_LIMITS.get(user.subscription_status, 3)
    free_remaining = max(0, tier_limit - this_month) if tier_limit != -1 else 0

    return UsageStatsResponse(
        total_cloaked=total_cloaked,
        total_saved=total_saved,
        this_month_cloaked=this_month,
        free_remaining=free_remaining,
    )
