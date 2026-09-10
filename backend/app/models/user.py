# This file defines the User model for MongoDB.
# Fully backward compatible with existing records while supporting the Senior Engineering Spec.

from datetime import datetime, timezone
from typing import Any, Optional, Dict

from app.core.user_id import generate_public_user_id
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
        public_user_id: Optional[str] = None,
        role: str = "user",
        status: str = "active",
        preferences: Optional[Dict[str, Any]] = None,
        timezone_str: str = "UTC",
        last_login_at: Optional[datetime] = None,
        subscription_plan: str = "free",
        subscription_status: str = "active",
    ):
        self._id = _id
        self.public_user_id = public_user_id or generate_public_user_id()
        self.email = email
        self.full_name = full_name
        self.hashed_password = hashed_password
        self.is_active = is_active
        self.role = role
        self.status = status
        self.preferences = preferences or {}
        self.timezone_str = timezone_str
        self.last_login_at = last_login_at
        self.subscription_plan = subscription_plan
        self.subscription_status = subscription_status
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
            public_user_id=doc.get("public_user_id"),
            email=doc.get("email", ""),
            full_name=doc.get("full_name", ""),
            hashed_password=doc.get("hashed_password", ""),
            is_active=doc.get("is_active", True),
            role=doc.get("role", "user"),
            status=doc.get("status", "active"),
            preferences=doc.get("preferences", {}),
            timezone_str=doc.get("timezone", "UTC"),
            last_login_at=doc.get("last_login_at"),
            subscription_plan=doc.get("subscription_plan", "free"),
            subscription_status=doc.get("subscription_status", "active"),
            created_at=doc.get("created_at"),
            face_embeddings=doc.get("face_embeddings", []),
        )

    def to_doc(self) -> dict[str, Any]:
        doc: dict[str, Any] = {
            "public_user_id": self.public_user_id,
            "email": self.email,
            "full_name": self.full_name,
            "hashed_password": self.hashed_password,
            "is_active": self.is_active,
            "role": self.role,
            "status": self.status,
            "preferences": self.preferences,
            "timezone": self.timezone_str,
            "last_login_at": self.last_login_at,
            "subscription_plan": self.subscription_plan,
            "subscription_status": self.subscription_status,
            "created_at": self.created_at,
            "face_embeddings": [emb.to_dict() for emb in self.face_embeddings],
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc
