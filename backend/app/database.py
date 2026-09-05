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
    except Exception as exc:
        print(f"Warning ensuring MongoDB indexes: {exc}")


def get_db() -> Database:
    # FastAPI dependency yielding database handle
    return db


# Backward-compatible factory for contexts (e.g. websockets) that previously used SessionLocal
def SessionLocal() -> Database:
    return db
