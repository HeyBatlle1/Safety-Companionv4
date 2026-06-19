"""
Users API Endpoints

RBAC-protected endpoints for user management.
Filters data based on user's role and hierarchy.
"""

from typing import List, Optional, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User, UserRole, Site, SiteAssignment


router = APIRouter(prefix="/users", tags=["Users"])


# ============ Schemas ============

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    phone: Optional[str]
    department: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    certifications: List[Dict] = []
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str = "field_worker"
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    reports_to: Optional[str] = None
    assigned_project_manager: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    # Role changes require admin - handled separately
    role: Optional[str] = None
    reports_to: Optional[str] = None
    assigned_project_manager: Optional[str] = None


# ============ Endpoints ============

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get the currently authenticated user's info"""
    return current_user


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile information"""
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.get("/me/sites")
async def get_my_sites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get sites assigned to the current user"""
    result = await db.execute(
        select(Site)
        .join(SiteAssignment, Site.id == SiteAssignment.site_id)
        .where(SiteAssignment.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List ALL employees in the system.
    
    RESTRICTED: Only Safety Director can view employee database.
    """
    from app.core.permissions import PermissionService
    
    if not PermissionService.can_view_employees(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Safety Director can access employee database"
        )
    
    # Safety Director sees all active users
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.name)
    )
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific user (permission check applied)"""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permission
    if not current_user.can_view_user(target_user):
        raise HTTPException(status_code=403, detail="Cannot view this user")
    
    return target_user


@router.post("", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (admin only)"""
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    valid_roles = [r.value for r in UserRole]
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        phone=user_data.phone,
        department=user_data.department,
        reports_to=user_data.reports_to,
        assigned_project_manager=user_data.assigned_project_manager
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a user (permission check applied)"""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permission
    if not current_user.can_manage_user(target_user):
        raise HTTPException(status_code=403, detail="Cannot modify this user")
    
    # Role/hierarchy changes require admin
    if user_data.role or user_data.reports_to or user_data.assigned_project_manager:
        if not current_user.is_admin():
            raise HTTPException(
                status_code=403, 
                detail="Only admins can change role or hierarchy"
            )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target_user, field, value)
    
    await db.commit()
    await db.refresh(target_user)
    
    return target_user


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a user (admin only) - soft delete"""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot deactivate self
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    target_user.is_active = False
    await db.commit()
    
    return {"message": f"User {target_user.email} deactivated"}
