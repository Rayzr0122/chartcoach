"""Idempotently import the single DRM pilot lesson.

Run from ``backend`` with ``python -m scripts.import_pilot_lesson``. The real
Mux playback ID and caption URL must come from CLI arguments or environment.
"""

from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from typing import Any

import pymongo

from app.domain.learning import Lesson


COURSE_ID = "price-action-secrets"
LESSON_ID = "l1"


def _pilot_lesson(mux_playback_id: str, duration_seconds: float, caption_url: str) -> Lesson:
    if duration_seconds < 90:
        raise ValueError("Pilot lesson duration must be at least 90 seconds")
    first_end = round(duration_seconds * 0.32, 3)
    second_end = round(duration_seconds * 0.68, 3)
    return Lesson.model_validate(
        {
            "id": LESSON_ID,
            "course_id": COURSE_ID,
            "title": "Price Action Foundations: Reading Market Structure",
            "duration_seconds": duration_seconds,
            "mux_playback_id": mux_playback_id,
            "captions": {"language": "en", "label": "English", "url": caption_url},
            "published": True,
            "segments": [
                {
                    "id": "structure-basics",
                    "title": "Map the market structure",
                    "description": "Identify swing highs and lows before forming a directional view.",
                    "start_seconds": 0,
                    "end_seconds": first_end,
                    "thumbnail": {
                        "time_seconds": round(first_end / 2, 3),
                        "url": f"https://image.mux.com/{mux_playback_id}/thumbnail.jpg?time={first_end / 2:.3f}",
                    },
                    "required_prompt": {
                        "id": "structure-check",
                        "question": "Which sequence supports a bullish market structure?",
                        "options": [
                            {"id": "higher", "text": "Higher highs and higher lows"},
                            {"id": "lower", "text": "Lower highs and lower lows"},
                            {"id": "single", "text": "One isolated bullish candle"},
                        ],
                        "correct_option_id": "higher",
                        "explanation": "A repeated sequence of higher highs and higher lows supports bullish structure.",
                    },
                },
                {
                    "id": "break-and-retest",
                    "title": "Evaluate a break and retest",
                    "description": "Distinguish a confirmed structural break from a brief price excursion.",
                    "start_seconds": first_end,
                    "end_seconds": second_end,
                    "thumbnail": {
                        "time_seconds": round((first_end + second_end) / 2, 3),
                        "url": f"https://image.mux.com/{mux_playback_id}/thumbnail.jpg?time={(first_end + second_end) / 2:.3f}",
                    },
                    "required_prompt": {
                        "id": "retest-check",
                        "question": "What adds evidence that a breakout is holding?",
                        "options": [
                            {"id": "retest", "text": "A retest that respects the broken level"},
                            {"id": "chase", "text": "Entering after any large candle"},
                            {"id": "ignore", "text": "Ignoring the prior range"},
                        ],
                        "correct_option_id": "retest",
                        "explanation": "A respected retest shows that the former boundary may be acting as support or resistance.",
                    },
                },
                {
                    "id": "risk-aware-review",
                    "title": "Build a risk-aware chart read",
                    "description": "Combine structure and confirmation without treating any setup as certain.",
                    "start_seconds": second_end,
                    "end_seconds": duration_seconds,
                    "thumbnail": {
                        "time_seconds": round((second_end + duration_seconds) / 2, 3),
                        "url": f"https://image.mux.com/{mux_playback_id}/thumbnail.jpg?time={(second_end + duration_seconds) / 2:.3f}",
                    },
                    "required_prompt": None,
                },
            ],
        }
    )


def upsert_pilot_lesson(
    db: Any,
    *,
    mux_playback_id: str,
    duration_seconds: float,
    caption_url: str,
    enrollment_email: str | None = None,
) -> dict[str, int]:
    lesson = _pilot_lesson(mux_playback_id, duration_seconds, caption_url)
    now = datetime.now(timezone.utc)
    db.courses.update_one(
        {"id": COURSE_ID},
        {
            "$set": {
                "slug": COURSE_ID,
                "title": "Price Action Secrets",
                "published": True,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    lesson_doc = lesson.to_storage_dict()
    lesson_doc["updated_at"] = now
    db.lessons.update_one(
        {"id": LESSON_ID},
        {"$set": lesson_doc, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    enrollment_count = 0
    if enrollment_email:
        normalized_email = enrollment_email.strip().lower()
        user_doc = db.users.find_one({"email": normalized_email})
        user_id = str(user_doc["_id"]) if user_doc else f"email:{normalized_email}"
        result = db.enrollments.update_one(
            {"user_id": user_id, "course_id": COURSE_ID},
            {
                "$set": {
                    "email": normalized_email,
                    "active": True,
                    "updated_at": now,
                },
                "$setOnInsert": {"enrolled_at": now},
            },
            upsert=True,
        )
        enrollment_count = 1 if result.acknowledged else 0
    return {"courses": 1, "lessons": 1, "enrollments": enrollment_count}


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Import the ChartCoach DRM pilot lesson")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    parser.add_argument("--database-name", default=os.getenv("DATABASE_NAME", "chartcoach"))
    parser.add_argument("--mux-playback-id", default=os.getenv("MUX_PLAYBACK_ID"))
    parser.add_argument(
        "--duration-seconds",
        type=float,
        default=float(os.getenv("PILOT_LESSON_DURATION_SECONDS", "900")),
    )
    parser.add_argument("--caption-url", default=os.getenv("PILOT_CAPTION_URL"))
    parser.add_argument("--enrollment-email", default=os.getenv("PILOT_ENROLLMENT_EMAIL"))
    return parser


def main() -> None:
    parser = _parser()
    args = parser.parse_args()
    if not args.database_url:
        parser.error("--database-url or DATABASE_URL is required")
    if not args.mux_playback_id:
        parser.error("--mux-playback-id or MUX_PLAYBACK_ID is required")
    if not args.caption_url:
        parser.error("--caption-url or PILOT_CAPTION_URL is required")

    client = pymongo.MongoClient(args.database_url, serverSelectionTimeoutMS=5000)
    counts = upsert_pilot_lesson(
        client[args.database_name],
        mux_playback_id=args.mux_playback_id,
        duration_seconds=args.duration_seconds,
        caption_url=args.caption_url,
        enrollment_email=args.enrollment_email,
    )
    print(
        "Pilot import complete: "
        f"{counts['courses']} course, {counts['lessons']} lesson, {counts['enrollments']} enrollment."
    )


if __name__ == "__main__":
    main()
