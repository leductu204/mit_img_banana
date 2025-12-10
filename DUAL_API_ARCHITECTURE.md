# Architecture: Dual API Setup

## Setup Overview

```
Frontend Web App → https://tramsangtao.com/api/*       (Path-based)
Developer API    → https://api.tramsangtao.com/*       (Subdomain)
```

## Why Two APIs?

1. **Frontend API** (`/api/*`): For the web application (admin, users, internal calls)
2. **Public API** (`api.`): For external developers using API keys

## Configuration

### 1. Frontend Environment

```bash
# frontend/.env.production
NEXT_PUBLIC_API=https://tramsangtao.com
```

This makes all frontend calls go to `tramsangtao.com/api/admin/keys`, etc.

### 2. Reverse Proxy (Nginx/Cloudflare)

```nginx
# Main domain
server {
    server_name tramsangtao.com;
    
    # Backend API (for frontend web app)
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Frontend Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}

# Developer API subdomain
server {
    server_name api.tramsangtao.com;
    
    # Public API for developers
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Backend CORS

```python
# backend/.env
CORS_ORIGINS=https://tramsangtao.com,https://api.tramsangtao.com
```

## How It Works

### Frontend Users:
```
Browser → tramsangtao.com/admin/login
         → JS calls: tramsangtao.com/api/admin/auth/login
         → Nginx routes to: localhost:8000/api/admin/auth/login
```

### External Developers:
```
cURL -H "Authorization: Bearer sk_live_xxx" https://api.tramsangtao.com/v1/image/generate
     → Nginx routes to: localhost:8000/v1/image/generate
```

## Deploy Steps

1. **Update `.env.production`**: Set `NEXT_PUBLIC_API=https://tramsangtao.com`
2. **Rebuild frontend**: `npm run build`
3. **Configure Nginx**: Add routing rules above
4. **Restart services**: `sudo systemctl restart nginx`

## Current Issue

Your `.env.local` or production config likely has:
```bash
NEXT_PUBLIC_API=https://api.tramsangtao.com  # ❌ WRONG for frontend
```

Should be:
```bash
NEXT_PUBLIC_API=https://tramsangtao.com  # ✅ CORRECT
```

Then frontend calls `${NEXT_PUBLIC_API}/api/admin/keys` = `tramsangtao.com/api/admin/keys`
