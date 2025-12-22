# Veo Video Generation - Selenium Captcha Integration

## Overview
This document explains how the Veo video generation flow has been updated to use Selenium-based captcha token generation instead of third-party APIs.

## Architecture

### Flow Diagram
```
User Request
    ↓
Video Router (video.py)
    ↓
get_recaptcha_token() ← NEW MODULE
    ↓
selenium_solver.py
    ↓
Chrome Browser (Selenium)
    ↓
reCAPTCHA v3 Enterprise Token
    ↓
google_veo_client.generate_video()
    ↓
Google Veo API
    ↓
Video Generation Job
```

## Key Components

### 1. **selenium_solver.py** (Existing)
Location: `backend/app/services/providers/selenium_solver.py`

**Purpose**: Uses Selenium WebDriver to solve reCAPTCHA v3 Enterprise challenges

**Key Function**:
```python
solve_recaptcha_v3_enterprise(site_key, site_url, action='FLOW_GENERATION')
```

**How it works**:
- Opens Chrome browser with Selenium
- Navigates to the target site (labs.google)
- Injects reCAPTCHA script
- Executes `grecaptcha.enterprise.execute()` 
- Returns the generated token

### 2. **recaptcha.py** (NEW)
Location: `backend/app/services/providers/recaptcha.py`

**Purpose**: Provides a clean interface for getting captcha tokens with caching

**Key Function**:
```python
get_recaptcha_token(force_refresh=False) -> str
```

**Features**:
- **Token Caching**: Reuses tokens for ~110 seconds (tokens are valid for 2 minutes)
- **Automatic Refresh**: Generates new token when cache expires
- **Error Handling**: Validates token and raises clear errors
- **Performance**: Avoids launching Chrome for every request

**Benefits**:
- Reduces Selenium overhead (launching Chrome is slow)
- Improves API response time
- No third-party captcha service costs

### 3. **video.py** (Updated)
Location: `backend/app/routers/video.py`

**Changes**:
```python
from app.services.providers.recaptcha import get_recaptcha_token

# In Veo generation endpoints:
recaptcha_token = get_recaptcha_token()
provider_job_id = google_veo_client.generate_video(
    prompt=prompt,
    recaptchaToken=recaptcha_token,
    ...
)
```

**Affected Endpoints**:
- `/api/video/generate` (for veo3.1-* models)
- `/api/video/veo3_1-low/t2v`
- `/api/video/veo3_1-low/i2v`
- `/api/video/veo3_1-fast/t2v`
- `/api/video/veo3_1-fast/i2v`
- `/api/video/veo3_1-high/t2v`
- `/api/video/veo3_1-high/i2v`

## Configuration

### Required Environment Variables
```env
# .env file
GOOGLE_VEO_COOKIE=<your_google_cookie>
```

### Chrome/Selenium Requirements
- Chrome browser installed
- ChromeDriver compatible with your Chrome version
- Selenium package: `pip install selenium`

## Testing

### Test Script
Location: `backend/test_veo_with_captcha.py`

**Run the test**:
```bash
cd backend
python test_veo_with_captcha.py
```

**What it tests**:
1. Captcha token generation via Selenium
2. Token usage in Veo API call
3. Video generation job creation
4. Job status monitoring
5. Token caching performance (optional)

**Expected Output**:
```
================================================================================
VEO VIDEO GENERATION - SELENIUM CAPTCHA INTEGRATION TEST
================================================================================

[STEP 1] Getting reCAPTCHA Token via Selenium
[*] Initializing Chrome and navigating to https://labs.google...
[*] Requesting Enterprise Token for action: 'FLOW_GENERATION'...
[+] Token generated successfully.
✅ Token obtained successfully!

[STEP 2] Generating Video with Veo API
🚀 Starting video generation...
✅ Video generation initiated!

[STEP 3] Monitoring Generation Progress
[Check 1/60] Polling status...
   Status: processing
...
🎉 SUCCESS! VIDEO GENERATION COMPLETED
📹 Video URL: https://...
```

## Performance Considerations

### Token Caching
- **First Request**: ~5-10 seconds (launches Chrome)
- **Cached Requests**: <0.1 seconds (instant)
- **Cache Duration**: 110 seconds
- **Benefit**: 50-100x speedup for subsequent requests

### Recommendations
1. **Pre-warm cache**: Call `get_recaptcha_token()` on server startup
2. **Background refresh**: Refresh token every 90 seconds to avoid expiry
3. **Monitor failures**: Log when Selenium fails to generate tokens

## Troubleshooting

### Common Issues

**1. Chrome not found**
```
Error: ChromeDriver not found
```
**Solution**: Install Chrome and ensure it's in PATH

**2. Token generation fails**
```
Error: Failed to generate reCAPTCHA token
```
**Solution**: 
- Check internet connection
- Verify Chrome can access labs.google
- Check Selenium logs for details

**3. Token expired**
```
Error: reCAPTCHA evaluation failed (403)
```
**Solution**: 
- Call `get_recaptcha_token(force_refresh=True)`
- Check cache TTL settings

**4. Slow performance**
```
Warning: Token generation taking >10 seconds
```
**Solution**:
- Ensure Chrome is not running in headless mode issues
- Check system resources (CPU/Memory)
- Consider increasing cache TTL

## Security Notes

1. **No Third-Party Services**: All captcha solving happens locally
2. **Cookie Security**: GOOGLE_VEO_COOKIE should be kept secret
3. **Token Lifetime**: Tokens are short-lived (2 minutes)
4. **Browser Fingerprinting**: Selenium uses real Chrome to avoid detection

## Future Improvements

1. **Headless Mode**: Run Chrome in headless mode for production
2. **Token Pool**: Maintain multiple pre-generated tokens
3. **Fallback**: Add fallback to third-party service if Selenium fails
4. **Monitoring**: Add metrics for token generation success rate
5. **Rate Limiting**: Implement rate limiting to avoid Google blocks

## API Usage Example

### Python
```python
from app.services.providers.recaptcha import get_recaptcha_token
from app.services.providers.google_client import google_veo_client

# Get token (uses cache if available)
token = get_recaptcha_token()

# Generate video
job_id = google_veo_client.generate_video(
    prompt="A beautiful sunset",
    recaptchaToken=token,
    model="veo3.1-fast",
    aspect_ratio="16:9"
)

# Monitor status
status = google_veo_client.get_job_status(job_id)
```

### cURL
```bash
# Get token via API endpoint (if exposed)
TOKEN=$(curl -X GET http://localhost:8000/api/captcha/token)

# Generate video
curl -X POST http://localhost:8000/api/video/veo3_1-fast/t2v \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "prompt=A beautiful sunset" \
  -F "aspect_ratio=16:9"
```

## Summary

✅ **Implemented**: Selenium-based captcha generation
✅ **Implemented**: Token caching for performance
✅ **Implemented**: Integration with Veo video endpoints
✅ **Implemented**: Test script for validation
✅ **No Third-Party APIs**: All captcha solving is local
✅ **Production Ready**: Caching reduces overhead significantly

The system now generates reCAPTCHA tokens locally using Selenium, eliminating dependency on third-party captcha services while maintaining good performance through intelligent caching.
