# Cloudflare Setup Guide for MIT Img Video

## Quick Setup (Recommended)

### 1. Cloudflare Dashboard Settings

#### SSL/TLS Settings
1. Go to: **SSL/TLS** tab
2. Set SSL/TLS encryption mode to: **Flexible**
   - This allows HTTPS from browser to Cloudflare
   - HTTP from Cloudflare to your server
   - No SSL certificate needed on your server initially

#### DNS Settings
1. Go to: **DNS** → **Records**
2. Make sure these records exist with **orange cloud ON** (proxied):
   ```
   Type: A
   Name: @
   Content: YOUR_SERVER_IP
   Proxy status: Proxied (orange cloud)

   Type: A
   Name: www
   Content: YOUR_SERVER_IP
   Proxy status: Proxied (orange cloud)
   ```

3. If you have both domains:
   - `n8nleductu.space` → Point to your server IP (orange cloud ON)
   - `dtnanotool.io.vn` → Point to your server IP (orange cloud ON)

#### Page Rules (Optional but Recommended)
1. Go to: **Rules** → **Page Rules**
2. Add rule for `http://*yourdomain.com/*`
   - Setting: **Always Use HTTPS**
   - This forces HTTPS for all visitors

---

### 2. Server Configuration (Nginx)

With Cloudflare Flexible SSL, your Nginx config should be:

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

    # NO HTTPS redirect needed - Cloudflare handles this
    # Remove or comment out: return 301 https://...

    # Health check
    location /health {
        proxy_pass http://mit_backend/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://mit_backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth endpoints
    location /auth/ {
        proxy_pass http://mit_backend/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin endpoints
    location /admin/ {
        proxy_pass http://mit_backend/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Docs
    location /docs {
        proxy_pass http://mit_backend/docs;
        proxy_set_header Host $host;
    }

    # Frontend (must be last)
    location / {
        proxy_pass http://mit_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### 3. Backend Environment Variables

File: `backend/.env`

```env
# Google OAuth - Use HTTPS (Cloudflare provides this)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://dtnanotool.io.vn/auth/google/callback

# Frontend URL - Use HTTPS
FRONTEND_URL=https://dtnanotool.io.vn

# CORS - Use HTTPS
CORS_ORIGINS=https://dtnanotool.io.vn,https://n8nleductu.space

# JWT Secret
JWT_SECRET=your_secure_secret_here

# Higgsfield API
HIGGSFIELD_SSES=your_sses_token
HIGGSFIELD_COOKIE=your_cookie

# Database
DATABASE_PATH=database/app.db
DEFAULT_USER_CREDITS=1000
```

---

### 4. Frontend Environment Variables

File: `frontend/.env.local`

```env
# Use HTTPS (Cloudflare provides this)
NEXT_PUBLIC_API=https://dtnanotool.io.vn
```

---

### 5. Google OAuth Console

Update **Authorized redirect URIs** to use HTTPS:

```
https://dtnanotool.io.vn/auth/google/callback
https://n8nleductu.space/auth/google/callback
```

---

## Testing Checklist

After setup:

- [ ] Visit `https://dtnanotool.io.vn` (should work with HTTPS)
- [ ] Check `https://dtnanotool.io.vn/health` (should return {"status":"ok"})
- [ ] Test Google login flow
- [ ] Check browser console for CORS errors
- [ ] Verify SSL certificate shows "Cloudflare" in browser

---

## Troubleshooting

### Issue: "Too many redirects"
**Solution:** Remove the `return 301 https://...` line from Nginx config

### Issue: "Mixed content" warnings
**Solution:** Make sure all URLs in frontend use HTTPS or relative paths

### Issue: Google OAuth fails
**Solution:** 
1. Check `GOOGLE_REDIRECT_URI` uses `https://`
2. Verify it matches exactly in Google Console
3. Check `FRONTEND_URL` uses `https://`

### Issue: CORS errors
**Solution:** Update `CORS_ORIGINS` to use `https://` instead of `http://`

---

## Advanced: Upgrade to "Full" SSL (Optional)

For better security, install SSL certificate on your server:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d dtnanotool.io.vn

# Update Cloudflare SSL mode to "Full" or "Full (strict)"
```

Then update Nginx to listen on port 443 as well.
