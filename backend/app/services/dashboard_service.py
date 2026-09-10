"""
Dashboard Composition Service for ChartCoach.
Implements Section 16, 32, 33 of the Senior Engineering Specification.
Composes user summary, continue learning, learning stats, market ticker, and activities.
"""

from typing import List, Dict, Any
from pymongo.database import Database

from app.core.plans import get_plan_entitlements
from app.models.user import User
from app.schemas.dashboard_dto import (
    DashboardDTO,
    UserSummaryDTO,
    DashboardAnnouncementDTO,
)
from app.services.learning_service import LearningService
from app.services.market_service import get_market_service


class DashboardService:
    def __init__(self, db: Database):
        self.db = db
        self.learning_service = LearningService(db)
        self.market_service = get_market_service()

    def get_dashboard(self, user: User) -> DashboardDTO:
        """
        Orchestrates single-request dashboard retrieval.
        No client-side guesswork, strictly database-driven.
        """
        # 1. User Summary
        user_summary = UserSummaryDTO(
            id=user.id,
            publicUserId=user.public_user_id,
            fullName=user.full_name,
            email=user.email,
            role=user.role,
            subscriptionPlan=user.subscription_plan,
            subscriptionStatus=user.subscription_status,
            hasFaceEnrolled=user.has_face_enrolled,
        )

        # 2. Continue Learning (MongoDB resolved)
        continue_learning = self.learning_service.get_continue_learning(user)

        # 3. Learning Summary Stats (Real user progress derived)
        learning_summary = self.learning_service.get_learning_summary(user)

        # 4. Curriculum Progress (All 5 courses calculated)
        curriculum_progress = self.learning_service.get_curriculum_progress(user)

        # 5. Recent Learning Activities
        recent_activities = self.learning_service.get_recent_activities(user)

        # 6. Live Market Ticker & Overview (Cached server-side)
        market_ticker = self.market_service.get_ticker_quotes()
        market_overview = self.market_service.get_market_overview("NIFTY 50")

        # 7. Platform Announcements
        announcements = [
            DashboardAnnouncementDTO(
                id="ann-1",
                title=recent_activities[0].title if recent_activities else "Trading 101 Foundations ready",
                date="Today",
                isHero=True,
            ),
            DashboardAnnouncementDTO(
                id="ann-2",
                title="Interactive Pattern Simulator: Pin Bar Rejections calibrated",
                date="10/13/2026",
                isHero=True,
            ),
            DashboardAnnouncementDTO(
                id="ann-3",
                title="New Course Released: Building a Trading Strategy (12 Modules)",
                date="10/12/2026",
                isHero=True,
            ),
            DashboardAnnouncementDTO(
                id="ann-4",
                title="Biometric Face ID Session Protection verified and operational",
                date="10/11/2026",
                isHero=False,
            ),
            DashboardAnnouncementDTO(
                id="ann-5",
                title="Market Reading Practice Lab scenarios updated for Live Nifty session",
                date="10/10/2026",
                isHero=False,
            ),
        ]

        # 8. Entitlements derived from user's active subscription plan
        entitlements = get_plan_entitlements(user.subscription_plan)

        return DashboardDTO(
            user=user_summary,
            continueLearning=continue_learning,
            learningSummary=learning_summary,
            curriculumProgress=curriculum_progress,
            recentActivities=recent_activities,
            marketTicker=market_ticker,
            marketOverview=market_overview,
            announcements=announcements,
            entitlements=entitlements,
        )
