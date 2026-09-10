"""
Courses API endpoints for ChartCoach LMS.
Handles retrieving course curricula, modules, lessons, and tracking user progress.
"""

from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database

from app.database import get_db
from app.api.deps import oauth2_scheme, AUTH_COOKIE_NAME
from app.core.security import decode_access_token
from app.models.user import User

router = APIRouter(prefix="/api/courses", tags=["courses"])


def get_optional_user(
    token_from_header: str | None = Depends(oauth2_scheme),
    token_from_cookie: str | None = None,
    db: Database = Depends(get_db),
) -> Optional[User]:
    token = token_from_header or token_from_cookie
    if not token:
        return None
    email = decode_access_token(token)
    if not email:
        return None
    user_doc = db.users.find_one({"email": email})
    return User.from_doc(user_doc)


@router.get("", response_model=List[Dict[str, Any]])
def list_courses(
    level: Optional[str] = Query(None, description="Filter by level (Beginner, Intermediate, Advanced)"),
    db: Database = Depends(get_db),
):
    """
    List all available courses in the curriculum.
    """
    query = {}
    if level:
        query["level"] = level

    courses_cursor = db.courses.find(query, {"_id": 0}).sort("levelNumber", 1)
    courses = list(courses_cursor)
    return courses


@router.get("/{course_id}", response_model=Dict[str, Any])
def get_course(course_id: str, db: Database = Depends(get_db)):
    """
    Get full course details, including all modules and lessons.
    """
    course = db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' was not found."
        )
    return course


@router.get("/{course_id}/lessons/{lesson_id}", response_model=Dict[str, Any])
def get_lesson(course_id: str, lesson_id: str, db: Database = Depends(get_db)):
    """
    Get a specific lesson within a course, including its content blocks,
    knowledge check question, key takeaways, and previous/next navigation links.
    """
    course = db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' was not found."
        )

    all_lessons = []
    parent_module = None
    target_lesson = None

    for module in course.get("modules", []):
        for lesson in module.get("lessons", []):
            all_lessons.append(lesson)
            if lesson.get("id") == lesson_id:
                target_lesson = lesson
                parent_module = {
                    "id": module.get("id"),
                    "title": module.get("title"),
                    "description": module.get("description"),
                }

    if not target_lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson '{lesson_id}' was not found in course '{course_id}'."
        )

    # Calculate prev and next
    lesson_index = next(
        (i for i, l in enumerate(all_lessons) if l.get("id") == lesson_id), -1
    )
    prev_lesson = (
        {
            "id": all_lessons[lesson_index - 1]["id"],
            "title": all_lessons[lesson_index - 1]["title"],
        }
        if lesson_index > 0
        else None
    )
    next_lesson = (
        {
            "id": all_lessons[lesson_index + 1]["id"],
            "title": all_lessons[lesson_index + 1]["title"],
        }
        if lesson_index < len(all_lessons) - 1
        else None
    )

    return {
        "course": {
            "id": course["id"],
            "title": course["title"],
            "level": course.get("level"),
            "levelName": course.get("levelName"),
        },
        "module": parent_module,
        "lesson": target_lesson,
        "prevLesson": prev_lesson,
        "nextLesson": next_lesson,
    }


@router.post("/{course_id}/lessons/{lesson_id}/complete")
def complete_lesson(
    course_id: str,
    lesson_id: str,
    user_email: Optional[str] = Query(None),
    db: Database = Depends(get_db),
):
    """
    Mark a lesson as completed for the given user email or guest.
    Records completion in MongoDB 'user_progress' collection.
    """
    email = user_email or "guest@chartcoach.com"
    progress = db.user_progress.find_one({"user_email": email, "course_id": course_id})
    completed_lessons = set(progress.get("completed_lessons", [])) if progress else set()
    completed_lessons.add(lesson_id)

    course = db.courses.find_one({"id": course_id})
    total_lessons = course.get("lessonCount", 1) if course else 1
    progress_percent = int(min(100, round((len(completed_lessons) / total_lessons) * 100)))

    db.user_progress.update_one(
        {"user_email": email, "course_id": course_id},
        {
            "$set": {
                "user_email": email,
                "course_id": course_id,
                "completed_lessons": list(completed_lessons),
                "last_lesson_id": lesson_id,
                "progress_percent": progress_percent,
            }
        },
        upsert=True
    )

    return {
        "status": "success",
        "courseId": course_id,
        "completedLessonId": lesson_id,
        "progressPercent": progress_percent,
        "totalCompleted": len(completed_lessons),
    }


@router.get("/progress/{course_id}")
def get_course_progress(
    course_id: str,
    user_email: Optional[str] = Query(None),
    db: Database = Depends(get_db),
):
    """
    Get user progress for a given course.
    """
    email = user_email or "guest@chartcoach.com"
    progress = db.user_progress.find_one({"user_email": email, "course_id": course_id}, {"_id": 0})
    if not progress:
        return {
            "user_email": email,
            "course_id": course_id,
            "completed_lessons": [],
            "progress_percent": 0,
        }
    return progress

