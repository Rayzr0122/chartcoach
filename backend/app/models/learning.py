"""
Learning Domain Models for MongoDB.
Entities: Enrollment, LessonProgress, LearningActivity.
"""

from datetime import datetime, timezone
from typing import Any, Optional, Dict, List
from bson import ObjectId


class Enrollment:
    """Represents a user's active enrollment in a course."""

    def __init__(
        self,
        user_id: ObjectId | str,
        public_user_id: str,
        course_id: str,
        status: str = "active",
        progress_percentage: int = 0,
        last_accessed_lesson_id: Optional[str] = None,
        last_accessed_at: Optional[datetime] = None,
        enrolled_at: Optional[datetime] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.public_user_id = public_user_id
        self.course_id = course_id
        self.status = status  # active, completed, paused
        self.progress_percentage = progress_percentage
        self.last_accessed_lesson_id = last_accessed_lesson_id
        self.last_accessed_at = last_accessed_at or datetime.now(timezone.utc)
        self.enrolled_at = enrolled_at or datetime.now(timezone.utc)
        self.started_at = started_at
        self.completed_at = completed_at

    @classmethod
    def from_doc(cls, doc: dict[str, Any] | None) -> Optional["Enrollment"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            public_user_id=doc.get("public_user_id", ""),
            course_id=doc.get("course_id", ""),
            status=doc.get("status", "active"),
            progress_percentage=doc.get("progress_percentage", 0),
            last_accessed_lesson_id=doc.get("last_accessed_lesson_id"),
            last_accessed_at=doc.get("last_accessed_at"),
            enrolled_at=doc.get("enrolled_at"),
            started_at=doc.get("started_at"),
            completed_at=doc.get("completed_at"),
        )

    def to_doc(self) -> dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "public_user_id": self.public_user_id,
            "course_id": self.course_id,
            "status": self.status,
            "progress_percentage": self.progress_percentage,
            "last_accessed_lesson_id": self.last_accessed_lesson_id,
            "last_accessed_at": self.last_accessed_at,
            "enrolled_at": self.enrolled_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class LessonProgress:
    """Fine-grained tracking of a user's progress through a specific lesson."""

    def __init__(
        self,
        user_id: ObjectId | str,
        public_user_id: str,
        lesson_id: str,
        course_id: str,
        watched_seconds: int = 0,
        duration_seconds: int = 0,
        progress_percentage: int = 0,
        last_position_seconds: int = 0,
        completed: bool = False,
        first_watched_at: Optional[datetime] = None,
        last_watched_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.public_user_id = public_user_id
        self.lesson_id = lesson_id
        self.course_id = course_id
        self.watched_seconds = watched_seconds
        self.duration_seconds = duration_seconds
        self.progress_percentage = progress_percentage
        self.last_position_seconds = last_position_seconds
        self.completed = completed
        self.first_watched_at = first_watched_at or datetime.now(timezone.utc)
        self.last_watched_at = last_watched_at or datetime.now(timezone.utc)
        self.completed_at = completed_at

    @classmethod
    def from_doc(cls, doc: dict[str, Any] | None) -> Optional["LessonProgress"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            public_user_id=doc.get("public_user_id", ""),
            lesson_id=doc.get("lesson_id", ""),
            course_id=doc.get("course_id", ""),
            watched_seconds=doc.get("watched_seconds", 0),
            duration_seconds=doc.get("duration_seconds", 0),
            progress_percentage=doc.get("progress_percentage", 0),
            last_position_seconds=doc.get("last_position_seconds", 0),
            completed=doc.get("completed", False),
            first_watched_at=doc.get("first_watched_at"),
            last_watched_at=doc.get("last_watched_at"),
            completed_at=doc.get("completed_at"),
        )

    def to_doc(self) -> dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "public_user_id": self.public_user_id,
            "lesson_id": self.lesson_id,
            "course_id": self.course_id,
            "watched_seconds": self.watched_seconds,
            "duration_seconds": self.duration_seconds,
            "progress_percentage": self.progress_percentage,
            "last_position_seconds": self.last_position_seconds,
            "completed": self.completed,
            "first_watched_at": self.first_watched_at,
            "last_watched_at": self.last_watched_at,
            "completed_at": self.completed_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class LearningActivity:
    """Append-only event log for user learning milestones."""

    def __init__(
        self,
        user_id: ObjectId | str,
        activity_type: str,  # lesson_started, lesson_progressed, lesson_completed, quiz_completed, course_enrolled, course_completed
        title: str,
        subtitle: str,
        entity_type: str,  # lesson, course, quiz
        entity_id: str,
        occurred_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.activity_type = activity_type
        self.title = title
        self.subtitle = subtitle
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.occurred_at = occurred_at or datetime.now(timezone.utc)
        self.metadata = metadata or {}

    def to_doc(self) -> dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "type": self.activity_type,
            "title": self.title,
            "subtitle": self.subtitle,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "occurred_at": self.occurred_at,
            "metadata": self.metadata,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc
