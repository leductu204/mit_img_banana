# MIT Nano Img - AI Image Generator

Ứng dụng tạo ảnh AI sử dụng Nano Banana API (Higgsfield)

## Yêu cầu hệ thống

- **Python**: 3.8+
- **Node.js**: 18+
- **npm** hoặc **yarn**

## Cài đặt

### 1. Clone project

```bash
git clone <repository-url>
cd MIT_Img_Video
```

### 2. Cài đặt Backend (Python/FastAPI)

```bash
cd backend

# Tạo virtual environment (khuyến nghị)
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### 3. Cấu hình Backend

Tạo file `.env` trong thư mục `backend/`:

```env
HIGGSFIELD_SSES=your_sses_token_here
HIGGSFIELD_COOKIE=your_cookie_here
```

**Cách lấy SSES và COOKIE:**

1. Truy cập https://higgsfield.ai
2. Đăng nhập vào tài khoản
3. Mở DevTools (F12) → Tab **Application** → **Cookies**
4. Copy giá trị của:
   - `__client` → Đây là `HIGGSFIELD_SSES`
   - `__session` → Đây là `HIGGSFIELD_COOKIE`

### 4. Cài đặt Frontend (Next.js)

```bash
cd ../frontend

# Cài đặt dependencies
npm install
# hoặc
yarn install
```

## Chạy ứng dụng

### Chạy Backend

```bash
cd backend

# Windows:
run_dev.bat

# Linux/Mac:
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend sẽ chạy tại: http://127.0.0.1:8000

### Chạy Frontend

```bash
cd frontend

npm run dev
# hoặc
yarn dev
```

Frontend sẽ chạy tại: http://localhost:3000

## Cấu trúc project

```
MIT_Img_Video/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # Entry point
│   │   ├── config.py       # Cấu hình
│   │   ├── routers/        # API routes
│   │   └── services/       # Business logic
│   ├── .env                # Environment variables
│   └── requirements.txt    # Python dependencies
│
└── frontend/               # Next.js frontend
    ├── app/                # Next.js app directory
    ├── components/         # React components
    ├── lib/                # Utilities
    └── package.json        # Node dependencies
```

## Sử dụng

1. Truy cập http://localhost:3000
2. Chọn **"Tạo ảnh"** từ sidebar
3. Nhập prompt mô tả ảnh bạn muốn
4. (Tùy chọn) Upload ảnh tham chiếu cho Image-to-Image
5. Chọn model:
   - **Nano Banana**: Nhanh, chất lượng tốt
   - **Nano Banana Pro**: Chậm hơn, chất lượng cao hơn, hỗ trợ resolution 1K/2K/4K
6. Chọn tỷ lệ khung hình: 1:1, 16:9, hoặc 9:16
7. Nhấn **"Tạo ảnh"**

## API Endpoints

### Backend API

- `POST /api/nano-banana/upload/reference` - Upload ảnh tham chiếu đầu tiên
- `POST /api/nano-banana/upload/batch` - Upload ảnh tham chiếu tiếp theo
- `POST /api/nano-banana/upload/check` - Xác nhận upload thành công
- `POST /api/nano-banana/generate` - Tạo ảnh
- `GET /api/nano-banana/jobs/{job_id}` - Kiểm tra trạng thái job

## Troubleshooting

### Backend không khởi động

- Kiểm tra Python version: `python --version`
- Kiểm tra virtual environment đã được kích hoạt chưa
- Kiểm tra file `.env` đã được tạo và có đúng giá trị

### Frontend không kết nối được Backend

- Kiểm tra Backend đang chạy tại port 8000
- Kiểm tra CORS đã được cấu hình trong `backend/app/main.py`
- Kiểm tra proxy config trong `frontend/next.config.mjs`

### Upload ảnh bị lỗi 403 Forbidden

- Kiểm tra SSES và COOKIE còn hạn không
- Thử đăng nhập lại Higgsfield và lấy token mới

### Lỗi "Module not found"

Backend:
```bash
pip install -r requirements.txt
```

Frontend:
```bash
npm install
```

## License

MIT License
