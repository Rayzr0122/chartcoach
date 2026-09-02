# This file has the WebSocket route that keeps watching the camera
# after login, to make sure the same person is still there.

import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.face_engine import best_similarity, get_faces, is_live_face, is_match
from app.core.security import AUTH_COOKIE_NAME, decode_access_token
from app.database import SessionLocal
from app.models.face_embedding import FaceEmbedding
from app.models.user import User

router = APIRouter(tags=["monitor"])

# Require a few bad frames in a row before pausing, so one blurry frame
# does not pause the session by accident.
FRAMES_TO_PAUSE = 3

# Require a few good frames in a row before resuming, for the same reason.
FRAMES_TO_RESUME = 2

# The frontend only sends one frame every few seconds, so there is never a
# legitimate reason for frames to arrive faster than this. Anything faster
# gets silently dropped instead of run through the (expensive) face models —
# this stops a buggy or malicious client from flooding the server with
# frame-analysis work over an already-open connection.
MIN_FRAME_INTERVAL_SECONDS = 2.0


@router.websocket("/ws/monitor")
async def monitor_session(websocket: WebSocket):
    # The browser sends the login cookie automatically on this connection.
    # A ?token=... query param is still accepted too, for non-browser clients.
    token = websocket.cookies.get(AUTH_COOKIE_NAME) or websocket.query_params.get("token")
    email = decode_access_token(token) if token else None

    if email is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or missing token.")
        return

    # Load the user's saved face fingerprint before accepting the connection
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found.")
            return

        face_rows = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).all()
        if not face_rows:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="No enrolled face for this user.")
            return

        stored_embeddings = [row.vector for row in face_rows]
    finally:
        db.close()

    await websocket.accept()

    is_paused = False
    bad_streak = 0
    good_streak = 0
    last_processed_at = 0.0

    try:
        while True:
            payload = await websocket.receive_json()
            image_base64 = payload.get("image_base64")
            if not image_base64:
                continue

            now = time.monotonic()
            if now - last_processed_at < MIN_FRAME_INTERVAL_SECONDS:
                continue
            last_processed_at = now

            try:
                faces = get_faces(image_base64)
            except ValueError:
                faces = []

            similarity = 0.0

            if len(faces) == 0:
                reason = "no_face"
                bad_streak += 1
                good_streak = 0
            elif len(faces) > 1:
                reason = "multiple_faces"
                bad_streak += 1
                good_streak = 0
            elif not is_live_face(image_base64):
                # Someone is holding up a photo or a screen instead of being there in person
                reason = "spoof_detected"
                bad_streak += 1
                good_streak = 0
            else:
                similarity = best_similarity(faces[0].normed_embedding.tolist(), stored_embeddings)
                if is_match(similarity):
                    reason = "ok"
                    good_streak += 1
                    bad_streak = 0
                else:
                    reason = "face_mismatch"
                    bad_streak += 1
                    good_streak = 0

            if not is_paused and bad_streak >= FRAMES_TO_PAUSE:
                is_paused = True
            elif is_paused and good_streak >= FRAMES_TO_RESUME:
                is_paused = False

            await websocket.send_json(
                {
                    "status": "paused" if is_paused else "active",
                    "reason": reason,
                    "similarity": round(similarity, 3),
                }
            )
    except WebSocketDisconnect:
        pass
