"""
Clerk authentication middleware for FastAPI backend.
Verifies JWT tokens from Clerk and retrieves user from database.
"""

from functools import wraps
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import jwt
from jwt import PyJWKClient

from app.core.config import get_settings
from app.core.deps import get_db
from app.models.user import User, UserRole

settings = get_settings()

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer(auto_error=False)

# Clerk JWKS endpoint for token verification
CLERK_JWKS_URL = settings.clerk_jwks_url


class ClerkAuth:
    """Clerk authentication helper"""
    
    _jwk_client: Optional[PyJWKClient] = None
    
    @classmethod
    def get_jwk_client(cls) -> PyJWKClient:
        """Get or create JWKS client for Clerk"""
        if cls._jwk_client is None:
            cls._jwk_client = PyJWKClient(CLERK_JWKS_URL)
        return cls._jwk_client
    
    @classmethod
    def verify_token(cls, token: str) -> dict:
        """Verify Clerk JWT token and return claims"""
        try:
            jwk_client = cls.get_jwk_client()
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            
            decode_options = {"verify_aud": False}
            kwargs = {}
            if settings.clerk_audience:
                decode_options["verify_aud"] = True
                kwargs["audience"] = settings.clerk_audience

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options=decode_options,
                **kwargs
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


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from Clerk token.
    
    Raises HTTPException if:
    - No token provided
    - Token is invalid
    - User not found in database
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
        # User authenticated with Clerk but not in our DB
        # This happens on first login - could auto-create here
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found in system. Please contact administrator."
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
