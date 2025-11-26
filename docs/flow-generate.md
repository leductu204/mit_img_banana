# Generation Flow

1. User submits request (e.g., T2I) via Frontend.
2. Frontend calls Backend API (/api/generate/t2i).
3. Backend validates request and credits.
4. Backend creates a Job record with status 'queued'.
5. Backend dispatches task to Provider Client (Nano/Kling).
6. Provider returns a task ID or immediate result.
7. Backend updates Job status.
8. Frontend polls /api/jobs/{job_id} until status is 'completed'.
9. Frontend displays result.
