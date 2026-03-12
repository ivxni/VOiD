"""Quick script to check current users in the database."""
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT id, email, subscription_tier, subscription_status, "
            "billing_cycle, is_premium, subscription_started_at, subscription_expires_at "
            "FROM users"
        ))
        rows = result.fetchall()
        if not rows:
            print("No users found in database.")
        for r in rows:
            print(f"ID: {r[0]}")
            print(f"  email:               {r[1]}")
            print(f"  subscription_tier:    {r[2]}")
            print(f"  subscription_status:  {r[3]}")
            print(f"  billing_cycle:        {r[4]}")
            print(f"  is_premium:           {r[5]}")
            print(f"  started_at:           {r[6]}")
            print(f"  expires_at:           {r[7]}")
            print()

asyncio.run(check())
