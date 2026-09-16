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
    # DRM lesson indexes are created independently so one unrelated index
    # failure cannot prevent the protected-player data model from initializing.
    drm_index_specs = [
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
    for label, collection, keys, options in drm_index_specs:
        try:
            collection.create_index(keys, **options)
        except Exception as exc:
            print(f"Warning ensuring MongoDB index {label}: {exc}")

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

        # Subscriptions & Billing (Phase 1 & Phase 2)
        db.subscriptionPlans.create_index("slug", unique=True)
        db.subscriptions.create_index([("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)])
        db.subscriptions.create_index("razorpay_subscription_id", unique=True, sparse=True)
        db.payments.create_index("razorpay_payment_id", unique=True, sparse=True)
        db.payments.create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        db.gemWallets.create_index("user_id", unique=True)
        db.gemTransactions.create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        db.usageRecords.create_index([("user_id", pymongo.ASCENDING), ("capability", pymongo.ASCENDING)])

        # Phase 2 Indexes
        db.checkoutSessions.create_index([("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)])
        db.checkoutSessions.create_index("subscription_id", sparse=True)
        db.coupons.create_index("code", unique=True)
        db.coursePurchases.create_index([("user_id", pymongo.ASCENDING), ("course_id", pymongo.ASCENDING)], unique=True)
        db.gemPackages.create_index("package_id", unique=True)
        db.auditLogs.create_index([("user_id", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
    except Exception as exc:
        print(f"Warning ensuring MongoDB indexes: {exc}")


def get_db() -> Database:
    # FastAPI dependency yielding database handle
    return db


# Backward-compatible factory for contexts (e.g. websockets) that previously used SessionLocal
def SessionLocal() -> Database:
    return db
