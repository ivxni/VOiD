"""
VOiD Backend — API Schemas (Pydantic)

Request/Response models for all endpoints.
"""

from datetime import datetime
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
    id: str
    email: str | None
    is_premium: bool
    subscription_status: str
    created_at: datetime
    last_login: datetime | None

    model_config = {"from_attributes": True}


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
