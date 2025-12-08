# config.py
"""
Configuration for the application.
"""
import os
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')
    
    # Existing Higgsfield settings
    API_KEY: str = Field(default="", env="API_KEY")
    DATABASE_URL: str = Field(default="", env="DATABASE_URL")
    HIGGSFIELD_SSES: str = Field(..., env="HIGGSFIELD_SSES")
    HIGGSFIELD_COOKIE: str = Field(..., env="HIGGSFIELD_COOKIE")
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID: str = Field(default="", env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", env="GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://localhost:8000/auth/google/callback",
        env="GOOGLE_REDIRECT_URI"
    )
    
    # JWT settings
    JWT_SECRET: str = Field(default="change-this-secret-key-in-production", env="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_EXPIRY_DAYS: int = Field(default=7, env="JWT_EXPIRY_DAYS")
    
    # SQLite Database settings
    DATABASE_PATH: str = Field(default="database/app.db", env="DATABASE_PATH")
    
    # Credits settings
    DEFAULT_USER_CREDITS: int = Field(default=1000, env="DEFAULT_USER_CREDITS")
    
    # Frontend URL (for OAuth callback redirect)
    FRONTEND_URL: str = Field(default="http://localhost:3000", env="FRONTEND_URL")

    # Admin Auto-Setup (Optional)
    ADMIN_USERNAME: Optional[str] = Field(default=None, env="ADMIN_USERNAME")
    ADMIN_EMAIL: Optional[str] = Field(default=None, env="ADMIN_EMAIL")
    ADMIN_PASSWORD: Optional[str] = Field(default=None, env="ADMIN_PASSWORD")
    
    # CORS Origins (comma-separated list for production)
    CORS_ORIGINS: Optional[str] = Field(default=None, env="CORS_ORIGINS")
    
    @model_validator(mode='after')
    def validate_jwt_secret(self):
        """Warn if using default JWT_SECRET"""
        if self.JWT_SECRET == "change-this-secret-key-in-production":
            print("\n" + "="*70)
            print("⚠️  WARNING: Using default JWT_SECRET!")
            print("="*70)
            print("This is INSECURE for production!")
            print("Generate a secure secret:")
            print('  python -c "import secrets; print(secrets.token_hex(32))"')
            print("Then add to .env:")
            print("  JWT_SECRET=your_generated_secret_here")
            print("="*70 + "\n")
        return self

settings = Settings()
