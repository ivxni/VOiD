"""
VOiD Backend — API Schemas (Pydantic)

Request/Response models for all endpoints.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


# ──────────────────────────────────────
# Auth
# ──────────────────────────────────────

class AppleSignInRequest(BaseModel):
    """Request body for Apple Sign In."""
    identity_token: str = Field(
        ..., description="The identity token from Apple Sign In"
    )
    email: str | None = Field(
        None, description="Email (only provided on first sign-in if user allows)"
    )


class AuthResponse(BaseModel):
    """Response after successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ──────────────────────────────────────
# User
# ──────────────────────────────────────

class UserResponse(BaseModel):
    """Public user profile."""
    id: UUID
    email: str | None
    is_premium: bool
    subscription_tier: str
    subscription_status: str
    billing_cycle: str | None
    subscription_expires_at: datetime | None
    created_at: datetime
    last_login: datetime | None

    model_config = {"from_attributes": True}


# ──────────────────────────────────────
# Subscription
# ──────────────────────────────────────

class SubscriptionUpdateRequest(BaseModel):
    """Request to update a user's subscription (from App Store receipt validation)."""
    tier: str = Field(..., pattern="^(free|pro|proplus)$", description="Subscription tier")
    billing_cycle: str | None = Field(None, pattern="^(monthly|yearly)$", description="Billing cycle")
    apple_transaction_id: str | None = Field(None, description="Apple original transaction ID")


class SubscriptionResponse(BaseModel):
    """Current subscription details."""
    tier: str
    billing_cycle: str | None
    status: str
    is_premium: bool
    monthly_cloak_limit: int = Field(description="-1 = unlimited")
    remaining_cloaks: int = Field(description="-1 = unlimited, else remaining count")
    features: "TierFeaturesResponse"
    expires_at: datetime | None


class TierFeaturesResponse(BaseModel):
    """Feature gates for the user's current tier."""
    strength_levels: list[str]
    video_cloaking: bool
    batch_processing: bool
    auto_cloak_roll: bool
    export_resolution: str
    priority_processing: bool
    analytics_access: bool
    custom_profiles: bool


# ──────────────────────────────────────
# Usage
# ──────────────────────────────────────

class LogUsageRequest(BaseModel):
    """Log a usage event (e.g., photo/video cloaked)."""
    action_type: str = Field(
        ..., pattern="^(cloak_photo|cloak_video|save_gallery)$",
        description="Type of action performed"
    )


class UsageStatsResponse(BaseModel):
    """User's usage statistics."""
    total_cloaked: int
    total_saved: int
    this_month_cloaked: int
    free_remaining: int = Field(
        description="Remaining free cloaks this month (0 if premium)"
    )


# ──────────────────────────────────────
# Health
# ──────────────────────────────────────

class HealthResponse(BaseModel):
    """API health check response."""
    status: str = "ok"
    version: str
    service: str


# Rebuild forward references
AuthResponse.model_rebuild()
SubscriptionResponse.model_rebuild()
