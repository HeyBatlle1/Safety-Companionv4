
from typing import Optional, Any
from app.models.user import User, UserRole
from app.models.analysis import AnalysisHistory

class Permissions:
    """
    Centralized RBAC Logic
    """

    @staticmethod
    def is_tier_1(user: User) -> bool:
        """Root (Master Admin) and Safety Director"""
        return user.role in [UserRole.MASTER_ADMIN.value, UserRole.SAFETY_DIRECTOR.value]

    @staticmethod
    def is_tier_2(user: User) -> bool:
        """Project Manager"""
        return user.role == UserRole.PROJECT_MANAGER.value

    @staticmethod
    def is_tier_3(user: User) -> bool:
        """Foreman, Field Worker, Fabricator"""
        return user.role in [UserRole.FOREMAN.value, UserRole.FIELD_WORKER.value]

    @classmethod
    def can_create_jha(cls, user: User) -> bool:
        """All tiers can create JHA"""
        return True

    @classmethod
    def can_view_jha(cls, user: User, jha: AnalysisHistory) -> bool:
        """
        All Tiers can view all JHAs.
        """
        return True

    @classmethod
    def can_edit_jha(cls, user: User, jha: AnalysisHistory) -> bool:
        """
        Tier 1: Edit Any
        Tier 2: Edit Any (Operational Management)
        Tier 3: Edit Own Only
        """
        if cls.is_tier_1(user) or cls.is_tier_2(user):
            return True
        return str(jha.user_id) == str(user.id)

    @classmethod
    def can_delete_jha(cls, user: User, jha: AnalysisHistory) -> bool:
        """
        Tier 1: Delete Any
        Tier 2: No Delete
        Tier 3: No Delete
        """
        return cls.is_tier_1(user)

    @classmethod
    def can_view_executive_summary(cls, user: User, jha: AnalysisHistory) -> bool:
        """
        Tier 3 cannot read executive summaries if they are not the author.
        Tier 1 & 2 can always read.
        """
        if cls.is_tier_1(user) or cls.is_tier_2(user):
            return True
        return str(jha.user_id) == str(user.id)

    @classmethod
    def get_jha_filter(cls, user: User):
        """
        Returns SQLAlchemy filter condition for list queries.
        Return None means "No Filter" (See All).
        """
        # All tiers see all JHAs now
        return None
