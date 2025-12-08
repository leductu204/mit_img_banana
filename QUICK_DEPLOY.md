# ⚡ Quick Setup - Deploy to Production Domain

## 📝 Tóm Tắt Nhanh

Giả sử domain của bạn: `https://yourdomain.com` (frontend) và `https://api.yourdomain.com` (backend)

---

## 1. Google OAuth Setup

### Vào: https://console.cloud.google.com/apis/credentials

**Authorized redirect URIs:**
```
https://api.yourdomain.com/auth/google/callback
```

**Authorized JavaScript origins:**
```
https://yourdomain.com
https://api.yourdomain.com
```

Lưu lại: **Client ID** và **Client Secret**

---

## 2. Backend .env

```env
# Server
PORT=8000
HOST=0.0.0.0

# Higgsfield
HIGGSFIELD_SSES=your_sses_token
HIGGSFIELD_COOKIE=your_cookie

# Google OAuth (từ Google Console)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback

# JWT (tạo mới: python -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=your_random_secret_here
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=7

# Database
DATABASE_PATH=database/app.db

# Credits
DEFAULT_USER_CREDITS=1000

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# CORS (QUAN TRỌNG!)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Admin (tùy chọn)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_password
```

---

## 3. Frontend .env.local

```env
PORT=3000
NEXT_PUBLIC_API=https://api.yourdomain.com
```

---

## 4. Chạy

```bash
# Backend
cd backend
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name backend

# Frontend
cd frontend
npm run build
pm2 start "npm run start" --name frontend
```

---

## ✅ Checklist

- [ ] Google OAuth redirect URI: `https://api.yourdomain.com/auth/google/callback`
- [ ] Backend `.env`: `GOOGLE_REDIRECT_URI` khớp với Google Console
- [ ] Backend `.env`: `FRONTEND_URL=https://yourdomain.com`
- [ ] Backend `.env`: `CORS_ORIGINS=https://yourdomain.com,...`
- [ ] Frontend `.env.local`: `NEXT_PUBLIC_API=https://api.yourdomain.com`
- [ ] SSL certificate đã cài (Let's Encrypt)
- [ ] Nginx reverse proxy đã cấu hình

---

## 🔥 Lỗi Thường Gặp

### "redirect_uri_mismatch"
→ `GOOGLE_REDIRECT_URI` trong `.env` phải CHÍNH XÁC giống Google Console

### CORS Error
→ Thêm domain vào `CORS_ORIGINS` trong backend `.env`

### "Failed to fetch"
→ Kiểm tra `NEXT_PUBLIC_API` trong frontend `.env.local`

---

Xem chi tiết: `DEPLOYMENT_GUIDE.md`
