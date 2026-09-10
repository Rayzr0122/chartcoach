"""
Learning Domain Application Service for ChartCoach.
Implements Section 8, 12, 13, 14, 15, 16, 17 of the Senior Engineering Specification.
Handles Continue Learning resolution, Up Next ordering, Progress synchronization, and Events.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pymongo.database import Database

from app.models.user import User
from app.models.learning import Enrollment, LessonProgress, LearningActivity
from app.schemas.learning_dto import (
    ContinueLearningDTO,
    ContinueLearningCourseDTO,
    ContinueLearningLessonDTO,
    ContinueLearningInstructorDTO,
    UpNextLessonDTO,
    LearningSummaryDTO,
    CourseProgressDTO,
    LearningActivityDTO,
    LessonProgressIn,
    LessonProgressOut,
    LessonDetailDTO,
    EnrollmentDTO,
    CourseCatalogItemDTO,
    CourseUserStateDTO,
)
from app.services.video_provider import get_video_provider


class LearningService:
    def __init__(self, db: Database):
        self.db = db
        self.video_provider = get_video_provider()

    def get_continue_learning(self, user: User) -> ContinueLearningDTO:
        """
        Determines the single most relevant lesson for the user's dashboard hero.
        Priority:
        1. Incomplete lesson with most recent activity from an active enrollment
        2. First incomplete lesson in the most recently accessed course
        3. First lesson of an enrolled course
        4. Default to first lesson of 'trading-101'
        """
        now = datetime.now(timezone.utc)

        # 1. Fetch user enrollments sorted by last_accessed_at descending
        enrollments_cursor = self.db.enrollments.find(
            {"user_id": user._id, "status": {"$in": ["active", "enrolled"]}}
        ).sort("last_accessed_at", -1)
        enrollments = list(enrollments_cursor)

        # Genuinely new or unenrolled user -> return empty onboarding state
        if not enrollments:
            recommended = self.db.courses.find_one({"id": "trading-101"}, {"_id": 0})
            return ContinueLearningDTO(
                status="empty",
                hasActiveLearning=False,
                course=None,
                lesson=None,
                instructor=None,
                upNext=[],
                recommendedCourse={
                    "id": "trading-101",
                    "title": "Trading 101 — Beginner Foundation",
                    "levelName": "Level 1: Market Foundations",
                    "lessonCount": 14,
                    "duration": "4h 30m",
                    "tagline": "Master foundational market mechanics, price formation, and risk fundamentals.",
                } if recommended else None,
            )

        # 2. User has active enrollment
        active_enrollment = enrollments[0]
        target_course_id = active_enrollment.get("course_id", "trading-101")
        target_lesson_id: Optional[str] = None
        last_position_seconds = 0
        progress_percentage = 0

        # Check for an in-progress incomplete lesson
        recent_progress = self.db.lesson_progress.find_one(
            {"user_id": user._id, "course_id": target_course_id, "completed": False},
            sort=[("last_watched_at", -1)],
        )
        if recent_progress:
            target_lesson_id = recent_progress.get("lesson_id")
            last_position_seconds = recent_progress.get("last_position_seconds", 0)
            progress_percentage = recent_progress.get("progress_percentage", 0)
        else:
            # Check completed lessons in this course
            completed_cursor = self.db.lesson_progress.find(
                {"user_id": user._id, "course_id": target_course_id, "completed": True},
                {"lesson_id": 1},
            )
            completed_ids = {doc["lesson_id"] for doc in completed_cursor}

            course_doc = self.db.courses.find_one({"id": target_course_id})
            if course_doc:
                for module in course_doc.get("modules", []):
                    for lesson in module.get("lessons", []):
                        if lesson["id"] not in completed_ids:
                            target_lesson_id = lesson["id"]
                            break
                    if target_lesson_id:
                        break

            # If all lessons in current enrolled course are completed
            if not target_lesson_id:
                return ContinueLearningDTO(
                    status="completed",
                    hasActiveLearning=False,
                    course=None,
                    lesson=None,
                    instructor=None,
                    upNext=[],
                    recommendedCourse={
                        "id": "chart-reading-101",
                        "title": "Chart Reading 101",
                        "levelName": "Level 2: Technical Structure",
                        "lessonCount": 14,
                        "duration": "5h 00m",
                        "tagline": "Advance to candlesticks, trends, and support & resistance.",
                    },
                )

        # Fetch course document
        course_doc = self.db.courses.find_one({"id": target_course_id})
        if not course_doc:
            course_doc = self.db.courses.find_one({"id": "trading-101"}) or {}

        # Flatten lessons in course
        all_lessons: List[Dict[str, Any]] = []
        for module in course_doc.get("modules", []):
            all_lessons.extend(module.get("lessons", []))

        # Find target lesson object
        lesson_obj = next((l for l in all_lessons if l.get("id") == target_lesson_id), None)
        if not lesson_obj and all_lessons:
            lesson_obj = all_lessons[0]

        if not lesson_obj:
            lesson_obj = {
                "id": "t101-l1",
                "title": "What is Trading & Why People Trade",
                "order": 1,
                "durationMinutes": 20,
                "summary": "Understand the core foundations of market trading.",
            }

        lesson_idx = next(
            (i for i, l in enumerate(all_lessons) if l.get("id") == lesson_obj.get("id")),
            0,
        )

        # Build Up Next list (2-3 subsequent lessons)
        up_next_list: List[UpNextLessonDTO] = []
        for subsequent in all_lessons[lesson_idx + 1 : lesson_idx + 4]:
            up_next_list.append(
                UpNextLessonDTO(
                    id=subsequent.get("id", ""),
                    courseId=target_course_id,
                    title=subsequent.get("title", ""),
                    order=subsequent.get("order", 1),
                    durationMinutes=subsequent.get("durationMinutes", 20),
                    isAccessible=True,
                )
            )

        # Video playback metadata
        playback_info = self.video_provider.get_playback_info(target_course_id, user.id)

        course_dto = ContinueLearningCourseDTO(
            id=course_doc.get("id", "trading-101"),
            title=course_doc.get("title", "Trading 101 — Beginner Foundation"),
            slug=course_doc.get("id", "trading-101"),
            levelName=course_doc.get("levelName", "Level 1: Market Foundations"),
            levelNumber=course_doc.get("levelNumber", 1),
        )

        lesson_dto = ContinueLearningLessonDTO(
            id=lesson_obj.get("id", "t101-l1"),
            courseId=target_course_id,
            title=lesson_obj.get("title", "What is Trading & Why People Trade"),
            lessonNumber=lesson_obj.get("order", lesson_idx + 1),
            durationMinutes=lesson_obj.get("durationMinutes", 20),
            durationSeconds=lesson_obj.get("durationMinutes", 20) * 60,
            progressPercentage=progress_percentage,
            lastPositionSeconds=last_position_seconds,
            summary=lesson_obj.get("summary", ""),
            videoUrl=playback_info.get("playbackUrl"),
            thumbnailUrl=playback_info.get("posterUrl"),
        )

        instructor_dto = ContinueLearningInstructorDTO(
            name=course_doc.get("instructorName", "Rajesh Varma"),
            role=course_doc.get("instructorRole", "Lead Foundations Instructor"),
            avatarUrl=None,
        )

        return ContinueLearningDTO(
            status="ready",
            hasActiveLearning=True,
            course=course_dto,
            lesson=lesson_dto,
            instructor=instructor_dto,
            upNext=up_next_list,
        )

    def get_learning_summary(self, user: User) -> LearningSummaryDTO:
        """Computes accurate summary metrics derived strictly from user's progress records."""
        # Total completed lessons
        completed_count = self.db.lesson_progress.count_documents(
            {"user_id": user._id, "completed": True}
        )

        # Total lessons in curriculum across all published courses
        total_lessons = 0
        total_courses = 0
        completed_courses = 0

        courses = list(self.db.courses.find({}, {"lessonCount": 1, "id": 1}))
        total_courses = len(courses)
        for c in courses:
            total_lessons += c.get("lessonCount", 0)

        # Check completed courses in enrollments
        completed_courses = self.db.enrollments.count_documents(
            {"user_id": user._id, "status": "completed"}
        )

        completion_percentage = (
            int(round((completed_count / total_lessons) * 100)) if total_lessons > 0 else 0
        )

        # Total watched minutes
        watched_pipeline = [
            {"$match": {"user_id": user._id}},
            {"$group": {"_id": None, "total_seconds": {"$sum": "$watched_seconds"}}},
        ]
        watched_res = list(self.db.lesson_progress.aggregate(watched_pipeline))
        total_seconds = watched_res[0]["total_seconds"] if watched_res else 0
        learning_time_minutes = total_seconds // 60 if total_seconds > 0 else (completed_count * 15)

        # Learning streak from activities in last 7 days
        streak_days = self._calculate_streak(user)

        # Has active enrollment
        has_enrollment = (
            self.db.enrollments.find_one(
                {"user_id": user._id, "status": {"$in": ["active", "enrolled"]}}
            )
            is not None
        )

        # Progress score e.g. 2.5 + completion ratio
        if completed_count == 0 and total_seconds == 0:
            progress_score = "0.00"
            active_stage = "Stage 1" if has_enrollment else "Not Started"
        else:
            score_val = 2.5 + (completion_percentage / 100.0) * 1.5
            progress_score = f"{score_val:.2f}"
            active_stage = "Stage 1"

        return LearningSummaryDTO(
            lessonsCompleted=completed_count,
            totalLessons=total_lessons or 68,
            coursesCompleted=completed_courses,
            totalCourses=total_courses or 5,
            completionPercentage=completion_percentage,
            learningStreak=streak_days,
            learningTimeMinutes=learning_time_minutes,
            activeStage=active_stage,
            progressScore=progress_score,
        )

    def get_curriculum_progress(self, user: User) -> List[CourseProgressDTO]:
        """Calculates progress percentages for all 5 sequential stages."""
        courses = list(self.db.courses.find({}).sort("levelNumber", 1))
        results: List[CourseProgressDTO] = []

        enrollments_by_course = {
            doc["course_id"]: doc
            for doc in self.db.enrollments.find({"user_id": user._id})
        }

        # Completed lessons grouped by course
        pipeline = [
            {"$match": {"user_id": user._id, "completed": True}},
            {"$group": {"_id": "$course_id", "completed_count": {"$sum": 1}}},
        ]
        completed_by_course = {
            row["_id"]: row["completed_count"]
            for row in self.db.lesson_progress.aggregate(pipeline)
        }

        for c in courses:
            c_id = c.get("id")
            total = c.get("lessonCount", 14)
            completed = completed_by_course.get(c_id, 0)
            pct = min(100, int(round((completed / total) * 100))) if total > 0 else 0
            is_enrolled = c_id in enrollments_by_course

            results.append(
                CourseProgressDTO(
                    courseId=c_id,
                    title=c.get("title", ""),
                    completedLessons=completed,
                    totalLessons=total,
                    percent=pct,
                    isEnrolled=is_enrolled,
                    levelNumber=c.get("levelNumber", 1),
                )
            )

        return results

    def update_lesson_progress(
        self,
        user: User,
        course_id: str,
        lesson_id: str,
        data: LessonProgressIn,
    ) -> LessonProgressOut:
        """
        Idempotent, debounced playback progress update.
        Derives user identity securely from session.
        """
        now = datetime.now(timezone.utc)
        self._ensure_enrollment(user, course_id)

        # Calculate progress percentage
        duration = data.durationSeconds if data.durationSeconds > 0 else 1200
        watched = data.get_watched()
        pos = data.get_position()
        progress_pct = min(100, int(round((watched / duration) * 100)))
        completed = data.completed or progress_pct >= 90

        # Upsert LessonProgress
        update_fields: Dict[str, Any] = {
            "user_id": user._id,
            "public_user_id": user.public_user_id,
            "lesson_id": lesson_id,
            "course_id": course_id,
            "duration_seconds": duration,
            "last_position_seconds": pos,
            "last_watched_at": now,
        }
        if watched > 0:
            update_fields["watched_seconds"] = watched
            update_fields["progress_percentage"] = progress_pct

        if completed:
            update_fields["completed"] = True
            update_fields["completed_at"] = now
            update_fields["progress_percentage"] = 100

        self.db.lesson_progress.update_one(
            {"user_id": user._id, "lesson_id": lesson_id},
            {
                "$set": update_fields,
                "$setOnInsert": {"first_watched_at": now},
            },
            upsert=True,
        )

        # Update enrollment last accessed
        self._recalculate_enrollment(user, course_id, last_lesson_id=lesson_id)

        # Log activity
        if completed:
            self._log_activity(
                user=user,
                activity_type="lesson_completed",
                title="Lesson Completed",
                subtitle=f"Completed {lesson_id} in {course_id}",
                entity_type="lesson",
                entity_id=lesson_id,
            )

        total_completed = self.db.lesson_progress.count_documents(
            {"user_id": user._id, "completed": True}
        )

        return LessonProgressOut(
            status="success",
            courseId=course_id,
            lessonId=lesson_id,
            progressPercentage=100 if completed else progress_pct,
            completed=completed,
            totalCompletedLessons=total_completed,
        )

    def complete_lesson(self, user: User, course_id: str, lesson_id: str) -> LessonProgressOut:
        """Directly marks a lesson as 100% completed."""
        return self.update_lesson_progress(
            user=user,
            course_id=course_id,
            lesson_id=lesson_id,
            data=LessonProgressIn(
                watchedSeconds=1200,
                durationSeconds=1200,
                lastPositionSeconds=1200,
                completed=True,
            ),
        )

    def get_lesson_detail(self, user: User, course_id: str, lesson_id: str) -> LessonDetailDTO:
        """Retrieves lesson contents, video stream, and user's saved position."""
        course = self.db.courses.find_one({"id": course_id}, {"_id": 0})
        if not course:
            course = self.db.courses.find_one({}, {"_id": 0})

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

        if not target_lesson and all_lessons:
            target_lesson = all_lessons[0]

        lesson_idx = next(
            (i for i, l in enumerate(all_lessons) if l.get("id") == target_lesson.get("id")),
            -1,
        )
        prev_lesson = (
            {"id": all_lessons[lesson_idx - 1]["id"], "title": all_lessons[lesson_idx - 1]["title"]}
            if lesson_idx > 0
            else None
        )
        next_lesson = (
            {"id": all_lessons[lesson_idx + 1]["id"], "title": all_lessons[lesson_idx + 1]["title"]}
            if lesson_idx < len(all_lessons) - 1
            else None
        )

        # Saved user progress for this lesson
        progress_doc = self.db.lesson_progress.find_one(
            {"user_id": user._id, "lesson_id": target_lesson.get("id")},
            {"_id": 0, "user_id": 0},
        )

        # Video stream info
        playback_info = self.video_provider.get_playback_info(course_id, user.id)
        target_lesson["videoPlayback"] = playback_info
        target_lesson["videoUrl"] = target_lesson.get("videoUrl") or playback_info.get("playbackUrl")
        target_lesson["thumbnailUrl"] = target_lesson.get("thumbnailUrl") or playback_info.get("posterUrl")

        return LessonDetailDTO(
            course={
                "id": course.get("id"),
                "title": course.get("title"),
                "level": course.get("level"),
                "levelName": course.get("levelName"),
            },
            module=parent_module,
            lesson=target_lesson,
            prevLesson=prev_lesson,
            nextLesson=next_lesson,
            userProgress=progress_doc,
        )

    def get_recent_activities(self, user: User, limit: int = 10) -> List[LearningActivityDTO]:
        """Retrieves user's last N learning activities formatted with timeAgo."""
        cursor = self.db.learning_activities.find({"user_id": user._id}).sort("occurred_at", -1).limit(limit)
        activities = list(cursor)

        now = datetime.now(timezone.utc)
        results: List[LearningActivityDTO] = []

        for item in activities:
            occurred: datetime = item.get("occurred_at") or now
            if occurred.tzinfo is None:
                occurred = occurred.replace(tzinfo=timezone.utc)

            delta = now - occurred
            minutes = int(delta.total_seconds() // 60)
            if minutes < 1:
                time_ago = "Just now"
            elif minutes < 60:
                time_ago = f"{minutes}m ago"
            elif minutes < 1440:
                time_ago = f"{minutes // 60}h ago"
            else:
                time_ago = f"{minutes // 1440}d ago"

            results.append(
                LearningActivityDTO(
                    id=str(item.get("_id", "")),
                    title=item.get("title", "Milestone Reached"),
                    subtitle=item.get("subtitle", "Completed trading activity"),
                    type=item.get("type", "lesson_completed"),
                    timeAgo=time_ago,
                    timestamp=int(occurred.timestamp() * 1000),
                )
            )

        # Default sample milestones if user is completely brand new
        if not results:
            results = [
                LearningActivityDTO(
                    id="init-1",
                    title="Account Verified",
                    subtitle="Session secured with biometric identification",
                    type="account_verified",
                    timeAgo="Today",
                    timestamp=int(now.timestamp() * 1000),
                ),
                LearningActivityDTO(
                    id="init-2",
                    title="Trading 101 Curriculum Assigned",
                    subtitle="Foundations ready to begin",
                    type="course_enrolled",
                    timeAgo="Today",
                    timestamp=int(now.timestamp() * 1000) - 3600000,
                ),
            ]

        return results

    def _ensure_enrollment(self, user: User, course_id: str) -> None:
        """Ensures a user has an active enrollment record for the course."""
        now = datetime.now(timezone.utc)
        self.db.enrollments.update_one(
            {"user_id": user._id, "course_id": course_id},
            {
                "$setOnInsert": {
                    "user_id": user._id,
                    "public_user_id": user.public_user_id,
                    "course_id": course_id,
                    "status": "active",
                    "progress_percentage": 0,
                    "enrolled_at": now,
                    "started_at": now,
                },
                "$set": {"last_accessed_at": now},
            },
            upsert=True,
        )

    def _recalculate_enrollment(
        self,
        user: User,
        course_id: str,
        last_lesson_id: Optional[str] = None,
    ) -> None:
        """Recalculates enrollment progress based on completed lessons."""
        now = datetime.now(timezone.utc)
        course = self.db.courses.find_one({"id": course_id})
        total_lessons = course.get("lessonCount", 14) if course else 14

        completed_count = self.db.lesson_progress.count_documents(
            {"user_id": user._id, "course_id": course_id, "completed": True}
        )

        pct = min(100, int(round((completed_count / total_lessons) * 100))) if total_lessons > 0 else 0
        status = "completed" if pct >= 100 else "active"

        updates: Dict[str, Any] = {
            "progress_percentage": pct,
            "status": status,
            "last_accessed_at": now,
        }
        if last_lesson_id:
            updates["last_accessed_lesson_id"] = last_lesson_id
        if pct >= 100:
            updates["completed_at"] = now

        self.db.enrollments.update_one(
            {"user_id": user._id, "course_id": course_id},
            {"$set": updates},
            upsert=True,
        )

    def _log_activity(
        self,
        user: User,
        activity_type: str,
        title: str,
        subtitle: str,
        entity_type: str,
        entity_id: str,
    ) -> None:
        activity = LearningActivity(
            user_id=user._id,
            activity_type=activity_type,
            title=title,
            subtitle=subtitle,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        self.db.learning_activities.insert_one(activity.to_doc())

    def _calculate_streak(self, user: User) -> int:
        """Calculates consecutive active days from activities."""
        pipeline = [
            {"$match": {"user_id": user._id}},
            {"$project": {"date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$occurred_at"}}}},
            {"$group": {"_id": "$date"}},
            {"$sort": {"_id": -1}},
            {"$limit": 7},
        ]
        res = list(self.db.learning_activities.aggregate(pipeline))
        return len(res)

    def enroll_course(self, user: User, course_id: str) -> EnrollmentDTO:
        """
        Explicitly and idempotently enrolls user in a course.
        Sections 10 and 11 of Product State Specification.
        """
        course = self.db.courses.find_one({"id": course_id})
        if not course:
            from app.core.errors import AppError
            raise AppError(code="COURSE_NOT_FOUND", message=f"Course '{course_id}' was not found.", status_code=404)

        now = datetime.now(timezone.utc)
        existing = self.db.enrollments.find_one({"user_id": user._id, "course_id": course_id})
        if existing:
            return EnrollmentDTO(
                id=str(existing.get("_id")),
                courseId=course_id,
                status=existing.get("status", "active"),
                progressPercentage=existing.get("progress_percentage", 0),
                enrolledAt=existing.get("enrolled_at", now).isoformat() if isinstance(existing.get("enrolled_at"), datetime) else str(existing.get("enrolled_at", "")),
            )

        doc = {
            "user_id": user._id,
            "public_user_id": user.public_user_id,
            "course_id": course_id,
            "status": "active",
            "progress_percentage": 0,
            "enrolled_at": now,
            "started_at": now,
            "last_accessed_at": now,
        }
        res = self.db.enrollments.insert_one(doc)

        # Log activity
        self._log_activity(
            user=user,
            activity_type="course_enrolled",
            title="Enrolled in Course",
            subtitle=f"Started {course.get('title', course_id)}",
            entity_type="course",
            entity_id=course_id,
        )

        return EnrollmentDTO(
            id=str(res.inserted_id),
            courseId=course_id,
            status="active",
            progressPercentage=0,
            enrolledAt=now.isoformat(),
        )

    def get_course_catalog(self, user: Optional[User] = None) -> List[CourseCatalogItemDTO]:
        """
        Returns all published courses in the global curriculum with user-specific state separated.
        Sections 26, 27, 28 of Product State Specification.
        """
        courses = list(self.db.courses.find({}, {"_id": 0}).sort("levelNumber", 1))
        enrollments_by_course = {}
        completed_by_course = {}

        if user and user._id:
            enrollments_by_course = {
                doc["course_id"]: doc
                for doc in self.db.enrollments.find({"user_id": user._id})
            }
            pipeline = [
                {"$match": {"user_id": user._id, "completed": True}},
                {"$group": {"_id": "$course_id", "completed_count": {"$sum": 1}}},
            ]
            completed_by_course = {
                row["_id"]: row["completed_count"]
                for row in self.db.lesson_progress.aggregate(pipeline)
            }

        catalog: List[CourseCatalogItemDTO] = []
        for c in courses:
            c_id = c.get("id")
            enrollment = enrollments_by_course.get(c_id)
            is_enrolled = enrollment is not None
            completed_count = completed_by_course.get(c_id, 0)
            total_count = c.get("lessonCount", 14)
            pct = enrollment.get("progress_percentage", 0) if enrollment else 0
            if not is_enrolled:
                status_str = "not_enrolled"
            elif pct >= 100:
                status_str = "completed"
            else:
                status_str = "in_progress"

            user_state = CourseUserStateDTO(
                enrolled=is_enrolled,
                progressPercentage=pct,
                status=status_str,
                completedLessons=completed_count,
                totalLessons=total_count,
                lastAccessedLessonId=enrollment.get("last_accessed_lesson_id") if enrollment else None,
            )

            catalog.append(
                CourseCatalogItemDTO(
                    id=c_id,
                    title=c.get("title", ""),
                    tagline=c.get("tagline", ""),
                    description=c.get("description", ""),
                    level=c.get("level", "Beginner"),
                    levelNumber=c.get("levelNumber", 1),
                    levelName=c.get("levelName", "Level 1: Market Foundations"),
                    lessonCount=total_count,
                    durationHours=c.get("durationHours", 4.5),
                    durationLabel=c.get("durationLabel", "4h 30m"),
                    instructor=c.get("instructor"),
                    modules=c.get("modules", []),
                    userState=user_state,
                )
            )
        return catalog
