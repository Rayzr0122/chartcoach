"""
Typed Dashboard DTO Contracts.
Complies with Section 33 and 68 of the Senior Engineering Specification.
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

from app.schemas.learning_dto import (
    ContinueLearningDTO,
    LearningSummaryDTO,
    CourseProgressDTO,
    LearningActivityDTO,
)
from app.services.market_service import MarketTickerItemDTO, MarketOverviewDTO


class UserSummaryDTO(BaseModel):
    id: str
    publicUserId: str
    fullName: str
    email: str
    role: str
    subscriptionPlan: str = "free"
    subscriptionStatus: str = "active"
    hasFaceEnrolled: bool


class DashboardAnnouncementDTO(BaseModel):
    id: str
    title: str
    date: str
    isHero: bool = False


class DashboardDTO(BaseModel):
    user: UserSummaryDTO
    continueLearning: Optional[ContinueLearningDTO] = None
    learningSummary: LearningSummaryDTO
    curriculumProgress: List[CourseProgressDTO] = Field(default_factory=list)
    recentActivities: List[LearningActivityDTO] = Field(default_factory=list)
    marketTicker: List[MarketTickerItemDTO] = Field(default_factory=list)
    marketOverview: MarketOverviewDTO
    announcements: List[DashboardAnnouncementDTO] = Field(default_factory=list)
    entitlements: Dict[str, Any] = Field(default_factory=dict)
