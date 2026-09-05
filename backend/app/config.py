# This file reads settings from the .env file.
# We keep secrets here instead of hardcoding them in code.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database connection string
    database_url: str
    database_name: str = "chartcoach"

    # Secret key used to sign login tokens (JWT)
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"

    # How long a login token stays valid (in minutes)
    access_token_expire_minutes: int = 60

    # Allowed frontend origin (for CORS)
    frontend_origin: str = "http://localhost:3000"

    # Whether the login cookie requires HTTPS. Keep False for local dev over
    # plain http://, but this MUST be True in any real deployment.
    cookie_secure: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# One shared settings object used everywhere in the app
settings = Settings()
