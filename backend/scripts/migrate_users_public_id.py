"""
Migration Script: Backfill public_user_id and User Metadata.
Safely backfills 'public_user_id', 'role', and 'status' for existing MongoDB users.
Fully idempotent: skips users that already have a public_user_id.
"""

import sys
import os

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import db
from app.core.user_id import generate_public_user_id


def migrate_users() -> None:
    users_cursor = db.users.find({})
    total = db.users.count_documents({})
    updated_count = 0

    print(f"Checking {total} user records in MongoDB...")

    for user in users_cursor:
        user_id = user["_id"]
        updates = {}

        if "public_user_id" not in user or not user["public_user_id"]:
            updates["public_user_id"] = generate_public_user_id()

        if "role" not in user:
            updates["role"] = "user"

        if "status" not in user:
            updates["status"] = "active" if user.get("is_active", True) else "suspended"

        if updates:
            db.users.update_one({"_id": user_id}, {"$set": updates})
            updated_count += 1
            print(f"  Updated user {user.get('email', str(user_id))} -> {updates['public_user_id']}")

    print(f"Migration complete: {updated_count} of {total} users updated.")

    # Verify unique index on public_user_id
    try:
        db.users.create_index("public_user_id", unique=True, sparse=True)
        print("Ensured unique index on users.public_user_id.")
    except Exception as exc:
        print(f"Warning creating index: {exc}")


if __name__ == "__main__":
    migrate_users()
