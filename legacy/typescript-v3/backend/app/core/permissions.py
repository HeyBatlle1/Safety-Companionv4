"""
Centralized Role-Based Access Control (RBAC) Service.

Permission Model (per user request):
1. FIELD_WORKER: READ ONLY - Can view JHAs but cannot create/edit
2. FOREMAN / PROJECT_MANAGER: Full permissions - Can create, edit, view all
3. SAFETY_DIRECTOR: Same as above + Can view Employee Database (exclusive)

Features:
- Action-Level Security (can_create, can_edit)
- Row-Level Security (RLS) (filter_query)
- Employee DB visibility (Safety Director only)
"""

from typing import Optional, List
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.analysis import AnalysisHistory, JHAStatus


class PermissionService:
    # ==================== ACTION-LEVEL SECURITY ====================
    
    @staticmethod
    def can_create_jha(user: User) -> bool:
        """
        Can the user create new JHAs?
        Field Workers: NO (read only)
        Everyone else: YES
        """
        if user.role == UserRole.FIELD_WORKER.value:
            return False
        return True

    @staticmethod
    def can_create_eap(user: User) -> bool:
        """
        Can the user create/edit EAPs?
        Field Workers: NO (read-only)
        Foreman, PM, Safety Director: YES
        """
        # Field workers are read-only
        if user.role == UserRole.FIELD_WORKER.value:
            return False
        return True

    @staticmethod
    def can_view_jha(user: User, jha: AnalysisHistory) -> bool:
        """All users can view JHAs (per simplified model)"""
        return True

    @staticmethod
    def can_edit_jha(user: User, jha: AnalysisHistory) -> bool:
        """
        Can the user edit this JHA?
        Field Workers: NO (read only)
        Foreman/PM: YES (unless signed off)
        Safety Director: YES (can even edit signed off)
        """
        # Field workers are read-only
        if user.role == UserRole.FIELD_WORKER.value:
            return False
        
        # Signed Off JHAs - only Safety Director can edit
        if jha.status == JHAStatus.SIGNED_OFF.value:
            return user.role in [UserRole.SAFETY_DIRECTOR.value, UserRole.MASTER_ADMIN.value]

        # Everyone else (Foreman, PM, Safety Director) can edit
        return True

    @staticmethod
    def can_delete_jha(user: User, jha: AnalysisHistory) -> bool:
        """
        Can the user delete this JHA?
        Only Safety Director can delete
        """
        return user.role in [UserRole.SAFETY_DIRECTOR.value, UserRole.MASTER_ADMIN.value]

    @staticmethod
    def can_change_status(user: User, new_status: JHAStatus) -> bool:
        """Who can transition to what status?"""
        # Field workers can't change status
        if user.role == UserRole.FIELD_WORKER.value:
            return False
            
        if new_status == JHAStatus.SIGNED_OFF:
            # Only Safety Director can sign off
            return user.role in [UserRole.SAFETY_DIRECTOR.value, UserRole.MASTER_ADMIN.value]
        
        return True

    # ==================== EMPLOYEE DATABASE ACCESS ====================
    
    @staticmethod
    def can_view_employees(user: User) -> bool:
        """
        EXCLUSIVE: Only Safety Director can view the employee database.
        """
        return user.role in [UserRole.SAFETY_DIRECTOR.value, UserRole.MASTER_ADMIN.value]

    @staticmethod
    def can_manage_employees(user: User) -> bool:
        """
        Can the user create/edit/deactivate employees?
        Only Safety Director.
        """
        return user.role in [UserRole.SAFETY_DIRECTOR.value, UserRole.MASTER_ADMIN.value]

    # ==================== ROW-LEVEL SECURITY (RLS) ====================

    @staticmethod
    async def get_visible_jhas_query(user: User, session: AsyncSession):
        """
        ROW-LEVEL SECURITY (RLS)
        Returns a SQLAlchemy select query filtered by user permissions.
        
        Current model: Everyone sees all JHAs (simplified)
        """
        query = select(AnalysisHistory).order_by(AnalysisHistory.created_at.desc())
        
        # All users can see all JHAs in this simplified model
        return query
    
    # ==================== ROLE CHECKS ====================
    
    @staticmethod
    def is_read_only(user: User) -> bool:
        """Is the user in read-only mode?"""
        return user.role == UserRole.FIELD_WORKER.value
    
    @staticmethod
    def is_admin(user: User) -> bool:
        """Is the user an admin (Safety Director)?"""
        return user.role in [UserRole.SAFETY_DIRECTOR.value, UserRole.MASTER_ADMIN.value]
