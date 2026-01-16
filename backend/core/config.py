from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/saralsandhi"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Gemini API
    GEMINI_API_KEY: str = ""

    # Frontend URL for CORS
    FRONTEND_URL: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def async_database_url(self) -> str:
        """Convert DATABASE_URL to async format if needed."""
        url = self.DATABASE_URL
        # Railway provides postgresql:// but asyncpg needs postgresql+asyncpg://
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
