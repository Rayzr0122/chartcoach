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
    # Ensure indexes exist in MongoDB collections
    try:
        db.users.create_index("email", unique=True)
        db.courses.create_index("id", unique=True, name="course_id_unique")
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
