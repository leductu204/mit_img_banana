# API Endpoints Documentation

This document describes all the API endpoints for different AI models.

**Important:** All models (Nano Banana, Kling) use the **Higgsfield API client**. "Kling" models are just different model variants provided by Higgsfield, not a separate API provider.

## Table of Contents
1. [Nano Banana (Image Generation)](#nano-banana-image-generation)
2. [Kling (Video Generation)](#kling-video-generation)
3. [General Routes](#general-routes)

---

## Nano Banana (Image Generation)

**Base Path:** `/api/nano-banana`
**Client:** `higgsfield_client`

### 1. Upload Reference Image
**Endpoint:** `POST /api/nano-banana/upload/reference`

Creates a presigned URL for uploading a reference image (for I2I - Image to Image).

**Request:** No body required

**Response:**
```json
{
  "id": "string",
  "url": "string",
  "upload_url": "string"
}
```

**Implementation:** `backend/app/routers/higgsfield.py:22-28`

---

### 2. Upload Batch Images
**Endpoint:** `POST /api/nano-banana/upload/batch`

Creates a presigned URL for uploading batch images.

**Request:** No body required

**Response:**
```json
{
  "id": "string",
  "url": "string",
  "upload_url": "string"
}
```

**Implementation:** `backend/app/routers/higgsfield.py:30-36`

---

### 3. Check Upload Status
**Endpoint:** `POST /api/nano-banana/upload/check`

Verifies that an image has been successfully uploaded.

**Request:**
```json
{
  "img_id": "string"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "string"
}
```

**Implementation:** `backend/app/routers/higgsfield.py:38-44`

---

### 4. Generate Image (T2I / I2I)
**Endpoint:** `POST /api/nano-banana/generate`

Generates an image using Nano Banana or Nano Banana PRO.

**Request:**
```json
{
  "prompt": "string",
  "input_images": [
    {
      "type": "media_input",
      "id": "string",
      "url": "string",
      "width": 1024,
      "height": 1024
    }
  ],
  "aspect_ratio": "9:16",  // Options: "1:1", "9:16", "16:9", "4:3", "3:4"
  "resolution": "2k",      // Only for Nano Banana PRO. Options: "1k", "2k", "4k"
  "model": "nano-banana"   // Options: "nano-banana", "nano-banana-pro"
}
```

**Response:**
```json
{
  "job_id": "string"
}
```

**Implementation:** `backend/app/routers/higgsfield.py:46-60`

**Client Implementation:** `backend/app/services/providers/higgsfield_client.py:144-206`

**Models:**
- **nano-banana**: Supports `aspect_ratio`, does NOT support `resolution`
- **nano-banana-pro**: Supports both `aspect_ratio` AND `resolution`

---

### 5. Get Job Status
**Endpoint:** `GET /api/nano-banana/jobs/{job_id}`

Polls the status of a generation job.

**Response:**
```json
{
  "status": "completed",  // Options: "pending", "processing", "completed", "failed"
  "result": "https://..."  // Image URL when completed
}
```

**Implementation:** `backend/app/routers/higgsfield.py:62-68`

**Client Implementation:** `backend/app/services/providers/higgsfield_client.py:208-227`

---

## Kling (Video Generation)

**Base Path:** `/api/nano-banana`
**Client:** `higgsfield_client` (same as Nano Banana)

**Note:** Kling models are video generation variants provided by Higgsfield. They use the same API client and authentication as Nano Banana.

### 1. Generate Video (T2V / I2V)
**Endpoint:** `POST /api/nano-banana/generate-video`

Generates a video using Kling models (kling-2.5-turbo, kling-o1-video, kling-2.6).

**Request:**
```json
{
  "prompt": "string",
  "input_images": [
    {
      "type": "media_input",
      "id": "string",
      "url": "string",
      "width": 1024,
      "height": 1024
    }
  ],
  "duration": "5s",                 // Options: "5s", "10s"
  "quality": "720p",                // Options: "720p", "1080p"
  "aspect_ratio": "16:9",           // Options: "9:16", "16:9", "1:1" (model dependent)
  "audio": false,                   // Only for kling-2.6
  "model": "kling-2.5-turbo"        // Options: "kling-2.5-turbo", "kling-o1-video", "kling-2.6"
}
```

**Response:**
```json
{
  "job_id": "string"
}
```

**Implementation:** `backend/app/routers/higgsfield.py:63-78`

**Client Implementation:** `backend/app/services/providers/higgsfield_client.py:229-295`

**Models:**
- **kling-2.5-turbo**: Supports `duration`, `quality` (720p only)
- **kling-o1-video**: Supports `duration`, `quality`, `aspect_ratio`
- **kling-2.6**: Supports `duration`, `quality`, `audio`

---

### 2. Get Video Job Status
**Endpoint:** `GET /api/nano-banana/jobs/{job_id}`

Polls the status of a video generation job (same endpoint as image generation).

**Response:**
```json
{
  "status": "completed",  // Options: "pending", "processing", "completed", "failed"
  "result": "https://..."  // Video URL when completed
}
```

**Implementation:** `backend/app/routers/higgsfield.py:80-86`

**Client Implementation:** `backend/app/services/providers/higgsfield_client.py:208-227`

---

## General Routes

### Health Check
**Endpoint:** `GET /health`

Checks if the API is running.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Model Configuration Mapping

### Frontend Model Keys → Backend Implementation

| Frontend Model | Backend Client | API Endpoints | Features |
|---------------|----------------|---------------|----------|
| `Nano Banana` | `higgsfield_client` | `/api/nano-banana/generate` | T2I, I2I, aspect_ratio |
| `Nano Banana PRO` | `higgsfield_client` | `/api/nano-banana/generate` | T2I, I2I, aspect_ratio, resolution |
| `kling-2.5-turbo` | `higgsfield_client` | `/api/nano-banana/generate-video` | T2V, I2V, duration, quality |
| `kling-o1-video` | `higgsfield_client` | `/api/nano-banana/generate-video` | T2V, I2V, duration, aspect_ratio, quality |
| `kling-2.6` | `higgsfield_client` | `/api/nano-banana/generate-video` | T2V, I2V, duration, quality, audio |

---

## File Structure

```
backend/app/
├── main.py                              # Main FastAPI app with route registration
├── routers/
│   ├── generate.py                      # General routes (deprecated/placeholder)
│   ├── higgsfield.py                    # All Higgsfield models (Nano Banana + Kling)
│   ├── jobs.py                          # Job management
│   └── health.py                        # Health check
├── services/
│   ├── dispatcher.py                    # Maps model keys to provider clients
│   └── providers/
│       ├── higgsfield_client.py         # Higgsfield API client (FULLY IMPLEMENTED)
│       ├── kling_client.py              # (Not needed - Kling uses higgsfield_client)
│       └── nano_client.py               # (Not needed - Nano uses higgsfield_client)
└── schemas/
    ├── higgsfield.py                    # Pydantic schemas for all Higgsfield models
    └── generate.py                      # Pydantic schemas for general generation
```

---

## Implementation Status

✅ **Fully Implemented:**
- Nano Banana (T2I, I2I)
- Nano Banana PRO (T2I, I2I with resolution)
- Kling 2.5 Turbo (T2V, I2V)
- Kling O1 Video (T2V, I2V with aspect ratio)
- Kling 2.6 (T2V, I2V with audio)
- Upload flow (reference, batch, check)
- Job status polling (shared for images and videos)

---

## Usage Flow Examples

### Example 1: Nano Banana Text to Image (T2I)

```javascript
// 1. Generate image
const response = await fetch('/api/nano-banana/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "A beautiful sunset",
    input_images: [],
    aspect_ratio: "9:16",
    model: "nano-banana"
  })
});
const { job_id } = await response.json();

// 2. Poll for status
const checkStatus = async () => {
  const statusRes = await fetch(`/api/nano-banana/jobs/${job_id}`);
  const { status, result } = await statusRes.json();
  
  if (status === 'completed') {
    console.log('Image URL:', result);
  } else {
    setTimeout(checkStatus, 2000);
  }
};
checkStatus();
```

### Example 2: Nano Banana Image to Image (I2I)

```javascript
// 1. Get upload URL
const uploadRes = await fetch('/api/nano-banana/upload/reference', {
  method: 'POST'
});
const { id, url, upload_url } = await uploadRes.json();

// 2. Upload image to presigned URL
await fetch(upload_url, {
  method: 'PUT',
  body: imageFile,
  headers: { 'Content-Type': 'image/jpeg' }
});

// 3. Confirm upload
await fetch('/api/nano-banana/upload/check', {
  method: 'POST',
  body: JSON.stringify({ img_id: id })
});

// 4. Generate with reference image
const genRes = await fetch('/api/nano-banana/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "Transform this image",
    input_images: [{
      type: "media_input",
      id: id,
      url: url,
      width: 1024,
      height: 1024
    }],
    aspect_ratio: "1:1",
    model: "nano-banana-pro",
    resolution: "2k"
  })
});
const { job_id } = await genRes.json();

// 5. Poll for status (same as T2I)
```

---

## Notes

- All Nano Banana endpoints require authentication via JWT token (handled by `higgsfield_client`)
- The JWT token is automatically refreshed using the `HIGGSFIELD_SSES` and `HIGGSFIELD_COOKIE` from environment variables
- Kling endpoints are currently placeholders and need to be implemented with actual Kling API integration
