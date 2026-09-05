# This file defines the shape of data going in and out of the API.
# FastAPI uses these to check incoming data and format outgoing data.

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    # Data needed to register a new user
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    # 72 chars is bcrypt's max supported password length
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    # Data needed to log in
    email: EmailStr
    password: str


class UserOut(BaseModel):
    # Data we send back about a user (never includes the password)
    id: str | int
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime
    has_face_enrolled: bool = False

    model_config = {"from_attributes": True}


class Token(BaseModel):
    # The login token sent back after a successful login
    access_token: str
    token_type: str = "bearer"
