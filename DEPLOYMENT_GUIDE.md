# 🚀 Hướng Dẫn Deploy Lên Domain Mới

## 📋 Tổng Quan

Giả sử bạn muốn deploy lên domain: `https://yourdomain.com`
- Frontend: `https://yourdomain.com`
- Backend API: `https://api.yourdomain.com`

---

## 1️⃣ Cấu Hình Google OAuth

### Bước 1: Truy cập Google Cloud Console
1. Vào https://console.cloud.google.com/apis/credentials
2. Chọn project của bạn (hoặc tạo mới)

### Bước 2: Cấu Hình OAuth Consent Screen
1. Vào **OAuth consent screen** (menu bên trái)
2. Chọn **External** → **Create**
3. Điền thông tin:
   - **App name**: Tên ứng dụng của bạn
   - **User support email**: Email hỗ trợ
   - **Developer contact**: Email developer
4. **Authorized domains**: Thêm domain của bạn
   ```
   yourdomain.com
   ```
5. Save and Continue

### Bước 3: Tạo OAuth 2.0 Client ID
1. Vào **Credentials** → **Create Credentials** → **OAuth client ID**
2. Chọn **Application type**: Web application
3. **Name**: Backend OAuth Client
4. **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   https://api.yourdomain.com
   ```
5. **Authorized redirect URIs** (QUAN TRỌNG):
   ```
   https://api.yourdomain.com/auth/google/callback
   ```
6. Click **Create**
7. Lưu lại **Client ID** và **Client Secret**

---

## 2️⃣ Cấu Hình Backend (.env)

Tạo file `backend/.env` với nội dung:

```env
# Server Configuration
PORT=8000
HOST=0.0.0.0

# Higgsfield API Credentials
HIGGSFIELD_SSES=your_sses_token_here
HIGGSFIELD_COOKIE=your_cookie_here

# Google OAuth Credentials (từ Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback

# JWT Configuration (tạo secret mới)
# Chạy: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=your_generated_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=7

# Database Configuration
DATABASE_PATH=database/app.db

# Credits Configuration
DEFAULT_USER_CREDITS=1000

# Frontend URL (để redirect sau khi login)
FRONTEND_URL=https://yourdomain.com

# Admin Auto-Setup (tùy chọn)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_password_here
```

### ⚠️ Lưu Ý Quan Trọng:
- `GOOGLE_REDIRECT_URI` phải CHÍNH XÁC giống với URI đã đăng ký trong Google Console
- `FRONTEND_URL` là domain frontend để redirect user sau khi login thành công
- `JWT_SECRET` phải là chuỗi random an toàn (dùng lệnh python ở trên)

---

## 3️⃣ Cấu Hình Frontend (.env.local)

Tạo file `frontend/.env.local`:

```env
# Server Configuration
PORT=3000

# API Configuration
# URL của backend API
NEXT_PUBLIC_API=https://api.yourdomain.com
```

---

## 4️⃣ Cập Nhật CORS trong Backend

File `backend/app/main.py` đã được cập nhật để đọc CORS từ environment variable.

Thêm vào `backend/.env`:

```env
# CORS Origins (phân cách bằng dấu phẩy)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 5️⃣ Cấu Hình Nginx (Reverse Proxy)

### Backend API (api.yourdomain.com)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL Configuration (dùng Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Proxy to FastAPI
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Frontend (yourdomain.com)

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
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

## 6️⃣ Cài Đặt SSL Certificate (Let's Encrypt)

```bash
# Cài đặt Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Tạo certificate cho backend
sudo certbot --nginx -d api.yourdomain.com

# Tạo certificate cho frontend
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 7️⃣ Chạy Ứng Dụng

### Backend (với PM2)

```bash
cd backend

# Cài đặt PM2
npm install -g pm2

# Chạy backend
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name backend

# Lưu cấu hình PM2
pm2 save
pm2 startup
```

### Frontend (với PM2)

```bash
cd frontend

# Build production
npm run build

# Chạy production
pm2 start "npm run start" --name frontend

# Hoặc dùng next start trực tiếp
pm2 start "npx next start -p 3000" --name frontend

# Lưu cấu hình
pm2 save
```

---

## 8️⃣ Kiểm Tra

### Test Backend API
```bash
curl https://api.yourdomain.com/health
```

### Test Frontend
Mở browser: `https://yourdomain.com`

### Test Google OAuth
1. Vào `https://yourdomain.com`
2. Click "Đăng nhập với Google"
3. Kiểm tra redirect về đúng domain

---

## 9️⃣ Checklist Deploy

- [ ] Domain đã trỏ DNS về server
- [ ] SSL certificate đã cài đặt (Let's Encrypt)
- [ ] Backend `.env` đã cấu hình đúng
- [ ] Frontend `.env.local` đã cấu hình đúng
- [ ] Google OAuth redirect URI đã đăng ký chính xác
- [ ] CORS origins đã cập nhật
- [ ] Nginx config đã cấu hình
- [ ] Backend đang chạy (PM2)
- [ ] Frontend đang chạy (PM2)
- [ ] Database đã được khởi tạo
- [ ] Admin account đã được tạo
- [ ] Test login Google thành công

---

## 🔧 Troubleshooting

### Lỗi: "redirect_uri_mismatch"
- Kiểm tra `GOOGLE_REDIRECT_URI` trong `.env` khớp với Google Console
- Đảm bảo có `https://` và không có trailing slash

### Lỗi: CORS
- Kiểm tra `CORS_ORIGINS` trong backend `.env`
- Kiểm tra frontend domain đã được thêm vào CORS

### Lỗi: "Failed to fetch"
- Kiểm tra `NEXT_PUBLIC_API` trong frontend `.env.local`
- Kiểm tra backend API có chạy không

### Database không tự tạo
- Kiểm tra quyền write của thư mục `backend/database/`
- Xem log khi app khởi động

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra logs:

```bash
# Backend logs
pm2 logs backend

# Frontend logs
pm2 logs frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```
