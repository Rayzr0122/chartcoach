# This file defines the FaceEmbedding data model for MongoDB.
# It stores face "fingerprints" (vectors) for a user captured during enrollment.
# We never store the real face photo, only the embedding numbers.

from datetime import datetime, timezone
from typing import Any


class FaceEmbedding:
    def __init__(
        self,
        vector: list[float],
        created_at: datetime | None = None,
        id: Any = None,
    ):
        self.vector = vector
        self.created_at = created_at or datetime.now(timezone.utc)
        self.id = id

    def to_dict(self) -> dict[str, Any]:
        return {
            "vector": self.vector,
            "created_at": self.created_at,
        }
