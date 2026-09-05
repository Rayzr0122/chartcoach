#!/usr/bin/env python3
"""
Migration script: Copy all users and face embeddings from MySQL to MongoDB Atlas.
Run with:
    python scripts/migrate_mysql_to_mongo.py
"""

import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pymongo
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

# Load .env
load_dotenv(backend_dir / ".env")

MONGO_URI = os.getenv("DATABASE_URL")
DB_NAME = os.getenv("DATABASE_NAME", "chartcoach")

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB = os.getenv("MYSQL_DB", "chartcoach")


def run_migration():
    print("=" * 60)
    print(" ChartCoach: MySQL -> MongoDB Atlas Data Migration")
    print("=" * 60)

    # 1. Connect to MySQL
    print(f"Connecting to MySQL ({MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB})...")
    try:
        mysql_conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DB,
            cursorclass=DictCursor,
        )
    except Exception as e:
        print(f"ERROR: Could not connect to MySQL: {e}")
        return False

    # 2. Connect to MongoDB
    print(f"Connecting to MongoDB Atlas ({DB_NAME})...")
    try:
        mongo_client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
        mongo_db = mongo_client[DB_NAME]
        # Ping
        mongo_db.command("ping")
        # Ensure unique index on email
        mongo_db.users.create_index("email", unique=True)
    except Exception as e:
        print(f"ERROR: Could not connect to MongoDB Atlas: {e}")
        mysql_conn.close()
        return False

    # 3. Read MySQL data
    with mysql_conn.cursor() as cur:
        cur.execute("SELECT * FROM users")
        mysql_users = cur.fetchall()

        cur.execute("SELECT * FROM face_embeddings")
        mysql_embeddings = cur.fetchall()

    mysql_conn.close()
    print(f"Found {len(mysql_users)} users and {len(mysql_embeddings)} face embeddings in MySQL.")

    # Group embeddings by user_id
    embeddings_by_user: dict[int, list[dict]] = {}
    for emb in mysql_embeddings:
        uid = emb["user_id"]
        raw_vec = emb["vector"]
        vector = json.loads(raw_vec) if isinstance(raw_vec, str) else raw_vec
        embeddings_by_user.setdefault(uid, []).append(
            {
                "vector": vector,
                "created_at": emb.get("created_at"),
            }
        )

    # 4. Upsert into MongoDB
    migrated_users = 0
    total_embeddings_migrated = 0

    for user in mysql_users:
        user_id = user["id"]
        email = user["email"]
        user_embeddings = embeddings_by_user.get(user_id, [])

        user_doc = {
            "email": email,
            "full_name": user["full_name"],
            "hashed_password": user["hashed_password"],
            "is_active": bool(user["is_active"]),
            "created_at": user.get("created_at"),
            "face_embeddings": user_embeddings,
        }

        # Upsert by email so running multiple times is safe and idempotent
        mongo_db.users.update_one({"email": email}, {"$set": user_doc}, upsert=True)
        migrated_users += 1
        total_embeddings_migrated += len(user_embeddings)
        print(f"  ✓ Migrated: {email} ({len(user_embeddings)} face samples)")

    print("=" * 60)
    print(f"Migration completed successfully!")
    print(f"  Total users migrated: {migrated_users}")
    print(f"  Total face embeddings migrated: {total_embeddings_migrated}")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
