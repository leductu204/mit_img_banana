from fastapi import FastAPI
from .routers import generate, jobs, users, health, higgsfield
from .config import settings

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS Configuration
# For production with domain, add your domain to allow_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Add your production domain here:
        # "https://yourdomain.com",
        # "https://www.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(higgsfield.router, prefix="/api/nano-banana", tags=["nano-banana"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
