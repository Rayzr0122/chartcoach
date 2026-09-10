"""
Public User ID Generator for ChartCoach.
Generates immutable, sortable, URL-safe identifiers prefixed with 'usr_' (ULID-style).
Uses standard library (time + os.urandom) to ensure zero third-party dependencies.
"""

import os
import time

# Crockford's Base32 character set (omits I, L, O, U to prevent visual confusion)
_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def generate_public_user_id() -> str:
    """
    Generates a 26-character Crockford Base32 ID prefixed with 'usr_'.
    Structure:
    - 48 bits of timestamp (millisecond precision, 10 characters)
    - 80 bits of cryptographic randomness (16 characters)
    Total: 'usr_' + 26 chars = 30 chars (e.g. 'usr_01K4V8W2XZ7R9BQ1M3DY4P6T0N')
    """
    ms = int(time.time() * 1000)
    time_chars = []
    for _ in range(10):
        time_chars.append(_BASE32_ALPHABET[ms & 0x1F])
        ms >>= 5
    time_chars.reverse()

    rand_bytes = os.urandom(10)
    rand_int = int.from_bytes(rand_bytes, "big")
    rand_chars = []
    for _ in range(16):
        rand_chars.append(_BASE32_ALPHABET[rand_int & 0x1F])
        rand_int >>= 5
    rand_chars.reverse()

    return f"usr_{''.join(time_chars)}{''.join(rand_chars)}"
