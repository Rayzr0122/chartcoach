"""
Dashboard Version 1 API Routes.
Enforces session-derived identity, returns typed DashboardDTO.
"""

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.dashboard_dto import DashboardDTO
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard-v1"])


@router.get("", response_model=DashboardDTO)
def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns the complete aggregated dashboard for the authenticated user.
    All metrics and progress are derived strictly from MongoDB.
    """
    service = DashboardService(db)
    return service.get_dashboard(current_user)
