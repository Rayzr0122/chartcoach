# This file sets up the connection to the MongoDB database.

from typing import Any

import pymongo
from pymongo.database import Database

from app.config import settings

def create_client() -> Any:
    """Create the configured database client.

    ``mongomock://`` is an explicit local-development mode so contributors can
    run the account/player flow without a MongoDB daemon. Production URLs still
    use a real PyMongo client; there is no silent fallback on connection errors.
    """
    if settings.database_url.startswith("mongomock://"):
        try:
            import mongomock
        except ImportError as exc:  # pragma: no cover - packaging guard
            raise RuntimeError(
                "mongomock is required when DATABASE_URL uses mongomock://"
            ) from exc
        return mongomock.MongoClient()

    return pymongo.MongoClient(
        settings.database_url,
        serverSelectionTimeoutMS=5000,
    )


# MongoClient connection to MongoDB (or explicit in-memory local development).
client: Any = create_client()

# Active database instance
db: Database = client[settings.database_name]


def init_db() -> None:
    # Keep the market-product indexes and the protected-learning indexes
    # independent so a failure in one collection does not block startup.
    index_specs = [
        ("users_email", db.users, "email", {"unique": True}),
        ("users_public_user_id", db.users, "public_user_id", {"unique": True, "sparse": True}),
        ("course_id_unique", db.courses, "id", {"unique": True, "name": "course_id_unique"}),
        ("courses_level", db.courses, "levelNumber", {}),
        ("course_slug_unique", db.courses, "slug", {"unique": True, "name": "course_slug_unique"}),
        ("lesson_id_unique", db.lessons, "id", {"unique": True, "name": "lesson_id_unique"}),
        (
            "media_asset_id_unique",
            db.media_assets,
            "id",
            {"unique": True, "name": "media_asset_id_unique"},
        ),
        (
            "media_source_checksum_unique",
            db.media_assets,
            "source_checksum",
            {"unique": True, "sparse": True, "name": "media_source_checksum_unique"},
        ),
        (
            "media_generation_id_unique",
            db.media_generations,
            "id",
            {"unique": True, "name": "media_generation_id_unique"},
        ),
        (
            "processing_jobs_state_lease",
            db.processing_jobs,
            [("state", pymongo.ASCENDING), ("lease_expires_at", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)],
            {"name": "processing_jobs_state_lease"},
        ),
        (
            "lesson_course_published",
            db.lessons,
            [("course_id", pymongo.ASCENDING), ("published", pymongo.ASCENDING)],
            {"name": "lesson_course_published"},
        ),
        (
            "user_course_unique",
            db.enrollments,
            [("user_id", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING)],
            {"unique": True, "name": "user_course_unique"},
        ),
        (
            "enrollment_email_course_active",
            db.enrollments,
            [("email", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING), ("active", pymongo.ASCENDING)],
            {"name": "enrollment_email_course_active"},
        ),
        (
            "user_lesson_unique",
            db.lesson_progress,
            [("user_id", pymongo.ASCENDING), ("lesson_id", pymongo.ASCENDING)],
            {"unique": True, "name": "user_lesson_unique"},
        ),
        (
            "attempts_user_lesson_prompt",
            db.prompt_attempts,
            [
                ("user_id", pymongo.ASCENDING),
                ("lesson_id", pymongo.ASCENDING),
                ("prompt_id", pymongo.ASCENDING),
                ("attempted_at", pymongo.DESCENDING),
            ],
            {"name": "attempts_user_lesson_prompt"},
        ),
        ("enrollment_status", db.enrollments, [("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)], {}),
        ("lesson_progress_course", db.lesson_progress, [("user_id", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING)], {}),
        ("lesson_progress_recent", db.lesson_progress, [("user_id", pymongo.ASCENDING), ("last_watched_at", pymongo.DESCENDING)], {}),
        ("learning_activities_recent", db.learning_activities, [("user_id", pymongo.ASCENDING), ("occurred_at", pymongo.DESCENDING)], {}),
        ("watchlists_default", db.watchlists, [("user_id", pymongo.ASCENDING), ("is_default", pymongo.DESCENDING)], {}),
        ("watchlist_item_unique", db.watchlist_items, [("watchlist_id", pymongo.ASCENDING), ("symbol", pymongo.ASCENDING), ("exchange", pymongo.ASCENDING)], {"unique": True}),
        ("ai_conversations_recent", db.ai_conversations, [("user_id", pymongo.ASCENDING), ("updated_at", pymongo.DESCENDING)], {}),
        ("ai_messages_order", db.ai_messages, [("conversation_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)], {}),
        ("notifications_recent", db.notifications, [("user_id", pymongo.ASCENDING), ("read_at", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)], {}),
        ("session_registration_unique", db.session_registrations, [("session_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING)], {"unique": True}),
    ]
    for label, collection, keys, options in index_specs:
        try:
            collection.create_index(keys, **options)
        except Exception as exc:
            print(f"Warning ensuring MongoDB index {label}: {exc}")


def get_db() -> Database:
    # FastAPI dependency yielding database handle
    return db


# Backward-compatible factory for contexts (e.g. websockets) that previously used SessionLocal
def SessionLocal() -> Database:
    return db
