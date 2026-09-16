# This file has shared "dependencies" used by multiple API routes.
# The main one here finds the currently logged-in user from the token.

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pymongo.database import Database

from app.core.security import AUTH_COOKIE_NAME, decode_access_token
from app.database import get_db
from app.models.user import User

# auto_error=False so a missing Authorization header does not immediately
# fail the request — we still get a chance to check the login cookie below.
# (tokenUrl is only used to label the login endpoint in the API docs.)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token_from_header: str | None = Depends(oauth2_scheme),
    token_from_cookie: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: Database = Depends(get_db),
) -> User:
    # This runs on every protected route. The browser app authenticates via
    # the httpOnly cookie; an Authorization header still works too, for
    # non-browser API clients (Swagger UI, scripts, mobile apps).
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not verify your login. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = token_from_header or token_from_cookie
    if token is None:
        raise credentials_error

    email = decode_access_token(token)
    if email is None:
        raise credentials_error

    user_doc = db.users.find_one({"email": email})
    user = User.from_doc(user_doc)
    if user is None or not user.is_active:
        raise credentials_error

    return user


def get_optional_current_user(
    token_from_header: str | None = Depends(oauth2_scheme),
    token_from_cookie: str | None = Cookie(default=None, alias=AUTH_COOKIE_NAME),
    db: Database = Depends(get_db),
) -> User | None:
    token = token_from_header or token_from_cookie
    if token is None:
        return None

    email = decode_access_token(token)
    if email is None:
        return None

    user_doc = db.users.find_one({"email": email})
    user = User.from_doc(user_doc)
    if user is None or not user.is_active:
        return None

    return user


def require_entitlement(capability: str):
    """
    FastAPI route dependency ensuring the current user is entitled to a capability.
    Returns 403 Forbidden with actionable upgrade metadata if unauthorized.
    """
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Database = Depends(get_db),
    ) -> User:
        from app.services.entitlement_service import EntitlementService

        service = EntitlementService(db)
        if not service.is_entitled(current_user, capability):
            req = service.get_required_plan(capability)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ENTITLEMENT_REQUIRED",
                    "message": f"This feature requires the {req['requiredPlanName']} plan or higher.",
                    "capability": capability,
                    "requiredPlan": req["requiredPlan"],
                    "requiredPlanName": req["requiredPlanName"],
                },
            )
        return current_user

    return dependency
