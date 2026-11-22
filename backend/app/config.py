from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    cors_origins: str = ""
    env: str = "development"
    # Optional: point tests at a separate Neon branch/database so a test run
    # can never compete with the app for connections. Falls back to
    # database_url when unset (tests still isolate via a rolled-back
    # transaction, just not at the database/schema level).
    test_database_url: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def effective_test_database_url(self) -> str:
        return self.test_database_url or self.database_url


settings = Settings()
