from typing import Annotated, Any

from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _split_origins(value: Any) -> Any:
    if isinstance(value, str):
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    return value


CorsOrigins = Annotated[list[str], NoDecode, BeforeValidator(_split_origins)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    app_name: str = "Water IoT API"
    app_env: str = "development"
    api_prefix: str = "/api"
    cors_origins: CorsOrigins = ["*"]


settings = Settings()
