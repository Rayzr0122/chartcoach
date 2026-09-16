from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.domain.learning import Lesson, ProgressError, normalize_progress, validate_progress_observation


class LessonNotFound(RuntimeError):
    pass


class EnrollmentRequired(RuntimeError):
    pass


class PlaybackSessionMismatch(RuntimeError):
    pass


class PromptNotReady(RuntimeError):
    pass


class PromptNotFound(RuntimeError):
    pass


class LearningService:
    def __init__(self, db: Any, signer: Any) -> None:
        self.db = db
        self.signer = signer

    @staticmethod
    def _user_id(user: Any) -> str:
        return str(user.id)

    def _load_authorized_lesson(self, lesson_id: str, user: Any) -> Lesson:
        lesson_doc = self.db.lessons.find_one({"id": lesson_id, "published": True})
        if not lesson_doc:
            raise LessonNotFound("Lesson was not found")
        lesson = Lesson.model_validate(lesson_doc)
        if not self.db.courses.find_one({"id": lesson.course_id, "published": True}):
            raise LessonNotFound("Lesson was not found")

        user_id = self._user_id(user)
        enrollment = (
            self.db.enrollments.find_one(
                {"user_id": user_id, "course_id": lesson.course_id, "active": True}
            )
            if user_id
            else None
        )
        if not enrollment:
            raise EnrollmentRequired("An active enrollment is required")
        return lesson

    def _progress_doc(self, lesson_id: str, user: Any) -> dict[str, Any] | None:
        return self.db.lesson_progress.find_one(
            {"user_id": self._user_id(user), "lesson_id": lesson_id}
        )

    @staticmethod
    def _required_prompt_ids(lesson: Lesson) -> list[str]:
        return [prompt.id for _, prompt in lesson.required_prompts]

    @staticmethod
    def _next_unanswered(lesson: Lesson, passed_prompt_ids: list[str]):
        passed = set(passed_prompt_ids)
        return next(
            ((boundary, prompt) for boundary, prompt in lesson.required_prompts if prompt.id not in passed),
            (None, None),
        )

    def _normalized_progress(
        self,
        lesson: Lesson,
        user: Any,
        progress_doc: dict[str, Any] | None = None,
        *,
        position_seconds: float | None = None,
        watched_intervals: list[list[float]] | None = None,
        passed_prompt_ids: list[str] | None = None,
        playback_session_id: str | None = None,
    ) -> dict[str, Any]:
        stored = progress_doc or {}
        passed = passed_prompt_ids if passed_prompt_ids is not None else stored.get("passed_prompt_ids", [])
        position = (
            float(position_seconds)
            if position_seconds is not None
            else float(stored.get("resume_position_seconds", 0))
        )
        next_boundary, next_prompt = self._next_unanswered(lesson, passed)
        resume = min(position, next_boundary) if next_boundary is not None else position
        pending_prompt_id = next_prompt.id if next_prompt is not None and position >= next_boundary else None
        return normalize_progress(
            lesson_id=lesson.id,
            user_id=self._user_id(user),
            duration_seconds=lesson.duration_seconds,
            watched_intervals=(
                watched_intervals if watched_intervals is not None else stored.get("watched_intervals", [])
            ),
            passed_prompt_ids=passed,
            required_prompt_ids=self._required_prompt_ids(lesson),
            position_seconds=resume,
            playback_session_id=(
                playback_session_id
                if playback_session_id is not None
                else stored.get("playback_session_id")
            ),
            pending_prompt_id=pending_prompt_id,
            completed_at=stored.get("completed_at"),
        )

    def _persist_progress(
        self,
        progress: dict[str, Any],
        *,
        expected_session_id: str | None = None,
    ) -> None:
        query = {"user_id": progress["user_id"], "lesson_id": progress["lesson_id"]}
        if expected_session_id is None:
            self.db.lesson_progress.replace_one(query, progress, upsert=True)
            return
        query["playback_session_id"] = expected_session_id
        result = self.db.lesson_progress.replace_one(query, progress, upsert=False)
        if result.matched_count == 0:
            raise PlaybackSessionMismatch("Playback session is missing or has been rotated")

    def get_lesson(self, lesson_id: str, user: Any) -> dict[str, Any]:
        lesson = self._load_authorized_lesson(lesson_id, user)
        public = lesson.to_public_dict()
        public["progress"] = self._normalized_progress(lesson, user, self._progress_doc(lesson.id, user))
        return public

    def start_playback(self, lesson_id: str, user: Any) -> dict[str, Any]:
        lesson = self._load_authorized_lesson(lesson_id, user)
        capabilities = self.signer.authorize(lesson.mux_playback_id, lesson.duration_seconds)
        session_id = uuid4().hex
        progress = self._normalized_progress(
            lesson,
            user,
            self._progress_doc(lesson.id, user),
            playback_session_id=session_id,
        )
        self._persist_progress(progress)
        return {
            **capabilities,
            "playback_session_id": session_id,
            "resume_position_seconds": progress["resume_position_seconds"],
            "pending_prompt_id": progress["pending_prompt_id"],
        }

    def update_progress(
        self,
        lesson_id: str,
        user: Any,
        playback_session_id: str,
        position_seconds: float,
        interval: list[float],
    ) -> dict[str, Any]:
        lesson = self._load_authorized_lesson(lesson_id, user)
        stored = self._progress_doc(lesson_id, user)
        if not stored or stored.get("playback_session_id") != playback_session_id:
            raise PlaybackSessionMismatch("Playback session is missing or has been rotated")

        next_boundary, _ = self._next_unanswered(lesson, stored.get("passed_prompt_ids", []))
        validate_progress_observation(
            lesson.duration_seconds,
            position_seconds,
            interval,
            next_boundary,
        )
        progress = self._normalized_progress(
            lesson,
            user,
            stored,
            position_seconds=position_seconds,
            watched_intervals=[*stored.get("watched_intervals", []), interval],
            playback_session_id=playback_session_id,
        )
        self._persist_progress(progress, expected_session_id=playback_session_id)
        return progress

    def attempt_prompt(
        self,
        lesson_id: str,
        prompt_id: str,
        user: Any,
        playback_session_id: str,
        option_id: str,
    ) -> dict[str, Any]:
        lesson = self._load_authorized_lesson(lesson_id, user)
        stored = self._progress_doc(lesson_id, user)
        if not stored or stored.get("playback_session_id") != playback_session_id:
            raise PlaybackSessionMismatch("Playback session is missing or has been rotated")

        prompt_match = next(
            ((boundary, prompt) for boundary, prompt in lesson.required_prompts if prompt.id == prompt_id),
            None,
        )
        if prompt_match is None:
            raise PromptNotFound("Prompt was not found in this lesson")
        boundary, prompt = prompt_match
        if float(stored.get("resume_position_seconds", 0)) < boundary:
            raise PromptNotReady("Playback must reach the prompt boundary before attempting it")
        if option_id not in {option.id for option in prompt.options}:
            raise ProgressError("option_id must belong to the prompt")

        is_correct = option_id == prompt.correct_option_id
        passed = list(stored.get("passed_prompt_ids", []))
        if is_correct and prompt.id not in passed:
            passed.append(prompt.id)
        progress = self._normalized_progress(
            lesson,
            user,
            stored,
            passed_prompt_ids=passed,
            playback_session_id=playback_session_id,
        )
        self._persist_progress(progress, expected_session_id=playback_session_id)
        attempted_at = datetime.now(timezone.utc)
        self.db.prompt_attempts.insert_one(
            {
                "user_id": self._user_id(user),
                "lesson_id": lesson.id,
                "prompt_id": prompt.id,
                "selected_option": option_id,
                "selected_option_id": option_id,
                "correctness": is_correct,
                "is_correct": is_correct,
                "feedback_returned": prompt.explanation,
                "feedback": prompt.explanation,
                "attempted_at": attempted_at,
            }
        )
        return {
            "is_correct": is_correct,
            "explanation": prompt.explanation,
            "feedback": prompt.explanation,
            "retry_allowed": True,
            "progress": progress,
        }
