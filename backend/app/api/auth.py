# This file has the register and login API routes.

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.database import Database

from app.core.face_engine import (
    best_similarity,
    is_match,
    process_face_burst,
)
from app.core.rate_limit import limiter
from app.core.security import clear_auth_cookie, create_access_token, hash_password, set_auth_cookie, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.face import FaceLoginIn
from app.schemas.user import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def register(request: Request, data: UserCreate, db: Database = Depends(get_db)):
    # Stop duplicate accounts using the same email
    existing_user = db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    now = datetime.now(timezone.utc)
    new_user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_active=True,
        created_at=now,
        face_embeddings=[],
    )
    result = db.users.insert_one(new_user.to_doc())
    new_user._id = result.inserted_id

    return new_user


@router.post("/login", response_model=Token)
@limiter.limit("30/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Database = Depends(get_db),
):
    # Swagger UI sends the email inside "username" because OAuth2 calls that field username
    user_doc = db.users.find_one({"email": form_data.username})
    user = User.from_doc(user_doc)

    # Same error message whether the email was wrong or the password was wrong,
    # so attackers cannot tell which emails actually exist in our database
    invalid_credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
    )

    if user is None:
        raise invalid_credentials_error

    if not verify_password(form_data.password, user.hashed_password):
        raise invalid_credentials_error

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is disabled.")

    token = create_access_token(subject=user.email)
    set_auth_cookie(response, token)
    return Token(access_token=token)


@router.post("/face-login", response_model=Token)
@limiter.limit("30/minute")
def face_login(request: Request, response: Response, data: FaceLoginIn, db: Database = Depends(get_db)):
    # Fast single-pass burst processing & dynamic blink liveness
    blink_confirmed, embedding, debug = process_face_burst(data.images_base64)
    if not blink_confirmed or embedding is None:
        valid_count = debug.get("valid_frame_count", 0)
        if valid_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in camera view. Please center your face inside the circle.",
            )
        if valid_count < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face was lost during scan. Please stay steady and face the camera directly.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not verify liveness. Please look directly at the camera and blink naturally.",
        )

    # 1:1 Biometric matching against enrolled samples for this specific email
    face_not_recognized_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Face not recognized. Please ensure your face is enrolled for this account.",
    )

    user_doc = db.users.find_one({"email": data.email})
    user = User.from_doc(user_doc)
    if user is None:
        raise face_not_recognized_error

    stored_embeddings = [row.vector for row in user.face_embeddings]
    if not stored_embeddings:
        raise face_not_recognized_error

    similarity = best_similarity(embedding, stored_embeddings)
    if not is_match(similarity):
        raise face_not_recognized_error

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is disabled.")

    token = create_access_token(subject=user.email)
    set_auth_cookie(response, token)
    return Token(access_token=token)


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Logged out."}
