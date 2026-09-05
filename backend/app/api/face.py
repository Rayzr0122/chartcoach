# This file has the routes for saving and removing a user's face data.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.api.deps import get_current_user
from app.core.face_engine import debug_blink_sequence, extract_embedding_with_liveness
from app.database import get_db
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
    db: Database = Depends(get_db),
):
    # Single-pass inference: each photo runs the ONNX model ONCE for both
    # embedding extraction and liveness check (previously ran it twice).
    embeddings: list[list[float]] = []

    for image_base64 in data.images_base64:
        embedding, is_live, reason = extract_embedding_with_liveness(image_base64)

        if not embedding:
            detail = (
                "No face was detected. Please look directly at the camera."
                if reason == "no_face"
                else "Multiple faces detected. Only one person should be in view."
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

        if not is_live:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One of the photos does not look like a live camera photo. Please try again.",
            )

        embeddings.append(embedding)

    # Replace any previous face samples with this fresh set in MongoDB
    now = datetime.now(timezone.utc)
    embedding_docs = [{"vector": emb, "created_at": now} for emb in embeddings]
    db.users.update_one(
        {"_id": current_user._id},
        {"$set": {"face_embeddings": embedding_docs}},
    )

    return FaceEnrollOut(
        message="Face enrolled successfully.",
        has_face_enrolled=True,
        sample_count=len(embeddings),
    )


@router.delete("/enroll", response_model=FaceEnrollOut)
def remove_face(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    db.users.update_one(
        {"_id": current_user._id},
        {"$set": {"face_embeddings": []}},
    )

    return FaceEnrollOut(message="Face data removed.", has_face_enrolled=False)
