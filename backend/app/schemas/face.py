# This file defines the shape of data for face-related API routes.

from pydantic import BaseModel, EmailStr, Field


class FaceImageIn(BaseModel):
    # A single photo from the browser camera, as a base64 string.
    # Used by the continuous monitoring check, where re-verifying a blink
    # on every single frame would be too slow and is not needed there.
    image_base64: str


class FaceFrameBurstIn(BaseModel):
    # A short burst of frames spanning a real blink, with no identity
    # attached. Used only by the debug-blink diagnostic tool.
    images_base64: list[str] = Field(min_length=3, max_length=12)


class FaceLoginIn(BaseModel):
    # Asking for the email turns face-login into a 1:1 check ("does this
    # face match THIS account?") instead of a 1:N search across every
    # enrolled face in the database. That is both faster and more accurate:
    # with many users enrolled, comparing against everyone raises the odds
    # of an accidental match against the wrong person.
    email: EmailStr

    # A short burst of frames spanning a real blink, so the server can
    # confirm liveness itself instead of trusting the browser's claim.
    # Login is the real security boundary, so this is the one place a
    # live blink is required.
    images_base64: list[str] = Field(min_length=3, max_length=12)


class FaceEnrollIn(BaseModel):
    # One photo per face sample we want to save. No blink is required here:
    # enrollment only happens inside an already-logged-in session (identity
    # is already proven by the password), and logging back in later still
    # requires a live blink regardless of how the sample was captured.
    images_base64: list[str] = Field(min_length=1, max_length=10)


class FaceEnrollOut(BaseModel):
    message: str
    has_face_enrolled: bool
    sample_count: int = 0
