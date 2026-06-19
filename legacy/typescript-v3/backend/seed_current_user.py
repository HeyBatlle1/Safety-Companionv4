
import asyncio
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User, UserRole
from sqlalchemy import select

async def seed_user():
    clerk_id = "user_37j6GtA5eQw7hth8QBt9etmlABn"
    email = "admin@example.com" # Placeholder, Clerk will provide the real one on next login if we synced
    
    async with SessionLocal() as db:
        # Check if user exists
        result = await db.execute(select(User).where(User.clerk_id == clerk_id))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {clerk_id} already exists.")
            return

        print(f"Seeding user {clerk_id}...")
        new_user = User(
            clerk_id=clerk_id,
            email=email,
            name="Admin User",
            password="clerk_authenticated", # Dummy password to satisfy NOT NULL
            role=UserRole.MASTER_ADMIN.value,
            is_active=True
        )
        db.add(new_user)
        await db.commit()
        print("✅ User seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_user())
