# 🚀 Deployment Summary - MIT Img Video

## ✅ Issues Fixed

### 1. **Nginx Configuration**
- ✅ Fixed typo: `hhtps` → `https`
- ✅ Added missing backend routes: `/health`, `/api/`, `/auth/`, `/admin/`, `/docs`
- ✅ Correct location block order (specific routes before catch-all `/`)
- ✅ Removed HTTPS redirect (Cloudflare handles this)

### 2. **Server Setup**
- ✅ Backend running on port 8000 (FastAPI/uvicorn)
- ✅ Frontend running on port 3000 (Next.js)
- ✅ Nginx running on port 80 (reverse proxy)
- ✅ Apache stopped (was conflicting with Nginx)

### 3. **Domain Configuration**
- ✅ Two domains configured: `n8nleductu.space` and `dtnanotool.io.vn`
- ✅ Cloudflare SSL mode: Flexible (provides HTTPS)

---

## 📋 Current Configuration

### Nginx Config
**File:** `/etc/nginx/sites-available/mit_img.conf`

```nginx
upstream mit_frontend {
    server 127.0.0.1:3000;
}

upstream mit_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name n8nleductu.space dtnanotool.io.vn;

    location /health { proxy_pass http://mit_backend/health; }
    location /docs { proxy_pass http://mit_backend/docs; }
    location /openapi.json { proxy_pass http://mit_backend/openapi.json; }
    location /auth/ { proxy_pass http://mit_backend/auth/; }
    location /api/ { proxy_pass http://mit_backend/api/; }
    location /admin/ { proxy_pass http://mit_backend/admin/; }
    location / { proxy_pass http://mit_frontend; }
}
```

### Backend Environment Variables
**File:** `backend/.env`

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://dtnanotool.io.vn/auth/google/callback

# Frontend URL
FRONTEND_URL=https://dtnanotool.io.vn

# CORS
CORS_ORIGINS=https://dtnanotool.io.vn,https://n8nleductu.space

# JWT
JWT_SECRET=your_secure_secret

# Higgsfield API
HIGGSFIELD_SSES=your_sses_token
HIGGSFIELD_COOKIE=your_cookie

# Database
DATABASE_PATH=database/app.db
DEFAULT_USER_CREDITS=1000
```

### Frontend Environment Variables
**File:** `frontend/.env.local`

```env
NEXT_PUBLIC_API=https://dtnanotool.io.vn
```

---

## 🔧 Final Steps for Google OAuth

### 1. Update Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

**Authorized JavaScript origins:**
```
https://dtnanotool.io.vn
https://n8nleductu.space
```

**Authorized redirect URIs:**
```
https://dtnanotool.io.vn/auth/google/callback
https://n8nleductu.space/auth/google/callback
```

### 2. Verify Backend Environment

```bash
# On server
cd /path/to/MIT_Img_Video/backend
cat .env | grep -E "(GOOGLE_|FRONTEND_URL|CORS_ORIGINS)"

# Make sure all URLs use https://
# If not, edit and restart:
nano .env
pm2 restart backend
```

### 3. Verify Frontend Environment

```bash
# On server
cd /path/to/MIT_Img_Video/frontend
cat .env.local

# Should show:
# NEXT_PUBLIC_API=https://dtnanotool.io.vn

# If you need to update:
nano .env.local
npm run build
pm2 restart frontend
```

### 4. Cloudflare Settings

1. Go to Cloudflare Dashboard
2. Select your domain
3. **SSL/TLS** → Set to **"Flexible"**
4. **DNS** → Make sure orange cloud is ON (proxied)

---

## ✅ Testing Checklist

Run these tests to verify everything works:

### Backend Tests
```bash
# Health check
curl https://dtnanotool.io.vn/health
# Expected: {"status":"ok"}

# API docs
curl https://dtnanotool.io.vn/docs
# Expected: HTML page with API documentation

# Google login endpoint
curl https://dtnanotool.io.vn/auth/google/login?redirect=false
# Expected: JSON with auth_url
```

### Browser Tests
1. ✅ Visit `https://dtnanotool.io.vn` (should load with HTTPS)
2. ✅ Click "Login with Google"
3. ✅ Should redirect to Google login page
4. ✅ After login, should redirect back to your site
5. ✅ User should be authenticated

