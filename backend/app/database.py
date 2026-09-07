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
    index_specs = [
        ("users_email", db.users, "email", {"unique": True}),
        ("course_id_unique", db.courses, "id", {"unique": True, "name": "course_id_unique"}),
        ("course_slug_unique", db.courses, "slug", {"unique": True, "name": "course_slug_unique"}),
        ("lesson_id_unique", db.lessons, "id", {"unique": True, "name": "lesson_id_unique"}),
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
