# This file has the routes for saving and removing a user's face data.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.face_engine import debug_blink_sequence, get_single_face_embedding, is_live_face
from app.database import get_db
from app.models.face_embedding import FaceEmbedding
from app.models.user import User
from app.schemas.face import FaceEnrollIn, FaceEnrollOut, FaceFrameBurstIn

router = APIRouter(prefix="/face", tags=["face"])


@router.post("/debug-blink")
def debug_blink(data: FaceFrameBurstIn):
    # A small diagnostic tool: send a burst of frames and see the raw
    # eye-openness numbers our blink check computed for each one. This is
    # meant for tuning BLINK_DROP_RATIO with real webcam data — it does not
    # save anything and does not require login.
    return debug_blink_sequence(data.images_base64)


@router.post("/enroll", response_model=FaceEnrollOut)
def enroll_face(
    data: FaceEnrollIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check every photo fully before saving anything, so a bad photo
    # rejects the whole enrollment instead of leaving a half-finished set.
    # No blink is required here — see the note on FaceEnrollIn for why.
    embeddings: list[list[float]] = []

    for image_base64 in data.images_base64:
        try:
            embedding = get_single_face_embedding(image_base64)
        except ValueError as error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))

        # Block photos, screens, and other spoofing attempts at enrollment time
        if not is_live_face(image_base64):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One of the photos does not look like a live camera photo. Please try again.",
            )

        embeddings.append(embedding)

    # Replace any previous face samples with this fresh set
    db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).delete()
    for embedding in embeddings:
        db.add(FaceEmbedding(user_id=current_user.id, vector=embedding))

    db.commit()

    return FaceEnrollOut(
        message="Face enrolled successfully.",
        has_face_enrolled=True,
        sample_count=len(embeddings),
    )


@router.delete("/enroll", response_model=FaceEnrollOut)
def remove_face(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).delete()
    db.commit()

    return FaceEnrollOut(message="Face data removed.", has_face_enrolled=False)
