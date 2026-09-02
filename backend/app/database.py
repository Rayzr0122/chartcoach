# This file sets up the connection to the MySQL database.

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# Engine talks to the MySQL database
engine = create_engine(settings.database_url, pool_pre_ping=True)

# Each request gets its own database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All models (tables) will inherit from this Base class
Base = declarative_base()


def get_db():
    # This function gives a database session to a request,
    # and always closes it when the request is done.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
