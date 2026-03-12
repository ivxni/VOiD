"""
VOiD Backend — Database Models

Minimal schema optimized for privacy.
We store user accounts and usage statistics, never photos.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Integer,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    """
    User account linked to Apple Sign In.

    We deliberately collect minimal data:
    - apple_subject_id: The unique identifier Apple gives us for this user
    - email: Only if the user chooses to share it
    - No name, no birthday, no phone number
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    apple_subject_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)

    # ── Subscription ──────────────────────────────────────────────────────
    # Tier: 'free', 'pro', 'proplus'
    subscription_tier = Column(String(20), default="free", nullable=False)
    # Billing cycle: 'monthly', 'yearly', None (for free)
    billing_cycle = Column(String(20), nullable=True)
    # Status: 'active', 'expired', 'trial', 'cancelled', 'none'
    subscription_status = Column(String(50), default="none", nullable=False)
    # Apple original_transaction_id for receipt validation
    apple_transaction_id = Column(String(255), nullable=True)
    # When the current subscription period started
    subscription_started_at = Column(DateTime(timezone=True), nullable=True)
    # When the current subscription period expires
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Derived convenience field
    is_premium = Column(Boolean, default=False, nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login = Column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    usage_logs = relationship("UsageLog", back_populates="user", lazy="dynamic")

    @property
    def effective_tier(self) -> str:
        """Return the effective tier based on subscription status."""
        if self.subscription_status in ("active", "trial"):
            return self.subscription_tier or "free"
        return "free"

    @property
    def is_active_subscriber(self) -> bool:
        """True if user has an active paid subscription."""
        return (
            self.subscription_status in ("active", "trial")
            and self.subscription_tier in ("pro", "proplus")
        )

    def __repr__(self) -> str:
        return f"<User {self.id} tier={self.subscription_tier} status={self.subscription_status}>"


class UsageLog(Base):
    """
    Anonymous usage tracking.

    We track THAT a photo was cloaked, not THE photo.
    This helps us understand usage patterns and enforce free-tier limits.
    """

    __tablename__ = "usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type = Column(
        String(50), nullable=False
    )  # 'cloak_photo', 'save_gallery'
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="usage_logs")

    def __repr__(self) -> str:
        return f"<UsageLog {self.action_type} user={self.user_id}>"
