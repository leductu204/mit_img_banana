# config.py
import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')
    API_KEY: str = Field(..., env="API_KEY")
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    HIGGSFIELD_SSES: str = Field(..., env="HIGGSFIELD_SSES")
    HIGGSFIELD_COOKIE: str = Field(..., env="HIGGSFIELD_COOKIE")
    # Add other environment variables as needed

settings = Settings()
