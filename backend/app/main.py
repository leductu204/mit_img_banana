# main.py
"""FastAPI application entry point with database initialization."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, image, video, jobs, users, health, costs
from .routers import admin, admin_users, admin_stats, admin_costs, admin_logs
from .config import settings
from .database.db import init_database
from .services.admin_service import create_initial_admin
from .repositories import model_costs_repo


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup: Initialize database
    print("Initializing database...")
    try:
        init_database()
        print("Database initialized successfully")
        
        # Seed default model costs if table is empty
        try:
            model_costs_repo.seed_default_costs()
        except Exception as e:
            print(f"Model costs seeding skipped or failed: {e}")
        
        # Check for admin auto-setup
        if settings.ADMIN_USERNAME and settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
            print("Checking admin auto-setup...")
            try:
                create_initial_admin(
                    username=settings.ADMIN_USERNAME,
                    email=settings.ADMIN_EMAIL,
                    password=settings.ADMIN_PASSWORD
                )
                print(f"Admin auto-created: {settings.ADMIN_USERNAME}")
            except ValueError as e:
                print(f"Admin auto-setup skipped: {e}")
            except Exception as e:
                print(f"Admin auto-setup failed: {e}")
                
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        print("The app will continue but database features may not work.")
    
    yield
    
    # Shutdown: Cleanup if needed
    print("Shutting down...")


app = FastAPI(
    title="MIT Nano Img API",
    description="AI Image and Video Generation Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Build allowed origins list
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production origins from environment variable
if settings.CORS_ORIGINS:
    production_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
    allowed_origins.extend(production_origins)
    print(f"CORS: Added production origins: {production_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Router Registration - Clean URL Structure
# ============================================

# Authentication
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Generation endpoints
app.include_router(image.router, prefix="/api/generate/image", tags=["image"])
app.include_router(video.router, prefix="/api/generate/video", tags=["video"])

# Job management
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])

# User data
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Public costs endpoint
app.include_router(costs.router, prefix="/api", tags=["costs"])

# Health check
app.include_router(health.router, prefix="/health", tags=["health"])

# ============================================
# Admin Panel Routes (prefixed with /api to avoid frontend collision)
# ============================================
app.include_router(admin.router, prefix="/api")  # /api/admin/auth/login, /api/admin/me
app.include_router(admin_users.router, prefix="/api")  # /api/admin/users
app.include_router(admin_stats.router, prefix="/api")  # /api/admin/stats
app.include_router(admin_costs.router, prefix="/api")  # /api/admin/model-costs
app.include_router(admin_logs.router, prefix="/api")  # /api/admin/audit-logs


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "MIT Nano Img API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "image_generation": {
                "nano-banana": "/api/generate/image/nano-banana/generate",
                "nano-banana-pro": "/api/generate/image/nano-banana-pro/generate"
            },
            "video_generation": "/api/generate/video",
            "jobs": "/api/jobs",
            "auth": "/auth",
            "users": "/api/users"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
