# This file sets up the connection to the MongoDB database.

import pymongo
from pymongo.database import Database

from app.config import settings

# MongoClient connection to MongoDB
client: pymongo.MongoClient = pymongo.MongoClient(
    settings.database_url,
    serverSelectionTimeoutMS=5000,
)

# Active database instance
db: Database = client[settings.database_name]


def init_db() -> None:
    # Ensure production indexes exist across all domain collections
    try:
        # Identity
        db.users.create_index("email", unique=True)
        db.users.create_index("public_user_id", unique=True, sparse=True)

        # Learning Domain
        db.courses.create_index("id", unique=True)
        db.courses.create_index("levelNumber")

        db.enrollments.create_index([("user_id", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING)], unique=True)
        db.enrollments.create_index([("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)])

        db.lesson_progress.create_index([("user_id", pymongo.ASCENDING), ("lesson_id", pymongo.ASCENDING)], unique=True)
        db.lesson_progress.create_index([("user_id", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING)])
        db.lesson_progress.create_index([("user_id", pymongo.ASCENDING), ("last_watched_at", pymongo.DESCENDING)])

        db.learning_activities.create_index([("user_id", pymongo.ASCENDING), ("occurred_at", pymongo.DESCENDING)])

        # Watchlists
        db.watchlists.create_index([("user_id", pymongo.ASCENDING), ("is_default", pymongo.DESCENDING)])
        db.watchlist_items.create_index(
            [("watchlist_id", pymongo.ASCENDING), ("symbol", pymongo.ASCENDING), ("exchange", pymongo.ASCENDING)],
            unique=True,
        )

        # AI & Sessions
        db.ai_conversations.create_index([("user_id", pymongo.ASCENDING), ("updated_at", pymongo.DESCENDING)])
        db.ai_messages.create_index([("conversation_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
        db.notifications.create_index([("user_id", pymongo.ASCENDING), ("read_at", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        db.session_registrations.create_index([("session_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING)], unique=True)
        db.courses.create_index("slug", unique=True, name="course_slug_unique")
        db.lessons.create_index("id", unique=True, name="lesson_id_unique")
        db.lessons.create_index(
            [("course_id", pymongo.ASCENDING), ("published", pymongo.ASCENDING)],
            name="lesson_course_published",
        )
        db.enrollments.create_index(
            [("user_id", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING)],
            unique=True,
            name="user_course_unique",
        )
        db.enrollments.create_index(
            [("email", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING), ("active", pymongo.ASCENDING)],
            name="enrollment_email_course_active",
        )
        db.lesson_progress.create_index(
            [("user_id", pymongo.ASCENDING), ("lesson_id", pymongo.ASCENDING)],
            unique=True,
            name="user_lesson_unique",
        )
        db.prompt_attempts.create_index(
            [
                ("user_id", pymongo.ASCENDING),
                ("lesson_id", pymongo.ASCENDING),
                ("prompt_id", pymongo.ASCENDING),
                ("attempted_at", pymongo.DESCENDING),
            ],
            name="attempts_user_lesson_prompt",
        )
    except Exception as exc:
        print(f"Warning ensuring MongoDB indexes: {exc}")


def get_db() -> Database:
    # FastAPI dependency yielding database handle
    return db


# Backward-compatible factory for contexts (e.g. websockets) that previously used SessionLocal
def SessionLocal() -> Database:
    return db
