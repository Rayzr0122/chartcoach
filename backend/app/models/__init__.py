# Importing all models here makes sure SQLAlchemy knows about every table,
# even if only one of them is imported somewhere else in the app.
from app.models.user import User  # noqa: F401
from app.models.face_embedding import FaceEmbedding  # noqa: F401
