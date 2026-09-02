# This file has helper functions for passwords and login tokens (JWT).

from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Response
from jose import jwt, JWTError

from app.config import settings

# The name of the cookie that holds the login token
AUTH_COOKIE_NAME = "access_token"


def hash_password(plain_password: str) -> str:
    # Turn a plain password into a secure hash before saving it.
    # bcrypt only looks at the first 72 bytes of a password (this is a known bcrypt limit).
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Check if a plain password matches the saved hash
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(subject: str) -> str:
    # Build a signed login token that expires after some time
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    # Read the token and return the user email inside it (the "subject").
    # Returns None if the token is invalid or expired.
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None


def set_auth_cookie(response: Response, token: str) -> None:
    # Store the login token in an httpOnly cookie instead of relying on the
    # frontend to keep it in localStorage/JS memory. httpOnly means client-side
    # JavaScript cannot read this cookie at all, so an XSS bug in the frontend
    # cannot be used to steal a logged-in user's token.
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
