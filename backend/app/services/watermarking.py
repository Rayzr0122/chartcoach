"""Server-side watermark identity primitives.

The renderer consumes this session-bound identity before encryption. Raw email
addresses never travel in playback capabilities or watermark logs.
"""

from __future__ import annotations

import hashlib
import hmac
import re
from typing import TypedDict


class WatermarkIdentity(TypedDict):
    visible_text: str
    forensic_id: str
    algorithm: str


def mask_email(email: str) -> str:
    normalized = email.strip().lower()
    local, separator, domain = normalized.partition("@")
    if not separator or not local or not domain:
        raise ValueError("A valid email is required for watermarking")
    safe_domain = re.sub(r"[^a-z0-9.\-]", "", domain)
    if not safe_domain:
        raise ValueError("A valid email domain is required for watermarking")
    return f"{local[0]}{'•' * max(1, len(local) - 1)}@{safe_domain}"


def build_watermark_identity(email: str, playback_session_id: str, secret: str) -> WatermarkIdentity:
    if not playback_session_id or not secret:
        raise ValueError("A playback session and watermark secret are required")
    normalized = email.strip().lower()
    digest = hmac.new(
        secret.encode("utf-8"),
        f"{normalized}:{playback_session_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:32]
    return {
        "visible_text": mask_email(normalized),
        "forensic_id": digest,
        "algorithm": "hmac-sha256-session-bound",
    }
