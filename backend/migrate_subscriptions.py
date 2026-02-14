"""
VOiD — Quick migration to add subscription columns to existing users table.

Run once:
    python migrate_subscriptions.py

This adds the new subscription columns (subscription_tier, billing_cycle,
apple_transaction_id, subscription_started_at, subscription_expires_at)
to the existing 'users' table without losing data.
"""

import asyncio
from sqlalchemy import text
from app.db.database import engine


MIGRATIONS = [
    # Add subscription_tier column (default 'free')
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free';
    """,
    # Add billing_cycle column
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);
    """,
    # Add apple_transaction_id column
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS apple_transaction_id VARCHAR(255);
    """,
    # Add subscription_started_at column
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
    """,
    # Add subscription_expires_at column
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
    """,
]


async def run_migration():
    print("VOiD — Running subscription migration...")
    async with engine.begin() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            try:
                await conn.execute(text(sql.strip()))
                print(f"  [{i}/{len(MIGRATIONS)}] OK")
            except Exception as e:
                print(f"  [{i}/{len(MIGRATIONS)}] Skipped (already exists or error): {e}")

    print("\nMigration complete! New columns added to users table.")
    print("Columns: subscription_tier, billing_cycle, apple_transaction_id,")
    print("         subscription_started_at, subscription_expires_at")


if __name__ == "__main__":
    asyncio.run(run_migration())
