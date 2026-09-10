"""
Typed DTOs for the Learning Domain.
Complies with Section 12, 14, 15, and 68 of the Senior Engineering Specification.
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ContinueLearningCourseDTO(BaseModel):
    id: str
    title: str
    slug: str
    levelName: str
    levelNumber: int


class ContinueLearningLessonDTO(BaseModel):
    id: str
    courseId: str
    title: str
    lessonNumber: int
    durationMinutes: int = 20
    durationSeconds: int = 1200
    progressPercentage: int = 0
    lastPositionSeconds: int = 0
    summary: str = ""
    videoUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None


class ContinueLearningInstructorDTO(BaseModel):
    name: str
    role: str
    avatarUrl: Optional[str] = None


class UpNextLessonDTO(BaseModel):
    id: str
    courseId: str
    title: str
    order: int
    durationMinutes: int = 20
    isAccessible: bool = True


class ContinueLearningDTO(BaseModel):
    status: str = "empty"  # "ready" | "empty" | "completed"
    hasActiveLearning: bool = False
    course: Optional[ContinueLearningCourseDTO] = None
    lesson: Optional[ContinueLearningLessonDTO] = None
    instructor: Optional[ContinueLearningInstructorDTO] = None
    upNext: List[UpNextLessonDTO] = Field(default_factory=list)
    progress: Optional[Dict[str, Any]] = None
    recommendedCourse: Optional[Dict[str, Any]] = None


class EnrollmentDTO(BaseModel):
    id: str
    courseId: str
    status: str = "active"
    progressPercentage: int = 0
    enrolledAt: str


class CourseUserStateDTO(BaseModel):
    enrolled: bool = False
    progressPercentage: int = 0
    status: str = "not_enrolled"  # "not_enrolled" | "in_progress" | "completed"
    completedLessons: int = 0
    totalLessons: int = 14
    lastAccessedLessonId: Optional[str] = None


class CourseCatalogItemDTO(BaseModel):
    id: str
    title: str
    tagline: Optional[str] = ""
    description: Optional[str] = ""
    level: str
    levelNumber: int
    levelName: str
    lessonCount: int
    durationHours: float = 4.5
    durationLabel: str = "4h 30m"
    instructor: Optional[Dict[str, Any]] = None
    modules: List[Dict[str, Any]] = Field(default_factory=list)
    userState: CourseUserStateDTO


class LearningSummaryDTO(BaseModel):
    lessonsCompleted: int
    totalLessons: int
    coursesCompleted: int
    totalCourses: int
    completionPercentage: int
    learningStreak: int
    learningTimeMinutes: int
    activeStage: str = "Stage 1"
    progressScore: str = "3.52"


class CourseProgressDTO(BaseModel):
    courseId: str
    title: str
    completedLessons: int
    totalLessons: int
    percent: int
    isEnrolled: bool = False
    levelNumber: int = 1


class LearningActivityDTO(BaseModel):
    id: str
    title: str
    subtitle: str
    type: str
    timeAgo: str
    timestamp: int


class LessonProgressIn(BaseModel):
    watchedSeconds: int = Field(ge=0, default=0)
    durationSeconds: int = Field(ge=0, default=0)
    lastPositionSeconds: int = Field(ge=0, default=0)
    currentPositionSeconds: Optional[int] = None
    completed: bool = False

    def get_position(self) -> int:
        if self.lastPositionSeconds > 0:
            return self.lastPositionSeconds
        if self.currentPositionSeconds is not None:
            return self.currentPositionSeconds
        return 0

    def get_watched(self) -> int:
        if self.watchedSeconds > 0:
            return self.watchedSeconds
        return self.get_position()


class LessonProgressOut(BaseModel):
    status: str = "success"
    courseId: str
    lessonId: str
    progressPercentage: int
    completed: bool
    totalCompletedLessons: int


class LessonDetailDTO(BaseModel):
    course: Dict[str, Any]
    module: Optional[Dict[str, Any]] = None
    lesson: Dict[str, Any]
    prevLesson: Optional[Dict[str, Any]] = None
    nextLesson: Optional[Dict[str, Any]] = None
    userProgress: Optional[Dict[str, Any]] = None
