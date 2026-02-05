"""
Clerk authentication middleware for FastAPI backend.
Verifies JWT tokens from Clerk and retrieves user from database.
"""

from functools import wraps
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
import httpx
import jwt
from jwt import PyJWKClient

from app.core.config import get_settings
from app.core.deps import get_db
from app.models.user import User, UserRole

settings = get_settings()

# Expected JWT issuer for audience validation
CLERK_ISSUER = "https://usefull-catfish-47.clerk.accounts.dev"

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer(auto_error=False)

# Clerk JWKS endpoint for token verification (from env or default)
CLERK_JWKS_URL = settings.clerk_jwks_url or "https://usefull-catfish-47.clerk.accounts.dev/.well-known/jwks.json"


class ClerkAuth:
    """Clerk authentication helper using JWKS"""

    _jwks_client = None

    @classmethod
    def get_jwks_client(cls):
        """Get or create JWKS client (cached)"""
        if cls._jwks_client is None:
            cls._jwks_client = PyJWKClient(CLERK_JWKS_URL)
        return cls._jwks_client

    @classmethod
    def verify_token(cls, token: str) -> dict:
        """Verify Clerk JWT token using JWKS (fetches public key dynamically)"""
        try:
            # Get the signing key from JWKS
            jwks_client = cls.get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            # Decode and verify with issuer validation
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=CLERK_ISSUER,
                options={
                    "verify_aud": False,  # Clerk doesn't always set aud
                    "verify_iss": True,   # Verify token is from our Clerk instance
                }
            )

            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from Clerk token.
    Auto-creates user on first login with safety_director role.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Verify the JWT token
    payload = ClerkAuth.verify_token(credentials.credentials)
    clerk_id = payload.get("sub")
    
    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: no subject"
        )
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.clerk_id == clerk_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # AUTO-CREATE USER ON FIRST LOGIN
        # Extract email from Clerk token if available
        email = payload.get("email") or payload.get("primary_email_address") or f"{clerk_id}@clerk.user"
        name = payload.get("name") or payload.get("first_name") or "New User"

        # Check user count atomically to prevent race condition
        # Use COUNT(*) instead of loading all users
        count_result = await db.execute(select(func.count()).select_from(User))
        user_count = count_result.scalar() or 0

        # First user gets safety_director (root), others get field_worker
        # NOTE: There's still a small race window, but IntegrityError handles it
        default_role = UserRole.SAFETY_DIRECTOR.value if user_count == 0 else UserRole.FIELD_WORKER.value

        try:
            user = User(
                clerk_id=clerk_id,
                email=email,
                name=name,
                role=default_role,
                password="clerk_managed",  # Not used, Clerk handles auth
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"[AUTH] Auto-created user: {email} with role {default_role}")
        except IntegrityError:
            # Race condition: another request created the user first
            await db.rollback()
            result = await db.execute(
                select(User).where(User.clerk_id == clerk_id)
            )
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create or retrieve user"
                )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get the current user if authenticated, or None if not.
    Useful for endpoints that work differently for authenticated users.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(*allowed_roles: UserRole):
    """
    Dependency that requires user to have one of the specified roles.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_role(UserRole.MASTER_ADMIN, UserRole.SAFETY_DIRECTOR))):
            ...
    """
    async def role_checker(
        user: User = Depends(get_current_user)
    ) -> User:
        if user.role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}"
            )
        return user
    
    return role_checker


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require user to be admin (master_admin or safety_director)"""
    if not user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user
