# This file defines the User model for MongoDB.

from datetime import datetime, timezone
from typing import Any

from app.models.face_embedding import FaceEmbedding


class User:
    def __init__(
        self,
        email: str,
        full_name: str,
        hashed_password: str,
        is_active: bool = True,
        created_at: datetime | None = None,
        face_embeddings: list[Any] | None = None,
        _id: Any = None,
    ):
        self._id = _id
        self.email = email
        self.full_name = full_name
        self.hashed_password = hashed_password
        self.is_active = is_active
        self.created_at = created_at or datetime.now(timezone.utc)

        # Normalize face embeddings into FaceEmbedding objects
        raw_embeddings = face_embeddings or []
        self.face_embeddings: list[FaceEmbedding] = []
        for item in raw_embeddings:
            if isinstance(item, FaceEmbedding):
                self.face_embeddings.append(item)
            elif isinstance(item, dict):
                self.face_embeddings.append(
                    FaceEmbedding(
                        vector=item.get("vector", []),
                        created_at=item.get("created_at"),
                        id=item.get("id"),
                    )
                )
            elif isinstance(item, (list, tuple)):
                self.face_embeddings.append(FaceEmbedding(vector=list(item)))

    @property
    def id(self) -> str:
        return str(self._id) if self._id is not None else ""

    @property
    def has_face_enrolled(self) -> bool:
        # True once this user has registered at least one face sample
        return len(self.face_embeddings) > 0

    @classmethod
    def from_doc(cls, doc: dict[str, Any] | None) -> "User | None":
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            email=doc.get("email", ""),
            full_name=doc.get("full_name", ""),
            hashed_password=doc.get("hashed_password", ""),
            is_active=doc.get("is_active", True),
            created_at=doc.get("created_at"),
            face_embeddings=doc.get("face_embeddings", []),
        )

    def to_doc(self) -> dict[str, Any]:
        doc = {
            "email": self.email,
            "full_name": self.full_name,
            "hashed_password": self.hashed_password,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "face_embeddings": [emb.to_dict() for emb in self.face_embeddings],
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc
