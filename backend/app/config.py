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

    # Polygon.io API key for live financial market data & TradingView charts
    polygon_api_key: str = "u2kEX_q5yC8uBLevrFS13IjJjVvpe3eL"

    # Whether the login cookie requires HTTPS. Keep False for local dev over
    # plain http://, but this MUST be True in any real deployment.
    cookie_secure: bool = False

    app_environment: str = "development"
    playback_provider: str = "mux"

    # Mux signing is optional so unrelated APIs can start without video credentials.
    mux_signing_key_id: str | None = None
    mux_signing_private_key_base64: str | None = None
    mux_playback_token_expire_minutes: int = 120
    mux_playback_restriction_id: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# One shared settings object used everywhere in the app
settings = Settings()
