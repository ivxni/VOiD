"""
VOiD Backend — Subscription Endpoints

Manages subscription tiers, feature gates, and usage limits.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, UsageLog
from app.api.v1.users import get_current_user
from app.api.v1.schemas import (
    SubscriptionUpdateRequest,
    SubscriptionResponse,
    TierFeaturesResponse,
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


# ── Tier Configuration ────────────────────────────────────────────────────────

TIER_CONFIG = {
    "free": {
        "monthly_cloak_limit": 3,
        "strength_levels": ["standard"],
        "video_cloaking": False,
        "batch_processing": False,
        "auto_cloak_roll": False,
        "export_resolution": "standard",
        "priority_processing": False,
        "analytics_access": False,
        "custom_profiles": False,
    },
    "pro": {
        "monthly_cloak_limit": -1,
        "strength_levels": ["subtle", "standard", "maximum"],
        "video_cloaking": False,
        "batch_processing": False,
        "auto_cloak_roll": False,
        "export_resolution": "full",
        "priority_processing": True,
        "analytics_access": True,
        "custom_profiles": False,
    },
    "proplus": {
        "monthly_cloak_limit": -1,
        "strength_levels": ["subtle", "standard", "maximum"],
        "video_cloaking": True,
        "batch_processing": True,
        "auto_cloak_roll": True,
        "export_resolution": "raw",
        "priority_processing": True,
        "analytics_access": True,
        "custom_profiles": True,
    },
}


def get_tier_features(tier: str) -> TierFeaturesResponse:
    """Get the feature set for a given tier."""
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    return TierFeaturesResponse(
        strength_levels=config["strength_levels"],
        video_cloaking=config["video_cloaking"],
        batch_processing=config["batch_processing"],
        auto_cloak_roll=config["auto_cloak_roll"],
        export_resolution=config["export_resolution"],
        priority_processing=config["priority_processing"],
        analytics_access=config["analytics_access"],
        custom_profiles=config["custom_profiles"],
    )


def get_cloak_limit(tier: str) -> int:
    """Return monthly cloak limit for a tier. -1 = unlimited."""
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    return config["monthly_cloak_limit"]


async def get_remaining_cloaks(user: User, db: AsyncSession) -> int:
    """
    Calculate remaining cloaks for the current month.
    Returns -1 for unlimited tiers.
    """
    tier = user.effective_tier
    limit = get_cloak_limit(tier)

    if limit == -1:
        return -1

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(func.count(UsageLog.id)).where(
            UsageLog.user_id == user.id,
            UsageLog.action_type == "cloak_photo",
            UsageLog.timestamp >= month_start,
        )
    )
    used = result.scalar() or 0
    return max(0, limit - used)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current user's subscription details, including tier,
    feature gates, and remaining cloaks.
    """
    tier = user.effective_tier
    remaining = await get_remaining_cloaks(user, db)
    features = get_tier_features(tier)

    return SubscriptionResponse(
        tier=tier,
        billing_cycle=user.billing_cycle,
        status=user.subscription_status,
        is_premium=user.is_active_subscriber,
        monthly_cloak_limit=get_cloak_limit(tier),
        remaining_cloaks=remaining,
        features=features,
        expires_at=user.subscription_expires_at,
    )


@router.post("/update", response_model=SubscriptionResponse)
async def update_subscription(
    body: SubscriptionUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's subscription after App Store receipt validation.

    In production, this would be called by the server-side receipt
    validation webhook. For development, it can be called directly.
    """
    now = datetime.now(timezone.utc)

    user.subscription_tier = body.tier
    user.billing_cycle = body.billing_cycle if body.tier != "free" else None
    user.subscription_status = "active" if body.tier != "free" else "none"
    user.is_premium = body.tier in ("pro", "proplus")

    if body.apple_transaction_id:
        user.apple_transaction_id = body.apple_transaction_id

    if body.tier != "free":
        user.subscription_started_at = now
        # Set expiry based on billing cycle
        if body.billing_cycle == "yearly":
            user.subscription_expires_at = now + timedelta(days=365)
        else:
            user.subscription_expires_at = now + timedelta(days=30)
    else:
        user.subscription_started_at = None
        user.subscription_expires_at = None

    await db.commit()
    await db.refresh(user)

    tier = user.effective_tier
    remaining = await get_remaining_cloaks(user, db)
    features = get_tier_features(tier)

    return SubscriptionResponse(
        tier=tier,
        billing_cycle=user.billing_cycle,
        status=user.subscription_status,
        is_premium=user.is_active_subscriber,
        monthly_cloak_limit=get_cloak_limit(tier),
        remaining_cloaks=remaining,
        features=features,
        expires_at=user.subscription_expires_at,
    )


@router.post("/cancel")
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel the user's subscription.
    The subscription remains active until the current period expires.
    """
    if user.subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel",
        )

    user.subscription_status = "cancelled"
    await db.commit()

    return {
        "status": "cancelled",
        "message": "Subscription cancelled. You'll retain access until the end of your billing period.",
        "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
    }


@router.post("/restore")
async def restore_purchases(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Restore purchases — re-validates with Apple and updates subscription.
    In development mode, this returns the current state.
    """
    # In production, this would call Apple's /verifyReceipt endpoint
    # For now, return current subscription state
    tier = user.effective_tier
    remaining = await get_remaining_cloaks(user, db)
    features = get_tier_features(tier)

    return SubscriptionResponse(
        tier=tier,
        billing_cycle=user.billing_cycle,
        status=user.subscription_status,
        is_premium=user.is_active_subscriber,
        monthly_cloak_limit=get_cloak_limit(tier),
        remaining_cloaks=remaining,
        features=features,
        expires_at=user.subscription_expires_at,
    )
