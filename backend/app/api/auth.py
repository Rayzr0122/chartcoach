# This file has the register and login API routes.

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

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
def register(request: Request, data: UserCreate, db: Session = Depends(get_db)):
    # Stop duplicate accounts using the same email
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    new_user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
@limiter.limit("30/minute")
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger UI sends the email inside "username" because OAuth2 calls that field username
    user = db.query(User).filter(User.email == form_data.username).first()

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
def face_login(request: Request, response: Response, data: FaceLoginIn, db: Session = Depends(get_db)):
    # Fast single-pass burst processing & dynamic blink liveness
    blink_confirmed, embedding, debug = process_face_burst(data.images_base64)
    if not blink_confirmed or embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not verify liveness. Please look directly at the camera and blink naturally.",
        )

    # 1:1 Biometric matching against enrolled samples for this specific email
    face_not_recognized_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Face not recognized. Please ensure your face is enrolled for this account.",
    )

    user = db.query(User).filter(User.email == data.email).first()
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
