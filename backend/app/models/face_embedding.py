# This file defines the "face_embeddings" table.
# It stores several face "fingerprints" (each a list of numbers) per user,
# captured from different blinks during enrollment. Checking a new face
# against all of them (and keeping the best match) is more reliable than
# checking against just one photo.
# We never store the real face photo here, only the numbers.

from sqlalchemy import Column, Integer, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    # The face fingerprint, saved as a list of numbers (JSON array)
    vector = Column(JSON, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="face_embeddings")
