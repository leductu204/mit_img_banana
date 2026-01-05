# main.py
"""FastAPI application entry point with database initialization."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    users,
    jobs,
    costs,
    auth,
    api_keys,
    health,
    admin,
    higgsfield,
    public_api,
    admin_logs,
    admin_users,
    admin_costs,
    admin_settings,
    admin_accounts,
    admin_stats,
    admin_api_keys,
    image,
    video,
    sora
)
from app.routers import settings as public_settings
from .config import settings
from .database.db import init_database
from .services.admin_service import create_initial_admin
from .repositories import model_costs_repo
from .tasks.cleanup import run_pending_jobs_cleanup
from .tasks.job_monitor import run_job_monitor
from .tasks.old_jobs_cleanup import run_old_jobs_cleanup
import asyncio


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
    
    # Start background tasks
    print("Starting background tasks...")
    cleanup_task = asyncio.create_task(run_pending_jobs_cleanup())
    job_monitor_task = asyncio.create_task(run_job_monitor())
    old_jobs_cleanup_task = asyncio.create_task(run_old_jobs_cleanup())
    
    yield
    
    # Shutdown: Cleanup if needed
    print("Shutting down...")
    
    # Cancel background tasks
    cleanup_task.cancel()
    job_monitor_task.cancel()
    old_jobs_cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        print("Cleanup task cancelled")
    try:
        await job_monitor_task
    except asyncio.CancelledError:
        print("Job monitor task cancelled")
    try:
        await old_jobs_cleanup_task
    except asyncio.CancelledError:
        print("Old jobs cleanup task cancelled")


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


# Cache Control Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Middleware to set appropriate cache headers for different routes."""
    
    # Static file extensions that should be cached
    STATIC_EXTENSIONS = {'.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'}
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        
        # Check if this is a static file (by extension)
        is_static = any(path.endswith(ext) for ext in self.STATIC_EXTENSIONS)
        
        if is_static:
            # Long cache for static assets (1 year, immutable)
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.startswith("/api/") or path.startswith("/v1/") or path.startswith("/auth/"):
            # No cache for API endpoints
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response


app.add_middleware(CacheControlMiddleware)


# ============================================
# Router Registration - Clean URL Structure
# ============================================

# Authentication
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Generation endpoints
app.include_router(image.router, prefix="/api/generate/image", tags=["image"])
app.include_router(video.router, prefix="/api/generate/video", tags=["video"])

# Payment endpoint
from app.routers import payment
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])

# Job management
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])

# API Keys (Internal management)
app.include_router(api_keys.router, prefix="/api/keys", tags=["api-keys"])

# Public API (External developers)
app.include_router(public_api.router, prefix="/v1", tags=["public-api"])

# User data
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Public costs endpoint
app.include_router(costs.router, prefix="/api", tags=["costs"])

# Health check
app.include_router(health.router, prefix="/health", tags=["health"])

# Sora Downloader
app.include_router(sora.router, prefix="/api/sora", tags=["sora"])

# ============================================
# Admin Panel Routes (prefixed with /api to avoid frontend collision)
# Hidden from public docs for security
# ============================================
app.include_router(admin.router, prefix="/api", include_in_schema=False)  # /api/admin/auth/login, /api/admin/me
app.include_router(admin_users.router, prefix="/api", include_in_schema=False)  # /api/admin/users
app.include_router(admin_stats.router, prefix="/api", include_in_schema=False)  # /api/admin/stats
app.include_router(admin_costs.router, prefix="/api", include_in_schema=False)  # /api/admin/model-costs
app.include_router(admin_logs.router, prefix="/api", include_in_schema=False)  # /api/admin/audit-logs
app.include_router(admin_api_keys.router, prefix="/api", include_in_schema=False)  # /api/admin/keys
app.include_router(admin_settings.router, prefix="/api", include_in_schema=False)  # /api/admin/settings
app.include_router(admin_accounts.router, prefix="/api/admin/higgsfield", tags=["admin-higgsfield"], include_in_schema=False)  # /api/admin/higgsfield/accounts

app.include_router(public_settings.router, prefix="/api")  # /api/settings/public


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
