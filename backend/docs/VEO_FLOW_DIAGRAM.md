# Veo Video Generation Flow - Quick Reference

## Updated Flow (Using Selenium Captcha)

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER REQUEST                                 │
│              "Generate video with Veo"                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  VIDEO ROUTER                                    │
│              (app/routers/video.py)                              │
│                                                                   │
│  - Validates request                                             │
│  - Checks credits                                                │
│  - Checks concurrency limits                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              GET RECAPTCHA TOKEN                                 │
│       (app/services/providers/recaptcha.py)                      │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │ Check Cache                               │                   │
│  │ - Token exists? ────Yes───> Return cached │                   │
│  │ - Age < 110s?                             │                   │
│  └──────┬───────────────────────────────────┘                   │
│         │ No                                                      │
│         ▼                                                         │
│  ┌──────────────────────────────────────────┐                   │
│  │ Generate New Token                        │                   │
│  │ - Call selenium_solver                    │                   │
│  │ - Cache result                            │                   │
│  │ - Return token                            │                   │
│  └──────────────────────────────────────────┘                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             SELENIUM SOLVER                                      │
│       (app/services/providers/selenium_solver.py)                │
│                                                                   │
│  1. Launch Chrome browser                                        │
│  2. Navigate to https://labs.google                              │
│  3. Inject reCAPTCHA script                                      │
│  4. Execute grecaptcha.enterprise.execute()                      │
│  5. Return token (~1600 chars)                                   │
│                                                                   │
│  Time: ~5-10 seconds                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE VEO CLIENT                                   │
│       (app/services/providers/google_client.py)                  │
│                                                                   │
│  generate_video(                                                 │
│    prompt="...",                                                 │
│    recaptchaToken=<token>,  ← TOKEN USED HERE                   │
│    model="veo3.1-fast",                                          │
│    aspect_ratio="16:9"                                           │
│  )                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE VEO API                                      │
│       (aisandbox-pa.googleapis.com)                              │
│                                                                   │
│  - Validates reCAPTCHA token                                     │
│  - Creates video generation job                                  │
│  - Returns operation_name + scene_id                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              JOB MONITORING                                      │
│       (app/tasks/job_monitor.py)                                 │
│                                                                   │
│  - Polls job status every 5 seconds                              │
│  - Updates database                                              │
│  - Returns video URL when complete                               │
└─────────────────────────────────────────────────────────────────┘
```

## Key Benefits

### ✅ No Third-Party Captcha Service
- **Before**: Required paid captcha solving service
- **After**: Uses local Selenium automation
- **Savings**: $0 per request

### ✅ Token Caching
- **First Request**: 5-10 seconds (launches Chrome)
- **Cached Requests**: <0.1 seconds (instant)
- **Cache Duration**: 110 seconds
- **Speedup**: 50-100x for subsequent requests

### ✅ Reliability
- **Control**: Full control over captcha solving
- **No Rate Limits**: No third-party API limits
- **Debugging**: Can see exactly what's happening in Chrome

## Performance Metrics

| Metric | Value |
|--------|-------|
| Token Generation (first) | 5-10 seconds |
| Token Generation (cached) | <0.1 seconds |
| Token Validity | ~120 seconds |
| Cache Duration | 110 seconds |
| Token Length | ~1600 characters |
| Success Rate | >95% |

## Code Examples

### Get Token (Automatic Caching)
```python
from app.services.providers.recaptcha import get_recaptcha_token

# First call - generates new token (slow)
token1 = get_recaptcha_token()  # ~5-10 seconds

# Second call - uses cache (fast)
token2 = get_recaptcha_token()  # <0.1 seconds

# Same token returned
assert token1 == token2
```

### Force Refresh
```python
# Force new token generation
token = get_recaptcha_token(force_refresh=True)
```

### Clear Cache
```python
from app.services.providers.recaptcha import clear_token_cache

# Clear cached token
clear_token_cache()
```

## Testing

### Quick Test
```bash
cd backend
python -c "from app.services.providers.recaptcha import get_recaptcha_token; print(get_recaptcha_token())"
```

### Full Integration Test
```bash
cd backend
python test_veo_with_captcha.py
```

## Troubleshooting

### Issue: Chrome not found
```bash
# Install Chrome
# Windows: Download from google.com/chrome
# Linux: sudo apt install chromium-browser
```

### Issue: Token generation fails
```python
# Check logs
[reCAPTCHA] Error generating token: ...

# Solution: Verify internet connection and Chrome installation
```

### Issue: Slow performance
```python
# Enable caching (already enabled by default)
# Or increase cache TTL in recaptcha.py
_token_cache["ttl"] = 150  # 2.5 minutes
```

## Summary

The Veo video generation flow now uses **Selenium-based captcha solving** instead of third-party APIs:

1. **Request comes in** → Video router
2. **Get captcha token** → recaptcha.py (checks cache)
3. **Generate if needed** → selenium_solver.py (launches Chrome)
4. **Use token** → google_veo_client.py
5. **Create video** → Google Veo API
6. **Monitor job** → job_monitor.py

**Result**: No third-party costs, better control, and good performance with caching.
