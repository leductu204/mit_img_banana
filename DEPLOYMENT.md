# Production Deployment Guide

## Để public ra ngoài Internet và nối domain

### 1. Cấu hình Backend (FastAPI)

#### Sửa file `backend/.env`:
```bash
# Đổi HOST từ 127.0.0.1 sang 0.0.0.0
HOST=0.0.0.0
PORT=8000
```

#### Sửa CORS trong `backend/app/main.py`:
```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://yourdomain.com",      # Thêm domain của bạn
    "https://www.yourdomain.com",  # Thêm www subdomain
]
```

#### Chạy backend:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Cấu hình Frontend (Next.js)

#### Tạo file `frontend/.env.production`:
```bash
NEXT_PUBLIC_API=https://api.yourdomain.com
```

#### Build production:
```bash
cd frontend
npm run build
npm start
```

### 3. Cấu hình Domain & DNS

#### A. Nếu dùng VPS/Server riêng:

1. **Trỏ DNS**:
   - A Record: `yourdomain.com` → IP server của bạn
   - A Record: `www.yourdomain.com` → IP server của bạn
   - A Record: `api.yourdomain.com` → IP server của bạn

2. **Cài Nginx làm reverse proxy**:

```nginx
# /etc/nginx/sites-available/yourdomain.com

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

3. **Enable site**:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Cài SSL (HTTPS) với Let's Encrypt**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

#### B. Nếu dùng Cloudflare Tunnel (không cần mở port):

1. **Cài cloudflared**:
```bash
# Download từ https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

2. **Login và tạo tunnel**:
```bash
cloudflared tunnel login
cloudflared tunnel create my-tunnel
```

3. **Cấu hình tunnel** (`~/.cloudflared/config.yml`):
```yaml
tunnel: <tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  # Frontend
  - hostname: yourdomain.com
    service: http://localhost:3000
  
  # Backend API
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  
  # Catch-all
  - service: http_status:404
```

4. **Chạy tunnel**:
```bash
cloudflared tunnel run my-tunnel
```

### 4. Chạy Production với PM2 (khuyến nghị)

#### Cài PM2:
```bash
npm install -g pm2
```

#### Tạo file `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      cwd: './backend',
      interpreter: 'python',
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
    }
  ]
};
```

#### Chạy:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto start on boot
```

### 5. Firewall (nếu cần)

```bash
# Mở port 80, 443 (HTTP/HTTPS)
sudo ufw allow 80
sudo ufw allow 443

# Nếu không dùng Nginx, mở port trực tiếp
sudo ufw allow 3000  # Frontend
sudo ufw allow 8000  # Backend
```

### 6. Kiểm tra

- Frontend: https://yourdomain.com
- Backend API: https://api.yourdomain.com/health
- API Docs: https://api.yourdomain.com/docs

## Troubleshooting

### CORS Error
- Kiểm tra domain đã thêm vào `allow_origins` chưa
- Kiểm tra HTTPS/HTTP có khớp không

### 502 Bad Gateway
- Kiểm tra backend có đang chạy không: `pm2 status`
- Kiểm tra port có đúng không

### SSL Certificate Error
- Chạy lại: `sudo certbot renew`
