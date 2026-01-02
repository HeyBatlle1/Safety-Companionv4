from pydantic import BaseModel, Field, ConfigDict

class DashboardStats(BaseModel):
    jhas_this_week: int = Field(..., alias="jhasThisWeek")
    compliance_score: int = Field(..., alias="complianceScore")
    active_alerts: int = Field(..., alias="activeAlerts")
    team_size: int = Field(..., alias="teamSize")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "jhasThisWeek": 12,
                "complianceScore": 85,
                "activeAlerts": 3,
                "teamSize": 24
            }
        }
    )