---

## 🐛 Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Cause:** Google Console redirect URI doesn't match backend configuration

**Fix:**
1. Check `GOOGLE_REDIRECT_URI` in `backend/.env`
2. Make sure it EXACTLY matches the URI in Google Console
3. Both should use `https://` (not `http://`)
4. No trailing slash

### Issue: CORS Errors in Browser Console

**Cause:** Frontend domain not in CORS_ORIGINS

**Fix:**
```bash
# Edit backend/.env
nano backend/.env

# Update CORS_ORIGINS to include your domain with https://
CORS_ORIGINS=https://dtnanotool.io.vn,https://n8nleductu.space

# Restart backend
pm2 restart backend
```

### Issue: 404 on /auth/google/login

**Cause:** Nginx location blocks in wrong order

**Fix:**
```bash
# Make sure /auth/ location block comes BEFORE location /
sudo nano /etc/nginx/sites-available/mit_img.conf

# Reload Nginx
sudo systemctl reload nginx
```

### Issue: "Too Many Redirects"

**Cause:** Nginx trying to redirect to HTTPS when Cloudflare already does this

**Fix:**
```bash
# Remove or comment out this line in Nginx config:
# return 301 https://$server_name$request_uri;

sudo systemctl reload nginx
```

---

## 📊 Service Management

### Check Status
```bash
# Check all services
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check logs
pm2 logs backend
pm2 logs frontend
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
pm2 restart backend

# Restart frontend
pm2 restart frontend

# Restart Nginx
sudo systemctl restart nginx
```

### Stop Services
```bash
# Stop all PM2 processes
pm2 stop all

# Stop Nginx
sudo systemctl stop nginx
```

---

## 🎯 Architecture Overview

```
User Browser
    ↓ HTTPS
Cloudflare (SSL/TLS Termination)
    ↓ HTTP
Nginx (Port 80) - Reverse Proxy
    ├─→ Backend (Port 8000) - /auth/, /api/, /admin/, /health, /docs
    └─→ Frontend (Port 3000) - / (all other routes)
```

---

## 📝 Important Notes

1. **Cloudflare Flexible SSL**: Browser → HTTPS → Cloudflare → HTTP → Your Server
2. **No SSL on Server**: Not needed with Cloudflare Flexible mode
3. **Environment Variables**: Always use `https://` for production URLs
4. **Google OAuth**: Redirect URIs must use `https://`
5. **Nginx Order**: Specific location blocks must come before catch-all `/`

---

## 🔐 Security Recommendations

### For Production:

1. **Upgrade to Cloudflare Full SSL**
   ```bash
   # Install SSL certificate on server
   sudo certbot --nginx -d dtnanotool.io.vn
   
   # Update Cloudflare SSL mode to "Full (strict)"
   ```

2. **Secure JWT Secret**
   ```bash
   # Generate a strong secret
   python -c "import secrets; print(secrets.token_hex(32))"
   
   # Update in backend/.env
   JWT_SECRET=generated_secret_here
   ```

3. **Database Backups**
   ```bash
   # Create backup script
   cp backend/database/app.db backend/database/app.db.backup.$(date +%Y%m%d)
   ```

4. **Environment Variables Security**
   ```bash
   # Protect .env files
   chmod 600 backend/.env
   chmod 600 frontend/.env.local
   ```

---

## 📞 Support

If you encounter issues:

1. Check service status: `pm2 status`
2. Check logs: `pm2 logs backend` or `pm2 logs frontend`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Test backend directly: `curl http://localhost:8000/health`
5. Test through Nginx: `curl http://localhost/health`

---

## ✨ Success Criteria

Your deployment is successful when:

- ✅ `https://dtnanotool.io.vn/health` returns `{"status":"ok"}`
- ✅ `https://dtnanotool.io.vn/docs` shows API documentation
- ✅ Google login redirects to Google and back successfully
- ✅ Users can authenticate and use the application
- ✅ No CORS errors in browser console
- ✅ All API endpoints work correctly

---

**Deployment Date:** 2025-12-09  
**Status:** ✅ Completed
