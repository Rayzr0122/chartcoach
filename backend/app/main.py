# This is the entry point of the FastAPI app.
# It creates the app, sets up CORS, and connects all the routes.

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import auth, face, learning, monitor, users
from app.config import settings
from app.core.face_engine import load_face_app
from app.core.rate_limit import limiter
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database indexes
    init_db()
    # Load the face recognition model once, when the server starts,
    # so the first user request does not have to wait for it.
    load_face_app()
    yield


app = FastAPI(title="ChartCoach API", version="0.1.0", lifespan=lifespan)

# Wire up rate limiting: sends a friendly 429 response instead of a crash
# once a client goes over the limit on a decorated route
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS lets the Next.js frontend (a different port) call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect the route files to the app
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(face.router)
app.include_router(monitor.router)
app.include_router(learning.router)


@app.get("/health")
def health_check():
    # Simple route to check the API is running
    return {"status": "ok"}
