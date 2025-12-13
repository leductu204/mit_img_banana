# VPS Deployment Guide

## Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Python 3.10+
- Node.js 18+ and npm
- SQLite3
- Nginx (for reverse proxy)
- PM2 (for process management)

## Backend Setup

### 1. Install System Dependencies
```bash
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3-pip sqlite3 nginx
```

### 2. Clone Repository
```bash
git clone <your-repo-url>
cd MIT_Img_Video
```

### 3. Backend Environment Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create `.env` file in `backend/` directory:
```bash
# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-secure-secret-key-min-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Higgsfield API
HIGGSFIELD_SSES=your-higgsfield-session
HIGGSFIELD_COOKIE=your-higgsfield-cookie

# Google Veo
GOOGLE_VEO_COOKIE=your-google-veo-cookie

# CORS (your frontend domain)
FRONTEND_URL=https://yourdomain.com

# Admin Setup
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=change-this-secure-password
```

### 5. Initialize Database
The database will auto-initialize when you first run the backend. To verify:
```bash
# Should create app.db in backend/ directory
python -c "from app.database.db import init_database; init_database()"
```

This will create all tables from `database/schema.sql`:
- ✅ users (with plan_id, last_login_at)
- ✅ jobs (with provider_job_id, plan_id_snapshot)
- ✅ credit_transactions
- ✅ subscription_plans (seeded with 4 plans: Free, Starter, Professional, Business)
- ✅ admins
- ✅ admin_audit_logs
- ✅ model_costs
- ✅ system_settings
- ✅ api_keys
- ✅ api_key_usage

### 6. Run Backend with Gunicorn
```bash
# Test first with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000

# For production, use gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Frontend Setup

### 1. Install Node.js Dependencies
```bash
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_API=https://yourdomain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Build for Production
```bash
npm run build
```

### 4. Run with PM2
```bash
npm install -g pm2
pm2 start npm --name "frontend" -- start
pm2 save
pm2 startup
```

## Nginx Configuration

Create `/etc/nginx/sites-available/yourdomain.com`:
```nginx
# Backend - API
server {
    listen 80;
    server_name api.yourdomain.com;  # or yourdomain.com/api

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
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/HTTPS Setup with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
sudo systemctl reload nginx
```

## Process Management

### Backend with PM2
```bash
cd backend
pm2 start "gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000" --name "backend-api"
pm2 save
```

### Check Status
```bash
pm2 list
pm2 logs backend-api
pm2 logs frontend
```

## Database Migrations

If you already have an existing database and need to update to the new 4-tier subscription structure:
```bash
cd backend
python migrate_subscription_plans.py
```

Or run the SQL migration:
```bash
sqlite3 app.db < database/migrate_subscription_plans.sql
```

## Verification Checklist

### Backend
- [ ] Python dependencies installed (`pip list`)
- [ ] `.env` file configured with all required variables
- [ ] Database initialized (check `app.db` exists)
- [ ] Subscription plans seeded (4 plans)
- [ ] Admin account created
- [ ] Backend running on port 8000
- [ ] Health check: `curl http://localhost:8000/health`

### Frontend
- [ ] Node modules installed
- [ ] `.env.local` configured
- [ ] Build successful (`npm run build`)
- [ ] Frontend running on port 3000
- [ ] Can access `http://localhost:3000`

### Nginx
- [ ] Configuration file created
- [ ] SSL certificates installed
- [ ] Sites enabled and nginx restarted
- [ ] Can access via domain name

### Services
- [ ] PM2 processes running for both backend and frontend
- [ ] PM2 startup script enabled
- [ ] Services auto-restart on reboot

## Troubleshooting

### Database Issues
```bash
# Check if tables exist
sqlite3 app.db "SELECT name FROM sqlite_master WHERE type='table';"

# Check subscription plans
sqlite3 app.db "SELECT * FROM subscription_plans;"

# Recreate database
rm app.db
python -c "from app.database.db import init_database; init_database()"
```

### Permission Issues
```bash
# Ensure correct ownership
sudo chown -R $USER:$USER /path/to/MIT_Img_Video
chmod 644 backend/app.db
```

### Port Already in Use
```bash
# Find process using port 8000
sudo lsof -i :8000
# Kill if needed
kill -9 <PID>
```

## Monitoring

### View Logs
```bash
# PM2 logs
pm2 logs backend-api --lines 100
pm2 logs frontend --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
pm2 restart backend-api
pm2 restart frontend
sudo systemctl restart nginx
```

## Security Recommendations

1. **Change Default Credentials**: Update `ADMIN_PASSWORD` and `JWT_SECRET` in `.env`
2. **Firewall**: Configure UFW to allow only necessary ports
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```
3. **Keep System Updated**: Regular security updates
   ```bash
   sudo apt update && sudo apt upgrade
   ```
4. **Database Backups**: Regular backups of `app.db`
   ```bash
   # Add to crontab
   0 2 * * * /usr/bin/sqlite3 /path/to/app.db ".backup /path/to/backups/app_$(date +\%Y\%m\%d).db"
   ```

## Support

For issues during deployment, check:
- Backend logs: `pm2 logs backend-api`
- Frontend logs: `pm2 logs frontend`
- Nginx error logs: `/var/log/nginx/error.log`
- Database integrity: Run init_database() again if needed
