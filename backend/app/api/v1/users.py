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
    # Import here to avoid circular dependency
    from app.api.v1.subscriptions import get_cloak_limit, get_remaining_cloaks

    if body.action_type in ("cloak_photo", "cloak_video"):
        tier = user.effective_tier
        limit = get_cloak_limit(tier)

        if limit != -1:
            remaining = await get_remaining_cloaks(user, db)
            if remaining <= 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Free tier limit reached ({limit} cloaks/month). Upgrade to Pro for unlimited.",
                )

        # Video cloaking requires Pro+
        if body.action_type == "cloak_video":
            from app.api.v1.subscriptions import TIER_CONFIG
            config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
            if not config["video_cloaking"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Video cloaking requires Pro+. Upgrade to unlock this feature.",
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
    from app.api.v1.subscriptions import get_cloak_limit, get_remaining_cloaks

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

    tier = user.effective_tier
    remaining = await get_remaining_cloaks(user, db)

    return UsageStatsResponse(
        total_cloaked=total_cloaked,
        total_saved=total_saved,
        this_month_cloaked=this_month,
        free_remaining=remaining if remaining != -1 else 0,
    )
