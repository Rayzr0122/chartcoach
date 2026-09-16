"""
Learning Domain Version 1 API Routes.
Complies with Section 8, 10, 13, 14, 15, 67 of the Senior Engineering Specification.
Strictly derives identity from the authenticated session.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.learning_dto import (
    ContinueLearningDTO,
    LearningSummaryDTO,
    CourseProgressDTO,
    LearningActivityDTO,
    LessonProgressIn,
    LessonProgressOut,
    LessonDetailDTO,
)
from app.services.learning_service import LearningService

router = APIRouter(prefix="/api/v1/learning", tags=["learning-v1"])


@router.get("/continue", response_model=ContinueLearningDTO)
def get_continue_learning(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns the user's primary continue learning hero payload.
    Determined via server-side business rules from MongoDB enrollments and progress.
    """
    service = LearningService(db)
    return service.get_continue_learning(current_user)


@router.get("/summary", response_model=LearningSummaryDTO)
def get_learning_summary(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns verified aggregate statistics (lessons completed, streak, study minutes).
    """
    service = LearningService(db)
    return service.get_learning_summary(current_user)


@router.get("/progress", response_model=List[CourseProgressDTO])
def get_curriculum_progress(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns stage-by-stage progress for all 5 technical trading courses.
    """
    service = LearningService(db)
    return service.get_curriculum_progress(current_user)


@router.get("/activities", response_model=List[LearningActivityDTO])
def get_recent_activities(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns the user's recent learning activity event milestones.
    """
    service = LearningService(db)
    return service.get_recent_activities(current_user)


@router.get("/courses/{course_id}/lessons/{lesson_id}", response_model=LessonDetailDTO)
def get_lesson_detail(
    course_id: str,
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns full lesson content, video streaming playback metadata, and user's saved position.
    Protected server-side by capability entitlement.
    """
    from fastapi import HTTPException
    from app.services.entitlement_service import EntitlementService

    entitlements = EntitlementService(db)
    if not entitlements.is_entitled(current_user, f"course:{course_id}"):
        req = entitlements.get_required_plan(f"course:{course_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "COURSE_LOCKED",
                "message": f"This lesson is part of a locked course. Available with {req['requiredPlanName']}.",
                "requiredPlan": req["requiredPlan"],
                "requiredPlanName": req["requiredPlanName"],
            },
        )

    service = LearningService(db)
    return service.get_lesson_detail(current_user, course_id, lesson_id)


@router.api_route(
    "/courses/{course_id}/lessons/{lesson_id}/progress",
    methods=["POST", "PUT"],
    response_model=LessonProgressOut,
    status_code=status.HTTP_200_OK,
)
def update_lesson_progress(
    course_id: str,
    lesson_id: str,
    data: LessonProgressIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Synchronizes playback position, watched seconds, and completion state.
    Debounced by frontend every 10-15 seconds.
    """
    service = LearningService(db)
    return service.update_lesson_progress(current_user, course_id, lesson_id, data)


@router.post(
    "/courses/{course_id}/lessons/{lesson_id}/complete",
    response_model=LessonProgressOut,
    status_code=status.HTTP_200_OK,
)
def complete_lesson(
    course_id: str,
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Marks lesson 100% completed and logs completion event.
    """
    service = LearningService(db)
    return service.complete_lesson(current_user, course_id, lesson_id)
