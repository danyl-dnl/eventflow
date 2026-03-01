from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "change-me-in-production"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()