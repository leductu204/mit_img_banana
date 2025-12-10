# Production Environment Configuration Guide

## Current Setup Issue
Your frontend at `tramsangtao.com` is getting "Not Found" errors because:
1. `NEXT_PUBLIC_API` is not set correctly
2. Backend routing is not configured

## Choose Your Architecture:

### Option 1: Subdomain (Recommended)
```
Frontend: https://tramsangtao.com
Backend:  https://api.tramsangtao.com
```

**Configuration:**

1. **DNS Setup:**
   - Add A record: `api.tramsangtao.com` → Your VPS IP

2. **Backend Environment (.env):**
   ```bash
   # In backend/.env
   CORS_ORIGINS=https://tramsangtao.com,https://api.tramsangtao.com
   ```

3. **Frontend Environment (.env.local or .env.production):**
   ```bash
   # In frontend/.env.production
   NEXT_PUBLIC_API=https://api.tramsangtao.com
   ```

4. **Nginx/Cloudflare:**
   ```nginx
   server {
       server_name api.tramsangtao.com;
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   
   server {
       server_name tramsangtao.com;
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
       }
   }
   ```

### Option 2: Path-based
```
Frontend: https://tramsangtao.com/*
Backend:  https://tramsangtao.com/api/*
```

**Configuration:**

1. **Frontend Environment:**
   ```bash
   # In frontend/.env.production
   NEXT_PUBLIC_API=https://tramsangtao.com
   ```

2. **Nginx/Cloudflare:**
   ```nginx
   server {
       server_name tramsangtao.com;
       
       # Backend API
       location /api/ {
           proxy_pass http://localhost:8000/api/;
       }
       
       # Frontend
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

## Current Development Setup

For **local development**:
```bash
# frontend/.env.local (already ignored by git)
NEXT_PUBLIC_API=http://localhost:8000
```

Then access: `http://localhost:3000/admin/api-keys`

## Quick Test

1. **Check current value:**
   ```bash
   # On your VPS
   echo $NEXT_PUBLIC_API
   ```

2. **Set it temporarily:**
   ```bash
   # For subdomain approach
   export NEXT_PUBLIC_API=https://api.tramsangtao.com
   
   # Rebuild frontend
   npm run build
   npm run start
   ```

## Which do you prefer?

**Subdomain** (`api.tramsangtao.com`):
- ✅ Cleaner separation
- ✅ Easier CORS
- ✅ Can scale independently
- ❌ Need to manage DNS

**Path-based** (`tramsangtao.com/api`):
- ✅ Single domain
- ✅ No DNS changes
- ❌ More complex proxy rules
- ❌ URL conflicts possible
