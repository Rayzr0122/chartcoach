"""
Courses Domain Version 1 API Routes.
Complies with Sections 26, 27, 28 of the Product State & New User Experience Specification.
Separates global Course catalog from user-specific Enrollment state.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.api.deps import get_current_user, get_optional_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.learning_dto import CourseCatalogItemDTO, EnrollmentDTO
from app.services.learning_service import LearningService

router = APIRouter(prefix="/api/v1/courses", tags=["courses-v1"])


@router.get("", response_model=List[CourseCatalogItemDTO])
def list_courses(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns the full curriculum catalog with user-specific state separated.
    If authenticated, returns whether the user is enrolled and their completion progress.
    """
    service = LearningService(db)
    return service.get_course_catalog(current_user)


@router.post("/{course_id}/enroll", response_model=EnrollmentDTO, status_code=status.HTTP_201_CREATED)
def enroll_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Explicitly enrolls the authenticated user into a specific course.
    Idempotent: if already enrolled, returns the existing active enrollment record.
    """
    service = LearningService(db)
    return service.enroll_course(current_user, course_id)


@router.get("/{course_id}", response_model=CourseCatalogItemDTO)
def get_course_detail(
    course_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns full course structure including modules and user state.
    """
    service = LearningService(db)
    catalog = service.get_course_catalog(current_user)
    course = next((c for c in catalog if c.id == course_id), None)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' was not found.",
        )
    return course
