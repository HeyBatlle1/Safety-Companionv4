from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import List

from app.core.deps import get_db
from app.core.auth import get_current_user
from app.models.analysis import AnalysisHistory
from app.models.user import User
from app.schemas.dashboard import DashboardStats

router = APIRouter()

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics including:
    - JHAs created this week
    - Compliance score (average of all time)
    - Active alerts (high/critical urgency JHAs in last 24h)
    - Team size (total users)

    Requires authentication.
    """

    # JHAs This Week (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    jhas_query = select(func.count()).select_from(AnalysisHistory).where(
        AnalysisHistory.created_at >= week_ago
    )
    jhas_result = await db.execute(jhas_query)
    jhas_this_week = jhas_result.scalar_one()

    # Compliance Score (Average)
    # Using compliance_score if available, otherwise defaulting to calculation or 0
    compliance_query = select(func.avg(AnalysisHistory.compliance_score)).where(
        AnalysisHistory.compliance_score != None
    )
    compliance_result = await db.execute(compliance_query)
    compliance_score_avg = compliance_result.scalar_one_or_none()

    if compliance_score_avg is None:
        compliance_score = 0
    else:
        compliance_score = int(compliance_score_avg)

    # Active Alerts
    # Counting High/Critical urgency JHAs from last 24 hours
    day_ago = datetime.utcnow() - timedelta(days=1)
    alerts_query = select(func.count()).select_from(AnalysisHistory).where(
        and_(
            AnalysisHistory.urgency_level.in_(['high', 'critical']),
            AnalysisHistory.created_at >= day_ago
        )
    )
    alerts_result = await db.execute(alerts_query)
    active_alerts = alerts_result.scalar_one()

    # Team Size
    team_query = select(func.count()).select_from(User)
    team_result = await db.execute(team_query)
    team_size = team_result.scalar_one()

    return DashboardStats(
        jhas_this_week=jhas_this_week,
        compliance_score=compliance_score,
        active_alerts=active_alerts,
        team_size=team_size
    )
