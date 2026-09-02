# This file sets up rate limiting: it stops one computer from hammering
# sensitive routes (like login) with thousands of guesses per minute.
# Limits are tracked per client IP address, in memory.

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
